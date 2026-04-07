import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { parse } from 'yaml';
import {
  buildCommitConventionObservation,
  clampCommitLimit,
  learnFromGitHistory,
  normalizeCommitMessages
} from '../src/learning/git-history-learning.js';

const execFileAsync = promisify(execFile);

describe('git-history-learning', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `git-history-learning-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    await fs.ensureDir(tempDir);
    await execFileAsync('git', ['init'], { cwd: tempDir });
    await execFileAsync('git', ['config', 'user.name', 'Test User'], { cwd: tempDir });
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempDir });
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('normalizes commit message output into non-empty lines', () => {
    expect(normalizeCommitMessages('\nfeat: add router\n\nfix: repair tests\n')).toEqual([
      'feat: add router',
      'fix: repair tests'
    ]);
  });

  it('clamps commit limit to a safe positive range', () => {
    expect(clampCommitLimit(undefined)).toBe(200);
    expect(clampCommitLimit('0')).toBe(200);
    expect(clampCommitLimit('5')).toBe(5);
    expect(clampCommitLimit('9999')).toBe(1000);
  });

  it('builds a reusable observation from conventional commits', () => {
    const observation = buildCommitConventionObservation(
      ['feat: add instinct export', 'fix: tighten defaults', 'docs: update learn command'],
      'auto-wms'
    );

    expect(observation).toEqual({
      pattern: 'Repository uses conventional commit prefixes',
      action: 'Write commit messages with prefixes like docs, feat, fix',
      source: 'Git history analysis',
      evidence: ['auto-wms: analyzed 3 commits', '100% matched conventional commit format'],
      tags: ['git', 'workflow', 'commit']
    });
  });

  it('returns null when conventional commits are not the dominant history pattern', () => {
    const observation = buildCommitConventionObservation(
      ['temporary note', 'feat: add router', 'misc cleanup', 'follow-up change'],
      'auto-wms'
    );

    expect(observation).toBeNull();
  });

  it('requires more than half of commits to match conventional format', () => {
    expect(
      buildCommitConventionObservation(
        ['feat: add router', 'fix: tighten defaults', 'misc', 'note'],
        'auto-wms'
      )
    ).toBeNull();

    expect(
      buildCommitConventionObservation(
        ['feat: add router', 'fix: tighten defaults', 'docs: update learn command', 'misc', 'note'],
        'auto-wms'
      )
    ).toMatchObject({
      pattern: 'Repository uses conventional commit prefixes'
    });
  });

  it('skips learning when repository has no commits yet', async () => {
    const result = await learnFromGitHistory({ projectDir: tempDir, projectName: 'demo' });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('No reusable git history pattern');
    expect(result.analyzedCommits).toBe(0);
  });

  it('skips learning when git history has no reusable pattern', async () => {
    await fs.writeFile(path.join(tempDir, 'note.txt'), 'temporary', 'utf-8');
    await execFileAsync('git', ['add', 'note.txt'], { cwd: tempDir });
    await execFileAsync('git', ['commit', '-m', 'temporary note'], { cwd: tempDir });

    const result = await learnFromGitHistory({ projectDir: tempDir, projectName: 'demo' });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('No reusable git history pattern');
    expect(result.analyzedCommits).toBe(1);
  });

  it('records a git-history instinct candidate from recent commits', async () => {
    const commits = [
      ['README.md', '# demo\n', 'docs: add project intro'],
      ['src.js', 'export const value = 1;\n', 'feat: add first value'],
      ['src.js', 'export const value = 2;\n', 'fix: tighten default value']
    ];

    for (const [fileName, content, message] of commits) {
      await fs.writeFile(path.join(tempDir, fileName), content, 'utf-8');
      await execFileAsync('git', ['add', fileName], { cwd: tempDir });
      await execFileAsync('git', ['commit', '-m', message], { cwd: tempDir });
    }

    const result = await learnFromGitHistory({
      projectDir: tempDir,
      projectName: 'demo',
      commitLimit: 10
    });

    expect(result.skipped).toBe(false);
    expect(result.analyzedCommits).toBe(3);
    expect(result.result.kind).toBe('candidate');
    expect(result.observation.pattern).toBe('Repository uses conventional commit prefixes');

    const candidatesPath = path.join(tempDir, '.aimax', 'instincts', 'candidates.yaml');
    const doc = parse(await fs.readFile(candidatesPath, 'utf-8'));
    expect(doc.candidates).toHaveLength(1);
    expect(doc.candidates[0].pattern).toBe('Repository uses conventional commit prefixes');
    expect(doc.candidates[0].tags).toEqual(['git', 'workflow', 'commit']);
  });
});
