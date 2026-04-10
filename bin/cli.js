#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import chalk from 'chalk';
import {
  interactiveMode,
  runInstall,
  runUpdate,
  runUninstall,
  runDocs,
  runRoute,
  runWmsAuto,
  runStatus,
  runDoctor
} from '../src/index.js';
import { getPackageVersion, COMPONENTS } from '../src/utils.js';
import { KnowledgeSteward } from '../src/knowledge/knowledge-steward.js';
import { InstinctManager } from '../src/learning/instinct-manager.js';
import { learnFromTaskEvent } from '../src/learning/task-event-learning.js';
import { learnFromGitHistory } from '../src/learning/git-history-learning.js';

const defaultHandlers = {
  interactiveMode,
  runInstall,
  runUpdate,
  runUninstall,
  runDocs,
  runRoute,
  runWmsAuto,
  runStatus,
  runDoctor
};

function withCliErrorHandling(action) {
  return async (...args) => {
    try {
      return await action(...args);
    } catch (error) {
      console.error(chalk.red('错误：'), error.message);
      process.exit(1);
    }
  };
}

function parseCommaSeparatedList(value) {
  return value
    ? value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
}

function buildInstallOptions(options) {
  return {
    yes: options.yes,
    force: options.force,
    quiet: false,
    components: parseCommaSeparatedList(options.components)
  };
}

function buildStatusOptions(options) {
  return {
    json: Boolean(options.json),
    directory: options.directory
  };
}

function buildDoctorOptions(options) {
  return {
    json: Boolean(options.json),
    fix: Boolean(options.fix),
    directory: options.directory
  };
}

function buildWmsAutoOptions(options) {
  return {
    json: Boolean(options.json),
    run: Boolean(options.run),
    presentQuestMap: Boolean(options.presentQuestMap),
    approveQuestMap: Boolean(options.approveQuestMap)
  };
}

function buildSaveTags(options) {
  return parseCommaSeparatedList(options.tags);
}

function buildInstinctArray(options, key) {
  return parseCommaSeparatedList(options[key]);
}

export function createProgram(handlers = defaultHandlers) {
  const program = new Command();
  const resolvedHandlers = { ...defaultHandlers, ...handlers };

  async function readStdin() {
    if (process.stdin.isTTY) {
      return '';
    }

    return await new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', reject);
    });
  }

  program
    .name('auto')
    .description('Auto WMS - WMS 仓储管理系统智能开发辅助工具')
    .version(getPackageVersion(), '-v, --version', '显示版本号');

  // 默认命令 - 交互模式
  program.action(
    withCliErrorHandling(async () => {
      await resolvedHandlers.interactiveMode();
    })
  );

  // 安装命令
  program
    .command('install')
    .description('安装 Auto WMS')
    .option('-y, --yes', '跳过确认提示')
    .option('-f, --force', '强制覆盖现有文件（不备份）')
    .option('-c, --components <list>', '指定安装的组件，逗号分隔（如: agents,commands,skills）')
    .action(
      withCliErrorHandling(async (options) => {
        await resolvedHandlers.runInstall(buildInstallOptions(options));
      })
    );

  // 更新命令
  program
    .command('update')
    .description('更新 Auto WMS')
    .option('-y, --yes', '跳过确认提示')
    .action(
      withCliErrorHandling(async (options) => {
        await resolvedHandlers.runUpdate({ yes: options.yes });
      })
    );

  // 卸载命令
  program
    .command('uninstall')
    .description('卸载 Auto WMS')
    .option('-y, --yes', '跳过确认提示')
    .action(
      withCliErrorHandling(async (options) => {
        await resolvedHandlers.runUninstall({ yes: options.yes });
      })
    );

  // 列表命令
  program
    .command('list')
    .description('列出可用组件')
    .action(() => {
      console.log('');
      console.log(chalk.cyan.bold('可用组件：'));
      console.log('');
      for (const [, value] of Object.entries(COMPONENTS)) {
        console.log(`  ${chalk.green(value.name.padEnd(16))} ${value.description}`);
      }
      console.log('');
    });

  // 文档命令
  program
    .command('docs')
    .description('打开使用文档')
    .action(
      withCliErrorHandling(async () => {
        await resolvedHandlers.runDocs();
      })
    );

  // 知识保存命令
  const save = program.command('save').description('保存知识条目（灵感、踩坑经验、架构决策等）');

  save
    .command('insight')
    .description('保存一条知识条目')
    .requiredOption('-c, --content <text>', '要保存的内容')
    .option('-t, --category <type>', '指定分类（prompt, trap, pattern, decision）')
    .option('--tags <tags>', '标签，逗号分隔（如: react,performance）')
    .option('--git', '启用 git 自动提交（默认关闭）')
    .action(
      withCliErrorHandling(async (options) => {
        const steward = new KnowledgeSteward();
        const tags = buildSaveTags(options);

        const result = await steward.save({
          content: options.content,
          category: options.category,
          tags,
          gitCommit: options.git
        });

        if (result.success) {
          console.log(chalk.green('知识已保存！'));
          console.log(chalk.gray(`  分类: ${result.categoryName}`));
          console.log(chalk.gray(`  文件: ${result.filePath}`));
          if (result.gitHash) {
            console.log(chalk.gray(`  提交: ${result.gitHash}`));
          }
        } else {
          console.log(chalk.yellow(`保存失败: ${result.error}`));
          process.exit(1);
        }
      })
    );

  save
    .command('list')
    .description('列出所有知识条目统计')
    .action(
      withCliErrorHandling(async () => {
        const steward = new KnowledgeSteward();
        const stats = await steward.list();

        console.log('');
        console.log(chalk.cyan.bold('知识库统计：'));
        console.log('');
        for (const stat of stats) {
          const count = stat.count > 0 ? chalk.green(`${stat.count} 条`) : chalk.gray('空');
          console.log(
            `  ${chalk.bold(stat.category.padEnd(10))} ${count} ${chalk.gray(`- ${stat.description}`)}`
          );
        }
        console.log('');
      })
    );

  save
    .command('search')
    .description('搜索知识条目')
    .requiredOption('-q, --query <keyword>', '搜索关键词')
    .action(
      withCliErrorHandling(async (options) => {
        const steward = new KnowledgeSteward();
        const results = await steward.search(options.query);

        if (results.length === 0) {
          console.log(chalk.yellow(`未找到与 "${options.query}" 相关的知识条目`));
          return;
        }

        console.log('');
        console.log(chalk.cyan.bold(`搜索 "${options.query}" 的结果：`));
        console.log('');
        for (const result of results) {
          console.log(chalk.bold(`  [${result.category}]`));
          for (const match of result.matches) {
            const lines = match.split('\n').slice(0, 5);
            for (const line of lines) {
              console.log(chalk.gray(`    ${line}`));
            }
            console.log('');
          }
        }
      })
    );

  save
    .command('instinct')
    .description('记录一条可复用的编码模式观察')
    .requiredOption('-p, --pattern <text>', '模式描述')
    .requiredOption('-a, --action <text>', '下次应自动应用的动作')
    .option('-s, --source <text>', '观察来源')
    .option('-e, --evidence <items>', '证据，逗号分隔')
    .option('--tags <tags>', '标签，逗号分隔')
    .action(
      withCliErrorHandling(async (options) => {
        const manager = new InstinctManager();
        const evidence = buildInstinctArray(options, 'evidence');
        const tags = buildInstinctArray(options, 'tags');

        const result = await manager.observe({
          pattern: options.pattern,
          action: options.action,
          source: options.source,
          evidence,
          tags
        });

        const label = result.promoted
          ? '已晋升为 Instinct'
          : result.kind === 'instinct'
            ? 'Instinct 已更新'
            : '已记录为候选模式';
        console.log(chalk.green(label));
        console.log(chalk.gray(`  模式: ${result.pattern}`));
        console.log(chalk.gray(`  置信度: ${result.confidence}`));
        console.log(chalk.gray(`  观察次数: ${result.observations}`));
      })
    );

  program
    .command('internal:learn-task-event')
    .description('内部命令：从 TaskCompleted 事件学习 instinct')
    .action(
      withCliErrorHandling(async () => {
        const rawInput = await readStdin();
        if (!rawInput.trim()) {
          return;
        }

        const event = JSON.parse(rawInput);
        const result = await learnFromTaskEvent(event, { projectDir: process.cwd() });
        if (result.skipped) {
          console.log(chalk.gray(result.reason));
          return;
        }

        console.log(chalk.green(`Learned instinct candidate: ${result.result.pattern}`));
      })
    );

  program
    .command('learn-history')
    .description('从最近的 Git 历史提取可复用的 instinct 候选')
    .option('-n, --commits <count>', '分析最近多少次提交')
    .action(
      withCliErrorHandling(async (options) => {
        const result = await learnFromGitHistory({
          projectDir: process.cwd(),
          projectName: 'auto-wms',
          commitLimit: options.commits
        });

        if (result.skipped) {
          console.log(chalk.yellow(result.reason));
          console.log(chalk.gray(`  已分析提交: ${result.analyzedCommits}`));
          return;
        }

        console.log(chalk.green('已从 Git 历史学习 instinct 候选'));
        console.log(chalk.gray(`  模式: ${result.observation.pattern}`));
        console.log(chalk.gray(`  已分析提交: ${result.analyzedCommits}`));
        console.log(chalk.gray(`  观察次数: ${result.result.observations}`));
        console.log(chalk.gray(`  当前类型: ${result.result.kind}`));
      })
    );

  program
    .command('instinct-status')
    .description('查看已学习的 Instinct 与候选模式')
    .action(
      withCliErrorHandling(async () => {
        const manager = new InstinctManager();
        const status = await manager.getStatus();

        console.log('');
        console.log(chalk.cyan.bold(`已学习 Instincts (${status.counts.instincts} 条)`));
        if (status.instincts.length === 0) {
          console.log(chalk.gray('  暂无已确认 instinct'));
        } else {
          for (const instinct of status.instincts) {
            console.log(
              chalk.gray(
                `  - ${instinct.pattern} | 置信度 ${instinct.confidence} | 观察 ${instinct.observations} 次`
              )
            );
          }
        }

        console.log('');
        console.log(chalk.cyan.bold(`候选模式 (${status.counts.candidates} 条)`));
        if (status.candidates.length === 0) {
          console.log(chalk.gray('  暂无候选模式'));
        } else {
          for (const candidate of status.candidates) {
            console.log(
              chalk.gray(
                `  - ${candidate.pattern} | 置信度 ${candidate.confidence} | 观察 ${candidate.observations} 次`
              )
            );
          }
        }
        console.log('');
      })
    );

  program
    .command('instinct-export')
    .description('导出已学习的 Instinct 与候选模式')
    .option('-o, --output <path>', '导出文件路径')
    .action(
      withCliErrorHandling(async (options) => {
        const manager = new InstinctManager();
        const result = await manager.exportTo(options.output);
        console.log(chalk.green('Instinct 已导出'));
        console.log(chalk.gray(`  文件: ${result.filePath}`));
        console.log(chalk.gray(`  Instincts: ${result.counts.instincts}`));
        console.log(chalk.gray(`  Candidates: ${result.counts.candidates}`));
      })
    );

  program
    .command('instinct-import <file>')
    .description('导入已学习的 Instinct 与候选模式')
    .action(
      withCliErrorHandling(async (file) => {
        const manager = new InstinctManager();
        const result = await manager.importFrom(file);
        console.log(chalk.green('Instinct 已导入'));
        console.log(chalk.gray(`  文件: ${result.filePath}`));
        console.log(chalk.gray(`  导入 instincts: ${result.counts.instincts}`));
        console.log(chalk.gray(`  导入 candidates: ${result.counts.candidates}`));
      })
    );

  program
    .command('instinct-evolve')
    .description('聚合相关 Instinct 为更高阶技能候选')
    .option('-o, --output <path>', '导出文件路径')
    .action(
      withCliErrorHandling(async (options) => {
        const manager = new InstinctManager();
        const result = await manager.evolveTo(options.output);
        console.log(chalk.green('Instinct 已进化'));
        console.log(chalk.gray(`  文件: ${result.filePath}`));
        console.log(chalk.gray(`  技能候选: ${result.count}`));
      })
    );

  // 路由命令
  program
    .command('route <intent>')
    .description('使用 Canonical Router 智能路由到最合适的 Agent')
    .option('-d, --debug', '显示详细的路由决策过程')
    .option('-j, --json', '以 JSON 格式输出')
    .action(
      withCliErrorHandling(async (intent, options) => {
        await resolvedHandlers.runRoute(intent, options);
      })
    );

  program
    .command('status')
    .description('查看项目状态和能力安装情况')
    .option('-j, --json', '以 JSON 格式输出')
    .option('-d, --directory <path>', '指定项目目录')
    .action(
      withCliErrorHandling(async (options) => {
        await resolvedHandlers.runStatus(buildStatusOptions(options));
      })
    );

  program
    .command('doctor')
    .description('环境诊断并输出修复建议')
    .option('-j, --json', '以 JSON 格式输出')
    .option('--fix', '执行自动修复（当前版本保持只读诊断）')
    .option('-d, --directory <path>', '指定项目目录')
    .action(
      withCliErrorHandling(async (options) => {
        await resolvedHandlers.runDoctor(buildDoctorOptions(options));
      })
    );

  program
    .command('wms:auto <intent>')
    .description('运行 wms:auto 编排入口')
    .option('-j, --json', '以 JSON 格式输出')
    .option('--run', '执行完整编排流程')
    .option('--present-quest-map', '标记 Quest Map 已展示给用户')
    .option('--approve-quest-map', '确认 Quest Map 后允许进入执行阶段')
    .action(
      withCliErrorHandling(async (intent, options) => {
        await resolvedHandlers.runWmsAuto(intent, buildWmsAutoOptions(options));
      })
    );

  return program;
}

export function shouldParseCli(argv = process.argv, metaUrl = import.meta.url) {
  const entryPath = argv[1];
  return Boolean(entryPath) && metaUrl === pathToFileURL(entryPath).href;
}

const program = createProgram();

if (shouldParseCli()) {
  program.parse();
}
