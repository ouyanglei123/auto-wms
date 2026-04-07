import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRuntimeStatus } from '../src/runtime-status.js';

async function createTempProject() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'auto-wms-runtime-status-'));
}

describe('runtime-status.js', () => {
  let projectDir = '';

  afterEach(async () => {
    if (projectDir) {
      await fs.remove(projectDir);
      projectDir = '';
    }
  });

  it('aggregates runtime modules without writing project files', async () => {
    projectDir = await createTempProject();
    await fs.ensureDir(path.join(projectDir, '.auto', 'insights'));
    await fs.writeFile(
      path.join(projectDir, '.auto', 'insights', 'patterns.md'),
      '### A\n\nBody\n',
      'utf-8'
    );
    await fs.ensureDir(path.join(projectDir, '.aimax', 'instincts'));
    await fs.writeFile(
      path.join(projectDir, '.aimax', 'instincts', 'instincts.yaml'),
      'version: 2\ninstincts:\n  - pattern: p\n    action: a\n',
      'utf-8'
    );
    await fs.writeFile(
      path.join(projectDir, '.aimax', 'instincts', 'candidates.yaml'),
      'version: 2\ncandidates:\n  - pattern: c\n    action: b\n',
      'utf-8'
    );

    const agentRegistry = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockReturnValue({ total: 3, active: 2, bySource: { 'built-in': 3 } })
    };
    const canonicalRouter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      diagnose: vi.fn().mockResolvedValue({ initialized: true, agentCount: 3 })
    };
    const skillIndexer = {
      _cache: null,
      buildIndex: vi.fn().mockResolvedValue({ totalSkills: 4, savingsPercent: 75 })
    };
    const orchestrator = {
      executors: {
        discover: { isDefault: false },
        reason: { isDefault: false },
        execute: { isDefault: true },
        verify: { isDefault: true },
        commit: { isDefault: true },
        learn: { isDefault: true }
      }
    };

    const result = await getRuntimeStatus({
      projectDir,
      agentRegistry,
      canonicalRouter,
      skillIndexer,
      orchestrator
    });

    expect(result.modules.agentRegistry.agents).toBe(3);
    expect(result.modules.canonicalRouter.agents).toBe(3);
    expect(result.modules.skillIndexer.totalSkills).toBe(4);
    expect(result.modules.knowledgeSteward.entries).toBe(1);
    expect(result.modules.instinctManager.instincts).toBe(1);
    expect(result.modules.instinctManager.candidates).toBe(1);
    expect(result.modules.workflow.placeholderPhases).toEqual([
      'execute',
      'verify',
      'commit',
      'learn'
    ]);
  });
});
