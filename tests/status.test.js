import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';
import { collectStatus, renderStatusReport } from '../src/status.js';

async function createTempProject() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'auto-wms-status-'));
}

describe('status.js', () => {
  let projectDir = '';

  afterEach(async () => {
    if (projectDir) {
      await fs.remove(projectDir);
      projectDir = '';
    }
  });

  it('builds project status from local files and injected runtime data', async () => {
    projectDir = await createTempProject();
    await fs.writeJson(path.join(projectDir, 'package.json'), {
      name: 'auto-wms',
      version: '1.2.3'
    });
    await fs.ensureDir(path.join(projectDir, 'node_modules'));
    await fs.writeFile(path.join(projectDir, 'CLAUDE.md'), '# context', 'utf-8');
    await fs.ensureDir(path.join(projectDir, 'agents'));
    await fs.writeFile(
      path.join(projectDir, 'agents', 'architect.md'),
      '---\nname: architect\n---',
      'utf-8'
    );
    await fs.ensureDir(path.join(projectDir, 'commands', 'wms'));
    await fs.writeFile(path.join(projectDir, 'commands', 'wms', 'auto.md'), '# auto', 'utf-8');
    await fs.ensureDir(path.join(projectDir, 'skills'));
    await fs.writeFile(path.join(projectDir, 'skills', 'init-project.md'), '# init', 'utf-8');
    await fs.ensureDir(path.join(projectDir, 'rules'));
    await fs.writeFile(path.join(projectDir, 'rules', 'testing.md'), '# testing', 'utf-8');
    await fs.ensureDir(path.join(projectDir, 'hooks'));
    await fs.writeJson(path.join(projectDir, 'hooks', 'hooks.json'), { PreToolUse: [], Stop: [] });
    await fs.ensureDir(path.join(projectDir, '.auto', 'insights'));
    await fs.writeFile(
      path.join(projectDir, '.auto', 'insights', 'patterns.md'),
      '### A\n\nBody\n',
      'utf-8'
    );

    const report = await collectStatus({
      projectDir,
      gitInfo: {
        branch: 'dev_wms',
        commit: 'abc1234',
        dirtyOutput: ''
      },
      runtimeStatus: {
        modules: {
          agentRegistry: { status: 'READY' },
          canonicalRouter: { status: 'READY' },
          skillIndexer: { status: 'READY' },
          knowledgeSteward: { status: 'READY' },
          instinctManager: { status: 'READY' },
          workflow: { status: 'READY', placeholderPhases: ['execute'] }
        }
      },
      claudeComponentStatus: {
        agents: { installed: true },
        commands: { installed: true },
        skills: { installed: false }
      }
    });

    expect(report.project.name).toBe('auto-wms');
    expect(report.capabilities.agents.count).toBe(1);
    expect(report.capabilities.commands.count).toBe(1);
    expect(report.capabilities.skills.count).toBe(1);
    expect(report.capabilities.rules.count).toBe(1);
    expect(report.capabilities.hooks.count).toBe(2);
    expect(report.capabilities.knowledge.count).toBe(1);
    expect(report.health.claudeMd.status).toBe('PASS');
    expect(report.health.repoMap.status).toBe('INFO');
    expect(report.suggestions).toContain('补齐运行时占位阶段：execute。');

    const output = renderStatusReport(report);
    expect(output).toContain('## 项目状态');
    expect(output).toContain('auto-wms v1.2.3');
  });
});
