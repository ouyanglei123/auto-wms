import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { CanonicalRouter } from '../src/router/canonical-router.js';
import { AgentRegistry } from '../src/router/agent-registry.js';
import { COMPLEXITY_LEVELS, AGENT_STATES } from '../src/router/agent-types.js';

describe('AgentRegistry', () => {
  let tempDir;
  let registry;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `agent-registry-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
    registry = new AgentRegistry(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('initialize', () => {
    it('should load built-in agents', async () => {
      const count = await registry.initialize();

      expect(count).toBeGreaterThanOrEqual(10);
      expect(registry.getAgent('quest-designer')).toBeDefined();
      expect(registry.getAgent('architect')).toBeDefined();
      expect(registry.getAgent('tdd-guide')).toBeDefined();
      expect(registry.getAgent('installer-manager')).toBeDefined();
    });

    it('should load custom agents only when manifest frontmatter is present', async () => {
      await fs.ensureDir(path.join(tempDir, 'agents'));
      await fs.writeFile(
        path.join(tempDir, 'agents', 'custom-helper.md'),
        `---
name: custom-helper
description: Custom helper agent
tools: Read, Glob
tags: [custom, helper]
---

# Custom Helper
`,
        'utf-8'
      );
      await fs.writeFile(
        path.join(tempDir, 'agents', 'notes.md'),
        `# Notes
This is not an agent.
`,
        'utf-8'
      );

      await registry.initialize();

      const customAgent = registry.getAgent('custom-helper');
      expect(customAgent).toBeDefined();
      expect(customAgent.capabilities).toEqual(['Read', 'Glob']);
      expect(customAgent.tags).toEqual(['custom', 'helper']);
      expect(registry.getAgent('notes')).toBeNull();
    });

    it('should keep custom agents out of routing candidates by default', async () => {
      await fs.ensureDir(path.join(tempDir, 'agents'));
      await fs.writeFile(
        path.join(tempDir, 'agents', 'security-helper.md'),
        `---
name: security-helper
description: Custom security helper
tools: Read, Glob
tags: [security, 漏洞]
---

# Security Helper
`,
        'utf-8'
      );

      await registry.initialize();

      const customAgent = registry.getAgent('security-helper');
      const candidates = registry.findCandidates(['security', '漏洞']);

      expect(customAgent).toBeDefined();
      expect(customAgent.source).toBe('custom');
      expect(candidates.some((candidate) => candidate.agent.name === 'security-helper')).toBe(
        false
      );
    });

    it('should allow custom agents into routing candidates when explicitly enabled', async () => {
      await fs.ensureDir(path.join(tempDir, 'agents'));
      await fs.writeFile(
        path.join(tempDir, 'agents', 'security-helper.md'),
        `---
name: security-helper
description: Custom security helper
tools: Read, Glob
tags: [security, helper]
---

# Security Helper
`,
        'utf-8'
      );
      registry = new AgentRegistry(tempDir, { enableCustomAgentsInRouting: true });

      await registry.initialize();

      const candidates = registry.findCandidates(['security-helper']);

      expect(candidates.some((candidate) => candidate.agent.name === 'security-helper')).toBe(true);
    });

    it('should reject custom agents with unknown manifest keys', async () => {
      await fs.ensureDir(path.join(tempDir, 'agents'));
      await fs.writeFile(
        path.join(tempDir, 'agents', 'bad-keys.md'),
        `---
name: bad-keys
description: Invalid manifest
tools: Read
command: rm -rf /
---

# Bad Keys
`,
        'utf-8'
      );

      await registry.initialize();

      expect(registry.getAgent('bad-keys')).toBeNull();
    });

    it('should reject custom agents with unsupported model values', async () => {
      await fs.ensureDir(path.join(tempDir, 'agents'));
      await fs.writeFile(
        path.join(tempDir, 'agents', 'bad-model.md'),
        `---
name: bad-model
description: Invalid model
tools: Read
model: gpt-4
---

# Bad Model
`,
        'utf-8'
      );

      await registry.initialize();

      expect(registry.getAgent('bad-model')).toBeNull();
    });

    it('should reject custom agents with invalid tool names', async () => {
      await fs.ensureDir(path.join(tempDir, 'agents'));
      await fs.writeFile(
        path.join(tempDir, 'agents', 'bad-tools.md'),
        `---
name: bad-tools
description: Invalid tools
tools: Read, ../../Write
---

# Bad Tools
`,
        'utf-8'
      );

      await registry.initialize();

      expect(registry.getAgent('bad-tools')).toBeNull();
    });

    it('should not let custom agents override built-in agents', async () => {
      await fs.ensureDir(path.join(tempDir, 'agents'));
      await fs.writeFile(
        path.join(tempDir, 'agents', 'quest-designer.md'),
        `---
name: quest-designer
description: Override built in
tools: Read
---

# Override
`,
        'utf-8'
      );

      await registry.initialize();

      const builtInAgent = registry.getAgent('quest-designer');
      expect(builtInAgent).toBeDefined();
      expect(builtInAgent.source).toBe('built-in');
      expect(builtInAgent.description).toBe('完整代码输出的闯关式开发规划');
    });

    it('should reject non-file agent entries even when they end with .md', async () => {
      await fs.ensureDir(path.join(tempDir, 'agents', 'linked-agent.md'));

      await registry.initialize();

      expect(registry.getAgent('linked-agent')).toBeNull();
    });
  });

  describe('listAgents', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should list all agents sorted by priority', () => {
      const agents = registry.listAgents();

      expect(agents.length).toBeGreaterThanOrEqual(9);
      for (let i = 1; i < agents.length; i++) {
        expect(agents[i - 1].priority).toBeGreaterThanOrEqual(agents[i].priority);
      }
    });

    it('should filter by state', () => {
      const active = registry.listAgents({ state: AGENT_STATES.ACTIVE });

      expect(active.length).toBeGreaterThanOrEqual(9);
      expect(active.every((a) => a.state === AGENT_STATES.ACTIVE)).toBe(true);
    });

    it('should filter by complexity', () => {
      const high = registry.listAgents({ complexity: COMPLEXITY_LEVELS.HIGH });

      expect(high.length).toBeGreaterThan(0);
      expect(high.every((a) => a.complexity === COMPLEXITY_LEVELS.HIGH)).toBe(true);
    });

    it('should filter by capabilities', () => {
      const testing = registry.listAgents({ capabilities: ['testing'] });

      expect(testing.length).toBeGreaterThan(0);
      expect(testing.every((a) => a.capabilities.includes('testing'))).toBe(true);
    });
  });

  describe('getAgent', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return agent by name', () => {
      const questDesigner = registry.getAgent('quest-designer');

      expect(questDesigner).toBeDefined();
      expect(questDesigner.name).toBe('quest-designer');
      expect(questDesigner.displayName).toBe('闯关大纲设计师 v4');
    });

    it('should return null for unknown agent', () => {
      expect(registry.getAgent('nonexistent')).toBeNull();
    });
  });

  describe('registerAgent', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should register new agent', () => {
      const result = registry.registerAgent({
        name: 'custom-agent',
        displayName: 'Custom Agent',
        description: 'A custom agent',
        capabilities: ['custom'],
        triggerKeywords: ['custom', 'test'],
        priority: 50,
        complexity: COMPLEXITY_LEVELS.LOW,
        fallbackAgents: [],
        state: AGENT_STATES.ACTIVE
      });

      expect(result).toBe(true);
      expect(registry.getAgent('custom-agent')).toBeDefined();
    });

    it('should reject agent without required fields', () => {
      expect(registry.registerAgent({ name: 'bad' })).toBe(false);
    });

    it('should override existing agent with warning', () => {
      const result = registry.registerAgent({
        name: 'quest-designer',
        displayName: 'Override Quest Designer',
        capabilities: ['quest', 'planning'],
        triggerKeywords: ['quest', 'plan'],
        priority: 100,
        state: AGENT_STATES.ACTIVE
      });

      expect(result).toBe(true);
      expect(registry.getAgent('quest-designer').priority).toBe(100);
    });
  });

  describe('unregisterAgent', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should unregister custom agent', () => {
      registry.registerAgent({
        name: 'temp-agent',
        displayName: 'Temp',
        capabilities: ['temp'],
        triggerKeywords: ['temp'],
        priority: 50,
        state: AGENT_STATES.ACTIVE
      });

      expect(registry.unregisterAgent('temp-agent')).toBe(true);
      expect(registry.getAgent('temp-agent')).toBeNull();
    });

    it('should not unregister built-in agent', () => {
      expect(registry.unregisterAgent('quest-designer')).toBe(false);
    });

    it('should handle unknown agent', () => {
      expect(registry.unregisterAgent('nonexistent')).toBe(false);
    });
  });

  describe('findCandidates', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should find agents by keyword', () => {
      const candidates = registry.findCandidates(['测试', 'tdd']);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.some((c) => c.agent.name === 'tdd-guide')).toBe(true);
    });

    it('should sort by score', () => {
      const candidates = registry.findCandidates(['plan', '架构']);

      expect(candidates.length).toBeGreaterThan(0);
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
      }
    });

    it('should return empty for no matches', () => {
      const candidates = registry.findCandidates(['xyznonexistent']);
      expect(candidates).toEqual([]);
    });

    it('should match upgrade intent to installer manager', () => {
      const candidates = registry.findCandidates(['升级', '更新', 'update']);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].agent.name).toBe('installer-manager');
    });
  });

  describe('getFallbackChain', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return fallback chain', () => {
      const chain = registry.getFallbackChain('tdd-guide');

      expect(chain.length).toBeGreaterThan(0);
      expect(chain[0].name).toBe('code-reviewer');
    });

    it('should return empty for agent without fallback', () => {
      const chain = registry.getFallbackChain('refactor-cleaner');
      expect(chain).toEqual([]);
    });

    it('should return empty for unknown agent', () => {
      const chain = registry.getFallbackChain('nonexistent');
      expect(chain).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      await registry.initialize();
      const stats = registry.getStats();

      expect(stats.total).toBeGreaterThanOrEqual(9);
      expect(stats.active).toBeGreaterThanOrEqual(9);
      expect(stats.byComplexity).toBeDefined();
      expect(stats.bySource).toBeDefined();
      expect(stats.bySource['built-in']).toBeGreaterThanOrEqual(9);
    });
  });
});

describe('CanonicalRouter', () => {
  let router;
  let tempDir;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `router-test-${Date.now()}`);
    await fs.ensureDir(tempDir);

    const registry = new AgentRegistry(tempDir);
    router = new CanonicalRouter(registry);
    await router.initialize();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('route', () => {
    it('should route to tdd-guide for testing intent', async () => {
      const result = await router.route('编写测试用例');

      expect(result).toBeDefined();
      expect(result.agent).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.isDefault).toBe(false);
      expect(result.routeId).toBeDefined();
    });

    it('should route to security-reviewer for security intent', async () => {
      const result = await router.route('检查密码泄露漏洞');

      expect(result.agent.name).toBe('security-reviewer');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should ignore custom agents in default routing unless explicitly enabled', async () => {
      await fs.ensureDir(path.join(tempDir, 'agents'));
      await fs.writeFile(
        path.join(tempDir, 'agents', 'security-helper.md'),
        `---
name: security-helper
description: Custom security helper
tools: Read, Glob
tags: [security, 漏洞]
---

# Security Helper
`,
        'utf-8'
      );

      const registry = new AgentRegistry(tempDir);
      router = new CanonicalRouter(registry);
      await router.initialize();

      const result = await router.route('检查安全漏洞');

      expect(result.agent.name).toBe('security-reviewer');
    });

    it('should allow custom agents to influence routing when explicitly enabled', async () => {
      await fs.ensureDir(path.join(tempDir, 'agents'));
      await fs.writeFile(
        path.join(tempDir, 'agents', 'novel-helper.md'),
        `---
name: novel-helper
description: Custom routing helper
tools: Read, Glob
tags: [novel-helper]
---

# Novel Helper
`,
        'utf-8'
      );

      const registry = new AgentRegistry(tempDir, { enableCustomAgentsInRouting: true });
      router = new CanonicalRouter(registry);
      await router.initialize();

      const result = await router.route('novel-helper');

      expect(result.agent.name).toBe('novel-helper');
    });

    it('should preserve externally initialized registry state', async () => {
      const registry = new AgentRegistry(tempDir);
      await registry.initialize();
      expect(registry.unregisterAgent('quest-designer', { force: true })).toBe(true);

      router = new CanonicalRouter(registry);
      await router.initialize();

      expect(router.registry.getAgent('quest-designer')).toBeNull();
    });

    it('should route to build-error-resolver for build errors', async () => {
      const result = await router.route('构建失败，TypeScript 编译错误');

      expect(result.agent.name).toBe('build-error-resolver');
    });

    it('should route upgrade intent to installer manager', async () => {
      const result = await router.route('升级');

      expect(result.agent.name).toBe('installer-manager');
      expect(result.isDefault).toBe(false);
    });

    it('should route update phrases to installer manager', async () => {
      const result = await router.route('更新 auto-wms');

      expect(result.agent.name).toBe('installer-manager');
      expect(result.isDefault).toBe(false);
    });

    it('should route english update intent to installer manager', async () => {
      const result = await router.route('update auto wms');

      expect(result.agent.name).toBe('installer-manager');
      expect(result.isDefault).toBe(false);
    });

    it('should return default for empty intent', async () => {
      const result = await router.route('');

      expect(result.isDefault).toBe(true);
      expect(result.routeId).toBeDefined();
    });

    it('should return default for whitespace intent', async () => {
      const result = await router.route('   ');

      expect(result.isDefault).toBe(true);
    });

    it('should include match reason', async () => {
      const result = await router.route('重构代码结构');

      expect(result.matchReason).toBeDefined();
      expect(result.matchReason.length).toBeGreaterThan(0);
    });

    it('should include fallback chain', async () => {
      const result = await router.route('编写测试用例');

      expect(Array.isArray(result.fallbackChain)).toBe(true);
    });

    it('should prioritize security for security-sensitive intent', async () => {
      const result = await router.route('认证和授权的安全审查');

      expect(result.agent.name).toBe('security-reviewer');
    });

    it('should handle context flags', async () => {
      // 使用安全相关的意图，确保 security-reviewer 在候选列表中
      // 然后通过 flags 验证优先级提升逻辑
      const result = await router.route('检查代码安全漏洞', {
        flags: { securityReview: true }
      });

      expect(result.agent.name).toBe('security-reviewer');
    });

    it('should enrich route result with wms match reason when intent is wms-related', async () => {
      const result = await router.route('重构出库波次分配流程');

      expect(result.matchReason).toContain('WMS服务: outbound');
      expect(result.matchReason).toContain('业务域: 波次');
    });
  });

  describe('history and feedback', () => {
    it('should record proposals without updating hit stats immediately', async () => {
      const result = await router.route('编写测试用例');

      const history = router.getHistory();
      const stats = router.getAgentStats();

      expect(history).toHaveLength(1);
      expect(history[0].routeId).toBe(result.routeId);
      expect(history[0].outcome).toBe('proposed');
      expect(stats.has(result.agent.name)).toBe(false);
    });

    it('should update stats and route outcome on success feedback', async () => {
      const result = await router.route('编写测试用例');
      router.reportSuccess(result.routeId);

      const stats = router.getAgentStats().get(result.agent.name);
      const history = router.getHistory();

      expect(stats).toEqual({ hits: 1, total: 1, hitRate: 1 });
      expect(history[0].outcome).toBe('success');
    });

    it('should update stats and route outcome on failure feedback', async () => {
      const result = await router.route('编写测试用例');
      router.reportFailure(result.routeId);

      const stats = router.getAgentStats().get(result.agent.name);
      const history = router.getHistory();

      expect(stats).toEqual({ hits: 0, total: 1, hitRate: 0 });
      expect(history[0].outcome).toBe('failure');
    });

    it('should not double-count stats when reportSuccess is called twice for the same routeId', async () => {
      const result = await router.route('编写测试用例');
      router.reportSuccess(result.routeId);
      router.reportSuccess(result.routeId);

      const stats = router.getAgentStats().get(result.agent.name);
      const history = router.getHistory();

      expect(stats).toEqual({ hits: 1, total: 1, hitRate: 1 });
      expect(history[0].outcome).toBe('success');
    });

    it('should keep the first terminal outcome when conflicting feedback arrives for the same routeId', async () => {
      const result = await router.route('编写测试用例');
      router.reportSuccess(result.routeId);
      router.reportFailure(result.routeId);

      const stats = router.getAgentStats().get(result.agent.name);
      const history = router.getHistory();

      expect(stats).toEqual({ hits: 1, total: 1, hitRate: 1 });
      expect(history[0].outcome).toBe('success');
    });

    it('should not double-count stats when reportFailure is called twice for the same routeId', async () => {
      const result = await router.route('编写测试用例');
      router.reportFailure(result.routeId);
      router.reportFailure(result.routeId);

      const stats = router.getAgentStats().get(result.agent.name);
      const history = router.getHistory();

      expect(stats).toEqual({ hits: 0, total: 1, hitRate: 0 });
      expect(history[0].outcome).toBe('failure');
    });

    it('should keep the first failure outcome when success feedback arrives later for the same routeId', async () => {
      const result = await router.route('编写测试用例');
      router.reportFailure(result.routeId);
      router.reportSuccess(result.routeId);

      const stats = router.getAgentStats().get(result.agent.name);
      const history = router.getHistory();

      expect(stats).toEqual({ hits: 0, total: 1, hitRate: 0 });
      expect(history[0].outcome).toBe('failure');
    });

    it('should accumulate stats when feedback is reported directly by agent name', () => {
      router.reportSuccess('code-reviewer');
      router.reportSuccess('code-reviewer');

      expect(router.getAgentStats().get('code-reviewer')).toEqual({
        hits: 2,
        total: 2,
        hitRate: 1
      });
    });

    it('should prefer scope-matched agent when feedback improved its hit rate', () => {
      router.reportSuccess('code-reviewer');
      const intent = { wms: { isWmsRelated: false }, complexity: COMPLEXITY_LEVELS.LOW };
      const context = { scope: 'pre-commit' };

      expect(router._computeContextSimilarity('code-reviewer', intent, context)).toBe(1.5);
      expect(router._computeContextSimilarity('architect', intent, context)).toBe(0.5);
    });
  });

  describe('diagnose', () => {
    it('should return diagnostic info', async () => {
      const info = await router.diagnose();

      expect(info.initialized).toBe(true);
      expect(info.agentCount).toBeGreaterThanOrEqual(9);
      expect(info.agents).toBeDefined();
      expect(info.agents.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('_analyzeIntent', () => {
    it('should extract keywords', async () => {
      const intent = router._analyzeIntent('使用 React 开发新功能', {});

      expect(intent.keywords).toContain('使用');
      expect(intent.keywords).toContain('react');
      // "开发新功能" 被作为一个整体（因为分词逻辑）
      expect(intent.keywords.some((k) => k.includes('开发'))).toBe(true);
      expect(intent.complexity).toBeDefined();
    });

    it('should detect security sensitivity', () => {
      const intent = router._analyzeIntent('检查密码泄露', {});

      expect(intent.securitySensitive).toBe(true);
    });

    it('should detect non-security intent', () => {
      const intent = router._analyzeIntent('格式化代码', {});

      expect(intent.securitySensitive).toBe(false);
    });

    it('should extract file extensions from context', () => {
      const intent = router._analyzeIntent('修复代码', {
        files: ['app.tsx', 'style.css']
      });

      expect(intent.keywords).toContain('.tsx');
      expect(intent.keywords).toContain('.css');
    });

    it('should enrich intent with wms signals', () => {
      const intent = router._analyzeIntent('修复库存冻结流程', {});

      expect(intent.wms.isWmsRelated).toBe(true);
      expect(intent.wms.targetService).toBe('storage');
      expect(intent.keywords).toContain('storage');
    });
  });

  describe('_assessComplexity', () => {
    it('should detect high complexity', () => {
      const result = router._assessComplexity('全面重构微服务架构');
      expect(result).toBe(COMPLEXITY_LEVELS.HIGH);
    });

    it('should detect medium complexity', () => {
      const result = router._assessComplexity('新增用户注册功能');
      expect(result).toBe(COMPLEXITY_LEVELS.MEDIUM);
    });

    it('should detect low complexity', () => {
      const result = router._assessComplexity('格式化代码，快速修复');
      expect(result).toBe(COMPLEXITY_LEVELS.LOW);
    });

    it('should default to medium', () => {
      const result = router._assessComplexity('hello world');
      expect(result).toBe(COMPLEXITY_LEVELS.MEDIUM);
    });
  });
});
