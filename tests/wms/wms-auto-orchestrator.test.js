import { describe, expect, it, vi } from 'vitest';
import { WmsAutoOrchestrator } from '../../src/wms/runtime/wms-auto-orchestrator.js';
import { ORCHESTRATION_MODE, PHASE_STATUS } from '../../src/wms/runtime/phase-contracts.js';

function createExecutors(overrides = {}) {
  return {
    discover: vi.fn().mockResolvedValue({
      healthReport: {
        status: 'green',
        questDesignerAvailable: true,
        hooksEnabled: true,
        capabilityCounts: { agents: 10 },
        recommendedAgent: 'quest-designer'
      }
    }),
    reason: vi.fn().mockResolvedValue({
      questDesigner: {
        invoked: true,
        agent: 'quest-designer',
        generatedAt: '2026-04-07T00:00:00.000Z'
      },
      questMap: '# quest map',
      contracts: ['CONTRACT-1']
    }),
    execute: vi.fn().mockResolvedValue({
      executionLog: {
        steps: ['quest-1']
      }
    }),
    verify: vi.fn().mockResolvedValue({
      verification: {
        passed: true,
        checks: ['tests']
      }
    }),
    commit: vi.fn().mockResolvedValue({
      summary: 'done'
    }),
    learn: vi.fn().mockResolvedValue({
      learning: {
        updated: true
      }
    }),
    ...overrides
  };
}

describe('WmsAutoOrchestrator', () => {
  it('stops after reason phase in plan mode', async () => {
    const executors = createExecutors();
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.PLAN_ONLY,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.COMPLETED);
    expect(state.completedPhases).toEqual(['discover', 'reason']);
    expect(executors.execute).not.toHaveBeenCalled();
    expect(state.artifacts.reason.questMap).toContain('quest map');
  });

  it('blocks plan mode when reason output omits quest designer metadata', async () => {
    const executors = createExecutors({
      reason: vi.fn().mockResolvedValue({
        questMap: '# quest map',
        contracts: ['CONTRACT-1']
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.PLAN_ONLY,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('reason');
  });

  it('blocks run mode before execute when quest map is not approved', async () => {
    const executors = createExecutors();
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('execute');
    expect(state.blockers).toHaveLength(1);
    expect(executors.execute).not.toHaveBeenCalled();
  });

  it('keeps run mode blocked until quest map presentation is explicitly confirmed', async () => {
    const executors = createExecutors();
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('execute');
    expect(state.approvals.questMapPresented).toBe(false);
    expect(executors.execute).not.toHaveBeenCalled();
  });

  it('preserves plan mode quest map presentation state after reason phase', async () => {
    const executors = createExecutors();
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.PLAN_ONLY,
      source: 'test'
    });

    expect(state.approvals.questMapPresented).toBe(false);
    expect(state.approvals.questMapApproved).toBe(false);
  });

  it('preserves explicit quest map presentation state from options', async () => {
    const executors = createExecutors();
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.PLAN_ONLY,
      questMapPresented: false,
      source: 'test'
    });

    expect(state.approvals.questMapPresented).toBe(false);
  });

  it('preserves explicit quest map presentation state in run mode inputs', async () => {
    const executors = createExecutors();
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.approvals.questMapPresented).toBe(true);
  });

  it('allows run mode to proceed after quest map presentation is explicitly confirmed', async () => {
    const executors = createExecutors();
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.COMPLETED);
    expect(state.approvals.questMapPresented).toBe(true);
    expect(executors.execute).toHaveBeenCalledOnce();
  });

  it('runs all phases when quest map is presented, approved, and executors are present', async () => {
    const executors = createExecutors();
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.COMPLETED);
    expect(state.completedPhases).toEqual([
      'discover',
      'reason',
      'execute',
      'verify',
      'commit',
      'learn'
    ]);
    expect(state.artifacts.verify.verification.passed).toBe(true);
    expect(state.artifacts.commit.summary).toBe('done');
    expect(executors.commit).toHaveBeenCalledOnce();
    expect(executors.learn).toHaveBeenCalledOnce();
  });

  it('maps legacy deliver executor overrides to commit phase', async () => {
    const deliver = vi.fn().mockResolvedValue({ summary: 'legacy done' });
    const orchestrator = new WmsAutoOrchestrator({
      executors: createExecutors({ commit: undefined, deliver })
    });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.COMPLETED);
    expect(state.artifacts.commit.summary).toBe('legacy done');
    expect(deliver).toHaveBeenCalledOnce();
  });

  it('blocks run mode when only default runtime executors are available', async () => {
    const orchestrator = new WmsAutoOrchestrator();

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('execute');
    expect(state.completedPhases).toEqual(['discover', 'reason']);
    expect(state.blockers[0]).toMatchObject({
      code: 'ORCHESTRATION_BLOCKED',
      details: {
        phase: 'execute'
      }
    });
  });

  it('blocks reason phase when reason output does not prove quest designer invocation', async () => {
    const executors = createExecutors({
      reason: vi.fn().mockResolvedValue({
        questDesigner: {
          invoked: false,
          agent: 'quest-designer',
          generatedAt: '2026-04-07T00:00:00.000Z'
        },
        questMap: '# quest map',
        contracts: ['CONTRACT-1']
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('reason');
    expect(executors.execute).not.toHaveBeenCalled();
    expect(state.blockers[0].details).toMatchObject({
      phase: 'reason'
    });
  });

  it('blocks plan mode when reason output does not prove quest designer invocation', async () => {
    const executors = createExecutors({
      reason: vi.fn().mockResolvedValue({
        questDesigner: {
          invoked: false,
          agent: 'quest-designer',
          generatedAt: '2026-04-07T00:00:00.000Z'
        },
        questMap: '# quest map',
        contracts: ['CONTRACT-1']
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.PLAN_ONLY,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('reason');
    expect(executors.execute).not.toHaveBeenCalled();
  });

  it('blocks reason phase when reason output omits quest map evidence', async () => {
    const executors = createExecutors({
      reason: vi.fn().mockResolvedValue({
        questDesigner: {
          invoked: true,
          agent: 'quest-designer',
          generatedAt: '2026-04-07T00:00:00.000Z'
        },
        questMap: '   ',
        contracts: ['CONTRACT-1']
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.PLAN_ONLY,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('reason');
  });

  it('blocks run mode when a write phase falls back to default placeholder executors', async () => {
    const executors = createExecutors({
      verify: undefined,
      commit: undefined,
      learn: undefined
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('verify');
    expect(executors.execute).toHaveBeenCalledOnce();
  });

  it('blocks execute phase when execute output has no real evidence', async () => {
    const executors = createExecutors({
      execute: vi.fn().mockResolvedValue({
        executionLog: {
          steps: []
        }
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('execute');
    expect(executors.verify).not.toHaveBeenCalled();
  });

  it('blocks verify phase when verify output has no real evidence', async () => {
    const executors = createExecutors({
      verify: vi.fn().mockResolvedValue({
        verification: {
          passed: true,
          checks: []
        }
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('verify');
    expect(executors.commit).not.toHaveBeenCalled();
    expect(state.blockers[0].details).toMatchObject({
      phase: 'verify'
    });
  });

  it('blocks verify phase when skipped verification omits a reason', async () => {
    const executors = createExecutors({
      verify: vi.fn().mockResolvedValue({
        verification: {
          passed: true,
          skipped: true
        }
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('verify');
    expect(executors.commit).not.toHaveBeenCalled();
  });

  it('allows explicit skipped verification to proceed to commit', async () => {
    const executors = createExecutors({
      verify: vi.fn().mockResolvedValue({
        verification: {
          passed: true,
          skipped: true,
          reason: 'no-op change'
        }
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.COMPLETED);
    expect(executors.commit).toHaveBeenCalledOnce();
  });

  it('allows skipped verification with a reason even when passed is omitted', async () => {
    const executors = createExecutors({
      verify: vi.fn().mockResolvedValue({
        verification: {
          skipped: true,
          reason: 'verification not required'
        }
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.COMPLETED);
    expect(executors.commit).toHaveBeenCalledOnce();
  });

  it('blocks commit phase when skipped commit omits a reason', async () => {
    const executors = createExecutors({
      commit: vi.fn().mockResolvedValue({
        skipped: true
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('commit');
    expect(executors.learn).not.toHaveBeenCalled();
  });

  it('blocks learn phase when learning output is empty', async () => {
    const executors = createExecutors({
      learn: vi.fn().mockResolvedValue({
        learning: {}
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('learn');
  });

  it('blocks learn phase when learning output reports no update', async () => {
    const executors = createExecutors({
      learn: vi.fn().mockResolvedValue({
        learning: {
          updated: false
        }
      })
    });
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      questMapPresented: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.BLOCKED);
    expect(state.currentPhase).toBe('learn');
  });
});
