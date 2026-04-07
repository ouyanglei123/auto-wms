import path from 'node:path';
import fs from 'fs-extra';
import { parse } from 'yaml';
import { AgentRegistry } from './router/agent-registry.js';
import { CanonicalRouter } from './router/canonical-router.js';
import { SkillIndexer } from './skills/skill-indexer.js';
import { WmsAutoOrchestrator } from './wms/runtime/index.js';

function createReadyState(details = {}) {
  return {
    status: 'READY',
    ...details
  };
}

function createErrorState(error) {
  return {
    status: 'ERROR',
    error: error instanceof Error ? error.message : String(error)
  };
}

async function safeRuntimeSection(factory) {
  try {
    return await factory();
  } catch (error) {
    return createErrorState(error);
  }
}

async function countInsightEntries(projectDir) {
  const insightsDir = path.join(projectDir, '.auto', 'insights');
  if (!(await fs.pathExists(insightsDir))) {
    return { exists: false, files: 0, entries: 0 };
  }

  const files = (await fs.readdir(insightsDir)).filter((file) => file.endsWith('.md'));
  let entries = 0;

  for (const file of files) {
    const content = await fs.readFile(path.join(insightsDir, file), 'utf-8');
    entries += (content.match(/^### /gm) || []).length;
  }

  return {
    exists: true,
    files: files.length,
    entries
  };
}

async function readYamlList(filePath, key) {
  if (!(await fs.pathExists(filePath))) {
    return [];
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const data = parse(content) || {};
  return Array.isArray(data[key]) ? data[key] : [];
}

async function countInstinctEntries(projectDir) {
  const instinctsDir = path.join(projectDir, '.aimax', 'instincts');
  const instinctsPath = path.join(instinctsDir, 'instincts.yaml');
  const candidatesPath = path.join(instinctsDir, 'candidates.yaml');

  if (!(await fs.pathExists(instinctsDir))) {
    return {
      exists: false,
      instincts: 0,
      candidates: 0
    };
  }

  const [instincts, candidates] = await Promise.all([
    readYamlList(instinctsPath, 'instincts'),
    readYamlList(candidatesPath, 'candidates')
  ]);

  return {
    exists: true,
    instincts: instincts.length,
    candidates: candidates.length
  };
}

function getWorkflowRuntimeState(orchestrator) {
  const entries = orchestrator?.executors ? Object.entries(orchestrator.executors) : [];
  const placeholderPhases = entries.filter(([, entry]) => entry?.isDefault).map(([phase]) => phase);

  return createReadyState({
    phase: 'discover',
    mode: 'plan',
    placeholderPhases,
    executorCount: entries.length
  });
}

export async function getRuntimeStatus(options = {}) {
  const projectDir = path.resolve(options.projectDir ?? process.cwd());
  const agentRegistry = options.agentRegistry ?? new AgentRegistry(projectDir);
  const canonicalRouter = options.canonicalRouter ?? new CanonicalRouter(agentRegistry);
  const skillIndexer = options.skillIndexer ?? new SkillIndexer(path.join(projectDir, 'skills'));
  const orchestrator = options.orchestrator ?? new WmsAutoOrchestrator();

  const [
    agentRegistryState,
    canonicalRouterState,
    skillIndexerState,
    knowledgeState,
    instinctState
  ] = await Promise.all([
    safeRuntimeSection(async () => {
      if (typeof agentRegistry.initialize === 'function') {
        await agentRegistry.initialize();
      }

      const stats = typeof agentRegistry.getStats === 'function' ? agentRegistry.getStats() : null;
      return createReadyState({
        initialized: true,
        agents: stats?.total ?? agentRegistry?.agents?.size ?? 0,
        active: stats?.active ?? 0,
        sources: stats?.bySource ?? {}
      });
    }),
    safeRuntimeSection(async () => {
      if (typeof canonicalRouter.initialize === 'function') {
        await canonicalRouter.initialize();
      }

      const diagnosis =
        typeof canonicalRouter.diagnose === 'function'
          ? await canonicalRouter.diagnose()
          : { initialized: true, agentCount: 0 };

      return createReadyState({
        initialized: Boolean(diagnosis.initialized),
        agents: diagnosis.agentCount ?? 0
      });
    }),
    safeRuntimeSection(async () => {
      const index =
        typeof skillIndexer.buildIndex === 'function'
          ? await skillIndexer.buildIndex({ useCache: false, incremental: false })
          : { totalSkills: 0, savingsPercent: 0 };

      return createReadyState({
        totalSkills: index.totalSkills ?? 0,
        savingsPercent: index.savingsPercent ?? 0,
        cached: Boolean(skillIndexer._cache)
      });
    }),
    safeRuntimeSection(async () => {
      const storage = await countInsightEntries(projectDir);
      return createReadyState(storage);
    }),
    safeRuntimeSection(async () => {
      const storage = await countInstinctEntries(projectDir);
      return createReadyState(storage);
    })
  ]);

  const workflowState = await safeRuntimeSection(async () => getWorkflowRuntimeState(orchestrator));

  return {
    generatedAt: new Date().toISOString(),
    modules: {
      agentRegistry: agentRegistryState,
      canonicalRouter: canonicalRouterState,
      skillIndexer: skillIndexerState,
      knowledgeSteward: knowledgeState,
      instinctManager: instinctState,
      workflow: workflowState
    }
  };
}

export default getRuntimeStatus;
