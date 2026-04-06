import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import * as childProcess from 'child_process';
import { fileURLToPath } from 'url';

/**
 * @typedef {Object} ComponentConfig
 * @property {string} name - 组件名称
 * @property {string} description - 组件描述
 * @property {string} source - 源目录
 * @property {string} target - 目标目录
 * @property {string} pattern - 文件匹配模式
 * @property {boolean} [recursive] - 是否递归
 */

/**
 * @typedef {Object} ContextCompressionOptions
 * @property {number} [threshold] - 触发压缩的阈值（默认 30）
 * @property {number} [maxEntries] - 压缩后保留的最大条目数（默认 10）
 */

/**
 * @typedef {Object} ContextCompressionResult
 * @property {boolean} compressed - 是否执行了压缩
 * @property {string} summary - 压缩摘要
 * @property {number} keptCount - 保留的消息数量
 * @property {number} removedCount - 移除的消息数量
 * @property {Object[]} [keptMessages] - 保留的消息列表
 */

/**
 * @typedef {Object} Message
 * @property {string} role - 角色（user/assistant/system）
 * @property {string} content - 消息内容
 */

/**
 * 获取 Claude 配置目录路径
 * @returns {string} Claude 配置目录的绝对路径
 */
export function getClaudeDir() {
  return path.join(os.homedir(), '.claude');
}

/**
 * 获取 Auto WMS 官方文件目录（更新时会覆盖）
 * @returns {string} Auto WMS 官方文件目录的绝对路径
 */
export function getAutoDir() {
  return path.join(getClaudeDir(), 'auto');
}

/**
 * 获取用户自定义目录（永不覆盖）
 * @returns {string} 用户自定义目录的绝对路径
 */
export function getCustomDir() {
  return path.join(getClaudeDir(), 'custom');
}

/**
 * 获取版本文件路径
 * @returns {string} 版本文件的绝对路径
 */
export function getVersionFilePath() {
  return path.join(getClaudeDir(), '.auto-version');
}

/**
 * 获取已安装的版本信息
 * @returns {Promise<{version: string, components: string[], installedFiles: string[], installedAt: string}|null>} 版本信息对象，如果不存在则返回 null
 */
export async function getInstalledVersion() {
  const versionFile = getVersionFilePath();
  try {
    if (await fs.pathExists(versionFile)) {
      const content = await fs.readFile(versionFile, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // 文件不存在或损坏，返回 null
    // 这不是致命错误，可能是首次安装
  }
  return null;
}

/**
 * 保存已安装版本信息
 * @param {string} version - 版本号
 * @param {string[]} components - 组件列表
 * @param {string[]} [installedFiles=[]] - 安装的文件列表（绝对路径）
 * @returns {Promise<void>}
 */
export async function saveInstalledVersion(version, components, installedFiles = []) {
  const versionFile = getVersionFilePath();
  await fs.writeJson(
    versionFile,
    {
      version,
      components,
      installedFiles,
      installedAt: new Date().toISOString()
    },
    { spaces: 2 }
  );
}

/**
 * 获取包版本
 * @returns {string} 当前包的版本号
 */
export function getPackageVersion() {
  const pkgPath = path.join(getSourceDir(), 'package.json');
  const pkg = fs.readJsonSync(pkgPath);
  return pkg.version;
}

/**
 * 组件定义
 * @type {{agents: ComponentConfig, rules: ComponentConfig, commands: ComponentConfig, skills: ComponentConfig, hooks: ComponentConfig}}
 */
export const COMPONENTS = {
  agents: {
    name: 'Agents（代理）',
    description: '专用子代理（planner, architect, tdd-guide 等）',
    source: 'agents',
    target: 'agents',
    pattern: '*.md'
  },
  rules: {
    name: 'Rules（规则）',
    description: '必须遵循的准则（security, testing, coding-style 等）',
    source: 'rules',
    target: 'rules',
    pattern: '*.md'
  },
  commands: {
    name: 'wms 斜杠指令',
    description: '斜杠命令（/wms:auto, /wms:route, /wms:doctor 等）',
    source: 'commands/wms',
    target: 'commands/wms',
    pattern: '*.md'
  },
  skills: {
    name: 'Skills（技能）',
    description: '工作流定义和领域知识',
    source: 'skills',
    target: 'skills',
    pattern: '**/*',
    recursive: true
  },
  hooks: {
    name: 'Hooks（自动化门禁）',
    description: 'PreToolUse/PostToolUse/Stop 等 Hook 模板配置',
    source: 'hooks',
    target: 'hooks',
    pattern: '*.json'
  }
};

/**
 * 获取源目录（包安装的位置）
 * @returns {string} 源目录的绝对路径
 */
export function getSourceDir() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.dirname(__dirname);
}

/**
 * 上下文压缩策略配置
 * @readonly
 * @type {{MESSAGE_THRESHOLD: number, MAX_COMPRESSED_ENTRIES: number, KEY_INDICATORS: string[], DECISION_PATTERNS: string[]}}
 */
export const CONTEXT_COMPRESSION = Object.freeze({
  // 触发压缩的阈值（消息数量）
  MESSAGE_THRESHOLD: 30,
  // 压缩后保留的最大条目数
  MAX_COMPRESSED_ENTRIES: 10,
  // 关键信息提取关键词
  KEY_INDICATORS: [
    'TODO',
    'FIXME',
    'HACK',
    'NOTE',
    'IMPORTANT',
    '决定',
    '决策',
    '选择',
    '原因',
    '理由',
    '问题',
    '错误',
    '修复',
    'fix',
    'bug',
    '架构',
    '设计',
    '方案',
    'approach'
  ],
  // 决策点模式（必须保留）
  DECISION_PATTERNS: [
    /^.*(?:决定|决策|选择|方案|plan|decide|decision).*$/i,
    /^.*(?:同意|批准|确认|confirm|approve).*$/i,
    /^.*(?:拒绝|否决|reject|cancel).*$/i,
    /^.*(?:继续|开始|执行|proceed|execute).*$/i
  ],
  // 任务上下文标记
  TASK_MARKERS: [
    { pattern: /^.*(?:Quest|Task|TODO).*\d+.*$/, weight: 2 },
    { pattern: /^.*(?:完成|完成|finish|complete).*$/, weight: 1.5 }
  ]
});

/**
 * 计算 TF-IDF 权重
 * @param {string[]} terms - 词项数组
 * @param {string[]} documents - 文档数组
 * @returns {Map<string, number>} 词项权重
 * @private
 */
function computeTfIdf(terms, documents) {
  const tf = new Map();
  const df = new Map();

  // 计算 TF
  for (const term of terms) {
    tf.set(term, (tf.get(term) || 0) + 1);
  }

  // 计算 DF
  for (const doc of documents) {
    const uniqueTerms = new Set(doc.toLowerCase().split(/\s+/));
    for (const term of uniqueTerms) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  // 计算 TF-IDF
  const tfIdf = new Map();
  const N = documents.length;
  for (const [term, tfVal] of tf) {
    const dfVal = df.get(term) || 1;
    tfIdf.set(term, (tfVal / terms.length) * Math.log(N / dfVal));
  }

  return tfIdf;
}

/**
 * 识别决策点
 * @param {string} content - 消息内容
 * @returns {boolean}
 * @private
 */
function isDecisionPoint(content) {
  return CONTEXT_COMPRESSION.DECISION_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * 计算消息重要性分数
 * @param {Message} msg - 消息
 * @param {number} index - 消息索引
 * @param {number} total - 总消息数
 * @param {Map<string, number>} tfIdf - TF-IDF 权重
 * @returns {number}
 * @private
 */
function computeMessageScore(msg, index, total, tfIdf) {
  const content = msg.content || '';
  let score = 0;

  // 1. 位置权重：越接近当前越重要
  const recencyWeight = index / total;
  score += recencyWeight * 30;

  // 2. 关键信息匹配
  const keyMatches = CONTEXT_COMPRESSION.KEY_INDICATORS.filter((k) => content.includes(k)).length;
  score += Math.min(keyMatches * 15, 45);

  // 3. 决策点权重
  if (isDecisionPoint(content)) {
    score += 40;
  }

  // 4. TF-IDF 权重
  const terms = content.toLowerCase().split(/\s+/);
  let termScore = 0;
  for (const term of terms) {
    termScore += tfIdf.get(term) || 0;
  }
  score += Math.min(termScore * 10, 25);

  // 5. 任务标记权重
  for (const marker of CONTEXT_COMPRESSION.TASK_MARKERS) {
    if (marker.pattern.test(content)) {
      score += marker.weight * 10;
    }
  }

  return score;
}

/**
 * 压缩对话上下文，保留关键信息
 *
 * 灵感来源：
 * - Builder.io #38 "Compress Context Window"
 * - DataCamp "Smart Context Window Management"
 *
 * @param {Message[]} messages - 对话消息列表
 * @param {ContextCompressionOptions} [options={}] - 压缩选项
 * @returns {ContextCompressionResult} 压缩结果
 */
export function compressContext(messages, options = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { compressed: false, summary: '', keptCount: 0, removedCount: 0 };
  }

  const threshold = options.threshold ?? CONTEXT_COMPRESSION.MESSAGE_THRESHOLD;
  const maxEntries = options.maxEntries ?? CONTEXT_COMPRESSION.MAX_COMPRESSED_ENTRIES;

  // 不需要压缩
  if (messages.length < threshold) {
    return {
      compressed: false,
      summary: '',
      keptCount: messages.length,
      removedCount: 0
    };
  }

  // 计算 TF-IDF
  const documents = messages.map((m) => m.content || '');
  const allTerms = documents
    .join(' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  const tfIdf = computeTfIdf(allTerms, documents);

  // 计算每条消息的分数
  const scoredMessages = messages.map((msg, index) => ({
    msg,
    index,
    score: computeMessageScore(msg, index, messages.length, tfIdf)
  }));

  // 按分数排序
  scoredMessages.sort((a, b) => b.score - a.score);

  // 保留决策点（优先保留）
  const decisionMessages = messages
    .map((msg, index) => ({ msg, index }))
    .filter(({ msg }) => isDecisionPoint(msg.content || ''));

  // 构建最终保留列表（决策点 + 高分消息 + 最近消息）
  const decisionIndices = new Set(decisionMessages.map((d) => d.index));
  const recentIndices = new Set(
    messages
      .slice(-Math.floor(maxEntries / 2))
      .map((_, i) => messages.length - Math.floor(maxEntries / 2) + i)
  );
  const topScoredIndices = new Set(
    scoredMessages.slice(0, Math.floor(maxEntries / 2)).map((s) => s.index)
  );

  const keptIndices = new Set([...decisionIndices, ...recentIndices, ...topScoredIndices]);

  // 确保不超过最大条目数
  const kept = messages.filter((_, index) => keptIndices.has(index)).slice(0, maxEntries);
  const removedCount = messages.length - kept.length;

  // 生成压缩摘要
  const summaryParts = [
    `[上下文压缩] 原始消息: ${messages.length} 条 -> 保留: ${kept.length} 条`,
    `[上下文压缩] 压缩原因: 消息数 (${messages.length}) 超过阈值 (${threshold})`,
    `[上下文压缩] 保留策略: 决策点(${decisionIndices.size}) + 高分(${topScoredIndices.size}) + 最近(${recentIndices.size})`
  ];

  // 提取被移除消息中的关键信息摘要
  const removedMessages = messages.filter((_, i) => !keptIndices.has(i));
  const removedKeyInfo = removedMessages
    .filter((msg) => {
      const content = msg.content || '';
      return (
        CONTEXT_COMPRESSION.KEY_INDICATORS.some((i) => content.includes(i)) ||
        isDecisionPoint(content)
      );
    })
    .map((msg) => {
      const content = msg.content || '';
      return content.length > 150 ? content.slice(0, 150) + '...' : content;
    });

  if (removedKeyInfo.length > 0) {
    summaryParts.push(`[上下文压缩] 被移除的关键信息 (前5条):`);
    for (const info of removedKeyInfo.slice(0, 5)) {
      summaryParts.push(`  - ${info}`);
    }
  }

  return {
    compressed: true,
    summary: summaryParts.join('\n'),
    keptCount: kept.length,
    removedCount,
    keptMessages: kept,
    stats: {
      decisionPoints: decisionIndices.size,
      highScore: topScoredIndices.size,
      recent: recentIndices.size
    }
  };
}

/**
 * 跨平台打开浏览器
 * @param {string} url - 要打开的 URL
 * @returns {Promise<boolean>} 是否成功打开
 */
export async function openBrowser(url) {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return false;
  }

  const targetUrl = parsedUrl.toString();
  const platform = process.platform;
  let command;
  let args;

  if (platform === 'darwin') {
    command = 'open';
    args = [targetUrl];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', targetUrl];
  } else {
    command = 'xdg-open';
    args = [targetUrl];
  }

  return new Promise((resolve) => {
    childProcess.execFile(command, args, (error) => {
      resolve(!error);
    });
  });
}
