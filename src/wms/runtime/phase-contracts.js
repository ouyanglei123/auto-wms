export const ORCHESTRATION_MODE = {
  PLAN_ONLY: 'plan',
  RUN: 'run'
};

export const PHASE_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  FAILED: 'failed'
};

export const ORCHESTRATION_PHASES = ['discover', 'reason', 'execute', 'verify', 'deliver', 'learn'];

export function createInitialOrchestrationState(intent, options = {}) {
  return {
    intent,
    status: PHASE_STATUS.IDLE,
    currentPhase: 'discover',
    completedPhases: [],
    blockers: [],
    errors: [],
    source: options.source ?? 'unknown',
    mode: options.mode ?? ORCHESTRATION_MODE.PLAN_ONLY,
    approvals: {
      questMapApproved: Boolean(options.questMapApproved),
      questMapPresented: Boolean(options.questMapPresented)
    },
    artifacts: {
      discover: {},
      reason: {},
      execute: {},
      verify: {},
      deliver: {},
      learn: {}
    },
    metadata: {
      startedAt: options.startedAt ?? new Date().toISOString(),
      updatedAt: options.startedAt ?? new Date().toISOString()
    }
  };
}

export function updatePhaseState(state, phase, patch = {}) {
  return {
    ...state,
    currentPhase: phase,
    artifacts: {
      ...state.artifacts,
      [phase]: {
        ...state.artifacts[phase],
        ...patch
      }
    },
    metadata: {
      ...state.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}

export function completePhase(state, phase, patch = {}) {
  const nextCompletedPhases = state.completedPhases.includes(phase)
    ? state.completedPhases
    : [...state.completedPhases, phase];

  return {
    ...updatePhaseState(state, phase, patch),
    status: PHASE_STATUS.RUNNING,
    completedPhases: nextCompletedPhases,
    blockers: []
  };
}

export function blockPhase(state, phase, blocker) {
  return {
    ...state,
    status: PHASE_STATUS.BLOCKED,
    currentPhase: phase,
    blockers: [blocker],
    metadata: {
      ...state.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}

export function finalizeState(state, status) {
  return {
    ...state,
    status,
    metadata: {
      ...state.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}
