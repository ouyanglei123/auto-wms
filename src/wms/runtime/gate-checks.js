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

const STRICT_TRUE_PATHS = new Set(['approvals.questMapPresented', 'approvals.questMapApproved']);

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

  return value !== undefined && value !== null && value !== '';
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
}

export function assertExecutionWriteGate(state) {
  assertPaths(state, 'execute', EXECUTION_WRITE_GATE);
}
