import { describe, it, expect } from 'vitest';
import { DEFAULT_TOOLS, MCP_ERRORS, McpToolRegistry, createMcpError } from '../../src/mcp/index.js';

describe('mcp index exports', () => {
  it('should expose shared protocol utilities', () => {
    expect(DEFAULT_TOOLS).toBeInstanceOf(Array);
    expect(DEFAULT_TOOLS.length).toBeGreaterThan(0);
    expect(McpToolRegistry).toBeTypeOf('function');
    expect(createMcpError).toBeTypeOf('function');
    expect(MCP_ERRORS).toBeDefined();
  });
});
