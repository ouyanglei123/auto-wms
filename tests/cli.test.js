import { describe, it, expect, vi } from 'vitest';

vi.mock('chalk', () => ({
  default: {
    cyan: Object.assign((s) => s, { bold: (s) => s }),
    white: Object.assign((s) => s, { bold: (s) => s }),
    green: Object.assign((s) => s, { bold: (s) => s }),
    gray: (s) => s,
    yellow: (s) => s,
    red: (s) => s,
    bold: (s) => s
  }
}));

vi.mock('../src/index.js', () => ({
  interactiveMode: vi.fn(),
  runInstall: vi.fn(),
  runUpdate: vi.fn(),
  runUninstall: vi.fn(),
  runDocs: vi.fn(),
  runRoute: vi.fn(),
  runWmsAuto: vi.fn(),
  runStatus: vi.fn(),
  runDoctor: vi.fn()
}));

vi.mock('../src/utils.js', () => ({
  getPackageVersion: () => '0.27.0',
  COMPONENTS: {},
  openBrowser: vi.fn().mockResolvedValue(true)
}));

vi.mock('../src/config.js', () => ({
  DOCS_URL: 'https://example.com/docs'
}));

vi.mock('../src/knowledge/knowledge-steward.js', () => ({
  KnowledgeSteward: class {
    save = vi.fn();
    list = vi.fn();
    search = vi.fn();
  }
}));

vi.mock('../src/learning/instinct-manager.js', () => ({
  InstinctManager: class {
    observe = vi.fn();
    getStatus = vi.fn();
    exportTo = vi.fn();
    importFrom = vi.fn();
    evolveTo = vi.fn();
  }
}));

vi.mock('../src/learning/task-event-learning.js', () => ({
  learnFromTaskEvent: vi.fn()
}));

vi.mock('../src/learning/git-history-learning.js', () => ({
  learnFromGitHistory: vi.fn()
}));

import { createProgram, shouldParseCli } from '../bin/cli.js';

function createHandlers() {
  return {
    interactiveMode: vi.fn().mockResolvedValue(undefined),
    runInstall: vi.fn().mockResolvedValue(undefined),
    runUpdate: vi.fn().mockResolvedValue(undefined),
    runDocs: vi.fn().mockResolvedValue(undefined),
    runRoute: vi.fn().mockResolvedValue(undefined),
    runWmsAuto: vi.fn().mockResolvedValue(undefined),
    runStatus: vi.fn().mockResolvedValue(undefined),
    runDoctor: vi.fn().mockResolvedValue(undefined)
  };
}

describe('cli.js', () => {
  it('parses wms:auto flags and forwards them to runWmsAuto', async () => {
    const handlers = createHandlers();
    const program = createProgram(handlers);

    await program.parseAsync(
      [
        'node',
        'auto',
        'wms:auto',
        'improve orchestration',
        '--run',
        '--present-quest-map',
        '--approve-quest-map',
        '--json'
      ],
      { from: 'node' }
    );

    expect(handlers.runWmsAuto).toHaveBeenCalledWith(
      'improve orchestration',
      expect.objectContaining({
        run: true,
        presentQuestMap: true,
        approveQuestMap: true,
        json: true
      })
    );
  });

  it('keeps optional wms:auto flags false when they are omitted', async () => {
    const handlers = createHandlers();
    const program = createProgram(handlers);

    await program.parseAsync(['node', 'auto', 'wms:auto', 'inspect runtime'], { from: 'node' });

    expect(handlers.runWmsAuto).toHaveBeenCalledWith(
      'inspect runtime',
      expect.objectContaining({
        run: false,
        presentQuestMap: false,
        approveQuestMap: false,
        json: false
      })
    );
  });

  it('routes the default command through the injected interactive handler', async () => {
    const handlers = createHandlers();
    const program = createProgram(handlers);

    await program.parseAsync(['node', 'auto'], { from: 'node' });

    expect(handlers.interactiveMode).toHaveBeenCalledOnce();
  });

  it('routes install through the injected handler with normalized options', async () => {
    const handlers = createHandlers();
    const program = createProgram(handlers);

    await program.parseAsync(
      ['node', 'auto', 'install', '--yes', '--force', '--components', 'agents, commands'],
      {
        from: 'node'
      }
    );

    expect(handlers.runInstall).toHaveBeenCalledWith({
      yes: true,
      force: true,
      quiet: false,
      components: ['agents', 'commands']
    });
  });

  it('does not parse automatically when argv has no entry script', () => {
    expect(shouldParseCli(['node'], 'file:///cli.js')).toBe(false);
  });

  it('routes docs through the injected handler', async () => {
    const handlers = createHandlers();
    const program = createProgram(handlers);

    await program.parseAsync(['node', 'auto', 'docs'], { from: 'node' });

    expect(handlers.runDocs).toHaveBeenCalledOnce();
  });

  it('routes doctor through the injected handler with normalized options', async () => {
    const handlers = createHandlers();
    const program = createProgram(handlers);

    await program.parseAsync(['node', 'auto', 'doctor', '--json', '--fix', '--directory', '.'], {
      from: 'node'
    });

    expect(handlers.runDoctor).toHaveBeenCalledWith({
      json: true,
      fix: true,
      directory: '.'
    });
  });
});
