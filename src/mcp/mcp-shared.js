/**
 * MCP 共享协议与工具定义
 */
import { logger } from '../logger.js';

export const MCP_PROTOCOL_VERSION = '1.0';

export const MCP_ERRORS = Object.freeze({
  CONNECTION_FAILED: 'MCP_CONNECTION_FAILED',
  TOOL_NOT_FOUND: 'MCP_TOOL_NOT_FOUND',
  TOOL_NOT_IMPLEMENTED: 'MCP_TOOL_NOT_IMPLEMENTED',
  INVOCATION_FAILED: 'MCP_INVOCATION_FAILED',
  TIMEOUT: 'MCP_TIMEOUT'
});

export const DEFAULT_TOOLS = [
  {
    name: 'wms:lookup',
    description: '在 WMS 代码库中查找指定关键词的代码位置',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '搜索关键词（如：出库、波次、分配）' },
        service: {
          type: 'string',
          description: '微服务名称（outbound/inbound/basicdata/inside/storage/edi）'
        }
      },
      required: ['keyword']
    }
  },
  {
    name: 'wms:intent',
    description: '分析用户意图并返回 WMS 相关的服务定位',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '用户需求文本' }
      },
      required: ['text']
    }
  },
  {
    name: 'wms:route',
    description: '使用 Canonical Router 为用户意图选择合适的 Agent',
    inputSchema: {
      type: 'object',
      properties: {
        intent: { type: 'string', description: '用户意图描述' },
        context: { type: 'object', description: '上下文信息' }
      },
      required: ['intent']
    }
  }
];

export function createMcpError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export class McpToolRegistry {
  constructor() {
    this._tools = new Map();
    this._middlewares = [];
  }

  /**
   * 注册工具
   * @param {Object} tool - 工具描述
   */
  register(tool) {
    if (!tool?.name) {
      throw new Error('工具必须包含 name');
    }

    this._tools.set(tool.name, { ...tool });
    logger.debug(`MCP 工具已注册: ${tool.name}`);
  }

  /**
   * 批量注册工具
   * @param {Object[]} tools
   */
  registerAll(tools) {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * 注销工具
   * @param {string} name
   */
  unregister(name) {
    this._tools.delete(name);
    logger.debug(`MCP 工具已注销: ${name}`);
  }

  /**
   * 获取工具
   * @param {string} name
   * @returns {Object|null}
   */
  get(name) {
    return this._tools.get(name) || null;
  }

  /**
   * 列出所有工具
   * @returns {Object[]}
   */
  list() {
    return Array.from(this._tools.values());
  }

  /**
   * 按名称前缀筛选
   * @param {string} prefix
   * @returns {Object[]}
   */
  filterByPrefix(prefix) {
    return this.list().filter((tool) => tool.name.startsWith(prefix));
  }

  /**
   * 添加中间件
   * @param {Function} middleware
   */
  use(middleware) {
    this._middlewares.push(middleware);
  }

  /**
   * 执行工具调用（经过中间件）
   * @param {string} name
   * @param {Object} args
   * @returns {Promise<Object>}
   */
  async execute(name, args = {}) {
    let ctx = { name, args, tool: this.get(name), result: undefined };

    for (const middleware of this._middlewares) {
      ctx = (await middleware(ctx)) || ctx;
    }

    if (!ctx.tool) {
      throw createMcpError(MCP_ERRORS.TOOL_NOT_FOUND, `工具不存在: ${name}`);
    }

    if (ctx.result !== undefined) {
      return ctx.result;
    }

    if (typeof ctx.tool.handler !== 'function') {
      throw createMcpError(MCP_ERRORS.TOOL_NOT_IMPLEMENTED, `工具未实现: ${name}`);
    }

    return ctx.tool.handler(ctx.args, ctx);
  }
}
