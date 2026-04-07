import { describe, expect, it } from 'vitest';
import { OrchestrationBlockedError } from '../../src/wms/runtime/orchestration-errors.js';
import { createInitialOrchestrationState } from '../../src/wms/runtime/phase-contracts.js';
import {
  assertExecutionWriteGate,
  assertPhaseCanStart,
  getValueByPath,
  hasRequiredValue
} from '../../src/wms/runtime/gate-checks.js';

describe('gate-checks', () => {
  it('reads nested values by dot path', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.discover.healthReport = { status: 'green' };

    expect(getValueByPath(state, 'artifacts.discover.healthReport.status')).toBe('green');
    expect(getValueByPath(state, 'artifacts.reason.questMap')).toBeUndefined();
  });

  it('treats false and zero as valid required values', () => {
    expect(hasRequiredValue(false)).toBe(true);
    expect(hasRequiredValue(0)).toBe(true);
    expect(hasRequiredValue('')).toBe(false);
    expect(hasRequiredValue(undefined)).toBe(false);
  });

  it('blocks reason phase before discover health report exists', () => {
    const state = createInitialOrchestrationState('test');

    expect(() => assertPhaseCanStart(state, 'reason')).toThrowError(OrchestrationBlockedError);
    expect(() => assertPhaseCanStart(state, 'reason')).toThrow(/discover.healthReport/);
  });

  it('blocks execute writes until quest map prerequisites, presentation, and approval are satisfied', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.discover.healthReport = { status: 'green' };
    state.artifacts.reason.questMap = '# quest map';
    state.artifacts.reason.questDesigner = { invoked: true, agent: 'quest-designer' };

    expect(() => assertExecutionWriteGate(state)).toThrowError(OrchestrationBlockedError);

    state.approvals.questMapApproved = true;

    expect(() => assertExecutionWriteGate(state)).toThrow(/questMapPresented/);

    state.approvals.questMapPresented = true;

    expect(() => assertExecutionWriteGate(state)).not.toThrow();
  });
});
