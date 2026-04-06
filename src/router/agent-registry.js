/**
 * Agent 注册表
 *
 * 核心功能：
 * - 注册和管理 Agent 清单
 * - 按能力/关键词/优先级查询 Agent
 * - 为 Canonical Router 提供数据源
 * - 从 Agent .md 文件自动提取清单
 */
import path from 'node:path';
import fs from 'fs-extra';
import { logger } from '../logger.js';
import { COMPLEXITY_LEVELS, AGENT_STATES } from './agent-types.js';

const AGENTS_DIR_NAME = 'agents';
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;
const SAFE_AGENT_NAME_REGEX = /^[a-z0-9-]+$/;

/**
 * 内置 Agent 清单定义
 * @type {import('./agent-types.js').AgentManifest[]}
 */
const BUILT_IN_AGENTS = [
  {
    name: 'architect',
    displayName: '系统设计和架构决策',
    description: '架构决策、技术选型、系统边界划分',
    capabilities: ['architecture', 'design', 'tech-selection', 'system-boundary'],
    triggerKeywords: [
      'architecture',
      '架构',
      'design',
      '设计',
      'structure',
      '结构',
      'refactor',
      '重构'
    ],
    priority: 85,
    complexity: COMPLEXITY_LEVELS.HIGH,
    fallbackAgents: ['quest-designer'],
    state: AGENT_STATES.ACTIVE,
    source: 'built-in',
    version: '1.0.0',
    tags: ['core', 'architecture']
  },
  {
    name: 'tdd-guide',
    displayName: '测试驱动开发专家',
    description: '强制 TDD 工作流：红灯-绿灯-重构',
    capabilities: ['testing', 'tdd', 'coverage', 'unit-test', 'integration-test'],
    triggerKeywords: ['test', '测试', 'tdd', 'spec', 'coverage', '覆盖率', 'vitest', 'jest'],
    priority: 75,
    complexity: COMPLEXITY_LEVELS.MEDIUM,
    fallbackAgents: ['code-reviewer'],
    state: AGENT_STATES.ACTIVE,
    source: 'built-in',
    version: '1.0.0',
    tags: ['core', 'testing']
  },
  {
    name: 'code-reviewer',
    displayName: '代码质量审查',
    description: '代码质量、可维护性、最佳实践审查',
    capabilities: ['review', 'quality', 'maintainability', 'best-practices'],
    triggerKeywords: ['review', '审查', 'code-review', '质量', 'quality', 'reviewer'],
    priority: 70,
    complexity: COMPLEXITY_LEVELS.LOW,
    fallbackAgents: [],
    state: AGENT_STATES.ACTIVE,
    source: 'built-in',
    version: '1.0.0',
    tags: ['core', 'review']
  },
  {
    name: 'security-reviewer',
    displayName: '安全漏洞检测',
    description: '安全扫描、漏洞检测、密钥泄露检查',
    capabilities: ['security', 'vulnerability', 'secret-detection', 'xss', 'sql-injection'],
    triggerKeywords: [
      'security',
      '安全',
      '漏洞',
      'vulnerability',
      'auth',
      '认证',
      '密钥',
      'secret'
    ],
    priority: 95,
    complexity: COMPLEXITY_LEVELS.MEDIUM,
    fallbackAgents: ['code-reviewer'],
    state: AGENT_STATES.ACTIVE,
    source: 'built-in',
    version: '1.0.0',
    tags: ['core', 'security']
  },
  {
    name: 'build-error-resolver',
    displayName: '构建错误修复',
    description: '构建失败、TypeScript 错误、依赖冲突修复',
    capabilities: ['build', 'error-fix', 'typescript', 'dependency'],
    triggerKeywords: [
      'build',
      '构建',
      'error',
      '错误',
      'compile',
      '编译',
      'typescript',
      'fail',
      '失败'
    ],
    priority: 90,
    complexity: COMPLEXITY_LEVELS.LOW,
    fallbackAgents: [],
    state: AGENT_STATES.ACTIVE,
    source: 'built-in',
    version: '1.0.0',
    tags: ['core', 'build']
  },
  {
    name: 'e2e-runner',
    displayName: 'E2E 测试管理',
    description: 'Playwright 端到端测试、关键用户流程验证',
    capabilities: ['e2e', 'playwright', 'browser-test', 'user-flow'],
    triggerKeywords: ['e2e', 'end-to-end', '端到端', 'playwright', 'browser', '浏览器测试'],
    priority: 65,
    complexity: COMPLEXITY_LEVELS.MEDIUM,
    fallbackAgents: ['tdd-guide'],
    state: AGENT_STATES.ACTIVE,
    source: 'built-in',
    version: '1.0.0',
    tags: ['core', 'testing']
  },
  {
    name: 'refactor-cleaner',
    displayName: '死代码清理',
    description: '识别和清理死代码、未使用的导入、冗余逻辑',
    capabilities: ['refactor', 'cleanup', 'dead-code', 'unused-imports'],
    triggerKeywords: ['refactor', '清理', 'clean', 'dead-code', 'unused', '冗余', '重构'],
    priority: 55,
    complexity: COMPLEXITY_LEVELS.LOW,
    fallbackAgents: [],
    state: AGENT_STATES.ACTIVE,
    source: 'built-in',
    version: '1.0.0',
    tags: ['core', 'maintenance']
  },
  {
    name: 'doc-updater',
    displayName: '文档更新',
    description: '自动更新项目文档、README、API 文档',
    capabilities: ['documentation', 'readme', 'api-doc', 'changelog'],
    triggerKeywords: ['doc', '文档', 'readme', 'documentation', 'changelog', '更新文档'],
    priority: 50,
    complexity: COMPLEXITY_LEVELS.LOW,
    fallbackAgents: [],
    state: AGENT_STATES.ACTIVE,
    source: 'built-in',
    version: '1.0.0',
    tags: ['core', 'documentation']
  },
  {
    name: 'installer-manager',
    displayName: '安装与升级管理',
    description: '安装、更新、升级、卸载 Auto WMS 及其组件',
    capabilities: ['install', 'update', 'upgrade', 'uninstall', 'maintenance'],
    triggerKeywords: [
      'install',
      '安装',
      'update',
      '更新',
      'upgrade',
      '升级',
      'uninstall',
      '卸载',
      'auto-wms',
      '组件'
    ],
    priority: 88,
    complexity: COMPLEXITY_LEVELS.LOW,
    fallbackAgents: ['quest-designer'],
    state: AGENT_STATES.ACTIVE,
    source: 'built-in',
    version: '1.0.0',
    tags: ['core', 'maintenance']
  },
  {
    name: 'quest-designer',
    displayName: '闯关大纲设计师 v4',
    description: '完整代码输出的闯关式开发规划',
    capabilities: ['quest', 'planning', 'code-generation', 'step-by-step'],
    triggerKeywords: ['quest', '闯关', '大纲', '蓝图', 'blueprint', 'quest-map'],
    priority: 82,
    complexity: COMPLEXITY_LEVELS.HIGH,
    fallbackAgents: ['architect'],
    state: AGENT_STATES.ACTIVE,
    source: 'built-in',
    version: '4.0.0',
    tags: ['core', 'planning']
  }
];

export class AgentRegistry {
  /**
   * @param {string} [projectDir] - 项目根目录
   * @param {Object} [options] - 配置选项
   * @param {boolean} [options.enableHealthCheck] - 启用健康检查（默认 false）
   * @param {number} [options.healthCheckInterval] - 健康检查间隔（默认 60000ms）
   */
  constructor(projectDir, options = {}) {
    this.projectDir = projectDir || process.cwd();
    this.agents = new Map();
    this.logger = logger;
    this._enableHealthCheck = options.enableHealthCheck ?? false;
    this._healthCheckInterval = options.healthCheckInterval ?? 60000;
    this._healthCheckTimer = null;
    this._agentHealth = new Map(); // Agent 健康状态
  }

  /**
   * 初始化注册表（加载内置 + 自定义 Agent）
   * @returns {Promise<number>} 注册的 Agent 数量
   */
  async initialize() {
    // 加载内置 Agent（按依赖顺序）
    const sortedBuiltIn = this._sortByDependencies(BUILT_IN_AGENTS);
    for (const manifest of sortedBuiltIn) {
      this.agents.set(manifest.name, { ...manifest });
      this._agentHealth.set(manifest.name, { status: 'healthy', lastCheck: Date.now() });
    }

    // 加载自定义 Agent（从项目 .claude/agents/ 目录）
    await this._loadCustomAgents();

    // 启动健康检查（如果启用）
    if (this._enableHealthCheck) {
      this._startHealthCheck();
    }

    this.logger.info(`Agent 注册表初始化完成：${this.agents.size} 个 Agent`);
    return this.agents.size;
  }

  /**
   * 按依赖顺序排序 Agent
   * @param {Array} agents - Agent 列表
   * @returns {Array} 排序后的列表
   * @private
   */
  _sortByDependencies(agents) {
    const agentMap = new Map(agents.map((a) => [a.name, a]));
    const visited = new Set();
    const sorted = [];

    const visit = (agent) => {
      if (visited.has(agent.name)) return;
      visited.add(agent.name);

      // 先访问依赖的 Agent
      if (agent.dependencies) {
        for (const dep of agent.dependencies) {
          const depAgent = agentMap.get(dep);
          if (depAgent) visit(depAgent);
        }
      }

      sorted.push(agent);
    };

    for (const agent of agents) {
      visit(agent);
    }

    return sorted;
  }

  /**
   * 启动健康检查
   * @private
   */
  _startHealthCheck() {
    if (this._healthCheckTimer) return;

    this._healthCheckTimer = setInterval(async () => {
      await this._performHealthCheck();
    }, this._healthCheckInterval);

    this.logger.debug('Agent 健康检查已启动');
  }

  /**
   * 执行健康检查
   * @private
   */
  async _performHealthCheck() {
    for (const [name, agent] of this.agents) {
      if (agent.source === 'built-in') {
        // 内置 Agent 默认健康
        this._agentHealth.set(name, { status: 'healthy', lastCheck: Date.now() });
        continue;
      }

      // 自定义 Agent 检查文件是否存在
      if (agent.filePath) {
        const exists = await fs.pathExists(agent.filePath);
        this._agentHealth.set(name, {
          status: exists ? 'healthy' : 'unhealthy',
          lastCheck: Date.now()
        });
      }
    }
  }

  /**
   * 获取 Agent 健康状态
   * @param {string} name - Agent 名称
   * @returns {Object|null} 健康状态
   */
  getHealth(name) {
    return this._agentHealth.get(name) || null;
  }

  /**
   * 获取所有 Agent 健康状态
   * @returns {Map<string, Object>}
   */
  getAllHealth() {
    return new Map(this._agentHealth);
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck() {
    if (this._healthCheckTimer) {
      clearInterval(this._healthCheckTimer);
      this._healthCheckTimer = null;
      this.logger.debug('Agent 健康检查已停止');
    }
  }

  /**
   * 动态注册 Agent（支持依赖校验）
   * @param {import('./agent-types.js').AgentManifest} manifest
   * @param {Object} [options]
   * @param {boolean} [options.skipDependencyCheck] - 跳过依赖检查
   * @returns {boolean}
   */
  registerAgent(manifest, options = {}) {
    if (!manifest.name || !manifest.triggerKeywords || !manifest.capabilities) {
      this.logger.error('Agent 清单必须包含 name, triggerKeywords, capabilities');
      return false;
    }

    // 依赖检查
    if (!options.skipDependencyCheck && manifest.dependencies) {
      for (const dep of manifest.dependencies) {
        if (!this.agents.has(dep)) {
          this.logger.error(`Agent "${manifest.name}" 依赖 "${dep}" 但未注册`);
          return false;
        }
      }
    }

    if (this.agents.has(manifest.name)) {
      this.logger.warn(`Agent "${manifest.name}" 已存在，将被覆盖`);
    }

    this.agents.set(manifest.name, {
      ...manifest,
      source: manifest.source || 'dynamic',
      state: manifest.state || AGENT_STATES.ACTIVE,
      registeredAt: Date.now()
    });

    this._agentHealth.set(manifest.name, { status: 'healthy', lastCheck: Date.now() });

    this.logger.info(`Agent 已动态注册: ${manifest.name}`);
    return true;
  }

  /**
   * 获取所有已注册的 Agent 清单
   * @param {Object} [filters] - 过滤条件
   * @param {string} [filters.state] - 按状态过滤
   * @param {string} [filters.complexity] - 按复杂度过滤
   * @param {string[]} [filters.capabilities] - 按能力过滤（任一匹配）
   * @returns {import('./agent-types.js').AgentManifest[]}
   */
  listAgents(filters = {}) {
    let results = Array.from(this.agents.values());

    if (filters.state) {
      results = results.filter((a) => a.state === filters.state);
    }

    if (filters.complexity) {
      results = results.filter((a) => a.complexity === filters.complexity);
    }

    if (filters.capabilities && filters.capabilities.length > 0) {
      results = results.filter((a) =>
        filters.capabilities.some((cap) => a.capabilities.includes(cap))
      );
    }

    return results.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 获取单个 Agent 清单
   * @param {string} name - Agent 名称
   * @returns {import('./agent-types.js').AgentManifest|null}
   */
  getAgent(name) {
    return this.agents.get(name) || null;
  }

  /**
   * 注销 Agent
   * @param {string} name - Agent 名称
   * @param {Object} [options]
   * @param {boolean} [options.force] - 强制注销（包括内置 Agent）
   * @param {boolean} [options.cascade] - 级联注销依赖此 Agent 的 Agent
   * @returns {boolean}
   */
  unregisterAgent(name, options = {}) {
    if (!this.agents.has(name)) {
      this.logger.warn(`Agent "${name}" 不存在`);
      return false;
    }

    const agent = this.agents.get(name);
    if (agent.source === 'built-in' && !options.force) {
      this.logger.warn(`无法注销内置 Agent: ${name}，使用 force 选项强制注销`);
      return false;
    }

    // 检查是否有其他 Agent 依赖此 Agent
    if (!options.cascade) {
      for (const [, otherAgent] of this.agents) {
        if (otherAgent.dependencies?.includes(name)) {
          this.logger.warn(
            `Agent "${otherAgent.name}" 依赖 "${name}"，请先注销依赖者或使用 cascade`
          );
          return false;
        }
      }
    } else {
      // 级联注销依赖者
      const toRemove = [name];
      let changed = true;
      while (changed) {
        changed = false;
        for (const [otherName, otherAgent] of this.agents) {
          if (!toRemove.includes(otherName) && otherAgent.dependencies?.includes(name)) {
            toRemove.push(otherName);
            name = otherName;
            changed = true;
          }
        }
      }
      for (const n of toRemove) {
        this.agents.delete(n);
        this._agentHealth.delete(n);
        this.logger.info(`Agent 已级联注销: ${n}`);
      }
      return true;
    }

    this.agents.delete(name);
    this._agentHealth.delete(name);
    this.logger.info(`Agent 已注销: ${name}`);
    return true;
  }

  /**
   * 按关键词查找候选 Agent
   * @param {string[]} keywords - 关键词列表
   * @returns {Array<{agent: import('./agent-types.js').AgentManifest, score: number, matchedKeywords: string[]}>}
   */
  findCandidates(keywords) {
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    const candidates = [];

    for (const agent of this.agents.values()) {
      if (agent.state !== AGENT_STATES.ACTIVE) {
        continue;
      }

      const matchedKeywords = agent.triggerKeywords.filter((trigger) =>
        lowerKeywords.some(
          (kw) => kw.includes(trigger.toLowerCase()) || trigger.toLowerCase().includes(kw)
        )
      );

      if (matchedKeywords.length > 0) {
        // 评分：匹配关键词数 * 10 + Agent 优先级
        const score = matchedKeywords.length * 10 + agent.priority;
        candidates.push({ agent, score, matchedKeywords });
      }
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * 获取 Agent 的回退链
   * @param {string} agentName - Agent 名称
   * @returns {import('./agent-types.js').AgentManifest[]}
   */
  getFallbackChain(agentName) {
    const agent = this.agents.get(agentName);
    if (!agent || !agent.fallbackAgents || agent.fallbackAgents.length === 0) {
      return [];
    }

    return agent.fallbackAgents
      .map((name) => this.agents.get(name))
      .filter((a) => a && a.state === AGENT_STATES.ACTIVE);
  }

  /**
   * 获取统计信息
   * @returns {Object}
   */
  getStats() {
    const all = Array.from(this.agents.values());
    const byComplexity = { low: 0, medium: 0, high: 0 };
    const bySource = {};

    for (const agent of all) {
      byComplexity[agent.complexity] = (byComplexity[agent.complexity] || 0) + 1;
      bySource[agent.source] = (bySource[agent.source] || 0) + 1;
    }

    return {
      total: all.length,
      active: all.filter((a) => a.state === AGENT_STATES.ACTIVE).length,
      byComplexity,
      bySource
    };
  }

  /**
   * 加载自定义 Agent
   * @private
   */
  async _loadCustomAgents() {
    const agentsDir = path.join(this.projectDir, AGENTS_DIR_NAME);

    if (!(await fs.pathExists(agentsDir))) {
      return;
    }

    try {
      const files = await fs.readdir(agentsDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const filePath = path.join(agentsDir, file);
        const name = path.basename(file, '.md');

        if (!SAFE_AGENT_NAME_REGEX.test(name)) {
          this.logger.warn(`跳过非法 Agent 文件名: ${file}`);
          continue;
        }

        const manifest = await this._parseAgentFile(filePath, name);
        if (!manifest) {
          continue;
        }

        if (this.agents.has(name)) {
          const existing = this.agents.get(name);
          existing.filePath = filePath;
          continue;
        }

        this.agents.set(name, manifest);
      }
    } catch (error) {
      this.logger.warn(`加载自定义 Agent 失败: ${error.message}`);
    }
  }

  /**
   * 解析 Agent .md 文件，提取清单
   * @param {string} filePath
   * @param {string} name
   * @returns {Promise<import('./agent-types.js').AgentManifest|null>}
   * @private
   */
  async _parseAgentFile(filePath, name) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const frontmatter = this._parseFrontmatter(content);

      if (!frontmatter) {
        this.logger.debug(`跳过未声明清单的 Agent 文件: ${filePath}`);
        return null;
      }

      if (frontmatter.name !== name) {
        this.logger.warn(`Agent 文件名与清单名称不一致: ${filePath}`);
        return null;
      }

      const title = this._extractHeading(content) || frontmatter.name;

      return {
        name: frontmatter.name,
        displayName: title,
        description: frontmatter.description || title,
        capabilities: frontmatter.tools,
        triggerKeywords: [frontmatter.name, ...frontmatter.tags],
        priority: 50,
        complexity: COMPLEXITY_LEVELS.MEDIUM,
        fallbackAgents: [],
        state: AGENT_STATES.ACTIVE,
        source: 'custom',
        version: '1.0.0',
        filePath,
        tags: frontmatter.tags
      };
    } catch (error) {
      this.logger.warn(`解析 Agent 文件失败 ${filePath}: ${error.message}`);
      return null;
    }
  }

  _parseFrontmatter(content) {
    const match = content.match(FRONTMATTER_REGEX);
    if (!match?.[1]) {
      return null;
    }

    const frontmatter = match[1];
    const name = this._extractFrontmatterScalar(frontmatter, 'name');
    if (!name || !SAFE_AGENT_NAME_REGEX.test(name)) {
      return null;
    }

    return {
      name,
      description: this._extractFrontmatterScalar(frontmatter, 'description'),
      tools: this._extractFrontmatterList(frontmatter, 'tools'),
      tags: this._extractFrontmatterList(frontmatter, 'tags')
    };
  }

  _extractFrontmatterScalar(frontmatter, key) {
    return frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
  }

  _extractFrontmatterList(frontmatter, key) {
    const inline = frontmatter.match(new RegExp(`^${key}:\\s*\\[(.+)\\]$`, 'm'))?.[1];
    if (inline) {
      return inline
        .split(',')
        .map((item) => item.trim().replace(/['"]/g, ''))
        .filter(Boolean);
    }

    const scalar = this._extractFrontmatterScalar(frontmatter, key);
    if (!scalar) {
      return [];
    }

    return scalar
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  _extractHeading(content) {
    return content
      .split('\n')
      .find((line) => line.trim().startsWith('#'))
      ?.replace(/^#+\s*/, '')
      .trim();
  }
}

export default AgentRegistry;
