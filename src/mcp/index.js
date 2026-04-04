/**
 * MCP 模块导出
 *
 * 导出：
 * - McpClient: MCP 客户端
 * - McpServer: MCP 服务端
 * - toolRegistry: 工具注册表
 */
export { McpClient, toolRegistry } from './mcp-client.js';
export { McpServer, createMcpServer } from './mcp-server.js';

export default {
  McpClient: require('./mcp-client.js').McpClient,
  toolRegistry: require('./mcp-client.js').toolRegistry,
  McpServer: require('./mcp-server.js').McpServer
};
