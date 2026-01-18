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
 * 대화형 설정 변경
 */
async function runInteractiveSet(currentConfig) {
  console.log(chalk.cyan('\n🛠️  설정 변경 마법사\n'));

  // 1. 변경할 키 선택
  // roles.* 및 defaults.tool 등을 목록으로 제공
  const roleKeys = Object.keys(currentConfig.roles || {}).map(r => `roles.${r}`);
  const keys = ['defaults.tool', ...roleKeys];

  const { selectedKey } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedKey',
      message: '변경할 설정을 선택하세요:',
      choices: keys,
      pageSize: 10
    }
  ]);

  // 2. 변경할 값 선택
  // 도구 목록 제공
  const tools = ['claude', 'gemini', 'gpt', 'codex', 'copilot'];
  
  const { selectedValue } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedValue',
      message: `${selectedKey}에 사용할 도구를 선택하세요:`,
      choices: tools
    }
  ]);

  // 3. 업데이트 수행
  updateConfig(currentConfig, selectedKey, selectedValue);
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
