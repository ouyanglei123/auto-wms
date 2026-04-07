import path from 'node:path';
import fs from 'fs-extra';
import { spawnSync } from 'node:child_process';
import { getClaudeDir } from './utils.js';

function parseMajorVersion(version) {
  const match = String(version || '').match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function runCommandVersion(command, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf-8' });
  if (result.status !== 0) {
    return '';
  }

  return (
    String(result.stdout || result.stderr || '')
      .trim()
      .split('\n')[0] || ''
  );
}

async function countFiles(dirPath, predicate) {
  if (!(await fs.pathExists(dirPath))) {
    return 0;
  }

  const entries = await fs.readdir(dirPath);
  let total = 0;
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = await fs.stat(fullPath);
    if (stat.isFile() && predicate(entry)) {
      total += 1;
      continue;
    }

    if (stat.isDirectory()) {
      total += await countFiles(fullPath, predicate);
    }
  }

  return total;
}

function createCheck(status, label, detail, fix = '') {
  return { status, label, detail, fix };
}

function summarizeChecks(sections) {
  const summary = { PASS: 0, WARN: 0, FAIL: 0, INFO: 0 };
  const issues = [];

  for (const section of Object.values(sections)) {
    for (const check of section) {
      summary[check.status] = (summary[check.status] || 0) + 1;
      if (check.status !== 'PASS') {
        issues.push(check);
      }
    }
  }

  return { summary, issues };
}

export async function collectDoctorReport(options = {}) {
  const projectDir = path.resolve(options.projectDir ?? process.cwd());
  const claudeDir = path.resolve(options.claudeDir ?? getClaudeDir());

  const nodeVersion = options.versions?.node ?? process.version;
  const npmVersion = options.versions?.npm ?? runCommandVersion('npm');
  const gitVersion = options.versions?.git ?? runCommandVersion('git');
  const nodeMajor = parseMajorVersion(nodeVersion);

  const [
    claudeExists,
    hooksExists,
    agentCount,
    commandCount,
    skillCount,
    claudeMdExists,
    repoMapExists
  ] = await Promise.all([
    fs.pathExists(claudeDir),
    fs.pathExists(path.join(claudeDir, 'hooks', 'hooks.json')),
    countFiles(path.join(claudeDir, 'agents'), (entry) => entry.endsWith('.md')),
    countFiles(path.join(claudeDir, 'commands', 'wms'), (entry) => entry.endsWith('.md')),
    countFiles(path.join(claudeDir, 'skills'), (entry) => entry.endsWith('.md')),
    fs.pathExists(path.join(projectDir, 'CLAUDE.md')),
    fs.pathExists(path.join(projectDir, 'REPO_MAP.md'))
  ]);

  const packageExists = await fs.pathExists(path.join(projectDir, 'package.json'));
  const nodeModulesExists = packageExists
    ? await fs.pathExists(path.join(projectDir, 'node_modules'))
    : false;

  const sections = {
    base: [
      createCheck(
        nodeMajor >= 18 ? 'PASS' : 'FAIL',
        'Node.js',
        nodeVersion || '未检测到 Node.js',
        '升级 Node.js 到 18+'
      ),
      createCheck(
        npmVersion ? 'PASS' : 'WARN',
        'npm',
        npmVersion || '未检测到 npm',
        '检查 Node.js 安装'
      ),
      createCheck(
        gitVersion ? 'PASS' : 'WARN',
        'git',
        gitVersion || '未检测到 git',
        '安装 git 以启用版本控制工作流'
      )
    ],
    claude: [
      createCheck(
        claudeExists ? 'PASS' : 'FAIL',
        '~/.claude',
        claudeExists ? '目录存在' : '目录缺失',
        '先运行 auto install 安装 Claude 侧组件'
      ),
      createCheck(
        agentCount >= 5 ? 'PASS' : 'WARN',
        'Agents',
        `${agentCount} 个文件`,
        '重新安装或补齐 agents 组件'
      ),
      createCheck(
        commandCount >= 5 ? 'PASS' : 'WARN',
        'Commands',
        `${commandCount} 个文件`,
        '重新安装或补齐 commands/wms 组件'
      ),
      createCheck(
        skillCount >= 4 ? 'PASS' : 'WARN',
        'Skills',
        `${skillCount} 个文件`,
        '重新安装或补齐 skills 组件'
      ),
      createCheck(
        hooksExists ? 'PASS' : 'INFO',
        'Hooks',
        hooksExists ? 'hooks.json 已安装' : 'hooks 可选缺失'
      )
    ],
    project: [
      createCheck(
        claudeMdExists ? 'PASS' : 'WARN',
        'CLAUDE.md',
        claudeMdExists ? '存在' : '缺失',
        '补齐项目上下文文件'
      ),
      createCheck(
        repoMapExists ? 'PASS' : 'INFO',
        'REPO_MAP.md',
        repoMapExists ? '存在' : '缺失',
        '生成 REPO_MAP.md 以完善代码地图'
      ),
      createCheck(
        packageExists ? (nodeModulesExists ? 'PASS' : 'FAIL') : 'INFO',
        'node_modules',
        packageExists ? (nodeModulesExists ? '已安装' : '未安装') : '非 Node.js 项目，跳过',
        packageExists ? '运行 npm install' : ''
      )
    ]
  };

  const { summary, issues } = summarizeChecks(sections);
  const fixRequested = Boolean(options.fix);

  return {
    generatedAt: new Date().toISOString(),
    projectDir,
    claudeDir,
    fixRequested,
    fixesApplied: [],
    fixesSkipped: fixRequested ? ['当前 P0 仅支持只读诊断，未执行自动修复。'] : [],
    sections,
    issues,
    summary
  };
}

export function renderDoctorReport(report) {
  const lines = [];
  lines.push('## Auto WMS 环境诊断报告');
  lines.push('');
  lines.push('### 基础环境');
  for (const check of report.sections.base) {
    lines.push(`- ${check.label}: ${check.detail} -- ${check.status}`);
  }
  lines.push('');
  lines.push('### Claude Code 配置');
  for (const check of report.sections.claude) {
    lines.push(`- ${check.label}: ${check.detail} -- ${check.status}`);
  }
  lines.push('');
  lines.push('### 项目配置');
  for (const check of report.sections.project) {
    lines.push(`- ${check.label}: ${check.detail} -- ${check.status}`);
  }
  lines.push('');
  lines.push('### 发现的问题');

  if (report.issues.length === 0) {
    lines.push('1. 无');
  } else {
    report.issues.forEach((issue, index) => {
      lines.push(`${index + 1}. [${issue.status}] ${issue.label} - ${issue.detail}`);
      if (issue.fix) {
        lines.push(`   -> 修复: ${issue.fix}`);
      }
    });
  }

  lines.push('');
  lines.push('### 总结');
  lines.push(`- PASS: ${report.summary.PASS}`);
  lines.push(`- WARN: ${report.summary.WARN}`);
  lines.push(`- FAIL: ${report.summary.FAIL}`);
  lines.push(`- INFO: ${report.summary.INFO}`);

  if (report.fixRequested) {
    lines.push('');
    lines.push('### 自动修复');
    lines.push('- 当前 P0 仅支持只读诊断，未执行自动修复。');
  }

  return lines.join('\n');
}

export default collectDoctorReport;
