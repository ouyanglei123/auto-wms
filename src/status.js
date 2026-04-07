import path from 'node:path';
import fs from 'fs-extra';
import { spawnSync } from 'node:child_process';
import { checkStatus } from './installer.js';
import { getRuntimeStatus } from './runtime-status.js';

async function countFilesRecursive(dirPath, options = {}) {
  const ignoreNames = new Set(options.ignoreNames || []);

  if (!(await fs.pathExists(dirPath))) {
    return 0;
  }

  let total = 0;
  const entries = await fs.readdir(dirPath);
  for (const entry of entries) {
    if (ignoreNames.has(entry)) {
      continue;
    }

    const fullPath = path.join(dirPath, entry);
    const stat = await fs.stat(fullPath);
    if (stat.isFile()) {
      total += 1;
      continue;
    }

    if (stat.isDirectory()) {
      total += await countFilesRecursive(fullPath, options);
    }
  }

  return total;
}

async function listMarkdownNames(dirPath, options = {}) {
  if (!(await fs.pathExists(dirPath))) {
    return [];
  }

  const entries = await fs.readdir(dirPath);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = await fs.stat(fullPath);
    if (stat.isFile() && entry.endsWith('.md')) {
      files.push(entry.replace(/\.md$/u, ''));
      continue;
    }

    if (stat.isDirectory() && options.recursive) {
      const nested = await listMarkdownNames(fullPath, options);
      files.push(...nested.map((name) => `${entry}/${name}`));
    }
  }

  return files.sort();
}

function runGit(projectDir, args) {
  const result = spawnSync('git', args, {
    cwd: projectDir,
    encoding: 'utf-8'
  });

  if (result.status !== 0) {
    return '';
  }

  return String(result.stdout || '').trim();
}

async function readProjectPackage(projectDir) {
  const packagePath = path.join(projectDir, 'package.json');
  if (!(await fs.pathExists(packagePath))) {
    return null;
  }

  return fs.readJson(packagePath);
}

async function readHooksSummary(projectDir) {
  const hooksPath = path.join(projectDir, 'hooks', 'hooks.json');
  if (!(await fs.pathExists(hooksPath))) {
    return { count: 0, names: [] };
  }

  const hooks = await fs.readJson(hooksPath);
  const names = Object.keys(hooks || {});
  return {
    count: names.length,
    names
  };
}

async function readKnowledgeSummary(projectDir) {
  const insightsDir = path.join(projectDir, '.auto', 'insights');
  if (!(await fs.pathExists(insightsDir))) {
    return { count: 0 };
  }

  const files = (await fs.readdir(insightsDir)).filter((file) => file.endsWith('.md'));
  let count = 0;
  for (const file of files) {
    const content = await fs.readFile(path.join(insightsDir, file), 'utf-8');
    count += (content.match(/^### /gm) || []).length;
  }

  return { count };
}

function buildSuggestions(report) {
  const suggestions = [];

  if (!report.health.claudeMd.exists) {
    suggestions.push('补齐项目根目录的 CLAUDE.md。');
  }

  if (!report.health.repoMap.exists) {
    suggestions.push('生成或更新 REPO_MAP.md，补强代码地图。');
  }

  if (report.health.nodeModules.status === 'FAIL') {
    suggestions.push('安装依赖后再运行更完整的验证。');
  }

  if (!report.health.claudeComponents.allInstalled) {
    suggestions.push('运行 auto doctor 检查 Claude 侧组件安装是否完整。');
  }

  const placeholderPhases = report.runtime.modules.workflow.placeholderPhases || [];
  if (placeholderPhases.length > 0) {
    suggestions.push(`补齐运行时占位阶段：${placeholderPhases.join(', ')}。`);
  }

  if (report.project.dirtyCount > 0) {
    suggestions.push('整理当前未提交改动，避免能力升级与业务改动混杂。');
  }

  return suggestions;
}

export async function collectStatus(options = {}) {
  const projectDir = path.resolve(options.projectDir ?? process.cwd());
  const [pkg, fileCount, hooks, knowledge, runtime, claudeComponentStatus] = await Promise.all([
    readProjectPackage(projectDir),
    countFilesRecursive(projectDir, { ignoreNames: ['node_modules', '.git'] }),
    readHooksSummary(projectDir),
    readKnowledgeSummary(projectDir),
    options.runtimeStatus ?? getRuntimeStatus({ projectDir }),
    options.claudeComponentStatus ?? checkStatus()
  ]);

  const [agents, commands, skills, rules, claudeMdExists, repoMapExists, nodeModulesExists] =
    await Promise.all([
      listMarkdownNames(path.join(projectDir, 'agents')),
      listMarkdownNames(path.join(projectDir, 'commands'), { recursive: true }),
      listMarkdownNames(path.join(projectDir, 'skills'), { recursive: true }),
      listMarkdownNames(path.join(projectDir, 'rules')),
      fs.pathExists(path.join(projectDir, 'CLAUDE.md')),
      fs.pathExists(path.join(projectDir, 'REPO_MAP.md')),
      fs.pathExists(path.join(projectDir, 'node_modules'))
    ]);

  const branch = options.gitInfo?.branch ?? runGit(projectDir, ['branch', '--show-current']);
  const commit = options.gitInfo?.commit ?? runGit(projectDir, ['rev-parse', '--short', 'HEAD']);
  const dirtyOutput = options.gitInfo?.dirtyOutput ?? runGit(projectDir, ['status', '--short']);
  const dirtyCount = dirtyOutput ? dirtyOutput.split('\n').filter(Boolean).length : 0;
  const claudeComponentEntries = Object.entries(claudeComponentStatus || {});

  const report = {
    generatedAt: new Date().toISOString(),
    project: {
      name: pkg?.name ?? path.basename(projectDir),
      version: pkg?.version ?? '0.0.0',
      path: projectDir,
      branch: branch || 'unknown',
      commit: commit || 'unknown',
      fileCount,
      dirtyCount
    },
    capabilities: {
      agents: { count: agents.length, names: agents },
      commands: { count: commands.length, names: commands },
      skills: { count: skills.length, names: skills },
      rules: { count: rules.length, names: rules },
      hooks,
      knowledge
    },
    health: {
      claudeMd: {
        exists: claudeMdExists,
        status: claudeMdExists ? 'PASS' : 'WARN'
      },
      repoMap: {
        exists: repoMapExists,
        status: repoMapExists ? 'PASS' : 'INFO'
      },
      nodeModules: {
        exists: nodeModulesExists,
        status: pkg ? (nodeModulesExists ? 'PASS' : 'FAIL') : 'INFO'
      },
      git: {
        clean: dirtyCount === 0,
        status: dirtyCount === 0 ? 'PASS' : 'WARN'
      },
      claudeComponents: {
        installed: claudeComponentEntries.filter(([, item]) => item.installed).length,
        total: claudeComponentEntries.length,
        allInstalled:
          claudeComponentEntries.length > 0 &&
          claudeComponentEntries.every(([, item]) => item.installed),
        details: claudeComponentStatus
      }
    },
    runtime,
    suggestions: []
  };

  report.suggestions = buildSuggestions(report);
  return report;
}

export function renderStatusReport(report) {
  const lines = [];
  lines.push('## 项目状态');
  lines.push('');
  lines.push(
    `项目: ${report.project.name} v${report.project.version} | 分支: ${report.project.branch} @ ${report.project.commit}`
  );
  lines.push(`路径: ${report.project.path}`);
  lines.push(`文件: ${report.project.fileCount} | 未提交: ${report.project.dirtyCount}`);
  lines.push('');
  lines.push('### 已安装能力');
  lines.push(`- Agents: ${report.capabilities.agents.count}`);
  lines.push(`- Commands: ${report.capabilities.commands.count}`);
  lines.push(`- Skills: ${report.capabilities.skills.count}`);
  lines.push(`- Rules: ${report.capabilities.rules.count}`);
  lines.push(`- Hooks: ${report.capabilities.hooks.count}`);
  lines.push(`- Knowledge: ${report.capabilities.knowledge.count}`);
  lines.push('');
  lines.push('### 健康度');
  lines.push(`- CLAUDE.md: ${report.health.claudeMd.status}`);
  lines.push(`- REPO_MAP.md: ${report.health.repoMap.status}`);
  lines.push(`- node_modules: ${report.health.nodeModules.status}`);
  lines.push(`- Git 状态: ${report.health.git.status}`);
  lines.push('');
  lines.push('### Runtime 模块');
  lines.push(`- AgentRegistry: ${report.runtime.modules.agentRegistry.status}`);
  lines.push(`- CanonicalRouter: ${report.runtime.modules.canonicalRouter.status}`);
  lines.push(`- SkillIndexer: ${report.runtime.modules.skillIndexer.status}`);
  lines.push(`- KnowledgeSteward: ${report.runtime.modules.knowledgeSteward.status}`);
  lines.push(`- InstinctManager: ${report.runtime.modules.instinctManager.status}`);
  lines.push(`- Workflow: ${report.runtime.modules.workflow.status}`);
  lines.push('');
  lines.push('### 建议');

  if (report.suggestions.length === 0) {
    lines.push('- 当前没有阻塞型建议。');
  } else {
    for (const suggestion of report.suggestions) {
      lines.push(`- ${suggestion}`);
    }
  }

  return lines.join('\n');
}

export default collectStatus;
