function createPlaceholderArtifact(phase, patch) {
  return {
    __placeholder: true,
    phase,
    ...patch
  };
}

function normalizeCodeLocationList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim())
    : [];
}

function buildWmsContextSummary(wmsContext) {
  if (!wmsContext?.isWmsRelated) {
    return null;
  }

  if (
    Array.isArray(wmsContext.controllers) &&
    Array.isArray(wmsContext.services) &&
    Array.isArray(wmsContext.entities)
  ) {
    return wmsContext;
  }

  return {
    isWmsRelated: true,
    targetService: wmsContext.targetService ?? 'unknown-service',
    businessDomain: wmsContext.businessDomain ?? '通用',
    confidence: wmsContext.confidence ?? 0,
    controllers: normalizeCodeLocationList(wmsContext.codeLocations?.controllers),
    services: normalizeCodeLocationList(wmsContext.codeLocations?.services),
    entities: normalizeCodeLocationList(wmsContext.codeLocations?.entities)
  };
}

function buildDefaultContracts(wmsContext) {
  const summary = buildWmsContextSummary(wmsContext);
  if (!summary) {
    return ['CONTRACT: collect WMS context before execution'];
  }

  return [
    `SERVICE:${summary.targetService}`,
    `DOMAIN:${summary.businessDomain}`,
    `CONFIDENCE:${summary.confidence}`,
    `CONTROLLERS:${summary.controllers.join(', ') || 'N/A'}`,
    `SERVICES:${summary.services.join(', ') || 'N/A'}`,
    `ENTITIES:${summary.entities.join(', ') || 'N/A'}`
  ];
}

function buildDefaultQuestMap(wmsContext) {
  const summary = buildWmsContextSummary(wmsContext);
  if (!summary) {
    return 'Quest Map is pending runtime integration.';
  }

  return [
    '# Quest Map',
    `- Target Service: ${summary.targetService}`,
    `- Business Domain: ${summary.businessDomain}`,
    `- Confidence: ${summary.confidence}%`,
    `- Controllers: ${summary.controllers.join(', ') || 'N/A'}`,
    `- Services: ${summary.services.join(', ') || 'N/A'}`,
    `- Entities: ${summary.entities.join(', ') || 'N/A'}`,
    '- Objective: trace the identified WMS business path before any write phase.',
    '- Verification: confirm the mapped controller/service/entity chain matches the intended business flow.'
  ].join('\n');
}

function createDefaultExecutors() {
  return {
    discover: async (state) => ({
      healthReport: {
        status: 'yellow',
        questDesignerAvailable: true,
        hooksEnabled: true
      },
      wmsContext: state.artifacts.discover.wmsContext ?? null
    }),
    reason: async (state) => {
      const summary = buildWmsContextSummary(state.artifacts.discover.wmsContext);

      return {
        questDesigner: {
          invoked: true,
          agent: 'quest-designer',
          generatedAt: new Date().toISOString()
        },
        questMap: buildDefaultQuestMap(summary),
        wmsContext: state.artifacts.discover.wmsContext ?? null,
        contracts: buildDefaultContracts(summary)
      };
    },
    execute: async () =>
      createPlaceholderArtifact('execute', {
        executionLog: { steps: [] },
        reason: 'Default execute executor is a placeholder and cannot perform writes.'
      }),
    verify: async () =>
      createPlaceholderArtifact('verify', {
        verification: { passed: false, checks: [] },
        reason: 'Default verify executor is a placeholder and cannot validate execution.'
      }),
    commit: async () =>
      createPlaceholderArtifact('commit', {
        summary: 'pending',
        persisted: false,
        reason: 'Default commit executor is a placeholder and cannot persist changes.'
      }),
    learn: async () =>
      createPlaceholderArtifact('learn', {
        learning: { updated: false },
        reason: 'Default learn executor is a placeholder and cannot record learnings.'
      })
  };
}

function normalizeExecutors(executors = {}) {
  if (executors.commit || !executors.deliver) {
    return executors;
  }

  return {
    ...executors,
    commit: executors.deliver
  };
}

function createExecutorEntries(executors = {}) {
  const normalizedExecutors = normalizeExecutors(executors);
  const defaultExecutors = createDefaultExecutors();

  return Object.fromEntries(
    Object.keys(defaultExecutors).map((phase) => {
      const overrideExecutor = normalizedExecutors[phase];
      const executor =
        typeof overrideExecutor === 'function' ? overrideExecutor : defaultExecutors[phase];
      return [
        phase,
        {
          executor,
          isDefault: executor === defaultExecutors[phase]
        }
      ];
    })
  );
}

export {
  buildDefaultContracts,
  buildDefaultQuestMap,
  createDefaultExecutors,
  createExecutorEntries,
  createPlaceholderArtifact,
  normalizeCodeLocationList,
  normalizeExecutors
};
