import { describe, it, expect } from 'vitest';
import { McpClient } from '../../src/mcp/mcp-client.js';
import { McpServer } from '../../src/mcp/mcp-server.js';

describe('McpClient', () => {
  it('should connect and discover tools from transport', async () => {
    const server = new McpServer();
    const client = new McpClient({
      transport: {
        send: (method, params) => server.handleRequest(method, params)
      }
    });

    await expect(client.connect()).resolves.toBe(true);
    expect(client.isConnected()).toBe(true);
    expect(client.listTools().map((tool) => tool.name)).toContain('wms:route');
  });

  it('should reject unknown tools before invocation', async () => {
    const server = new McpServer();
    const client = new McpClient({
      transport: {
        send: (method, params) => server.handleRequest(method, params)
      }
    });

    await client.connect();

    await expect(client.invokeTool('missing:tool')).rejects.toThrow('工具不存在: missing:tool');
  });

  it('should surface unimplemented tool errors from server', async () => {
    const server = new McpServer();
    const client = new McpClient({
      transport: {
        send: (method, params) => server.handleRequest(method, params)
      }
    });

    await client.connect();

    await expect(client.invokeTool('wms:route', { intent: 'route this request' })).rejects.toThrow(
      '工具未实现: wms:route'
    );
  });

  it('should invoke implemented tools through transport', async () => {
    const server = new McpServer();
    server.registerTool({
      name: 'custom:sum',
      description: 'Sum two numbers',
      inputSchema: { type: 'object' },
      handler: async ({ a, b }) => ({ total: a + b })
    });

    const client = new McpClient({
      transport: {
        send: (method, params) => server.handleRequest(method, params)
      }
    });

    await client.connect();

    await expect(client.invokeTool('custom:sum', { a: 1, b: 2 })).resolves.toEqual({ total: 3 });
  });
});
