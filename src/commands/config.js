import chalk from 'chalk';
import inquirer from 'inquirer';
import { readConfig, writeConfig, getConfigPath } from '../utils/config.js';

/**
 * [CLI] 설정 관리 명령어
 */
export async function config(action, key, value) {
  const configPath = getConfigPath();
  const currentConfig = readConfig();

  // 1. 설정 조회 (List)
  if (!action || action === 'list') {
    console.log(chalk.cyan('━'.repeat(60)));
    console.log(chalk.cyan.bold('⚙️  ADA Configuration'));
    console.log(chalk.gray(`   Path: ${configPath}`));
    console.log(chalk.cyan('━'.repeat(60)));
    console.log('');
    console.log(JSON.stringify(currentConfig, null, 2));
    return;
  }

  // 2. 설정 값 확인 (Get)
  if (action === 'get') {
    if (!key) {
      // 키 입력이 없으면 목록에서 선택하게 할 수도 있음 (여기선 생략)
      console.error(chalk.red('❌ 조회할 설정 키를 입력하세요. (예: roles.manager)'));
      process.exit(1);
    }
    const val = getValue(currentConfig, key);
    console.log(val);
    return;
  }

  // 3. 설정 변경 (Set)
  if (action === 'set') {
    // 인자가 부족하면 대화형 모드로 진입
    if (!key || !value) {
      await runInteractiveSet(currentConfig);
      return;
    }

    // 인자가 있으면 바로 변경
    updateConfig(currentConfig, key, value);
    return;
  }

  console.error(chalk.red(`❌ 알 수 없는 명령입니다: ${action}`));
  console.log(chalk.gray('사용 가능: list, get, set'));
}

/**
 * 대화형 설정 변경 (개선된 버전)
 */
async function runInteractiveSet(currentConfig) {
  console.log(chalk.cyan('\n🛠️  설정 변경 마법사'));
  console.log(chalk.gray('   역할별 AI 도구를 설정합니다.\n'));

  const tools = ['claude', 'gemini', 'gpt', 'codex', 'copilot'];
  const pendingChanges = {}; // 변경 예정 사항 추적

  // 메인 루프
  while (true) {
    // 현재 설정 상태 표시
    printCurrentSettings(currentConfig, pendingChanges);

    // 메인 메뉴
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '무엇을 하시겠습니까?',
      choices: [
        { name: '📝 역할별 도구 설정', value: 'set_role' },
        { name: '🔧 기본 도구 변경', value: 'set_default' },
        { name: '📦 프리셋 적용', value: 'preset' },
        new inquirer.Separator(),
        { name: '💾 저장하고 종료', value: 'save' },
        { name: '❌ 변경 취소', value: 'cancel' }
      ]
    }]);

    if (action === 'set_role') {
      await setRoleTool(currentConfig, pendingChanges, tools);
    } else if (action === 'set_default') {
      await setDefaultTool(currentConfig, pendingChanges, tools);
    } else if (action === 'preset') {
      await applyPreset(currentConfig, pendingChanges);
    } else if (action === 'save') {
      if (Object.keys(pendingChanges).length === 0) {
        console.log(chalk.yellow('\n변경 사항이 없습니다.'));
      } else {
        // 변경 사항 적용
        for (const [key, value] of Object.entries(pendingChanges)) {
          setValue(currentConfig, key, value);
        }
        writeConfig(currentConfig);
        console.log(chalk.green('\n✅ 설정이 저장되었습니다.'));
        printChangeSummary(pendingChanges);
      }
      break;
    } else if (action === 'cancel') {
      if (Object.keys(pendingChanges).length > 0) {
        const { confirmCancel } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmCancel',
          message: '변경 사항이 있습니다. 정말 취소하시겠습니까?',
          default: false
        }]);
        if (!confirmCancel) continue;
      }
      console.log(chalk.gray('\n취소되었습니다.'));
      break;
    }
  }
}

/**
 * 현재 설정 상태 출력
 */
function printCurrentSettings(config, pendingChanges) {
  console.log(chalk.cyan('\n┌─────────────────────────────────────────┐'));
  console.log(chalk.cyan('│') + chalk.bold('        현재 설정 상태                   ') + chalk.cyan('│'));
  console.log(chalk.cyan('├─────────────────────────────────────────┤'));

  // 기본 도구
  const defaultTool = pendingChanges['defaults.tool'] || config.defaults?.tool || 'claude';
  const defaultChanged = pendingChanges['defaults.tool'] ? chalk.yellow(' (변경됨)') : '';
  console.log(chalk.cyan('│') + `  기본 도구: ${chalk.bold(defaultTool)}${defaultChanged}`.padEnd(48) + chalk.cyan('│'));

  console.log(chalk.cyan('├─────────────────────────────────────────┤'));

  // 역할별 설정
  const roles = Object.keys(config.roles || {});
  roles.forEach(role => {
    const currentValue = pendingChanges[`roles.${role}`] || config.roles[role];
    const changed = pendingChanges[`roles.${role}`] ? chalk.yellow(' *') : '';
    const line = `  ${role.padEnd(12)}: ${currentValue}${changed}`;
    console.log(chalk.cyan('│') + line.padEnd(48) + chalk.cyan('│'));
  });

  console.log(chalk.cyan('└─────────────────────────────────────────┘'));

  if (Object.keys(pendingChanges).length > 0) {
    console.log(chalk.yellow(`  (* 저장되지 않은 변경 ${Object.keys(pendingChanges).length}개)`));
  }
  console.log('');
}

/**
 * 역할별 도구 설정
 */
async function setRoleTool(config, pendingChanges, tools) {
  const roles = Object.keys(config.roles || {});

  const { selectedRole } = await inquirer.prompt([{
    type: 'list',
    name: 'selectedRole',
    message: '설정할 역할을 선택하세요:',
    choices: [
      ...roles.map(role => {
        const current = pendingChanges[`roles.${role}`] || config.roles[role];
        return { name: `${role} (현재: ${current})`, value: role };
      }),
      new inquirer.Separator(),
      { name: '↩️  뒤로가기', value: '__back__' }
    ]
  }]);

  if (selectedRole === '__back__') return;

  const currentTool = pendingChanges[`roles.${selectedRole}`] || config.roles[selectedRole];

  const { selectedTool } = await inquirer.prompt([{
    type: 'list',
    name: 'selectedTool',
    message: `${selectedRole}에 사용할 도구를 선택하세요:`,
    choices: [
      ...tools.map(tool => ({
        name: tool === currentTool ? `${tool} (현재)` : tool,
        value: tool
      })),
      new inquirer.Separator(),
      { name: '↩️  뒤로가기', value: '__back__' }
    ],
    default: currentTool
  }]);

  if (selectedTool === '__back__') return;

  if (selectedTool !== config.roles[selectedRole]) {
    pendingChanges[`roles.${selectedRole}`] = selectedTool;
    console.log(chalk.green(`\n  ✓ ${selectedRole}: ${config.roles[selectedRole]} → ${selectedTool}`));
  } else {
    // 원래 값으로 돌아간 경우 pending에서 제거
    delete pendingChanges[`roles.${selectedRole}`];
  }
}

/**
 * 기본 도구 설정
 */
async function setDefaultTool(config, pendingChanges, tools) {
  const currentDefault = pendingChanges['defaults.tool'] || config.defaults?.tool || 'claude';

  const { selectedTool } = await inquirer.prompt([{
    type: 'list',
    name: 'selectedTool',
    message: '기본 도구를 선택하세요:',
    choices: [
      ...tools.map(tool => ({
        name: tool === currentDefault ? `${tool} (현재)` : tool,
        value: tool
      })),
      new inquirer.Separator(),
      { name: '↩️  뒤로가기', value: '__back__' }
    ],
    default: currentDefault
  }]);

  if (selectedTool === '__back__') return;

  const originalDefault = config.defaults?.tool || 'claude';
  if (selectedTool !== originalDefault) {
    pendingChanges['defaults.tool'] = selectedTool;
    console.log(chalk.green(`\n  ✓ 기본 도구: ${originalDefault} → ${selectedTool}`));
  } else {
    delete pendingChanges['defaults.tool'];
  }
}

/**
 * 프리셋 적용
 */
async function applyPreset(config, pendingChanges) {
  const presets = {
    'all_claude': {
      name: '🔵 All Claude',
      description: '모든 역할에 Claude 사용',
      settings: { default: 'claude', roles: {} }
    },
    'all_gemini': {
      name: '🟢 All Gemini',
      description: '모든 역할에 Gemini 사용',
      settings: { default: 'gemini', roles: {} }
    },
    'mixed_optimal': {
      name: '🎨 Mixed Optimal',
      description: 'Planner/Reviewer: Claude, Developer: Gemini',
      settings: {
        default: 'claude',
        roles: {
          planner: 'claude',
          developer: 'gemini',
          reviewer: 'claude',
          documenter: 'claude',
          manager: 'claude',
          improver: 'claude',
          analyzer: 'claude'
        }
      }
    },
    'dev_gemini': {
      name: '⚡ Dev Gemini + Review Claude',
      description: '개발은 Gemini, 리뷰는 Claude',
      settings: {
        default: 'claude',
        roles: {
          developer: 'gemini'
        }
      }
    }
  };

  const { selectedPreset } = await inquirer.prompt([{
    type: 'list',
    name: 'selectedPreset',
    message: '적용할 프리셋을 선택하세요:',
    choices: [
      ...Object.entries(presets).map(([key, preset]) => ({
        name: `${preset.name} - ${chalk.gray(preset.description)}`,
        value: key
      })),
      new inquirer.Separator(),
      { name: '↩️  뒤로가기', value: '__back__' }
    ]
  }]);

  if (selectedPreset === '__back__') return;

  const preset = presets[selectedPreset];
  const roles = Object.keys(config.roles || {});

  // 기본 도구 설정
  if (preset.settings.default) {
    const originalDefault = config.defaults?.tool || 'claude';
    if (preset.settings.default !== originalDefault) {
      pendingChanges['defaults.tool'] = preset.settings.default;
    }
  }

  // 역할별 설정
  roles.forEach(role => {
    let newValue;
    if (preset.settings.roles && preset.settings.roles[role]) {
      newValue = preset.settings.roles[role];
    } else {
      newValue = preset.settings.default || 'claude';
    }

    if (newValue !== config.roles[role]) {
      pendingChanges[`roles.${role}`] = newValue;
    } else {
      delete pendingChanges[`roles.${role}`];
    }
  });

  console.log(chalk.green(`\n  ✓ 프리셋 '${preset.name}' 적용됨 (저장 필요)`));
}

/**
 * 변경 사항 요약 출력
 */
function printChangeSummary(changes) {
  console.log(chalk.cyan('\n변경 내역:'));
  for (const [key, value] of Object.entries(changes)) {
    console.log(chalk.gray(`  - ${key}: ${value}`));
  }
}

/**
 * 설정 업데이트 및 저장 공통 로직
 */
function updateConfig(config, key, value) {
  const validTools = ['claude', 'gemini', 'gpt', 'codex', 'copilot'];
  
  // 유효성 검사
  if (key.startsWith('roles.') || key === 'defaults.tool') {
    if (!validTools.includes(value)) {
      console.warn(chalk.yellow(`⚠️  경고: '${value}'는 알려진 도구 목록(${validTools.join(', ')})에 없습니다.`));
    }
  }

  setValue(config, key, value);
  writeConfig(config);
  
  console.log(chalk.green(`\n✅ 설정이 변경되었습니다: ${key} = ${value}`));
}

// ----------------------------------------------------------------------
// 헬퍼 함수: 점(.)으로 구분된 키로 객체 접근 (Lodash get/set 대용)
// ----------------------------------------------------------------------

function getValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function setValue(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((acc, part) => {
    if (!acc[part]) acc[part] = {};
    return acc[part];
  }, obj);
  target[last] = value;
}
