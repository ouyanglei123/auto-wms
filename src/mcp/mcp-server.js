/**
 * MCP Server 模板 (Model Context Protocol Server)
 *
 * 核心功能：
 * - 提供工具发现接口
 * - 处理工具调用请求
 * - 管理工具生命周期
 */
import { McpToolRegistry } from './mcp-client.js';

/**
 * MCP Server 默认工具
 */
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

/**
 * MCP Server Class
 */
export class McpServer {
  /**
   * @param {Object} options - 配置选项
   * @param {string} [options.name] - 服务器名称
   * @param {string} [options.version] - 服务器版本
   */
  constructor(options = {}) {
    this.name = options.name || 'auto-wms-mcp';
    this.version = options.version || '1.0.0';
    this.registry = new McpToolRegistry();
    this._running = false;

    // 注册默认工具
    this.registry.registerAll(DEFAULT_TOOLS);
  }

  /**
   * 启动服务器
   * @returns {Promise<void>}
   */
  async start() {
    if (this._running) {
      console.log(`${this.name} v${this.version} 已启动`);
      return;
    }

    this._running = true;
    console.log(`${this.name} v${this.version} 已启动`);
    console.log(`可用工具: ${this.registry.list().length} 个`);
  }

  /**
   * 停止服务器
   */
  stop() {
    this._running = false;
    console.log(`${this.name} 已停止`);
  }

  /**
   * 处理 MCP 请求
   * @param {string} method - 方法名
   * @param {Object} params - 参数
   * @returns {Promise<Object>}
   */
  async handleRequest(method, params) {
    switch (method) {
      case 'initialize':
        return this._handleInitialize(params);

      case 'tools/list':
        return this._handleListTools(params);

      case 'tools/call':
        return this._handleCallTool(params);

      default:
        throw new Error(`未知方法: ${method}`);
    }
  }

  /**
   * 处理初始化请求
   * @private
   */
  _handleInitialize(_params) {
    return {
      protocolVersion: '1.0',
      serverInfo: {
        name: this.name,
        version: this.version
      },
      capabilities: {
        tools: true
      }
    };
  }

  /**
   * 处理工具列表请求
   * @private
   */
  _handleListTools() {
    return {
      tools: this.registry.list()
    };
  }

  /**
   * 处理工具调用请求
   * @param {Object} params
   * @private
   */
  async _handleCallTool(params) {
    const { name, arguments: args = {} } = params;

    const tool = this.registry.get(name);
    if (!tool) {
      return { error: `工具不存在: ${name}` };
    }

    try {
      // 执行工具（通过中间件链）
      const result = await this.registry.execute(name, args);
      return { result };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * 注册自定义工具
   * @param {Object} tool - 工具定义
   */
  registerTool(tool) {
    this.registry.register(tool);
  }

  /**
   * 批量注册自定义工具
   * @param {Object[]} tools
   */
  registerTools(tools) {
    this.registry.registerAll(tools);
  }
}

/**
 * 创建 MCP Server 实例
 * @param {Object} options
 * @returns {McpServer}
 */
export function createMcpServer(options) {
  return new McpServer(options);
}

export default McpServer;
