import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';
import { collectDoctorReport, renderDoctorReport } from '../src/doctor.js';

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe('doctor.js', () => {
  let projectDir = '';
  let claudeDir = '';

  afterEach(async () => {
    if (projectDir) {
      await fs.remove(projectDir);
      projectDir = '';
    }

    if (claudeDir) {
      await fs.remove(claudeDir);
      claudeDir = '';
    }
  });

  it('reports environment checks and keeps fix mode read-only', async () => {
    projectDir = await createTempDir('auto-wms-doctor-project-');
    claudeDir = await createTempDir('auto-wms-doctor-claude-');

    await fs.writeJson(path.join(projectDir, 'package.json'), { name: 'auto-wms' });
    await fs.ensureDir(path.join(claudeDir, 'agents'));
    await fs.writeFile(path.join(claudeDir, 'agents', 'a.md'), '# a', 'utf-8');
    await fs.ensureDir(path.join(claudeDir, 'commands', 'wms'));
    await fs.writeFile(path.join(claudeDir, 'commands', 'wms', 'a.md'), '# a', 'utf-8');
    await fs.ensureDir(path.join(claudeDir, 'skills'));
    await fs.writeFile(path.join(claudeDir, 'skills', 'a.md'), '# a', 'utf-8');

    const report = await collectDoctorReport({
      projectDir,
      claudeDir,
      fix: true,
      versions: {
        node: 'v20.11.0',
        npm: '10.2.4',
        git: '2.43.0'
      }
    });

    expect(report.fixRequested).toBe(true);
    expect(report.fixesApplied).toEqual([]);
    expect(report.fixesSkipped).toEqual(['当前 P0 仅支持只读诊断，未执行自动修复。']);
    expect(report.summary.FAIL).toBeGreaterThan(0);
    expect(report.summary.WARN).toBeGreaterThan(0);

    const output = renderDoctorReport(report);
    expect(output).toContain('## Auto WMS 环境诊断报告');
    expect(output).toContain('当前 P0 仅支持只读诊断');
  });
});
