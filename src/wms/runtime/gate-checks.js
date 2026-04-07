import { OrchestrationBlockedError } from './orchestration-errors.js';

const PHASE_REQUIREMENTS = {
  reason: ['artifacts.discover.healthReport'],
  execute: [
    'artifacts.discover.healthReport',
    'artifacts.reason.questMap',
    'artifacts.reason.questDesigner.invoked'
  ],
  verify: ['artifacts.execute'],
  commit: ['artifacts.verify'],
  learn: ['artifacts.commit']
};

const EXECUTION_WRITE_GATE = [
  'artifacts.discover.healthReport',
  'artifacts.reason.questMap',
  'artifacts.reason.questDesigner.invoked',
  'approvals.questMapPresented',
  'approvals.questMapApproved'
];

const STRICT_TRUE_PATHS = new Set([
  'artifacts.reason.questDesigner.invoked',
  'approvals.questMapPresented',
  'approvals.questMapApproved'
]);

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function hasExecutionEvidence(executeArtifact) {
  if (executeArtifact?.skipped === true) {
    return hasNonEmptyString(executeArtifact.reason);
  }

  return hasNonEmptyArray(executeArtifact?.executionLog?.steps);
}

function hasVerificationEvidence(verifyArtifact) {
  const verification = verifyArtifact?.verification;
  if (!verification) {
    return false;
  }

  if (verification.skipped === true) {
    return hasNonEmptyString(verification.reason);
  }

  return verification.passed === true && hasNonEmptyArray(verification.checks);
}

function hasCommitEvidence(commitArtifact) {
  if (commitArtifact?.skipped === true) {
    return hasNonEmptyString(commitArtifact.reason);
  }

  return commitArtifact?.persisted === true && hasNonEmptyString(commitArtifact?.summary);
}

const PHASE_EVIDENCE_VALIDATORS = {
  verify: {
    isValid: (state) => hasExecutionEvidence(state.artifacts.execute),
    error: 'artifacts.execute.executionLog.steps or explicit skip reason'
  },
  commit: {
    isValid: (state) => hasVerificationEvidence(state.artifacts.verify),
    error: 'artifacts.verify.verification.checks or explicit skip reason'
  },
  learn: {
    isValid: (state) => hasCommitEvidence(state.artifacts.commit),
    error:
      'artifacts.commit.persisted === true and artifacts.commit.summary or explicit skip reason'
  }
};

export function getValueByPath(value, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], value);
}

export function hasRequiredValue(value) {
  if (value === false || value === 0) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  return value !== undefined && value !== null;
}

function assertPaths(state, phase, requiredPaths) {
  const missingPaths = requiredPaths.filter((path) => {
    const value = getValueByPath(state, path);

    if (STRICT_TRUE_PATHS.has(path)) {
      return value !== true;
    }

    return !hasRequiredValue(value);
  });

  if (missingPaths.length > 0) {
    throw new OrchestrationBlockedError(
      `Phase ${phase} is blocked. Missing prerequisites: ${missingPaths.join(', ')}`,
      {
        phase,
        missingPaths
      }
    );
  }
}

export function assertPhaseCanStart(state, phase) {
  const requiredPaths = PHASE_REQUIREMENTS[phase] ?? [];
  assertPaths(state, phase, requiredPaths);

  const validator = PHASE_EVIDENCE_VALIDATORS[phase];
  if (!validator || validator.isValid(state)) {
    return;
  }

  throw new OrchestrationBlockedError(
    `Phase ${phase} is blocked. Missing execution evidence: ${validator.error}`,
    {
      phase,
      missingPaths: [validator.error]
    }
  );
}

export function assertExecutionWriteGate(state) {
  assertPaths(state, 'execute', EXECUTION_WRITE_GATE);

  if (state.artifacts.discover?.wmsContext?.isWmsRelated === false) {
    throw new OrchestrationBlockedError(
      'Phase execute is blocked. Missing prerequisites: artifacts.discover.wmsContext.isWmsRelated',
      {
        phase: 'execute',
        missingPaths: ['artifacts.discover.wmsContext.isWmsRelated']
      }
    );
  }
}
