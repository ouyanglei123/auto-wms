import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { parse } from 'yaml';
import { InstinctManager } from '../src/learning/instinct-manager.js';

describe('InstinctManager', () => {
  let tempDir;
  let manager;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `instinct-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    await fs.ensureDir(tempDir);
    manager = new InstinctManager(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('creates instinct storage structure', async () => {
    const dir = await manager.ensureStructure();

    expect(dir).toBe(path.join(tempDir, '.aimax', 'instincts'));
    expect(await fs.pathExists(path.join(dir, 'instincts.yaml'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'candidates.yaml'))).toBe(true);
  });

  it('records first observation as a candidate', async () => {
    const result = await manager.observe({
      pattern: 'Controller methods return Result<T>',
      action: 'Wrap controller responses with Result<T>',
      source: 'Observed in API review',
      evidence: ['UserController.getById'],
      tags: ['java', 'spring']
    });

    expect(result.kind).toBe('candidate');
    expect(result.promoted).toBe(false);
    expect(result.confidence).toBe(0.3);
    expect(result.observations).toBe(1);

    const status = await manager.getStatus();
    expect(status.counts.candidates).toBe(1);
    expect(status.counts.instincts).toBe(0);
    expect(status.candidates[0].pattern).toBe('Controller methods return Result<T>');
  });

  it('promotes repeated observations to instinct', async () => {
    const payload = {
      pattern: 'Service methods keep transaction boundaries explicit',
      action: 'Add @Transactional only at service boundary methods',
      source: 'Observed in service refactors',
      tags: ['java', 'transaction']
    };

    await manager.observe({ ...payload, evidence: ['OrderService.create'] });
    await manager.observe({ ...payload, evidence: ['OrderService.cancel'] });
    const result = await manager.observe({ ...payload, evidence: ['OrderService.confirm'] });

    expect(result.kind).toBe('instinct');
    expect(result.promoted).toBe(true);
    expect(result.confidence).toBe(0.6);
    expect(result.observations).toBe(3);

    const status = await manager.getStatus();
    expect(status.counts.candidates).toBe(0);
    expect(status.counts.instincts).toBe(1);
    expect(status.instincts[0].pattern).toBe(payload.pattern);
    expect(status.instincts[0].evidence).toHaveLength(3);
  });

  it('updates existing instinct and merges metadata', async () => {
    const instinctsPath = path.join(tempDir, '.aimax', 'instincts', 'instincts.yaml');
    await manager.ensureStructure();
    await fs.writeFile(
      instinctsPath,
      `version: 2\ninstincts:\n  - id: inst-existing\n    pattern: "Use Vitest for JS tests"\n    confidence: 0.6\n    action: "Prefer Vitest in test setup"\n    source: "Observed before"\n    evidence:\n      - "tests/a.test.js"\n    tags:\n      - "testing"\n    observations: 3\n    created_at: "2026-04-06"\n    updated_at: "2026-04-06"\n`,
      'utf-8'
    );

    const result = await manager.observe({
      pattern: 'Use Vitest for JS tests',
      action: 'Prefer Vitest in test setup',
      evidence: ['tests/b.test.js'],
      tags: ['js', 'testing']
    });

    expect(result.kind).toBe('instinct');
    expect(result.promoted).toBe(false);
    expect(result.observations).toBe(4);

    const doc = parse(await fs.readFile(instinctsPath, 'utf-8'));
    expect(doc.instincts[0].evidence).toEqual(['tests/a.test.js', 'tests/b.test.js']);
    expect(doc.instincts[0].tags).toEqual(['testing', 'js']);
    expect(doc.instincts[0].confidence).toBe(0.6);
  });

  it('exports instincts and candidates to a shareable yaml file', async () => {
    await manager.observe({
      pattern: 'Use Result<T> in controllers',
      action: 'Wrap controller responses with Result<T>',
      evidence: ['UserController.getById']
    });
    await manager.observe({
      pattern: 'Guard dangerous defaults',
      action: 'Require explicit opt-in for risky automation',
      evidence: ['src/feature.js']
    });
    await manager.observe({
      pattern: 'Guard dangerous defaults',
      action: 'Require explicit opt-in for risky automation',
      evidence: ['src/another-feature.js']
    });
    await manager.observe({
      pattern: 'Guard dangerous defaults',
      action: 'Require explicit opt-in for risky automation',
      evidence: ['src/final-feature.js']
    });

    const exportPath = path.join(tempDir, 'shared', 'team-instincts.yaml');
    const result = await manager.exportTo(exportPath);
    const doc = parse(await fs.readFile(exportPath, 'utf-8'));

    expect(result.filePath).toBe(exportPath);
    expect(result.counts.instincts).toBe(1);
    expect(result.counts.candidates).toBe(1);
    expect(doc.instincts).toHaveLength(1);
    expect(doc.candidates).toHaveLength(1);
  });

  it('imports instincts and candidates without duplicating repeated imports', async () => {
    const importPath = path.join(tempDir, 'imports', 'team-instincts.yaml');
    await fs.ensureDir(path.dirname(importPath));
    await fs.writeFile(
      importPath,
      `version: 2\ninstincts:\n  - id: inst-imported\n    pattern: "Use Vitest for JS tests"\n    confidence: 0.8\n    action: "Prefer Vitest in test setup"\n    source: "Imported"\n    evidence:\n      - "tests/a.test.js"\n    tags:\n      - "testing"\n    observations: 6\n    created_at: "2026-04-06"\n    updated_at: "2026-04-06"\ncandidates:\n  - id: cand-imported\n    pattern: "Guard dangerous defaults"\n    confidence: 0.3\n    action: "Require explicit opt-in for risky automation"\n    source: "Imported"\n    evidence:\n      - "src/feature.js"\n    tags:\n      - "security"\n    observations: 1\n    created_at: "2026-04-06"\n    updated_at: "2026-04-06"\n`,
      'utf-8'
    );

    await manager.observe({
      pattern: 'Use Vitest for JS tests',
      action: 'Prefer Vitest in test setup',
      evidence: ['tests/b.test.js'],
      tags: ['js']
    });

    await manager.importFrom(importPath);
    await manager.importFrom(importPath);

    const status = await manager.getStatus();
    expect(status.counts.instincts).toBe(1);
    expect(status.counts.candidates).toBe(1);
    expect(status.instincts[0].observations).toBe(6);
    expect(status.instincts[0].evidence).toEqual(['tests/b.test.js', 'tests/a.test.js']);
    expect(status.instincts[0].tags).toEqual(['js', 'testing']);
    expect(status.candidates[0].pattern).toBe('Guard dangerous defaults');
    expect(status.candidates[0].evidence).toEqual(['src/feature.js']);
  });

  it('evolves related instincts into higher-level skill proposals', async () => {
    const testingInstincts = [
      {
        pattern: 'Use Vitest for JS tests',
        action: 'Prefer Vitest in test setup',
        tags: ['testing', 'js'],
        evidence: ['tests/a.test.js']
      },
      {
        pattern: 'Keep JS tests isolated with temp directories',
        action: 'Use temp directories for file-system tests',
        tags: ['testing', 'js'],
        evidence: ['tests/fs.test.js']
      }
    ];

    for (const instinct of testingInstincts) {
      await manager.observe(instinct);
      await manager.observe({ ...instinct, evidence: [`${instinct.evidence[0]}:2`] });
      await manager.observe({ ...instinct, evidence: [`${instinct.evidence[0]}:3`] });
    }

    await manager.observe({
      pattern: 'Use Result<T> in controllers',
      action: 'Wrap controller responses with Result<T>',
      tags: ['java'],
      evidence: ['UserController.getById']
    });
    await manager.observe({
      pattern: 'Use Result<T> in controllers',
      action: 'Wrap controller responses with Result<T>',
      tags: ['java'],
      evidence: ['UserController.getById:2']
    });
    await manager.observe({
      pattern: 'Use Result<T> in controllers',
      action: 'Wrap controller responses with Result<T>',
      tags: ['java'],
      evidence: ['UserController.getById:3']
    });

    const evolvePath = path.join(tempDir, 'shared', 'evolved-skills.yaml');
    const result = await manager.evolveTo(evolvePath);
    const doc = parse(await fs.readFile(evolvePath, 'utf-8'));

    expect(result.filePath).toBe(evolvePath);
    expect(result.count).toBe(2);
    expect(doc.skills).toHaveLength(2);
    expect(doc.skills.find((skill) => skill.name === 'testing practices').patterns).toEqual([
      'Use Vitest for JS tests',
      'Keep JS tests isolated with temp directories'
    ]);
  });
});
