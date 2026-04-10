/**
 * 知识管家 - 一句话保存灵感、踩坑经验、架构决策
 *
 * 核心功能：
 * - 智能分类：根据内容关键词自动路由到对应知识文件
 * - Markdown 追加：以结构化格式追加到对应 .md 文件
 * - 可选 Git 提交：显式开启后自动 git commit
 */
import path from 'path';
import fs from 'fs-extra';
import { execSync } from 'child_process';
import { logger } from '../logger.js';
import { classifyContent, CATEGORIES, getCategoryByName } from './categories.js';

async function loadCategoryFiles(insightsDir, categories = CATEGORIES) {
  return Promise.all(
    categories.map(async (category) => {
      const filePath = path.join(insightsDir, category.file);
      return {
        category,
        filePath,
        content: await fs.readFile(filePath, 'utf-8')
      };
    })
  );
}

function parseKnowledgeEntries(content) {
  const lines = String(content || '').split(/\r?\n/);
  const blocks = [];
  let current = [];
  let inEntry = false;

  for (const line of lines) {
    if (!inEntry) {
      if (line.startsWith('### ')) {
        inEntry = true;
        current = [line];
      }
      continue;
    }

    if (line.trim() === '---') {
      blocks.push(current.join('\n').trim());
      current = [];
      inEntry = false;
      continue;
    }

    current.push(line);
  }

  if (inEntry && current.length > 0) {
    blocks.push(current.join('\n').trim());
  }

  return blocks.filter(Boolean);
}

/**
 * @typedef {Object} SaveOptions
 * @property {string} content - 要保存的内容
 * @property {string} [category] - 指定分类（可选，自动推断时忽略）
 * @property {string[]} [tags] - 标签列表
 * @property {boolean} [gitCommit=false] - 是否自动 git commit
 * @property {string} [projectDir] - 项目根目录（默认 process.cwd()）
 */

/**
 * @typedef {Object} SaveResult
 * @property {boolean} success - 是否成功
 * @property {string} filePath - 写入的文件路径
 * @property {string} categoryName - 分类名称
 * @property {string} [gitHash] - Git commit hash（如果提交了）
 * @property {string} [error] - 错误信息（如果失败）
 */

class KnowledgeSteward {
  /**
   * @param {string} [projectDir] - 项目根目录
   * @param {Object} [options] - 配置选项
   * @param {boolean} [options.enableIndex] - 启用搜索索引（默认 true）
   */
  constructor(projectDir, options = {}) {
    this.projectDir = projectDir || process.cwd();
    this.insightsDir = path.join(this.projectDir, '.auto', 'insights');
    this._enableIndex = options.enableIndex ?? true;
    this._index = null; // 搜索索引缓存
    this._indexTimestamp = 0;
    this._indexTTL = 5 * 60 * 1000; // 索引 TTL: 5 分钟
    this._indexPromise = null;
    this.logger = logger;
  }

  /**
   * 确保知识目录结构存在
   * @returns {Promise<string>} insights 目录路径
   */
  async ensureStructure() {
    await fs.ensureDir(this.insightsDir);

    // 为每个分类创建空文件（如果不存在）
    for (const cat of CATEGORIES) {
      const filePath = path.join(this.insightsDir, cat.file);
      if (!(await fs.pathExists(filePath))) {
        const header = this._buildFileHeader(cat);
        await fs.writeFile(filePath, header, 'utf-8');
      }
    }

    return this.insightsDir;
  }

  /**
   * 构建或获取搜索索引
   * @returns {Promise<Object>} 索引对象
   * @private
   */
  async _getIndex() {
    if (!this._enableIndex) return null;

    const now = Date.now();
    if (this._index && now - this._indexTimestamp < this._indexTTL) {
      return this._index;
    }

    if (this._indexPromise) {
      return this._indexPromise;
    }

    this._indexPromise = (async () => {
      try {
        await this.ensureStructure();
        const index = { entries: [], invertedIndex: new Map() };
        const categoryFiles = await loadCategoryFiles(this.insightsDir);

        for (const { category: cat, content } of categoryFiles) {
          for (const block of parseKnowledgeEntries(content)) {
            const lines = block.split('\n');
            const title = lines[0]?.trim() || '';
            const body = lines.slice(2).join('\n');

            // 提取标签
            const tagMatch = body.match(/\*\*标签\*\*:\s*(.+)/);
            const tags = tagMatch ? tagMatch[1].split(',').map((t) => t.trim()) : [];

            const entry = {
              id: `${cat.name}:${title}`,
              category: cat.name,
              title,
              body,
              tags,
              timestamp: now
            };

            index.entries.push(entry);

            // 构建倒排索引
            const words = `${title} ${body} ${tags.join(' ')}`.toLowerCase().split(/\s+/);
            for (const word of words) {
              if (word.length < 2) continue;
              if (!index.invertedIndex.has(word)) {
                index.invertedIndex.set(word, []);
              }
              index.invertedIndex.get(word).push(entry.id);
            }
          }
        }

        this._index = index;
        this._indexTimestamp = now;
        this.logger.debug(`知识索引已构建: ${index.entries.length} 条目`);

        return index;
      } finally {
        this._indexPromise = null;
      }
    })();

    return this._indexPromise;
  }

  /**
   * 使索引失效（内容变更后调用）
   */
  invalidateIndex() {
    this._index = null;
    this._indexTimestamp = 0;
  }

  /**
   * 保存知识条目
   * @param {SaveOptions} options
   * @returns {Promise<SaveResult>}
   */
  async save({ content, category, tags, gitCommit = false }) {
    if (!content || !content.trim()) {
      return {
        success: false,
        filePath: '',
        categoryName: '',
        error: '内容不能为空'
      };
    }

    try {
      // 确保目录存在
      await this.ensureStructure();

      // 分类
      const matchedCategory = classifyContent(content, category);

      // 格式化条目
      const entry = this._formatEntry(content.trim(), tags);

      // 追加到文件
      const filePath = path.join(this.insightsDir, matchedCategory.file);
      await fs.appendFile(filePath, '\n' + entry, 'utf-8');

      // 使索引失效
      this.invalidateIndex();

      logger.info(`知识已保存到 ${matchedCategory.file}`);

      // Git 提交
      let gitHash = '';
      if (gitCommit) {
        gitHash = await this._gitCommit(filePath, matchedCategory.name);
      }

      return {
        success: true,
        filePath,
        categoryName: matchedCategory.name,
        gitHash
      };
    } catch (error) {
      logger.error(`保存失败: ${error.message}`);
      return {
        success: false,
        filePath: '',
        categoryName: '',
        error: error.message
      };
    }
  }

  /**
   * 列出所有知识条目（简要统计）
   * @returns {Promise<Array<{category: string, file: string, count: number}>>}
   */
  async list() {
    await this.ensureStructure();
    const results = [];
    const categoryFiles = await loadCategoryFiles(this.insightsDir);

    for (const { category: cat, filePath, content } of categoryFiles) {
      const count = parseKnowledgeEntries(content).length;
      results.push({
        category: cat.name,
        file: path.basename(filePath),
        count,
        description: cat.description
      });
    }

    return results;
  }

  /**
   * 搜索知识条目
   * @param {string} query - 搜索关键词
   * @param {Object} [options] - 搜索选项
   * @param {boolean} [options.useIndex=true] - 使用索引加速
   * @param {string[]} [options.tags] - 按标签筛选
   * @param {string} [options.category] - 按分类筛选
   * @returns {Promise<Array<{category: string, matches: string[]}>>}
   */
  async search(query, options = {}) {
    const useIndex = options.useIndex ?? true;
    const { tags, category } = options;

    // 使用索引搜索
    if (useIndex && this._enableIndex) {
      const entries = await this._searchWithIndex(query, { tags, category });
      return this._groupSearchEntries(entries);
    }

    // 回退到原始搜索
    await this.ensureStructure();
    const lowerQuery = query.toLowerCase();
    const results = [];
    const categoryFiles = await loadCategoryFiles(this.insightsDir);

    for (const { category: cat, filePath, content } of categoryFiles) {
      if (category && cat.name !== category) continue;

      const matches = parseKnowledgeEntries(content)
        .filter((entry) => {
          const matchesQuery = !lowerQuery || entry.toLowerCase().includes(lowerQuery);
          if (!matchesQuery) {
            return false;
          }

          if (tags && tags.length > 0) {
            const tagMatch = entry.match(/\*\*标签\*\*:\s*(.+)/);
            const entryTags = tagMatch ? tagMatch[1].split(',').map((t) => t.trim()) : [];
            return tags.some((tag) => entryTags.includes(tag));
          }

          return true;
        })
        .map((entry) => '### ' + entry.trim());

      if (matches.length > 0) {
        results.push({
          category: cat.name,
          file: path.basename(filePath),
          matches
        });
      }
    }

    return results;
  }

  _groupSearchEntries(entries) {
    const grouped = new Map();

    for (const entry of entries) {
      const categoryInfo = getCategoryByName(entry.category);
      if (!grouped.has(entry.category)) {
        grouped.set(entry.category, {
          category: entry.category,
          file: categoryInfo?.file || '',
          matches: []
        });
      }

      grouped.get(entry.category).matches.push(this._formatIndexedEntryMatch(entry));
    }

    return Array.from(grouped.values());
  }

  _formatIndexedEntryMatch(entry) {
    const body = entry.body?.trim() || '';
    return ['### ' + entry.title, '', body].filter(Boolean).join('\n');
  }

  async _searchEntriesByTags(tags) {
    const tagList = Array.isArray(tags) ? tags : [tags];
    return this._searchWithIndex('', { tags: tagList });
  }

  async _searchGroupedByTags(tags) {
    const entries = await this._searchEntriesByTags(tags);
    return this._groupSearchEntries(entries);
  }

  async getEntriesByTags(tags) {
    return this._searchEntriesByTags(tags);
  }

  async searchEntries(query, options = {}) {
    const { tags, category } = options;
    if (this._enableIndex) {
      return this._searchWithIndex(query, { tags, category });
    }

    const grouped = await this.search(query, { ...options, useIndex: false });
    return grouped.flatMap((group) =>
      group.matches.map((match, index) => ({
        id: `${group.category}:${index}`,
        category: group.category,
        title: match.split('\n')[0].replace(/^###\s+/, ''),
        body: match,
        tags: [],
        timestamp: Date.now()
      }))
    );
  }

  async searchByTagsGrouped(tags) {
    return this._searchGroupedByTags(tags);
  }

  /**
   * 按标签搜索知识条目
   * @param {string|string[]} tags - 标签或标签列表
   * @returns {Promise<Array>}
   */
  async searchByTags(tags) {
    return this._searchEntriesByTags(tags);
  }

  /**
   * 使用索引搜索
   * @param {string} query - 搜索关键词
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>}
   * @private
   */
  async _searchWithIndex(query, filters) {
    const index = await this._getIndex();
    if (!index) return [];

    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length >= 2);

    // 收集匹配的条目 ID
    const matchedIds = new Set();
    for (const word of queryWords) {
      const ids = index.invertedIndex.get(word) || [];
      ids.forEach((id) => matchedIds.add(id));
    }

    const hasQuery = queryWords.length > 0;

    // 过滤并返回结果
    const matchedEntries = index.entries.filter((entry) => {
      if (hasQuery && !matchedIds.has(entry.id)) return false;
      if (filters.category && entry.category !== filters.category) return false;
      if (filters.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some((t) => entry.tags.includes(t));
        if (!hasTag) return false;
      }
      return true;
    });

    // 按相关性排序（标题匹配优先）
    return matchedEntries.sort((a, b) => {
      const aTitle = hasQuery && a.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
      const bTitle = hasQuery && b.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
      return bTitle - aTitle;
    });
  }

  /**
   * 获取知识关联推荐
   * @param {string} entryId - 基准条目 ID
   * @param {number} [limit=5] - 返回数量
   * @returns {Promise<Array>} 推荐的条目
   */
  async getRelated(entryId, limit = 5) {
    const index = await this._getIndex();
    if (!index) return [];

    const entry = index.entries.find((e) => e.id === entryId);
    if (!entry) return [];

    // 计算共现词
    const entryWords = new Set(
      `${entry.title} ${entry.body}`
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 2)
    );

    // 找出共享词汇最多的条目
    const scores = [];
    for (const other of index.entries) {
      if (other.id === entryId) continue;

      const otherWords = new Set(
        `${other.title} ${other.body}`
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 2)
      );

      // Jaccard 相似度
      const intersection = [...entryWords].filter((w) => otherWords.has(w)).length;
      const union = new Set([...entryWords, ...otherWords]).size;
      const similarity = union > 0 ? intersection / union : 0;

      if (similarity > 0.1) {
        scores.push({ entry: other, similarity });
      }
    }

    return scores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((s) => ({ ...s.entry, similarity: s.similarity }));
  }

  /**
   * 构建 Markdown 文件头
   * @param {import('./categories.js').Category} category
   * @returns {string}
   * @private
   */
  _buildFileHeader(category) {
    return `# ${category.description}\n\n> 由 knowledge-steward 自动维护\n\n`;
  }

  /**
   * 格式化单个知识条目
   * @param {string} content
   * @param {string[]} [tags]
   * @returns {string}
   * @private
   */
  _formatEntry(content, tags) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString().slice(11, 19);

    // 提取第一行作为标题（截取前 50 字符）
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '');
    const title = firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine;

    const tagStr = tags && tags.length > 0 ? `\n**标签**: ${tags.join(', ')}` : '';

    return [
      `### ${title}`,
      '',
      `**日期**: ${dateStr} ${timeStr}${tagStr}`,
      '',
      content,
      '',
      '---',
      ''
    ].join('\n');
  }

  /**
   * 执行 git commit
   * @param {string} filePath - 要提交的文件路径
   * @param {string} categoryName - 分类名称（用于 commit message）
   * @returns {Promise<string>} commit hash
   * @private
   */
  async _gitCommit(filePath, categoryName) {
    try {
      const relativePath = path.relative(this.projectDir, filePath);

      // 检查是否在 git 仓库中
      try {
        execSync('git rev-parse --is-inside-work-tree', {
          cwd: this.projectDir,
          stdio: 'pipe'
        });
      } catch {
        logger.debug('不在 git 仓库中，跳过自动提交');
        return '';
      }

      // git add
      execSync(`git add "${relativePath}"`, {
        cwd: this.projectDir,
        stdio: 'pipe'
      });

      // 提取简短主题（取内容第一行前 30 字符）
      const topic = categoryName || 'insight';

      // git commit
      execSync(`git commit -m "docs: save ${topic} insight [knowledge-steward]"`, {
        cwd: this.projectDir,
        stdio: 'pipe'
      });

      // 获取 commit hash
      const hash = execSync('git rev-parse --short HEAD', {
        cwd: this.projectDir,
        encoding: 'utf-8'
      }).trim();

      logger.info(`Git 提交成功: ${hash}`);
      return hash;
    } catch (error) {
      logger.warn(`Git 提交跳过: ${error.message}`);
      return '';
    }
  }
}

export { KnowledgeSteward };
export default KnowledgeSteward;
