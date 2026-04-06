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
import { MCP_ERRORS, MCP_PROTOCOL_VERSION, createMcpError, McpToolRegistry } from './mcp-shared.js';

export { MCP_ERRORS, McpToolRegistry } from './mcp-shared.js';

/**
 * MCP 工具描述
 * @typedef {Object} McpTool
 * @property {string} name - 工具名称
 * @property {string} description - 工具描述
 * @property {Object} inputSchema - 输入模式
 * @property {Function} [handler] - 工具处理函数
 */

/**
 * MCP Client Class
 */
export class McpClient extends EventEmitter {
  /**
   * @param {Object} options - 配置选项
   * @param {string} [options.url] - MCP Server URL
   * @param {number} [options.timeout] - 超时时间（默认 30000ms）
   * @param {{send: Function}} [options.transport] - 传输适配器
   * @param {{name?: string, version?: string}} [options.clientInfo] - 客户端信息
   */
  constructor(options = {}) {
    super();
    this.url = options.url || 'http://localhost:3001/mcp';
    this.timeout = options.timeout || 30000;
    this.transport = options.transport || null;
    this.clientInfo = this._normalizeClientInfo(options.clientInfo);
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
      const response = await this._sendRequest('initialize', {
        protocolVersion: MCP_PROTOCOL_VERSION,
        clientInfo: this.clientInfo
      });

      if (!response?.protocolVersion) {
        throw createMcpError(MCP_ERRORS.CONNECTION_FAILED, 'MCP 初始化失败');
      }

      this._connected = true;
      await this._discoverTools();
      logger.info(`MCP Client 已连接: ${this.url}`);
      this.emit('connected', response.serverInfo || null);
      return true;
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
    if (!this._connected) {
      return;
    }

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
      const tools = Array.isArray(response?.tools) ? response.tools : [];
      this._tools.clear();

      for (const tool of tools) {
        this._tools.set(tool.name, tool);
      }

      logger.debug(`MCP 工具发现: ${this._tools.size} 个工具`);
      return this.listTools();
    } catch (error) {
      logger.warn(`MCP 工具发现失败: ${error.message}`);
      return [];
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

      if (response?.error) {
        throw this._toError(response.error, `MCP 工具调用失败: ${name}`);
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
  async _sendRequest(method, params = {}) {
    if (!this.transport?.send) {
      throw createMcpError(MCP_ERRORS.CONNECTION_FAILED, 'MCP transport 未配置');
    }

    const requestId = ++this._requestId;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(createMcpError(MCP_ERRORS.TIMEOUT, `MCP 请求超时: ${method}`));
      }, this.timeout);

      Promise.resolve(this.transport.send(method, params))
        .then((response) => {
          clearTimeout(timeout);
          const normalized = response || {};
          resolve({ ...normalized, id: normalized.id ?? requestId });
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  _normalizeClientInfo(clientInfo = {}) {
    const normalized = {
      name: clientInfo.name || 'auto-wms'
    };

    if (clientInfo.version) {
      normalized.version = clientInfo.version;
    }

    return normalized;
  }

  _toError(payload, fallbackMessage) {
    if (payload instanceof Error) {
      return payload;
    }

    if (typeof payload === 'string') {
      return new Error(payload);
    }

    if (payload?.code) {
      return createMcpError(payload.code, payload.message || fallbackMessage);
    }

    return new Error(payload?.message || fallbackMessage);
  }

  /**
   * 检查连接状态
   * @returns {boolean}
   */
  isConnected() {
    return this._connected;
  }
}

export const toolRegistry = new McpToolRegistry();

export default McpClient;
