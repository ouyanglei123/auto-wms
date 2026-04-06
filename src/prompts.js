import inquirer from 'inquirer';
import chalk from 'chalk';
import { getClaudeDir, getInstalledVersion, getPackageVersion, COMPONENTS } from './utils.js';

/**
 * 进度条类
 */
export class ProgressBar {
  constructor(total, prefix = '') {
    this.total = total;
    this.current = 0;
    this.prefix = prefix;
    this.width = 30;
  }

  increment() {
    this.current++;
    this.render();
  }

  setCurrent(current) {
    this.current = current;
    this.render();
  }

  render() {
    const percent = Math.min(100, Math.round((this.current / this.total) * 100));
    const filled = Math.round((this.width * percent) / 100);
    const empty = this.width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percentStr = `${percent}%`.padStart(4);

    process.stdout.write(`\r${this.prefix} [${bar}] ${percentStr} (${this.current}/${this.total})`);

    if (this.current >= this.total) {
      process.stdout.write('\n');
    }
  }
}

/**
 * 交互式教程步骤
 */
const TUTORIAL_STEPS = [
  {
    title: '欢迎使用 Auto WMS',
    content: 'Auto WMS 是 WMS 仓储管理系统的智能开发辅助工具',
    tip: '输入 /wms:auto 开始使用'
  },
  {
    title: 'WMS 领域感知',
    content: '自动加载 6 大微服务的代码定位索引',
    tip: '出库 / 入库 / 基础数据 / 库内作业 / 库存 / EDI'
  },
  {
    title: '智能路由',
    content: '基于 Canonical Router 自动选择合适的 Agent',
    tip: '架构师 / 开发者 / 测试 / 安全审查'
  },
  {
    title: 'Quest Map',
    content: '闯关式开发规划，确保每步可验证',
    tip: 'PLAN → EXECUTE → VERIFY → COMMIT'
  }
];

/**
 * 显示欢迎横幅
 */
export function showBanner() {
  const version = getPackageVersion();
  console.log('');
  console.log(chalk.cyan.bold('  ╔═══════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('  ║                                           ║'));
  console.log(
    chalk.cyan.bold('  ║') +
      chalk.white.bold(`           Auto WMS（v${version}）                 `) +
      chalk.cyan.bold('║')
  );
  console.log(
    chalk.cyan.bold('  ║') +
      chalk.gray('     Claude Code 一键能力增强，开箱即用      ') +
      chalk.cyan.bold('║')
  );
  console.log(chalk.cyan.bold('  ║                                           ║'));
  console.log(chalk.cyan.bold('  ╚═══════════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.gray(`  目标目录：${getClaudeDir()}`));
  console.log('');
}

/**
 * 显示带实时反馈的进度信息
 * @param {string} message - 消息
 * @param {string} [type='info'] - 类型：info/success/warn/error
 */
export function showFeedback(message, type = 'info') {
  const icons = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    warn: chalk.yellow('⚠'),
    error: chalk.red('✗')
  };
  console.log(`${icons[type]} ${message}`);
}

/**
 * 运行交互式教程
 * @returns {Promise<void>}
 */
export async function runTutorial() {
  console.log(chalk.bold('\n  交互式教程\n'));

  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    const step = TUTORIAL_STEPS[i];
    console.log(chalk.cyan(`  步骤 ${i + 1}/${TUTORIAL_STEPS.length}: ${step.title}`));
    console.log(chalk.gray(`  ${step.content}`));
    console.log(chalk.green(`  提示: ${step.tip}`));
    console.log('');

    if (i < TUTORIAL_STEPS.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  console.log(chalk.bold('  教程完成！'));
  console.log('');
}

/**
 * 提示确认
 */
export async function promptConfirmation(message = '确认继续安装？') {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: true
    }
  ]);

  return confirmed;
}

/**
 * 提示卸载确认
 */
export async function promptUninstallConfirmation() {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: chalk.yellow('确定要卸载 Auto WMS 吗？'),
      default: false
    }
  ]);

  return confirmed;
}

/**
 * 提示选择要安装的组件
 */
export async function promptComponentSelection() {
  const installedVersion = await getInstalledVersion();
  const installedComponents = installedVersion?.components || [];

  const choices = Object.entries(COMPONENTS).map(([key, component]) => {
    const isInstalled = installedComponents.includes(key);
    return {
      name: `${component.name}${isInstalled ? chalk.green(' (已安装)') : ''}`,
      value: key,
      checked: true
    };
  });

  const { selectedComponents } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedComponents',
      message: '选择要安装的组件（空格选择/取消，回车确认）：',
      choices,
      pageSize: 10
    }
  ]);

  if (selectedComponents.length === 0) {
    console.log(chalk.yellow('未选择任何组件，操作已取消。'));
    return null;
  }

  return selectedComponents;
}

/**
 * 提示选择操作（主菜单）
 */
export async function promptMainMenu() {
  const installedVersion = await getInstalledVersion();

  const choices = [
    { name: '安装 Auto WMS', value: 'install' },
    { name: '更新 Auto WMS', value: 'update', disabled: !installedVersion ? '（未安装）' : false },
    {
      name: '卸载 Auto WMS',
      value: 'uninstall',
      disabled: !installedVersion ? '（未安装）' : false
    },
    new inquirer.Separator(),
    { name: '查看文档', value: 'docs' },
    { name: '退出', value: 'exit' }
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '请选择操作：',
      choices
    }
  ]);

  return action;
}
