import { describe, it, expect } from 'vitest';
import mcpModule, {
  McpClient,
  McpServer,
  McpToolRegistry,
  createMcpServer,
  toolRegistry
} from '../../src/mcp/index.js';

describe('mcp index exports', () => {
  it('should expose stable ESM exports', () => {
    expect(McpClient).toBeTypeOf('function');
    expect(McpServer).toBeTypeOf('function');
    expect(McpToolRegistry).toBeTypeOf('function');
    expect(createMcpServer).toBeTypeOf('function');
    expect(toolRegistry).toBeDefined();
    expect(mcpModule.McpClient).toBe(McpClient);
    expect(mcpModule.McpServer).toBe(McpServer);
    expect(mcpModule.McpToolRegistry).toBe(McpToolRegistry);
    expect(mcpModule.toolRegistry).toBe(toolRegistry);
    expect(mcpModule.createMcpServer).toBe(createMcpServer);
  });
});
