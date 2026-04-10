import chalk from 'chalk';
import { install, uninstall } from './installer.js';
import {
  showBanner,
  promptConfirmation,
  promptUninstallConfirmation,
  promptMainMenu,
  promptComponentSelection
} from './prompts.js';
import { getInstalledVersion, COMPONENTS, openBrowser } from './utils.js';
import { logger } from './logger.js';
import { DOCS_URL } from './config.js';
import { WmsIntentMatcher } from './wms/wms-intent-matcher.js';
import { ORCHESTRATION_MODE, WmsAutoOrchestrator } from './wms/runtime/index.js';
import { collectStatus, renderStatusReport } from './status.js';
import { collectDoctorReport, renderDoctorReport } from './doctor.js';

export async function interactiveMode() {
  showBanner();

  const action = await promptMainMenu();

  switch (action) {
    case 'install':
      await runInstall();
      break;
    case 'update':
      await runUpdate();
      break;
    case 'uninstall':
      await runUninstall();
      break;
    case 'docs':
      await runDocs();
      break;
    case 'exit':
      console.log(chalk.gray('再见！'));
      break;
  }
}

export async function runInstall(options = {}) {
  if (!options.quiet) {
    showBanner();
  }

  let selectedComponents;
  if (options.yes || options.components) {
    selectedComponents = options.components || Object.keys(COMPONENTS);
  } else {
    selectedComponents = await promptComponentSelection();
    if (!selectedComponents) {
      return;
    }
  }

  console.log('');
  console.log(chalk.cyan('将要安装以下组件：'));
  for (const key of selectedComponents) {
    console.log(chalk.gray(`  • ${COMPONENTS[key].name}`));
  }
  console.log('');

  if (!options.yes) {
    const confirmed = await promptConfirmation('确认安装 Auto WMS？');
    if (!confirmed) {
      console.log(chalk.yellow('安装已取消。'));
      return;
    }
  }

  console.log('');
  await install(selectedComponents, { force: options.force });

  console.log('');
  console.log(chalk.cyan('后续步骤：'));
  console.log(chalk.gray('  1. 重启 Claude Code 以加载新配置'));
  console.log(chalk.gray('  2. 使用 /wms:auto, /wms:route, /wms:doctor 等命令'));
  console.log('');
}

export async function runUpdate(options = {}) {
  const installedVersion = await getInstalledVersion();

  if (!installedVersion) {
    console.log(chalk.yellow('未找到安装记录，请先运行安装命令。'));
    return;
  }

  console.log(chalk.cyan(`正在从版本 ${installedVersion.version} 更新...`));
  console.log('');

  const selectedComponents = installedVersion.components || Object.keys(COMPONENTS);

  if (!options.yes) {
    const confirmed = await promptConfirmation('确认更新 Auto WMS？');
    if (!confirmed) {
      console.log(chalk.yellow('更新已取消。'));
      return;
    }
  }

  await install(selectedComponents, { force: true });
}

export async function runUninstall(options = {}) {
  const installedVersion = await getInstalledVersion();

  if (!installedVersion) {
    console.log(chalk.yellow('未找到安装记录。'));
    return;
  }

  if (!options.yes) {
    const confirmed = await promptUninstallConfirmation();
    if (!confirmed) {
      console.log(chalk.yellow('卸载已取消。'));
      return;
    }
  }

  const components = installedVersion.components || Object.keys(COMPONENTS);
  await uninstall(components);
}

export async function runDocs() {
  const url = DOCS_URL;
  console.log('');
  console.log(chalk.cyan('正在打开文档...'));
  console.log(chalk.gray(`  ${url}`));
  console.log('');

  const success = await openBrowser(url);
  if (!success) {
    logger.warn('无法自动打开浏览器，请手动访问上述链接。');
  }
}

export async function runRoute(userIntent, options = {}) {
  const { CanonicalRouter } = await import('./router/canonical-router.js');
  const { AgentRegistry } = await import('./router/agent-registry.js');

  const registry = new AgentRegistry();
  const router = new CanonicalRouter(registry);
  await router.initialize();

  const result = await router.route(userIntent, {
    scope: 'on-demand'
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('');
  console.log(chalk.cyan.bold('🧠 路由分析'));
  console.log(chalk.gray('━'.repeat(50)));
  console.log('');

  console.log(chalk.white.bold('📝 用户意图：'));
  console.log(`  ${chalk.gray(userIntent)}`);
  console.log('');

  console.log(chalk.white.bold('🎯 推荐结果：'));
  if (result.isDefault) {
    console.log(
      `  ${chalk.yellow('⚠️  无精确匹配，使用默认路由：')} ${chalk.white.bold(result.agent.displayName)}`
    );
  } else {
    console.log(
      `  ${chalk.green('✅ 主 Agent：')} ${chalk.white.bold(result.agent.displayName)} ${chalk.gray(
        `(${result.agent.name})`
      )}`
    );
    console.log(`  ${chalk.gray(`   优先级：${result.agent.priority}`)}`);
    console.log(`  ${chalk.gray(`   匹配原因：${result.matchReason}`)}`);
  }

  if (result.fallbackChain && result.fallbackChain.length > 0) {
    console.log('');
    console.log(chalk.white.bold('🔄 回退链（主 Agent 失败时）：'));
    result.fallbackChain.forEach((fallback, index) => {
      console.log(`  ${chalk.gray(`${index + 1}. ${fallback.displayName} (${fallback.name})`)}`);
    });
  }

  if (options.debug) {
    console.log('');
    console.log(chalk.white.bold('🔍 调试信息：'));
    const diagnose = await router.diagnose();
    console.log(`  ${chalk.gray(`Agent 总数：${diagnose.agentCount}`)}`);
    console.log(`  ${chalk.gray(`初始化状态：${diagnose.initialized}`)}`);
  }

  console.log('');
  console.log(chalk.gray('━'.repeat(50)));
  console.log('');
}

export async function runWmsAuto(userIntent, options = {}) {
  const orchestrator = options.orchestrator ?? new WmsAutoOrchestrator();
  const intentMatcher = options.intentMatcher ?? new WmsIntentMatcher();
  const wmsContext = options.wmsContext ?? intentMatcher.analyze(userIntent);
  const runtimeOptions = {
    ...options.runtimeOptions,
    wmsContext,
    mode: options.run ? ORCHESTRATION_MODE.RUN : ORCHESTRATION_MODE.PLAN_ONLY,
    questMapApproved: Boolean(options.approveQuestMap),
    questMapPresented: Boolean(options.presentQuestMap),
    source: options.source ?? 'src/index'
  };

  const result = await orchestrator.run(userIntent, runtimeOptions);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

export async function runStatus(options = {}) {
  const result = await collectStatus({ projectDir: options.directory });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  console.log(renderStatusReport(result));
  return result;
}

export async function runDoctor(options = {}) {
  const result = await collectDoctorReport({
    projectDir: options.directory,
    fix: Boolean(options.fix)
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  console.log(renderDoctorReport(result));
  return result;
}
