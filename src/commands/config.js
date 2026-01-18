import chalk from 'chalk';
import inquirer from 'inquirer';
import { readConfig, writeConfig, getConfigPath } from '../utils/config.js';
import { isWorkspaceSetup, getAvailableRoles } from '../utils/files.js';

const AVAILABLE_TOOLS = ['claude', 'gemini', 'codex', 'copilot'];

/**
 * [CLI] config 명령어 핸들러
 * @param {string} action - 액션 (set, show, reset, interactive)
 * @param {string[]} args - 추가 인자
 */
export async function config(action, args = []) {
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('❌ 먼저 setup을 실행하세요.'));
    console.log(chalk.gray('  ada setup'));
    process.exit(1);
  }

  // 인자 없으면 대화형 모드
  if (!action) {
    await interactiveConfig();
    return;
  }

  switch (action) {
    case 'show':
      showConfig();
      break;
    case 'set':
      await setConfig(args);
      break;
    case 'set-default':
      await setDefaultTool(args[0]);
      break;
    case 'reset':
      await resetConfig();
      break;
    default:
      console.log(chalk.red(`❌ 알 수 없는 액션: ${action}`));
      showHelp();
  }
}

/**
 * 현재 설정 표시
 */
function showConfig() {
  const cfg = readConfig();
  const configPath = getConfigPath();

  console.log('');
  console.log(chalk.cyan('━'.repeat(50)));
  console.log(chalk.cyan.bold('⚙️  ADA 설정'));
  console.log(chalk.cyan('━'.repeat(50)));
  console.log('');

  console.log(chalk.white('📁 설정 파일:'), chalk.gray(configPath));
  console.log('');

  console.log(chalk.yellow('🔧 기본 도구:'), chalk.green(cfg.defaults.tool));
  console.log('');

  console.log(chalk.yellow('👥 역할별 도구 설정:'));
  console.log('');

  const roles = Object.keys(cfg.roles).sort();
  const maxRoleLen = Math.max(...roles.map(r => r.length));

  roles.forEach(role => {
    const tool = cfg.roles[role];
    const rolePadded = role.padEnd(maxRoleLen);
    const toolColor = getToolColor(tool);
    console.log(`  ${chalk.white(rolePadded)}  →  ${toolColor(tool)}`);
  });

  console.log('');
  console.log(chalk.cyan('━'.repeat(50)));
  console.log('');
  console.log(chalk.gray('사용 가능한 도구:'), AVAILABLE_TOOLS.join(', '));
  console.log(chalk.gray('설정 변경: ada config set <역할> <도구>'));
  console.log(chalk.gray('대화형 설정: ada config'));
  console.log('');
}

/**
 * 역할별 도구 설정
 */
async function setConfig(args) {
  if (args.length < 2) {
    console.log(chalk.red('❌ 사용법: ada config set <역할> <도구>'));
    console.log(chalk.gray('  예: ada config set developer gemini'));
    return;
  }

  const [role, tool] = args;
  const cfg = readConfig();

  // 역할 검증
  const availableRoles = getAvailableRoles();
  if (!availableRoles.includes(role) && !cfg.roles[role]) {
    console.log(chalk.red(`❌ 알 수 없는 역할: ${role}`));
    console.log(chalk.gray(`  사용 가능: ${availableRoles.join(', ')}`));
    return;
  }

  // 도구 검증
  if (!AVAILABLE_TOOLS.includes(tool)) {
    console.log(chalk.red(`❌ 알 수 없는 도구: ${tool}`));
    console.log(chalk.gray(`  사용 가능: ${AVAILABLE_TOOLS.join(', ')}`));
    return;
  }

  // 설정 업데이트
  cfg.roles[role] = tool;
  writeConfig(cfg);

  console.log(chalk.green(`✅ ${role} 역할의 도구가 ${tool}로 설정되었습니다.`));
}

/**
 * 기본 도구 설정
 */
async function setDefaultTool(tool) {
  if (!tool) {
    console.log(chalk.red('❌ 사용법: ada config set-default <도구>'));
    console.log(chalk.gray('  예: ada config set-default gemini'));
    return;
  }

  if (!AVAILABLE_TOOLS.includes(tool)) {
    console.log(chalk.red(`❌ 알 수 없는 도구: ${tool}`));
    console.log(chalk.gray(`  사용 가능: ${AVAILABLE_TOOLS.join(', ')}`));
    return;
  }

  const cfg = readConfig();
  cfg.defaults.tool = tool;
  writeConfig(cfg);

  console.log(chalk.green(`✅ 기본 도구가 ${tool}로 설정되었습니다.`));
}

/**
 * 설정 초기화
 */
async function resetConfig() {
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: '설정을 초기화하시겠습니까? 모든 역할이 claude로 재설정됩니다.',
    default: false
  }]);

  if (!confirm) {
    console.log(chalk.yellow('취소되었습니다.'));
    return;
  }

  const defaultConfig = {
    version: '1.0',
    defaults: { tool: 'claude' },
    roles: {
      manager: 'claude',
      planner: 'claude',
      architect: 'claude',
      developer: 'claude',
      reviewer: 'claude',
      qa: 'claude',
      improver: 'claude',
      documenter: 'claude'
    }
  };

  writeConfig(defaultConfig);
  console.log(chalk.green('✅ 설정이 초기화되었습니다.'));
}

/**
 * 대화형 설정 모드
 */
async function interactiveConfig() {
  console.log('');
  console.log(chalk.cyan('━'.repeat(50)));
  console.log(chalk.cyan.bold('⚙️  ADA 설정 (대화형 모드)'));
  console.log(chalk.cyan('━'.repeat(50)));
  console.log('');

  const { mode } = await inquirer.prompt([{
    type: 'list',
    name: 'mode',
    message: '무엇을 하시겠습니까?',
    choices: [
      { name: '📋 현재 설정 보기', value: 'show' },
      { name: '🔧 역할별 도구 설정', value: 'set_roles' },
      { name: '⚡ 기본 도구 변경', value: 'set_default' },
      { name: '🎯 빠른 설정 (프리셋)', value: 'preset' },
      { name: '🔄 설정 초기화', value: 'reset' },
      { name: '❌ 취소', value: 'cancel' }
    ]
  }]);

  switch (mode) {
    case 'show':
      showConfig();
      break;
    case 'set_roles':
      await setRolesInteractive();
      break;
    case 'set_default':
      await setDefaultInteractive();
      break;
    case 'preset':
      await applyPreset();
      break;
    case 'reset':
      await resetConfig();
      break;
    case 'cancel':
      console.log(chalk.gray('취소되었습니다.'));
      break;
  }
}

/**
 * 역할별 도구 대화형 설정
 */
async function setRolesInteractive() {
  const cfg = readConfig();
  const roles = Object.keys(cfg.roles).sort();

  console.log('');
  console.log(chalk.yellow('각 역할에 사용할 AI 도구를 선택하세요.'));
  console.log(chalk.gray('(Enter를 누르면 현재 설정 유지)'));
  console.log('');

  const questions = roles.map(role => ({
    type: 'list',
    name: role,
    message: `${role}:`,
    choices: AVAILABLE_TOOLS.map(tool => ({
      name: tool === cfg.roles[role] ? `${tool} (현재)` : tool,
      value: tool
    })),
    default: cfg.roles[role]
  }));

  const answers = await inquirer.prompt(questions);

  // 설정 업데이트
  Object.keys(answers).forEach(role => {
    cfg.roles[role] = answers[role];
  });
  writeConfig(cfg);

  console.log('');
  console.log(chalk.green('✅ 설정이 저장되었습니다.'));
  console.log('');
  showConfig();
}

/**
 * 기본 도구 대화형 설정
 */
async function setDefaultInteractive() {
  const cfg = readConfig();

  const { tool } = await inquirer.prompt([{
    type: 'list',
    name: 'tool',
    message: '기본 도구를 선택하세요:',
    choices: AVAILABLE_TOOLS.map(t => ({
      name: t === cfg.defaults.tool ? `${t} (현재)` : t,
      value: t
    })),
    default: cfg.defaults.tool
  }]);

  cfg.defaults.tool = tool;
  writeConfig(cfg);

  console.log(chalk.green(`✅ 기본 도구가 ${tool}로 설정되었습니다.`));
}

/**
 * 프리셋 적용
 */
async function applyPreset() {
  const presets = {
    all_claude: {
      name: '🟠 All Claude - 모든 역할에 Claude 사용',
      config: {
        manager: 'claude', planner: 'claude', architect: 'claude',
        developer: 'claude', reviewer: 'claude', qa: 'claude',
        improver: 'claude', documenter: 'claude'
      }
    },
    all_gemini: {
      name: '🔵 All Gemini - 모든 역할에 Gemini 사용',
      config: {
        manager: 'gemini', planner: 'gemini', architect: 'gemini',
        developer: 'gemini', reviewer: 'gemini', qa: 'gemini',
        improver: 'gemini', documenter: 'gemini'
      }
    },
    mixed_optimal: {
      name: '🟢 Mixed Optimal - 역할별 최적 도구 조합',
      config: {
        manager: 'claude',
        planner: 'claude',
        architect: 'claude',
        developer: 'claude',
        reviewer: 'gemini',
        qa: 'gemini',
        improver: 'claude',
        documenter: 'gemini'
      }
    },
    dev_gemini_review_claude: {
      name: '🟣 Dev Gemini + Review Claude',
      config: {
        manager: 'claude',
        planner: 'claude',
        architect: 'claude',
        developer: 'gemini',
        reviewer: 'claude',
        qa: 'claude',
        improver: 'gemini',
        documenter: 'claude'
      }
    }
  };

  const { preset } = await inquirer.prompt([{
    type: 'list',
    name: 'preset',
    message: '프리셋을 선택하세요:',
    choices: [
      ...Object.entries(presets).map(([key, value]) => ({
        name: value.name,
        value: key
      })),
      { name: '❌ 취소', value: 'cancel' }
    ]
  }]);

  if (preset === 'cancel') {
    console.log(chalk.gray('취소되었습니다.'));
    return;
  }

  const selectedPreset = presets[preset];
  const cfg = readConfig();
  cfg.roles = { ...cfg.roles, ...selectedPreset.config };
  writeConfig(cfg);

  console.log('');
  console.log(chalk.green(`✅ "${selectedPreset.name}" 프리셋이 적용되었습니다.`));
  console.log('');
  showConfig();
}

/**
 * 도움말 표시
 */
function showHelp() {
  console.log('');
  console.log(chalk.cyan('사용법:'));
  console.log('  ada config                    대화형 설정 모드');
  console.log('  ada config show               현재 설정 보기');
  console.log('  ada config set <역할> <도구>  역할별 도구 설정');
  console.log('  ada config set-default <도구> 기본 도구 설정');
  console.log('  ada config reset              설정 초기화');
  console.log('');
  console.log(chalk.cyan('예시:'));
  console.log('  ada config set developer gemini');
  console.log('  ada config set reviewer claude');
  console.log('  ada config set-default gemini');
  console.log('');
  console.log(chalk.cyan('사용 가능한 도구:'));
  console.log(`  ${AVAILABLE_TOOLS.join(', ')}`);
  console.log('');
}

/**
 * 도구별 색상 반환
 */
function getToolColor(tool) {
  const colors = {
    claude: chalk.hex('#D97706'),  // 주황색
    gemini: chalk.hex('#4285F4'),  // 파란색
    codex: chalk.hex('#10B981'),   // 초록색
    copilot: chalk.hex('#6366F1')  // 보라색
  };
  return colors[tool] || chalk.white;
}
