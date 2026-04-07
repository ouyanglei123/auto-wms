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

  it('marks quest map as presented before execute in run mode', async () => {
    const executors = createExecutors();
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
      source: 'test'
    });

    expect(state.status).toBe(PHASE_STATUS.COMPLETED);
    expect(state.approvals.questMapPresented).toBe(true);
    expect(executors.execute).toHaveBeenCalledOnce();
  });

  it('marks plan mode quest map as presented after reason phase', async () => {
    const executors = createExecutors();
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.PLAN_ONLY,
      source: 'test'
    });

    expect(state.approvals.questMapPresented).toBe(true);
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

    expect(state.approvals.questMapPresented).toBe(true);
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

  it('allows run mode to proceed after reason auto-presents the quest map', async () => {
    const executors = createExecutors();
    const orchestrator = new WmsAutoOrchestrator({ executors });

    const state = await orchestrator.run('improve orchestration', {
      mode: ORCHESTRATION_MODE.RUN,
      questMapApproved: true,
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
});
