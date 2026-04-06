import { describe, it, expect } from 'vitest';
import { McpServer, DEFAULT_TOOLS } from '../../src/mcp/mcp-server.js';

describe('McpServer', () => {
  it('should initialize with default tools', async () => {
    const server = new McpServer();
    const response = await server.handleRequest('initialize', {});

    expect(response.protocolVersion).toBe('1.0');
    expect(response.capabilities.tools).toBe(true);
  });

  it('should list default tools', async () => {
    const server = new McpServer();
    const response = await server.handleRequest('tools/list', {});

    expect(response.tools).toHaveLength(DEFAULT_TOOLS.length);
    expect(response.tools.map((tool) => tool.name)).toEqual(DEFAULT_TOOLS.map((tool) => tool.name));
  });

  it('should fail clearly when tool is not registered', async () => {
    const server = new McpServer();
    const response = await server.handleRequest('tools/call', {
      name: 'missing:tool',
      arguments: {}
    });

    expect(response.error.code).toBe('MCP_TOOL_NOT_FOUND');
  });

  it('should fail clearly when tool has no handler', async () => {
    const server = new McpServer();
    const response = await server.handleRequest('tools/call', {
      name: 'wms:route',
      arguments: { intent: 'route this request' }
    });

    expect(response.error.code).toBe('MCP_TOOL_NOT_IMPLEMENTED');
  });

  it('should execute registered handlers', async () => {
    const server = new McpServer();
    server.registerTool({
      name: 'custom:echo',
      description: 'Echo payload',
      inputSchema: { type: 'object' },
      handler: async (args) => ({ echoed: args })
    });

    const response = await server.handleRequest('tools/call', {
      name: 'custom:echo',
      arguments: { value: 42 }
    });

    expect(response.result).toEqual({ echoed: { value: 42 } });
  });
});
