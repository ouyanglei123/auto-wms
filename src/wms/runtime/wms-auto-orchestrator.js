import {
  assertExecutionWriteGate,
  assertPhaseCanStart,
  hasNonEmptyArray,
  hasNonEmptyString
} from './gate-checks.js';
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
import {
  buildDefaultContracts,
  buildDefaultQuestMap,
  createExecutorEntries
} from './wms-auto-artifacts.js';

const WRITE_PHASES = new Set(['execute', 'verify', 'commit', 'learn']);

function isWritePhase(phase) {
  return WRITE_PHASES.has(phase);
}

function isExplicitlySkipped(result) {
  return result?.skipped === true;
}

function getSkipReason(result) {
  return typeof result?.reason === 'string' && result.reason.trim() ? result.reason : '';
}

function isReasonArtifactSufficient(result) {
  return result?.questDesigner?.invoked === true && hasNonEmptyString(result?.questMap);
}

function isExecuteArtifactSufficient(result) {
  if (isExplicitlySkipped(result)) {
    return Boolean(getSkipReason(result));
  }

  return hasNonEmptyArray(result?.executionLog?.steps);
}

function isVerificationArtifactSufficient(result) {
  const verification = result?.verification;
  if (!verification) {
    return false;
  }

  if (isExplicitlySkipped(verification)) {
    return Boolean(getSkipReason(verification));
  }

  return verification.passed === true && hasNonEmptyArray(verification.checks);
}

function isCommitArtifactSufficient(result) {
  if (isExplicitlySkipped(result)) {
    return Boolean(getSkipReason(result));
  }

  return result?.persisted === true && hasNonEmptyString(result?.summary);
}

function hasReusableObservation(observation) {
  return hasNonEmptyString(observation?.pattern) && hasNonEmptyString(observation?.action);
}

function isLearnArtifactSufficient(result) {
  if (isExplicitlySkipped(result)) {
    return Boolean(getSkipReason(result));
  }

  return result?.learning?.updated === true && hasReusableObservation(result?.observation);
}

function isPhaseResultSufficient(phase, result) {
  if (phase === 'reason') {
    return isReasonArtifactSufficient(result);
  }

  if (phase === 'execute') {
    return isExecuteArtifactSufficient(result);
  }

  if (phase === 'verify') {
    return isVerificationArtifactSufficient(result);
  }

  if (phase === 'commit') {
    return isCommitArtifactSufficient(result);
  }

  if (phase === 'learn') {
    return isLearnArtifactSufficient(result);
  }

  return true;
}

function getPhaseResultReason(phase, result) {
  if (phase === 'reason') {
    return 'reason phase requires questDesigner.invoked === true and a non-empty questMap.';
  }

  if (phase === 'execute') {
    return (
      getSkipReason(result) ||
      'execute phase requires executionLog.steps or explicit skip semantics.'
    );
  }

  if (phase === 'verify') {
    return (
      getSkipReason(result?.verification) ||
      'verify phase requires checks or explicit skip semantics.'
    );
  }

  if (phase === 'commit') {
    return (
      getSkipReason(result) ||
      'commit phase requires persisted === true and a non-empty summary or explicit skip semantics.'
    );
  }

  if (phase === 'learn') {
    return (
      getSkipReason(result) ||
      'learn phase requires learning.updated === true and a reusable observation or explicit skip semantics.'
    );
  }

  return (
    getSkipReason(result) ||
    `${phase} phase requires a concrete artifact or explicit skip semantics.`
  );
}

function buildDefaultExecutorReason(phase, result) {
  return getSkipReason(result) || `Default ${phase} executor is a placeholder.`;
}

function buildPlaceholderArtifactReason(phase, result) {
  return getSkipReason(result) || `Placeholder ${phase} artifact cannot satisfy runtime execution.`;
}

function buildInsufficientResultReason(phase, result) {
  return getPhaseResultReason(phase, result);
}

function createRuntimeBlocker(phase, reason, category) {
  return createPhaseBlocker(phase, `Phase ${phase} is blocked. ${reason}`, {
    reason: category
  });
}

function validatePhaseResult(phase, result, metadata = {}, options = {}) {
  if (phase === 'reason' && !isPhaseResultSufficient(phase, result)) {
    return createRuntimeBlocker(
      phase,
      buildInsufficientResultReason(phase, result),
      'insufficient-phase-result'
    );
  }

  if (options.mode !== ORCHESTRATION_MODE.RUN || !isWritePhase(phase)) {
    return null;
  }

  if (metadata.isDefault) {
    return createRuntimeBlocker(
      phase,
      buildDefaultExecutorReason(phase, result),
      'default-placeholder-executor'
    );
  }

  if (result?.__placeholder === true) {
    return createRuntimeBlocker(
      phase,
      buildPlaceholderArtifactReason(phase, result),
      'placeholder-artifact'
    );
  }

  if (!isPhaseResultSufficient(phase, result)) {
    return createRuntimeBlocker(
      phase,
      buildInsufficientResultReason(phase, result),
      'insufficient-phase-result'
    );
  }

  return null;
}

function getExecutionResult(result) {
  return result && typeof result === 'object' && 'artifact' in result ? result.artifact : result;
}

function getExecutorMetadata(result) {
  if (!result || typeof result !== 'object' || !('artifact' in result)) {
    return {};
  }

  return result.meta && typeof result.meta === 'object' ? result.meta : {};
}

function createPhaseBlocker(phase, message, details = {}) {
  return {
    message,
    code: 'ORCHESTRATION_BLOCKED',
    details: {
      phase,
      ...details
    }
  };
}

export class WmsAutoOrchestrator {
  constructor(options = {}) {
    this.executors = createExecutorEntries(options.executors);
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

      const executorEntry = this.executors[phase];
      const rawResult = await executorEntry.executor(state, options);
      const result = getExecutionResult(rawResult);
      const validationBlocker = validatePhaseResult(
        phase,
        result,
        { ...getExecutorMetadata(rawResult), isDefault: executorEntry.isDefault },
        options
      );
      if (validationBlocker) {
        return blockPhase(state, phase, validationBlocker);
      }

      state = completePhase(state, phase, result);

      if (options.mode === ORCHESTRATION_MODE.PLAN_ONLY && phase === 'reason') {
        return finalizeState(state, PHASE_STATUS.COMPLETED);
      }
    }

    return finalizeState(state, PHASE_STATUS.COMPLETED);
  }
}
