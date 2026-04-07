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

  it('treats false and zero as valid required values while rejecting blank strings', () => {
    expect(hasRequiredValue(false)).toBe(true);
    expect(hasRequiredValue(0)).toBe(true);
    expect(hasRequiredValue('')).toBe(false);
    expect(hasRequiredValue('   ')).toBe(false);
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

  it('blocks execute writes when quest designer invocation is not explicitly true', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.discover.healthReport = { status: 'green' };
    state.artifacts.reason.questMap = '# quest map';
    state.artifacts.reason.questDesigner = { invoked: false, agent: 'quest-designer' };
    state.approvals.questMapPresented = true;
    state.approvals.questMapApproved = true;

    expect(() => assertExecutionWriteGate(state)).toThrowError(OrchestrationBlockedError);
    expect(() => assertExecutionWriteGate(state)).toThrow(/questDesigner\.invoked/);
  });

  it('blocks execute writes when discover only has non-WMS fallback context', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.discover.healthReport = { status: 'green' };
    state.artifacts.discover.wmsContext = {
      isWmsRelated: false,
      confidence: 0
    };
    state.artifacts.reason.questMap = 'Quest Map is pending runtime integration.';
    state.artifacts.reason.questDesigner = { invoked: true, agent: 'quest-designer' };
    state.approvals.questMapPresented = true;
    state.approvals.questMapApproved = true;

    expect(() => assertExecutionWriteGate(state)).toThrowError(OrchestrationBlockedError);
    expect(() => assertExecutionWriteGate(state)).toThrow(/wmsContext\.isWmsRelated/);
  });

  it('blocks verify phase when execute artifact has no real execution evidence', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.discover.healthReport = { status: 'green' };
    state.artifacts.reason.questMap = '# quest map';
    state.artifacts.reason.questDesigner = { invoked: true, agent: 'quest-designer' };
    state.artifacts.execute = { executionLog: { steps: [] } };

    expect(() => assertPhaseCanStart(state, 'verify')).toThrowError(OrchestrationBlockedError);
    expect(() => assertPhaseCanStart(state, 'verify')).toThrow(/executionLog\.steps/);
  });

  it('allows verify phase when execute artifact is explicitly skipped with a reason', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.discover.healthReport = { status: 'green' };
    state.artifacts.reason.questMap = '# quest map';
    state.artifacts.reason.questDesigner = { invoked: true, agent: 'quest-designer' };
    state.artifacts.execute = { skipped: true, reason: 'no-op change' };

    expect(() => assertPhaseCanStart(state, 'verify')).not.toThrow();
  });

  it('blocks commit phase when verify artifact has no checks and no explicit skip', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.verify = {
      verification: {
        passed: true,
        checks: []
      }
    };

    expect(() => assertPhaseCanStart(state, 'commit')).toThrowError(OrchestrationBlockedError);
    expect(() => assertPhaseCanStart(state, 'commit')).toThrow(/verification\.checks/);
  });

  it('allows commit phase when verify artifact is explicitly skipped with a reason', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.verify = {
      verification: {
        skipped: true,
        reason: 'verification not required'
      }
    };

    expect(() => assertPhaseCanStart(state, 'commit')).not.toThrow();
  });

  it('blocks commit phase when skipped verify artifact omits a reason', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.verify = {
      verification: {
        skipped: true
      }
    };

    expect(() => assertPhaseCanStart(state, 'commit')).toThrowError(OrchestrationBlockedError);
    expect(() => assertPhaseCanStart(state, 'commit')).toThrow(/explicit skip reason/);
  });

  it('blocks learn phase when commit artifact has no summary and no explicit skip', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.commit = {
      status: 'pending'
    };

    expect(() => assertPhaseCanStart(state, 'learn')).toThrowError(OrchestrationBlockedError);
    expect(() => assertPhaseCanStart(state, 'learn')).toThrow(/artifacts\.commit\.persisted/);
  });

  it('blocks learn phase when commit artifact has a summary but no persisted evidence', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.commit = {
      summary: 'commit pending publication',
      persisted: false
    };

    expect(() => assertPhaseCanStart(state, 'learn')).toThrowError(OrchestrationBlockedError);
    expect(() => assertPhaseCanStart(state, 'learn')).toThrow(/artifacts\.commit\.persisted/);
  });

  it('allows learn phase when commit artifact is explicitly skipped with a reason', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.commit = {
      skipped: true,
      reason: 'nothing to persist'
    };

    expect(() => assertPhaseCanStart(state, 'learn')).not.toThrow();
  });

  it('blocks learn phase when skipped commit artifact omits a usable reason', () => {
    const state = createInitialOrchestrationState('test');
    state.artifacts.commit = {
      skipped: true,
      reason: '   '
    };

    expect(() => assertPhaseCanStart(state, 'learn')).toThrowError(OrchestrationBlockedError);
    expect(() => assertPhaseCanStart(state, 'learn')).toThrow(/explicit skip reason/);
  });
});
