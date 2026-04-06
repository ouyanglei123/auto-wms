/**
 * Capability Catalog
 *
 * 统一枚举 command / skill / agent / mcp-tool 的元数据视图，
 * 让现有能力可以被同一套查询与统计接口消费。
 */
import path from 'node:path';
import fs from 'fs-extra';
import { AgentRegistry } from './router/agent-registry.js';
import { SkillIndexer } from './skills/skill-indexer.js';
import { DEFAULT_TOOLS } from './mcp/mcp-shared.js';

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;
const COMMAND_HEADING_REGEX = /^#\s+\/([^\s]+).*$/m;

/**
 * @typedef {'command' | 'skill' | 'agent' | 'mcp-tool'} CapabilityKind
 * @typedef {'prompt' | 'resource' | 'agent' | 'tool'} CapabilityLayer
 */

/**
 * @typedef {Object} CapabilityEntry
 * @property {string} id
 * @property {string} name
 * @property {CapabilityKind} kind
 * @property {CapabilityLayer} layer
 * @property {string} description
 * @property {string[]} tags
 * @property {string[]} capabilities
 * @property {string} source
 * @property {Object} metadata
 */

export class CapabilityCatalog {
  /**
   * @param {string} [projectDir]
   * @param {Object} [options]
   * @param {string} [options.commandsDir]
   * @param {string} [options.skillsDir]
   */
  constructor(projectDir = process.cwd(), options = {}) {
    this.projectDir = projectDir;
    this.commandsDir = options.commandsDir || path.join(projectDir, 'commands');
    this.skillsDir = options.skillsDir || path.join(projectDir, 'skills');
    this._cache = null;
  }

  /**
   * 构建统一能力目录
   * @param {Object} [options]
   * @param {boolean} [options.useCache=true]
   * @returns {Promise<{totalCapabilities: number, byKind: Record<string, number>, byLayer: Record<string, number>, entries: CapabilityEntry[]}>}
   */
  async buildCatalog(options = {}) {
    const useCache = options.useCache ?? true;
    if (useCache && this._cache) {
      return this._cache;
    }

    const [commandEntries, skillEntries, agentEntries, mcpToolEntries] = await Promise.all([
      this._loadCommands(),
      this._loadSkills(),
      this._loadAgents(),
      this._loadMcpTools()
    ]);

    const entries = [...commandEntries, ...skillEntries, ...agentEntries, ...mcpToolEntries].sort(
      (a, b) => a.id.localeCompare(b.id)
    );

    const result = {
      totalCapabilities: entries.length,
      byKind: this._countBy(entries, 'kind'),
      byLayer: this._countBy(entries, 'layer'),
      entries
    };

    this._cache = result;
    return result;
  }

  /**
   * 按条件列出能力
   * @param {Object} [filters]
   * @param {CapabilityKind} [filters.kind]
   * @param {CapabilityLayer} [filters.layer]
   * @param {string} [filters.query]
   * @returns {Promise<CapabilityEntry[]>}
   */
  async listCapabilities(filters = {}) {
    const catalog = await this.buildCatalog();
    const query = filters.query?.toLowerCase().trim();

    return catalog.entries.filter((entry) => {
      if (filters.kind && entry.kind !== filters.kind) {
        return false;
      }

      if (filters.layer && entry.layer !== filters.layer) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        entry.id,
        entry.name,
        entry.description,
        ...entry.tags,
        ...entry.capabilities
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }

  /**
   * 获取单个能力
   * @param {string} id
   * @returns {Promise<CapabilityEntry|null>}
   */
  async getCapability(id) {
    const catalog = await this.buildCatalog();
    return catalog.entries.find((entry) => entry.id === id) || null;
  }

  clearCache() {
    this._cache = null;
  }

  async _loadCommands() {
    if (!(await fs.pathExists(this.commandsDir))) {
      return [];
    }

    const files = await this._walkMarkdownFiles(this.commandsDir);
    const entries = [];

    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(this.projectDir, filePath).replace(/\\/g, '/');
      const frontmatter = this._parseFrontmatter(content);
      const headingName = content.match(COMMAND_HEADING_REGEX)?.[1]?.trim();
      const name = frontmatter.name || headingName || this._deriveCommandName(filePath);
      const title = this._extractHeading(content);

      entries.push({
        id: `command:${name}`,
        name,
        kind: 'command',
        layer: 'prompt',
        description: frontmatter.description || title || name,
        tags: frontmatter.tags,
        capabilities: frontmatter.allowed_tools,
        source: 'commands',
        metadata: {
          filePath,
          relativePath,
          title
        }
      });
    }

    return entries;
  }

  async _loadSkills() {
    const indexer = new SkillIndexer(this.skillsDir);
    const index = await indexer.buildIndex({ useCache: false });

    return index.entries.map((entry) => ({
      id: `skill:${entry.name}`,
      name: entry.name,
      kind: 'skill',
      layer: 'resource',
      description: entry.description || entry.name,
      tags: entry.tags || [],
      capabilities: [],
      source: 'skills',
      metadata: {
        filePath: entry.filePath,
        relativePath: path.join('skills', entry.relativePath).replace(/\\/g, '/'),
        isDirectory: entry.isDirectory,
        fileSize: entry.fileSize
      }
    }));
  }

  async _loadAgents() {
    const registry = new AgentRegistry(this.projectDir);
    await registry.initialize();

    return registry.listAgents().map((agent) => ({
      id: `agent:${agent.name}`,
      name: agent.name,
      kind: 'agent',
      layer: 'agent',
      description: agent.description || agent.displayName || agent.name,
      tags: agent.tags || [],
      capabilities: agent.capabilities || [],
      source: agent.source || 'unknown',
      metadata: {
        displayName: agent.displayName,
        priority: agent.priority,
        complexity: agent.complexity,
        state: agent.state,
        triggerKeywords: agent.triggerKeywords || [],
        fallbackAgents: agent.fallbackAgents || [],
        filePath: agent.filePath || null
      }
    }));
  }

  async _loadMcpTools() {
    return DEFAULT_TOOLS.map((tool) => ({
      id: `mcp-tool:${tool.name}`,
      name: tool.name,
      kind: 'mcp-tool',
      layer: 'tool',
      description: tool.description || tool.name,
      tags: ['mcp'],
      capabilities: Object.keys(tool.inputSchema?.properties || {}),
      source: 'mcp-default',
      metadata: {
        inputSchema: tool.inputSchema || null,
        implementation: this._getMcpToolImplementation(tool)
      }
    }));
  }

  _countBy(entries, field) {
    return entries.reduce((acc, entry) => {
      acc[entry[field]] = (acc[entry[field]] || 0) + 1;
      return acc;
    }, {});
  }

  _getMcpToolImplementation(tool) {
    if (typeof tool.handler === 'function') {
      return 'implemented';
    }

    return 'declared';
  }

  async _walkMarkdownFiles(baseDir) {
    const results = [];
    const items = await fs.readdir(baseDir);

    for (const item of items) {
      const fullPath = path.join(baseDir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        results.push(...(await this._walkMarkdownFiles(fullPath)));
      } else if (stat.isFile() && item.endsWith('.md')) {
        results.push(fullPath);
      }
    }

    return results;
  }

  _extractHeading(content) {
    return content
      .split('\n')
      .find((line) => line.trim().startsWith('#'))
      ?.replace(/^#+\s*/, '')
      .trim();
  }

  _deriveCommandName(filePath) {
    const relativePath = path.relative(this.commandsDir, filePath).replace(/\\/g, '/');
    const withoutExt = relativePath.replace(/\.md$/i, '');

    if (withoutExt.includes('/')) {
      const [namespace, ...rest] = withoutExt.split('/');
      return `${namespace}:${rest.join(':')}`;
    }

    return withoutExt;
  }

  _parseFrontmatter(content) {
    const match = content.match(FRONTMATTER_REGEX);
    if (!match?.[1]) {
      return { name: '', description: '', tags: [], allowed_tools: [] };
    }

    const frontmatter = match[1];
    return {
      name: this._extractScalar(frontmatter, 'name'),
      description: this._extractScalar(frontmatter, 'description'),
      tags: this._extractArray(frontmatter, 'tags'),
      allowed_tools: this._extractArray(frontmatter, 'allowed_tools')
    };
  }

  _extractScalar(frontmatter, key) {
    return frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
  }

  _extractArray(frontmatter, key) {
    const raw = frontmatter.match(new RegExp(`^${key}:\\s*\\[(.+)\\]$`, 'm'))?.[1];
    if (!raw) {
      return [];
    }

    return raw
      .split(',')
      .map((item) => item.trim().replace(/['"]/g, ''))
      .filter(Boolean);
  }
}

export default CapabilityCatalog;
