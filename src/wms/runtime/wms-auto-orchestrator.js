import { assertExecutionWriteGate, assertPhaseCanStart } from './gate-checks.js';
import { OrchestrationBlockedError } from './orchestration-errors.js';
import {
  ORCHESTRATION_MODE,
  ORCHESTRATION_PHASES,
  PHASE_STATUS,
  blockPhase,
  completePhase,
  createInitialOrchestrationState,
  finalizeState
} from './phase-contracts.js';

function createDefaultExecutors() {
  return {
    discover: async () => ({
      healthReport: {
        status: 'yellow',
        questDesignerAvailable: true,
        hooksEnabled: true
      }
    }),
    reason: async () => ({
      questDesigner: {
        invoked: true,
        agent: 'quest-designer',
        generatedAt: new Date().toISOString()
      },
      questMap: 'Quest Map is pending runtime integration.',
      contracts: []
    }),
    execute: async () => ({ executionLog: { steps: [] } }),
    verify: async () => ({ verification: { passed: true, checks: [] } }),
    deliver: async () => ({ delivery: { summary: 'pending' } }),
    learn: async () => ({ learning: { updated: false } })
  };
}

export class WmsAutoOrchestrator {
  constructor(options = {}) {
    this.executors = {
      ...createDefaultExecutors(),
      ...(options.executors ?? {})
    };
  }

  async run(intent, options = {}) {
    let state = createInitialOrchestrationState(intent, options);
    state = {
      ...state,
      status: PHASE_STATUS.RUNNING
    };

    for (const phase of ORCHESTRATION_PHASES) {
      try {
        if (phase !== 'discover') {
          assertPhaseCanStart(state, phase);
        }

        if (phase === 'execute') {
          assertExecutionWriteGate(state);
        }
      } catch (error) {
        if (error instanceof OrchestrationBlockedError) {
          return blockPhase(state, phase, {
            message: error.message,
            code: error.code,
            details: error.details
          });
        }

        throw error;
      }

      const result = await this.executors[phase](state, options);
      state = completePhase(state, phase, result);

      if (phase === 'reason') {
        state = {
          ...state,
          approvals: {
            ...state.approvals,
            questMapPresented: true
          }
        };
      }

      if (options.mode === ORCHESTRATION_MODE.PLAN_ONLY && phase === 'reason') {
        return finalizeState(state, PHASE_STATUS.COMPLETED);
      }
    }

    return finalizeState(state, PHASE_STATUS.COMPLETED);
  }
}
