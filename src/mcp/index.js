/**
 * MCP 模块导出
 *
 * 导出：
 * - McpClient: MCP 客户端
 * - McpServer: MCP 服务端
 * - McpToolRegistry: 工具注册表类
 * - toolRegistry: 工具注册表单例
 */
import McpClient, { McpToolRegistry, toolRegistry } from './mcp-client.js';
import McpServer, { createMcpServer } from './mcp-server.js';

export { McpClient, McpServer, McpToolRegistry, createMcpServer, toolRegistry };

export default {
  McpClient,
  McpServer,
  McpToolRegistry,
  createMcpServer,
  toolRegistry
};
