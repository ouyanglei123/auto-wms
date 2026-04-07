import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { parse } from 'yaml';
import {
  buildObservation,
  extractObservation,
  learnFromTaskEvent
} from '../src/learning/task-event-learning.js';

describe('task-event-learning', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `task-learning-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('builds observation from explicit instinct payload', () => {
    const observation = buildObservation({
      pattern: 'Use Result<T> in controllers',
      action: 'Wrap controller responses with Result<T>',
      source: 'Manual note',
      evidence: ['UserController'],
      tags: ['java', 'spring']
    });

    expect(observation).toEqual({
      pattern: 'Use Result<T> in controllers',
      action: 'Wrap controller responses with Result<T>',
      source: 'Manual note',
      evidence: ['UserController'],
      tags: ['java', 'spring']
    });
  });

  it('extracts reusable observation from task summary payload', () => {
    const observation = extractObservation({
      task_summary: {
        patterns: ['Route maintenance intents through registry agents'],
        key_decisions: ['Keep CanonicalRouter generic'],
        evidence: ['src/router/agent-registry.js', 'tests/canonical-router.test.js'],
        tags: ['router', 'registry']
      }
    });

    expect(observation.pattern).toBe('Route maintenance intents through registry agents');
    expect(observation.action).toBe(
      'When similar tasks appear, apply: Keep CanonicalRouter generic'
    );
    expect(observation.evidence).toEqual([
      'src/router/agent-registry.js',
      'tests/canonical-router.test.js'
    ]);
    expect(observation.tags).toEqual(['router', 'registry']);
  });

  it('falls back to task summary when instinct payload is invalid', () => {
    const observation = extractObservation({
      instinct: {
        pattern: 'Guard dangerous defaults'
      },
      task_summary: {
        patterns: ['Route maintenance intents through registry agents'],
        key_decisions: ['Keep CanonicalRouter generic'],
        evidence: 'src/router/agent-registry.js',
        tags: 'router'
      }
    });

    expect(observation).toEqual({
      pattern: 'Route maintenance intents through registry agents',
      action: 'When similar tasks appear, apply: Keep CanonicalRouter generic',
      source: 'TaskCompleted hook',
      evidence: ['src/router/agent-registry.js'],
      tags: ['router']
    });
  });

  it('uses scalar summary action when provided', () => {
    const observation = extractObservation({
      task_summary: {
        patterns: ['Guard dangerous defaults'],
        actions: 'Require explicit opt-in for risky automation',
        evidence: 'src/knowledge/knowledge-steward.js',
        tags: 'security'
      }
    });

    expect(observation).toEqual({
      pattern: 'Guard dangerous defaults',
      action: 'Require explicit opt-in for risky automation',
      source: 'TaskCompleted hook',
      evidence: ['src/knowledge/knowledge-steward.js'],
      tags: ['security']
    });
  });

  it('returns skipped result when no reusable pattern exists', async () => {
    const result = await learnFromTaskEvent(
      { task_summary: { evidence: ['only evidence'] } },
      { projectDir: tempDir }
    );

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('No reusable pattern');
  });

  it('records task-completed event into instinct candidates', async () => {
    const event = {
      task_summary: {
        patterns: ['Guard dangerous defaults'],
        key_decisions: ['Require explicit opt-in for risky automation'],
        evidence: ['src/knowledge/knowledge-steward.js'],
        tags: ['security', 'defaults']
      }
    };

    const result = await learnFromTaskEvent(event, { projectDir: tempDir });
    expect(result.skipped).toBe(false);
    expect(result.result.kind).toBe('candidate');

    const candidatesPath = path.join(tempDir, '.aimax', 'instincts', 'candidates.yaml');
    const doc = parse(await fs.readFile(candidatesPath, 'utf-8'));
    expect(doc.candidates).toHaveLength(1);
    expect(doc.candidates[0].pattern).toBe('Guard dangerous defaults');
    expect(doc.candidates[0].action).toBe(
      'When similar tasks appear, apply: Require explicit opt-in for risky automation'
    );
  });

  it('persists normalized summary-derived observation when invalid instinct falls back', async () => {
    const event = {
      instinct: {
        pattern: '   ',
        action: '  '
      },
      task_summary: {
        patterns: ['Guard dangerous defaults'],
        key_decisions: ['Require explicit opt-in for risky automation'],
        evidence: [' src/knowledge/knowledge-steward.js ', 'src/knowledge/knowledge-steward.js'],
        tags: [' security ', 'security', 'defaults']
      }
    };

    const result = await learnFromTaskEvent(event, { projectDir: tempDir });
    expect(result.skipped).toBe(false);
    expect(result.observation).toEqual({
      pattern: 'Guard dangerous defaults',
      action: 'When similar tasks appear, apply: Require explicit opt-in for risky automation',
      source: 'TaskCompleted hook',
      evidence: ['src/knowledge/knowledge-steward.js'],
      tags: ['security', 'defaults']
    });

    const candidatesPath = path.join(tempDir, '.aimax', 'instincts', 'candidates.yaml');
    const doc = parse(await fs.readFile(candidatesPath, 'utf-8'));
    expect(doc.candidates).toHaveLength(1);
    expect(doc.candidates[0].pattern).toBe('Guard dangerous defaults');
    expect(doc.candidates[0].action).toBe(
      'When similar tasks appear, apply: Require explicit opt-in for risky automation'
    );
    expect(doc.candidates[0].evidence).toEqual(['src/knowledge/knowledge-steward.js']);
    expect(doc.candidates[0].tags).toEqual(['security', 'defaults']);
  });
});
