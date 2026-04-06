#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { interactiveMode, runInstall, runUpdate, runUninstall, runRoute } from '../src/index.js';
import { getPackageVersion, COMPONENTS, openBrowser } from '../src/utils.js';
import { DOCS_URL } from '../src/config.js';
import { KnowledgeSteward } from '../src/knowledge/knowledge-steward.js';
import { InstinctManager } from '../src/learning/instinct-manager.js';
import { learnFromTaskEvent } from '../src/learning/task-event-learning.js';

const program = new Command();

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
program.action(async () => {
  try {
    await interactiveMode();
  } catch (error) {
    console.error(chalk.red('错误：'), error.message);
    process.exit(1);
  }
});

// 安装命令
program
  .command('install')
  .description('安装 Auto WMS')
  .option('-y, --yes', '跳过确认提示')
  .option('-f, --force', '强制覆盖现有文件（不备份）')
  .option('-c, --components <list>', '指定安装的组件，逗号分隔（如: agents,commands,skills）')
  .action(async (options) => {
    try {
      await runInstall({
        yes: options.yes,
        force: options.force,
        quiet: false,
        components: options.components
          ? options.components
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined
      });
    } catch (error) {
      console.error(chalk.red('错误：'), error.message);
      process.exit(1);
    }
  });

// 更新命令
program
  .command('update')
  .description('更新 Auto WMS')
  .option('-y, --yes', '跳过确认提示')
  .action(async (options) => {
    try {
      await runUpdate({ yes: options.yes });
    } catch (error) {
      console.error(chalk.red('错误：'), error.message);
      process.exit(1);
    }
  });

// 卸载命令
program
  .command('uninstall')
  .description('卸载 Auto WMS')
  .option('-y, --yes', '跳过确认提示')
  .action(async (options) => {
    try {
      await runUninstall({ yes: options.yes });
    } catch (error) {
      console.error(chalk.red('错误：'), error.message);
      process.exit(1);
    }
  });

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
  .action(async () => {
    const url = DOCS_URL;
    console.log('');
    console.log(chalk.cyan('正在打开文档...'));
    console.log(chalk.gray(`  ${url}`));
    console.log('');

    const success = await openBrowser(url);
    if (!success) {
      console.log(chalk.yellow('无法自动打开浏览器，请手动访问上述链接。'));
    }
  });

// 知识保存命令
const save = program.command('save').description('保存知识条目（灵感、踩坑经验、架构决策等）');

save
  .command('insight')
  .description('保存一条知识条目')
  .requiredOption('-c, --content <text>', '要保存的内容')
  .option('-t, --category <type>', '指定分类（prompt, trap, pattern, decision）')
  .option('--tags <tags>', '标签，逗号分隔（如: react,performance）')
  .option('--git', '启用 git 自动提交（默认关闭）')
  .action(async (options) => {
    try {
      const steward = new KnowledgeSteward();
      const tags = options.tags
        ? options.tags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

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
    } catch (error) {
      console.error(chalk.red('错误：'), error.message);
      process.exit(1);
    }
  });

save
  .command('list')
  .description('列出所有知识条目统计')
  .action(async () => {
    try {
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
    } catch (error) {
      console.error(chalk.red('错误：'), error.message);
      process.exit(1);
    }
  });

save
  .command('search')
  .description('搜索知识条目')
  .requiredOption('-q, --query <keyword>', '搜索关键词')
  .action(async (options) => {
    try {
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
    } catch (error) {
      console.error(chalk.red('错误：'), error.message);
      process.exit(1);
    }
  });

save
  .command('instinct')
  .description('记录一条可复用的编码模式观察')
  .requiredOption('-p, --pattern <text>', '模式描述')
  .requiredOption('-a, --action <text>', '下次应自动应用的动作')
  .option('-s, --source <text>', '观察来源')
  .option('-e, --evidence <items>', '证据，逗号分隔')
  .option('--tags <tags>', '标签，逗号分隔')
  .action(async (options) => {
    try {
      const manager = new InstinctManager();
      const evidence = options.evidence
        ? options.evidence
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      const tags = options.tags
        ? options.tags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

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
    } catch (error) {
      console.error(chalk.red('错误：'), error.message);
      process.exit(1);
    }
  });

program
  .command('internal:learn-task-event')
  .description('内部命令：从 TaskCompleted 事件学习 instinct')
  .action(async () => {
    try {
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
    } catch (error) {
      console.error(chalk.red('错误：'), error.message);
      process.exit(1);
    }
  });

program
  .command('instinct-status')
  .description('查看已学习的 Instinct 与候选模式')
  .action(async () => {
    try {
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
    } catch (error) {
      console.error(chalk.red('错误：'), error.message);
      process.exit(1);
    }
  });

// 路由命令
program
  .command('route <intent>')
  .description('使用 Canonical Router 智能路由到最合适的 Agent')
  .option('-d, --debug', '显示详细的路由决策过程')
  .option('-j, --json', '以 JSON 格式输出')
  .action(async (intent, options) => {
    try {
      await runRoute(intent, options);
    } catch (error) {
      console.error(chalk.red('错误：'), error.message);
      process.exit(1);
    }
  });

program.parse();
