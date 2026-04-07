/**
 * Canonical Router（权威路由器）
 *
 * 核心原则（来自 Vibe-Skills 分析）：
 * - 单一真相源：所有路由决策必须经过这里
 * - 技能隔离：Agent 之间不能直接调用，只能由 Router 调度
 * - 优先级明确：每个 Agent 有明确的触发条件和优先级
 * - 完整回退链：主 Agent 失败 -> 备用 Agent -> 降级处理
 *
 * 路由决策流程：
 * 1. 意图识别（提取关键词 + 复杂度评估）
 * 2. 候选匹配（基于关键词 + 能力 + 优先级）
 * 3. 冲突解决（多个候选时选最优）
 * 4. 执行 + 回退处理
 */
import { logger } from '../logger.js';
import { COMPLEXITY_LEVELS, AGENT_STATES } from './agent-types.js';
import { AgentRegistry } from './agent-registry.js';
import { WmsIntentMatcher } from '../wms/wms-intent-matcher.js';

/**
 * 默认 Agent（无匹配时的兜底）
 */
const DEFAULT_AGENT = {
  name: 'quest-designer',
  reason: '无精确匹配，回退到闯关设计 Agent'
};

const DEFAULT_HIT_RATE = 0.5;

/**
 * 复杂度评估关键词
 */
const COMPLEXITY_INDICATORS = {
  [COMPLEXITY_LEVELS.HIGH]: [
    '重构',
    '架构',
    '系统',
    '迁移',
    '全面',
    'redesign',
    'refactor',
    'microservice',
    '微服务',
    '分布式',
    '整体',
    '批量'
  ],
  [COMPLEXITY_LEVELS.MEDIUM]: [
    '功能',
    '实现',
    '开发',
    '新增',
    '修改',
    'feature',
    'implement',
    '集成',
    '优化',
    'fix',
    '修复'
  ],
  [COMPLEXITY_LEVELS.LOW]: [
    '格式化',
    '格式',
    'rename',
    '重命名',
    '文档',
    '注释',
    '格式',
    'format',
    'lint',
    '简单',
    '快速'
  ]
};

/**
 * 安全敏感关键词（安全相关意图自动提升优先级）
 */
const SECURITY_KEYWORDS = [
  '密码',
  'password',
  '密钥',
  'secret',
  'token',
  '认证',
  'auth',
  '授权',
  '权限',
  'permission',
  '注入',
  'injection',
  'xss',
  'csrf',
  '漏洞',
  'vulnerability',
  '安全',
  'security',
  '加密',
  'encrypt'
];

const SCOPE_PREFERENCES = {
  'pre-commit': { 'code-reviewer': 1.5, 'security-reviewer': 1.3 },
  edit: { 'build-error-resolver': 1.2, 'refactor-cleaner': 1.1 },
  'on-demand': { 'quest-designer': 1.2, architect: 1.1 }
};

function uniq(values) {
  return [...new Set((values || []).filter(Boolean))];
}

export class CanonicalRouter {
  /**
   * @param {AgentRegistry} [registry] - Agent 注册表
   * @param {Object} [options] - 配置选项
   * @param {boolean} [options.enableHistory] - 启用路由历史（默认 true）
   * @param {number} [options.historySize] - 历史记录大小（默认 100）
   */
  constructor(registry, options = {}) {
    this.registry = registry || new AgentRegistry();
    this.logger = logger;
    this._initialized = false;
    this._enableHistory = options.enableHistory ?? true;
    this._historySize = options.historySize ?? 100;
    this._routeHistory = [];
    this._agentStats = new Map();
    this._wmsIntentMatcher = options.wmsIntentMatcher || new WmsIntentMatcher();
  }

  /**
   * 初始化路由器（必须在使用前调用）
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this._initialized) {
      await this.registry.initialize();
      this._initialized = true;
    }
  }

  /**
   * 核心路由方法：唯一的决策入口
   * @param {string} userIntent - 用户意图（自然语言描述）
   * @param {Object} [context] - 上下文
   * @param {string} [context.scope] - 作用域（pre-commit, edit, on-demand）
   * @param {string[]} [context.files] - 涉及的文件列表
   * @param {Object} [context.flags] - 标志位
   * @returns {Promise<import('./agent-types.js').RouteResult>}
   */
  async route(userIntent, context = {}) {
    if (!this._initialized) {
      await this.initialize();
    }

    if (!userIntent || !userIntent.trim()) {
      return this._defaultRoute('空意图');
    }

    const intent = this._analyzeIntent(userIntent, context);

    this.logger.info(
      `路由分析: 关键词=[${intent.keywords.slice(0, 5).join(',')}] ` +
        `复杂度=${intent.complexity} 安全敏感=${intent.securitySensitive}`
    );

    const candidates = this.registry.findCandidates(intent.keywords);

    if (candidates.length === 0) {
      return this._defaultRoute('无匹配 Agent');
    }

    const filtered = this._applyContextFilters(candidates, intent, context);

    if (filtered.length === 0) {
      return this._defaultRoute('上下文过滤后无匹配');
    }

    const weighted = this._applyAdaptiveWeighting(filtered, intent, context);
    const ranked = this._applySecurityPriority(weighted, intent);
    const selected = ranked[0];
    const routeId = this._createRouteId();
    const result = {
      agent: selected.agent,
      score: selected.score,
      matchReason: this._buildMatchReason(selected, intent),
      fallbackChain: this.registry.getFallbackChain(selected.agent.name),
      isDefault: false,
      routeId
    };

    if (this._enableHistory) {
      this._recordHistory(routeId, userIntent, intent, result);
    }

    this.logger.info(
      `路由结果: agent=${result.agent.name} score=${result.score} reason=${result.matchReason}`
    );

    return result;
  }

  /**
   * 应用自适应权重（基于历史命中率）
   * @param {Array} candidates - 候选列表
   * @param {Object} intent - 意图分析结果
   * @param {Object} context - 上下文
   * @returns {Array}
   * @private
   */
  _applyAdaptiveWeighting(candidates, intent, context) {
    if (!this._enableHistory) return candidates;

    return candidates
      .map((candidate) => {
        const stats = this._agentStats.get(candidate.agent.name);
        const hitRate = stats?.hitRate || DEFAULT_HIT_RATE;
        const contextWeight = this._computeContextSimilarity(candidate.agent.name, intent, context);
        const contextualBoost = contextWeight * hitRate * 10;

        return {
          ...candidate,
          score: candidate.score + contextualBoost
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 计算上下文相似度
   * @param {string} agentName - Agent 名称
   * @param {Object} intent - 意图
   * @param {Object} context - 上下文
   * @returns {number}
   * @private
   */
  _computeContextSimilarity(agentName, intent, context) {
    let score = 0.5;

    if (context.scope) {
      const prefs = SCOPE_PREFERENCES[context.scope] || {};
      score = prefs[agentName] || score;
    }

    if (intent.wms?.isWmsRelated) {
      if (agentName === 'architect' && intent.complexity === COMPLEXITY_LEVELS.HIGH) {
        score += 0.2;
      }

      if (agentName === 'quest-designer') {
        score += 0.1;
      }
    }

    return score;
  }

  /**
   * 记录路由历史
   * @param {string} routeId
   * @param {string} userIntent - 用户意图
   * @param {Object} intent - 意图分析结果
   * @param {Object} result - 路由结果
   * @private
   */
  _recordHistory(routeId, userIntent, intent, result) {
    const entry = {
      routeId,
      timestamp: Date.now(),
      intent: userIntent.slice(0, 100),
      agent: result.agent.name,
      score: result.score,
      scope: intent.scope || null,
      outcome: 'proposed'
    };

    this._routeHistory.push(entry);

    if (this._routeHistory.length > this._historySize) {
      this._routeHistory.shift();
    }
  }

  /**
   * 报告路由成功（用于更新统计）
   * @param {string} routeIdOrAgentName - routeId 或 Agent 名称
   */
  reportSuccess(routeIdOrAgentName) {
    const agentName = this._resolveAgentName(routeIdOrAgentName);
    if (!agentName) {
      return;
    }

    this._markRouteOutcome(routeIdOrAgentName, 'success');
    this._recordAgentOutcome(agentName, true);
  }

  /**
   * 报告路由失败（用于更新统计）
   * @param {string} routeIdOrAgentName - routeId 或 Agent 名称
   */
  reportFailure(routeIdOrAgentName) {
    const agentName = this._resolveAgentName(routeIdOrAgentName);
    if (!agentName) {
      return;
    }

    this._markRouteOutcome(routeIdOrAgentName, 'failure');
    this._recordAgentOutcome(agentName, false);
  }

  /**
   * 获取路由历史
   * @param {number} [limit] - 返回条数
   * @returns {Array}
   */
  getHistory(limit) {
    return limit ? this._routeHistory.slice(-limit) : this._routeHistory;
  }

  /**
   * 获取 Agent 统计信息
   * @returns {Map<string, Object>}
   */
  getAgentStats() {
    return new Map(this._agentStats);
  }

  /**
   * 获取路由统计摘要
   * @returns {Object}
   */
  getRoutingStats() {
    const total = this._routeHistory.length;
    const agentCounts = {};
    const outcomes = { proposed: 0, success: 0, failure: 0 };

    for (const entry of this._routeHistory) {
      agentCounts[entry.agent] = (agentCounts[entry.agent] || 0) + 1;
      outcomes[entry.outcome] = (outcomes[entry.outcome] || 0) + 1;
    }

    return {
      totalRoutes: total,
      agentDistribution: agentCounts,
      outcomes,
      agentStats: Object.fromEntries(this._agentStats)
    };
  }

  /**
   * 分析用户意图
   * @param {string} userIntent
   * @param {Object} context
   * @returns {Object}
   * @private
   */
  _analyzeIntent(userIntent, context) {
    const lowerIntent = userIntent.toLowerCase();
    const keywords = lowerIntent.split(/[\s,，。.、；;！!？?：:]+/).filter((w) => w.length > 1);
    const complexity = this._assessComplexity(lowerIntent);
    const securitySensitive = SECURITY_KEYWORDS.some((kw) => lowerIntent.includes(kw));
    const fileExtensions = (context.files || [])
      .map((f) => {
        const ext = f.split('.').pop();
        return ext ? `.${ext}` : '';
      })
      .filter(Boolean);
    const wms = this._wmsIntentMatcher.analyze(userIntent);
    const wmsKeywords = wms.isWmsRelated
      ? uniq([wms.targetService, wms.businessDomain, ...(wms.matchedKeywords || [])])
      : [];

    return {
      keywords: uniq([
        ...keywords,
        ...fileExtensions,
        ...wmsKeywords.map((item) => String(item).toLowerCase())
      ]),
      complexity,
      securitySensitive,
      originalIntent: userIntent,
      scope: context.scope || null,
      wms
    };
  }

  /**
   * 评估任务复杂度
   * @param {string} text
   * @returns {string}
   * @private
   */
  _assessComplexity(text) {
    const scores = {
      [COMPLEXITY_LEVELS.HIGH]: 0,
      [COMPLEXITY_LEVELS.MEDIUM]: 0,
      [COMPLEXITY_LEVELS.LOW]: 0
    };

    for (const [level, indicators] of Object.entries(COMPLEXITY_INDICATORS)) {
      for (const indicator of indicators) {
        if (text.includes(indicator)) {
          scores[level] += 1;
        }
      }
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      return COMPLEXITY_LEVELS.MEDIUM;
    }

    for (const [level, score] of Object.entries(scores)) {
      if (score === maxScore) {
        return level;
      }
    }

    return COMPLEXITY_LEVELS.MEDIUM;
  }

  /**
   * 应用上下文过滤器
   * @param {Array} candidates
   * @param {Object} intent
   * @param {Object} context
   * @returns {Array}
   * @private
   */
  _applyContextFilters(candidates, intent, context) {
    let filtered = candidates;

    if (context.flags && context.flags.securityReview) {
      const securityAgent = candidates.find((c) => c.agent.name === 'security-reviewer');
      if (securityAgent) {
        return [securityAgent];
      }
    }

    if (intent.complexity) {
      filtered = [...candidates].sort((a, b) => {
        const aMatch = a.agent.complexity === intent.complexity ? 10 : 0;
        const bMatch = b.agent.complexity === intent.complexity ? 10 : 0;
        return b.score + bMatch - (a.score + aMatch);
      });
    }

    return filtered;
  }

  /**
   * 安全优先提升
   * @param {Array} candidates
   * @param {Object} intent
   * @returns {Array}
   * @private
   */
  _applySecurityPriority(candidates, intent) {
    if (!intent.securitySensitive) {
      return candidates;
    }

    return candidates
      .map((c) => {
        if (c.agent.name === 'security-reviewer') {
          return { ...c, score: c.score + 50 };
        }
        return c;
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 构建匹配原因说明
   * @param {Object} selected
   * @param {Object} intent
   * @returns {string}
   * @private
   */
  _buildMatchReason(selected, intent) {
    const matchedKw = selected.matchedKeywords.join(', ');
    const parts = [`匹配关键词: [${matchedKw}]`, `优先级: ${selected.agent.priority}`];

    if (intent.wms?.isWmsRelated) {
      parts.push(`WMS服务: ${intent.wms.targetService}`);
      if (intent.wms.businessDomain) {
        parts.push(`业务域: ${intent.wms.businessDomain}`);
      }
    }

    return parts.join(', ');
  }

  /**
   * 返回默认路由
   * @param {string} reason
   * @returns {Object}
   * @private
   */
  _defaultRoute(reason) {
    const defaultAgent = this.registry.getAgent(DEFAULT_AGENT.name);

    if (!defaultAgent) {
      return {
        agent: {
          name: DEFAULT_AGENT.name,
          displayName: '通用规划',
          description: DEFAULT_AGENT.reason,
          capabilities: ['planning'],
          triggerKeywords: [],
          priority: 0,
          complexity: COMPLEXITY_LEVELS.MEDIUM,
          fallbackAgents: [],
          state: AGENT_STATES.ACTIVE,
          source: 'fallback'
        },
        score: 0,
        matchReason: `默认路由: ${reason}`,
        fallbackChain: [],
        isDefault: true,
        routeId: this._createRouteId()
      };
    }

    return {
      agent: defaultAgent,
      score: 0,
      matchReason: `默认路由: ${reason}`,
      fallbackChain: this.registry.getFallbackChain(defaultAgent.name),
      isDefault: true,
      routeId: this._createRouteId()
    };
  }

  /**
   * 获取路由器的诊断信息
   * @returns {Promise<Object>}
   */
  async diagnose() {
    if (!this._initialized) {
      await this.initialize();
    }

    return {
      initialized: this._initialized,
      agentCount: this.registry.agents.size,
      agents: this.registry.listAgents().map((a) => ({
        name: a.name,
        priority: a.priority,
        state: a.state,
        triggerCount: a.triggerKeywords.length
      }))
    };
  }

  _createRouteId() {
    return `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  _resolveAgentName(routeIdOrAgentName) {
    if (!routeIdOrAgentName) {
      return '';
    }

    if (this.registry.getAgent(routeIdOrAgentName)) {
      return routeIdOrAgentName;
    }

    const historyEntry = this._routeHistory.find((entry) => entry.routeId === routeIdOrAgentName);
    return historyEntry?.agent || '';
  }

  _markRouteOutcome(routeIdOrAgentName, outcome) {
    const historyEntry = this._routeHistory.find((entry) => entry.routeId === routeIdOrAgentName);
    if (historyEntry) {
      historyEntry.outcome = outcome;
    }
  }

  _recordAgentOutcome(agentName, success) {
    const stats = this._agentStats.get(agentName) || {
      hits: 0,
      total: 0,
      hitRate: DEFAULT_HIT_RATE
    };
    stats.total += 1;
    if (success) {
      stats.hits += 1;
    }
    stats.hitRate = stats.total > 0 ? stats.hits / stats.total : DEFAULT_HIT_RATE;
    this._agentStats.set(agentName, stats);
  }
}

export default CanonicalRouter;
