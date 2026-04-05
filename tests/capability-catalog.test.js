import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { CapabilityCatalog } from '../src/capability-catalog.js';

describe('CapabilityCatalog', () => {
  let tempDir;
  let catalog;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `capability-catalog-test-${Date.now()}`);

    await fs.ensureDir(path.join(tempDir, 'commands', 'wms'));
    await fs.ensureDir(path.join(tempDir, 'skills'));
    await fs.ensureDir(path.join(tempDir, 'agents'));

    await fs.writeFile(
      path.join(tempDir, 'commands', 'wms', 'auto.md'),
      `---
description: 智能超级命令
allowed_tools: ["Read", "Glob", "Agent"]
---

# /wms:auto — 智能超级命令
`,
      'utf-8'
    );

    await fs.writeFile(
      path.join(tempDir, 'skills', 'domain.md'),
      `---
name: domain
description: Domain knowledge
tags: [wms, domain]
---
# Domain
`,
      'utf-8'
    );

    await fs.writeFile(
      path.join(tempDir, 'agents', 'custom-helper.md'),
      `# Custom Helper
A custom helper agent.
`,
      'utf-8'
    );

    catalog = new CapabilityCatalog(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should build unified catalog across command, skill, agent and mcp-tool', async () => {
    const result = await catalog.buildCatalog({ useCache: false });

    expect(result.totalCapabilities).toBeGreaterThan(0);
    expect(result.byKind.command).toBe(1);
    expect(result.byKind.skill).toBe(1);
    expect(result.byKind.agent).toBeGreaterThan(0);
    expect(result.byKind['mcp-tool']).toBe(3);
    expect(result.byLayer.prompt).toBe(1);
    expect(result.byLayer.resource).toBe(1);
    expect(result.byLayer.tool).toBe(3);
  });

  it('should normalize command metadata', async () => {
    const entry = await catalog.getCapability('command:wms:auto');

    expect(entry).toBeDefined();
    expect(entry.kind).toBe('command');
    expect(entry.layer).toBe('prompt');
    expect(entry.description).toBe('智能超级命令');
    expect(entry.capabilities).toEqual(['Read', 'Glob', 'Agent']);
    expect(entry.metadata.relativePath).toBe('commands/wms/auto.md');
  });

  it('should normalize skill metadata', async () => {
    const entry = await catalog.getCapability('skill:domain');

    expect(entry).toBeDefined();
    expect(entry.kind).toBe('skill');
    expect(entry.layer).toBe('resource');
    expect(entry.tags).toEqual(['wms', 'domain']);
  });

  it('should include custom agents from project agents directory', async () => {
    const entry = await catalog.getCapability('agent:custom-helper');

    expect(entry).toBeDefined();
    expect(entry.kind).toBe('agent');
    expect(entry.layer).toBe('agent');
    expect(entry.metadata.filePath).toContain('custom-helper.md');
  });

  it('should expose default mcp tools as tool-layer capabilities', async () => {
    const entry = await catalog.getCapability('mcp-tool:wms:route');

    expect(entry).toBeDefined();
    expect(entry.kind).toBe('mcp-tool');
    expect(entry.layer).toBe('tool');
    expect(entry.capabilities).toContain('intent');
    expect(entry.metadata.inputSchema).toBeDefined();
  });

  it('should filter by kind, layer and query', async () => {
    const commandEntries = await catalog.listCapabilities({ kind: 'command' });
    const toolEntries = await catalog.listCapabilities({ layer: 'tool' });
    const queriedEntries = await catalog.listCapabilities({ query: 'domain' });

    expect(commandEntries).toHaveLength(1);
    expect(toolEntries).toHaveLength(3);
    expect(queriedEntries.some((entry) => entry.id === 'skill:domain')).toBe(true);
  });

  it('should use cache by default', async () => {
    const first = await catalog.buildCatalog({ useCache: true });
    const second = await catalog.buildCatalog({ useCache: true });

    expect(second).toBe(first);
  });

  it('should clear cache explicitly', async () => {
    await catalog.buildCatalog({ useCache: true });
    catalog.clearCache();

    const result = await catalog.buildCatalog({ useCache: true });
    expect(result.totalCapabilities).toBeGreaterThan(0);
  });
});
