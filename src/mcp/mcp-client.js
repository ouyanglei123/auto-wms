/**
 * MCP Client (Model Context Protocol 客户端)
 *
 * 核心功能：
 * - 连接 MCP Server
 * - 发现可用工具
 * - 调用远程工具
 * - 管理连接生命周期
 */
import { EventEmitter } from 'events';
import { logger } from '../logger.js';

/**
 * MCP 工具描述
 * @typedef {Object} McpTool
 * @property {string} name - 工具名称
 * @property {string} description - 工具描述
 * @property {Object} inputSchema - 输入模式
 */

/**
 * MCP 错误类型
 */
const MCP_ERRORS = {
  CONNECTION_FAILED: 'MCP_CONNECTION_FAILED',
  TOOL_NOT_FOUND: 'MCP_TOOL_NOT_FOUND',
  INVOCATION_FAILED: 'MCP_INVOCATION_FAILED',
  TIMEOUT: 'MCP_TIMEOUT'
};

/**
 * MCP Client Class
 */
export class McpClient extends EventEmitter {
  /**
   * @param {Object} options - 配置选项
   * @param {string} [options.url] - MCP Server URL
   * @param {number} [options.timeout] - 超时时间（默认 30000ms）
   */
  constructor(options = {}) {
    super();
    this.url = options.url || 'http://localhost:3001/mcp';
    this.timeout = options.timeout || 30000;
    this._connected = false;
    this._tools = new Map();
    this._requestId = 0;
  }

  /**
   * 连接 MCP Server
   * @returns {Promise<boolean>}
   */
  async connect() {
    if (this._connected) {
      logger.debug('MCP Client 已连接');
      return true;
    }

    try {
      // 模拟连接（实际实现需要根据具体 MCP Server）
      const response = await this._sendRequest('initialize', {
        protocolVersion: '1.0',
        clientInfo: { name: 'auto-wms', version: '0.27.0' }
      });

      if (response.result === 'ok') {
        this._connected = true;
        await this._discoverTools();
        logger.info(`MCP Client 已连接: ${this.url}`);
        this.emit('connected');
        return true;
      }

      throw new Error('MCP 初始化失败');
    } catch (error) {
      logger.error(`MCP 连接失败: ${error.message}`);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (!this._connected) return;

    this._connected = false;
    this._tools.clear();
    logger.info('MCP Client 已断开');
    this.emit('disconnected');
  }

  /**
   * 发现可用工具
   * @returns {Promise<McpTool[]>}
   * @private
   */
  async _discoverTools() {
    try {
      const response = await this._sendRequest('tools/list', {});
      if (response.tools) {
        for (const tool of response.tools) {
          this._tools.set(tool.name, tool);
        }
        logger.debug(`MCP 工具发现: ${this._tools.size} 个工具`);
      }
    } catch (error) {
      logger.warn(`MCP 工具发现失败: ${error.message}`);
    }
  }

  /**
   * 列出所有可用工具
   * @returns {McpTool[]}
   */
  listTools() {
    return Array.from(this._tools.values());
  }

  /**
   * 获取单个工具
   * @param {string} name - 工具名称
   * @returns {McpTool|null}
   */
  getTool(name) {
    return this._tools.get(name) || null;
  }

  /**
   * 调用工具
   * @param {string} name - 工具名称
   * @param {Object} args - 工具参数
   * @returns {Promise<Object>}
   */
  async invokeTool(name, args = {}) {
    if (!this._connected) {
      throw new Error('MCP Client 未连接');
    }

    const tool = this._tools.get(name);
    if (!tool) {
      throw new Error(`工具不存在: ${name}`);
    }

    try {
      const response = await this._sendRequest('tools/call', {
        name,
        arguments: args
      });

      if (response.error) {
        throw new Error(response.error);
      }

      logger.debug(`MCP 工具调用成功: ${name}`);
      return response.result;
    } catch (error) {
      logger.error(`MCP 工具调用失败: ${name} - ${error.message}`);
      throw error;
    }
  }

  /**
   * 发送请求
   * @param {string} method - 方法名
   * @param {Object} params - 参数
   * @returns {Promise<Object>}
   * @private
   */
  async _sendRequest(method, _params) {
    const requestId = ++this._requestId;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`MCP 请求超时: ${method}`));
      }, this.timeout);

      // 模拟响应（实际实现需要根据具体协议）
      clearTimeout(timeout);
      resolve({ result: 'ok', id: requestId });
    });
  }

  /**
   * 检查连接状态
   * @returns {boolean}
   */
  isConnected() {
    return this._connected;
  }
}

/**
 * MCP 工具注册表
 */
class McpToolRegistry {
  constructor() {
    this._tools = new Map();
    this._middlewares = [];
  }

  /**
   * 注册工具
   * @param {McpTool} tool - 工具描述
   */
  register(tool) {
    if (!tool.name) {
      throw new Error('工具必须包含 name');
    }
    this._tools.set(tool.name, tool);
    logger.debug(`MCP 工具已注册: ${tool.name}`);
  }

  /**
   * 批量注册工具
   * @param {McpTool[]} tools
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
   * @returns {McpTool|null}
   */
  get(name) {
    return this._tools.get(name) || null;
  }

  /**
   * 列出所有工具
   * @returns {McpTool[]}
   */
  list() {
    return Array.from(this._tools.values());
  }

  /**
   * 按名称前缀筛选
   * @param {string} prefix
   * @returns {McpTool[]}
   */
  filterByPrefix(prefix) {
    return this.list().filter((t) => t.name.startsWith(prefix));
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
  async execute(name, args) {
    let ctx = { name, args, tool: this.get(name) };

    for (const mw of this._middlewares) {
      ctx = await mw(ctx) || ctx;
    }

    if (!ctx.tool) {
      throw new Error(`工具不存在: ${name}`);
    }

    return ctx.result;
  }
}

// 导出单例
export const toolRegistry = new McpToolRegistry();

export default McpClient;
