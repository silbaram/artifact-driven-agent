import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import {
  readConfig,
  writeConfig,
  getConfigPath,
  getSkillsForRole,
  setSkillsForRole,
  addSkillsToRole,
  removeSkillsFromRole,
  getToolForRole,
} from '../utils/config.js';
import { getWorkspaceDir } from '../utils/files.js';
import type { AdaConfig } from '../types/index.js';

/**
 * [CLI] 설정 관리 명령어
 */
export async function config(
  action?: string,
  key?: string,
  ...values: string[]
): Promise<void> {
  const value = values[0];
  const configPath = getConfigPath();
  const currentConfig = readConfig();

  // 1. 인자 없이 실행 → 대화형 모드
  if (!action) {
    await runInteractiveSet(currentConfig);
    return;
  }

  // 2. 설정 조회 (List/Show)
  if (action === 'list' || action === 'show') {
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
      console.error(
        chalk.red('❌ 조회할 설정 키를 입력하세요. (예: roles.manager)')
      );
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

  // 4. 스킬 설정 (set-skills)
  if (action === 'set-skills') {
    if (!key) {
      console.log(chalk.red('역할을 지정해주세요.'));
      console.log(chalk.gray('예시: ada config set-skills developer spring-boot kotlin'));
      process.exit(1);
    }

    const role = key;
    const skills = value ? [value, ...values.slice(1)] : [];

    if (skills.length === 0) {
      console.log(chalk.red('최소 1개 이상의 스킬을 지정해주세요.'));
      process.exit(1);
    }

    // 스킬 파일 존재 여부 확인
    const workspaceDir = getWorkspaceDir();
    const skillsDir = path.join(workspaceDir, 'skills');

    for (const skill of skills) {
      const skillPath = path.join(skillsDir, skill, 'SKILL.md');
      if (!fs.existsSync(skillPath)) {
        console.log(chalk.yellow(`⚠️  스킬 파일이 없습니다: ${skill}`));
        console.log(chalk.gray(`   생성: ada skills create ${skill}`));
      }
    }

    setSkillsForRole(role, skills);

    console.log(chalk.green(`✓ ${role} 역할의 스킬 설정 완료`));
    console.log(chalk.gray(`스킬: ${skills.join(', ')}`));
    return;
  }

  // 5. 스킬 추가 (add-skills)
  if (action === 'add-skills') {
    if (!key) {
      console.log(chalk.red('역할을 지정해주세요.'));
      process.exit(1);
    }

    const role = key;
    const skills = value ? [value, ...values.slice(1)] : [];

    if (skills.length === 0) {
      console.log(chalk.red('최소 1개 이상의 스킬을 지정해주세요.'));
      process.exit(1);
    }

    addSkillsToRole(role, ...skills);

    const updated = getSkillsForRole(role);
    console.log(chalk.green(`✓ ${role} 역할에 스킬 추가 완료`));
    console.log(chalk.gray(`전체 스킬: ${updated.join(', ')}`));
    return;
  }

  // 6. 스킬 제거 (remove-skills)
  if (action === 'remove-skills') {
    if (!key) {
      console.log(chalk.red('역할을 지정해주세요.'));
      process.exit(1);
    }

    const role = key;
    const skills = value ? [value, ...values.slice(1)] : [];

    if (skills.length === 0) {
      console.log(chalk.red('최소 1개 이상의 스킬을 지정해주세요.'));
      process.exit(1);
    }

    removeSkillsFromRole(role, ...skills);

    const updated = getSkillsForRole(role);
    console.log(chalk.green(`✓ ${role} 역할에서 스킬 제거 완료`));
    console.log(chalk.gray(`남은 스킬: ${updated.length > 0 ? updated.join(', ') : '없음'}`));
    return;
  }

  // 7. 스킬 목록 보기 (show-skills)
  if (action === 'show-skills') {
    console.log(chalk.blue('━'.repeat(50)));
    console.log(chalk.bold('📚 역할별 스킬 설정'));
    console.log(chalk.blue('━'.repeat(50)));

    const roles = Object.keys(currentConfig.roles);

    for (const role of roles) {
      const skills = getSkillsForRole(role);
      const tool = getToolForRole(role);

      console.log(`\n${chalk.cyan(role)}`);
      console.log(`  도구: ${chalk.gray(tool)}`);

      if (skills.length > 0) {
        console.log(`  스킬: ${chalk.green(skills.join(', '))}`);
      } else {
        console.log(`  스킬: ${chalk.gray('없음')}`);
      }
    }

    console.log('');
    return;
  }

  console.error(chalk.red(`❌ 알 수 없는 명령입니다: ${action}`));
  console.log(chalk.gray('사용 가능: list, get, set, set-skills, add-skills, remove-skills, show-skills'));
}

/**
 * 대화형 설정 변경 (개선된 버전)
 */
async function runInteractiveSet(currentConfig: AdaConfig): Promise<void> {
  console.log(chalk.cyan('\n🛠️  설정 변경 마법사'));
  console.log(chalk.gray('   역할별 AI 도구를 설정합니다.\n'));

  const tools = ['claude', 'gemini', 'gpt', 'codex', 'copilot'];
  const pendingChanges: Record<string, string> = {};

  // 메인 루프
  while (true) {
    // 현재 설정 상태 표시
    printCurrentSettings(currentConfig, pendingChanges);

    // 메인 메뉴
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '무엇을 하시겠습니까?',
        choices: [
          { name: '📝 역할별 도구 설정', value: 'set_role' },
          { name: '🔧 기본 도구 변경', value: 'set_default' },
          { name: '📦 프리셋 적용', value: 'preset' },
          { name: '📚 스킬 관리', value: 'manage_skills' },
          new inquirer.Separator(),
          { name: '💾 저장하고 종료', value: 'save' },
          { name: '❌ 변경 취소', value: 'cancel' },
        ],
      },
    ]);

    if (action === 'set_role') {
      await setRoleTool(currentConfig, pendingChanges, tools);
    } else if (action === 'set_default') {
      await setDefaultTool(currentConfig, pendingChanges, tools);
    } else if (action === 'preset') {
      await applyPreset(currentConfig, pendingChanges);
    } else if (action === 'manage_skills') {
      await manageSkills(currentConfig);
    } else if (action === 'save') {
      if (Object.keys(pendingChanges).length === 0) {
        console.log(chalk.yellow('\n변경 사항이 없습니다.'));
      } else {
        // 변경 사항 적용
        for (const [configKey, configValue] of Object.entries(pendingChanges)) {
          setValue(currentConfig, configKey, configValue);
        }
        writeConfig(currentConfig);
        console.log(chalk.green('\n✅ 설정이 저장되었습니다.'));
        printChangeSummary(pendingChanges);
      }
      break;
    } else if (action === 'cancel') {
      if (Object.keys(pendingChanges).length > 0) {
        const { confirmCancel } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmCancel',
            message: '변경 사항이 있습니다. 정말 취소하시겠습니까?',
            default: false,
          },
        ]);
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
function printCurrentSettings(
  configData: AdaConfig,
  pendingChanges: Record<string, string>
): void {
  console.log(chalk.cyan('\n┌─────────────────────────────────────────┐'));
  console.log(
    chalk.cyan('│') +
      chalk.bold('        현재 설정 상태                   ') +
      chalk.cyan('│')
  );
  console.log(chalk.cyan('├─────────────────────────────────────────┤'));

  // 기본 도구
  const defaultTool =
    pendingChanges['defaults.tool'] || configData.defaults?.tool || 'claude';
  const defaultChanged = pendingChanges['defaults.tool']
    ? chalk.yellow(' (변경됨)')
    : '';
  console.log(
    chalk.cyan('│') +
      `  기본 도구: ${chalk.bold(defaultTool)}${defaultChanged}`.padEnd(48) +
      chalk.cyan('│')
  );

  console.log(chalk.cyan('├─────────────────────────────────────────┤'));

  // 역할별 설정
  const roles = Object.keys(configData.roles || {});
  roles.forEach((role) => {
    const currentValue =
      pendingChanges[`roles.${role}`] || configData.roles[role];
    const changed = pendingChanges[`roles.${role}`]
      ? chalk.yellow(' *')
      : '';
    const line = `  ${role.padEnd(12)}: ${currentValue}${changed}`;
    console.log(chalk.cyan('│') + line.padEnd(48) + chalk.cyan('│'));
  });

  console.log(chalk.cyan('└─────────────────────────────────────────┘'));

  if (Object.keys(pendingChanges).length > 0) {
    console.log(
      chalk.yellow(
        `  (* 저장되지 않은 변경 ${Object.keys(pendingChanges).length}개)`
      )
    );
  }
  console.log('');
}

/**
 * 역할별 도구 설정
 */
async function setRoleTool(
  configData: AdaConfig,
  pendingChanges: Record<string, string>,
  tools: string[]
): Promise<void> {
  const roles = Object.keys(configData.roles || {});

  const { selectedRole } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedRole',
      message: '설정할 역할을 선택하세요:',
      choices: [
        ...roles.map((role) => {
          const current =
            pendingChanges[`roles.${role}`] || configData.roles[role];
          return { name: `${role} (현재: ${current})`, value: role };
        }),
        new inquirer.Separator(),
        { name: '↩️  뒤로가기', value: '__back__' },
      ],
    },
  ]);

  if (selectedRole === '__back__') return;

  const currentTool =
    pendingChanges[`roles.${selectedRole}`] || configData.roles[selectedRole];

  const { selectedTool } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedTool',
      message: `${selectedRole}에 사용할 도구를 선택하세요:`,
      choices: [
        ...tools.map((tool) => ({
          name: tool === currentTool ? `${tool} (현재)` : tool,
          value: tool,
        })),
        new inquirer.Separator(),
        { name: '↩️  뒤로가기', value: '__back__' },
      ],
      default: currentTool,
    },
  ]);

  if (selectedTool === '__back__') return;

  if (selectedTool !== configData.roles[selectedRole]) {
    pendingChanges[`roles.${selectedRole}`] = selectedTool;
    console.log(
      chalk.green(
        `\n  ✓ ${selectedRole}: ${configData.roles[selectedRole]} → ${selectedTool}`
      )
    );
  } else {
    // 원래 값으로 돌아간 경우 pending에서 제거
    delete pendingChanges[`roles.${selectedRole}`];
  }
}

/**
 * 기본 도구 설정
 */
async function setDefaultTool(
  configData: AdaConfig,
  pendingChanges: Record<string, string>,
  tools: string[]
): Promise<void> {
  const currentDefault =
    pendingChanges['defaults.tool'] || configData.defaults?.tool || 'claude';

  const { selectedTool } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedTool',
      message: '기본 도구를 선택하세요:',
      choices: [
        ...tools.map((tool) => ({
          name: tool === currentDefault ? `${tool} (현재)` : tool,
          value: tool,
        })),
        new inquirer.Separator(),
        { name: '↩️  뒤로가기', value: '__back__' },
      ],
      default: currentDefault,
    },
  ]);

  if (selectedTool === '__back__') return;

  const originalDefault = configData.defaults?.tool || 'claude';
  if (selectedTool !== originalDefault) {
    pendingChanges['defaults.tool'] = selectedTool;
    console.log(
      chalk.green(`\n  ✓ 기본 도구: ${originalDefault} → ${selectedTool}`)
    );
  } else {
    delete pendingChanges['defaults.tool'];
  }
}

interface PresetSettings {
  default?: string;
  roles: Record<string, string>;
}

interface Preset {
  name: string;
  description: string;
  settings: PresetSettings;
}

/**
 * 프리셋 적용
 */
async function applyPreset(
  configData: AdaConfig,
  pendingChanges: Record<string, string>
): Promise<void> {
  const presets: Record<string, Preset> = {
    all_claude: {
      name: '🔵 All Claude',
      description: '모든 역할에 Claude 사용',
      settings: { default: 'claude', roles: {} },
    },
    all_gemini: {
      name: '🟢 All Gemini',
      description: '모든 역할에 Gemini 사용',
      settings: { default: 'gemini', roles: {} },
    },
    mixed_optimal: {
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
          analyzer: 'claude',
        },
      },
    },
    dev_gemini: {
      name: '⚡ Dev Gemini + Review Claude',
      description: '개발은 Gemini, 리뷰는 Claude',
      settings: {
        default: 'claude',
        roles: {
          developer: 'gemini',
        },
      },
    },
  };

  const { selectedPreset } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPreset',
      message: '적용할 프리셋을 선택하세요:',
      choices: [
        ...Object.entries(presets).map(([presetKey, preset]) => ({
          name: `${preset.name} - ${chalk.gray(preset.description)}`,
          value: presetKey,
        })),
        new inquirer.Separator(),
        { name: '↩️  뒤로가기', value: '__back__' },
      ],
    },
  ]);

  if (selectedPreset === '__back__') return;

  const preset = presets[selectedPreset];
  const roles = Object.keys(configData.roles || {});

  // 기본 도구 설정
  if (preset.settings.default) {
    const originalDefault = configData.defaults?.tool || 'claude';
    if (preset.settings.default !== originalDefault) {
      pendingChanges['defaults.tool'] = preset.settings.default;
    }
  }

  // 역할별 설정
  roles.forEach((role) => {
    let newValue: string;
    if (preset.settings.roles && preset.settings.roles[role]) {
      newValue = preset.settings.roles[role];
    } else {
      newValue = preset.settings.default || 'claude';
    }

    if (newValue !== configData.roles[role]) {
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
function printChangeSummary(changes: Record<string, string>): void {
  console.log(chalk.cyan('\n변경 내역:'));
  for (const [changeKey, changeValue] of Object.entries(changes)) {
    console.log(chalk.gray(`  - ${changeKey}: ${changeValue}`));
  }
}

/**
 * 설정 업데이트 및 저장 공통 로직
 */
function updateConfig(
  configData: AdaConfig,
  configKey: string,
  configValue: string
): void {
  const validTools = ['claude', 'gemini', 'gpt', 'codex', 'copilot'];

  // 유효성 검사
  if (configKey.startsWith('roles.') || configKey === 'defaults.tool') {
    if (!validTools.includes(configValue)) {
      console.warn(
        chalk.yellow(
          `⚠️  경고: '${configValue}'는 알려진 도구 목록(${validTools.join(', ')})에 없습니다.`
        )
      );
    }
  }

  setValue(configData, configKey, configValue);
  writeConfig(configData);

  console.log(
    chalk.green(`\n✅ 설정이 변경되었습니다: ${configKey} = ${configValue}`)
  );
}

// ----------------------------------------------------------------------
// 헬퍼 함수: 점(.)으로 구분된 키로 객체 접근 (Lodash get/set 대용)
// ----------------------------------------------------------------------

function getValue(
  obj: Record<string, unknown>,
  pathStr: string
): unknown {
  return pathStr
    .split('.')
    .reduce(
      (acc, part) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined,
      obj as unknown
    );
}

function setValue(
  obj: Record<string, unknown>,
  pathStr: string,
  value: unknown
): void {
  const parts = pathStr.split('.');
  const last = parts.pop();
  const target = parts.reduce((acc, part) => {
    if (!(acc as Record<string, unknown>)[part]) {
      (acc as Record<string, unknown>)[part] = {};
    }
    return (acc as Record<string, unknown>)[part];
  }, obj as unknown) as Record<string, unknown>;
  if (last) {
    target[last] = value;
  }
}

/**
 * 사용 가능한 스킬 목록 가져오기
 */
function getAvailableSkills(): string[] {
  const workspaceDir = getWorkspaceDir();
  const skillsDir = path.join(workspaceDir, 'skills');

  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
    .map(dirent => dirent.name);
}

/**
 * 스킬 관리 (대화형)
 */
async function manageSkills(config: AdaConfig): Promise<void> {
  while (true) {
    console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan.bold('📚 스킬 관리'));
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    const { skillAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'skillAction',
        message: '무엇을 하시겠습니까?',
        choices: [
          { name: '👀 역할별 스킬 보기', value: 'view' },
          { name: '➕ 역할에 스킬 추가', value: 'add' },
          { name: '➖ 역할에서 스킬 제거', value: 'remove' },
          { name: '🔄 역할 스킬 초기화', value: 'reset' },
          new inquirer.Separator(),
          { name: '↩️  뒤로가기', value: 'back' },
        ],
      },
    ]);

    if (skillAction === 'back') {
      break;
    }

    if (skillAction === 'view') {
      await viewRoleSkills(config);
    } else if (skillAction === 'add') {
      await addSkillsInteractive(config);
    } else if (skillAction === 'remove') {
      await removeSkillsInteractive(config);
    } else if (skillAction === 'reset') {
      await resetRoleSkills(config);
    }
  }
}

/**
 * 역할별 스킬 보기
 */
async function viewRoleSkills(config: AdaConfig): Promise<void> {
  console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('👀 역할별 스킬 현황'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  const roles = Object.keys(config.roles);

  for (const role of roles) {
    const skills = getSkillsForRole(role);
    const tool = getToolForRole(role);

    console.log(`${chalk.cyan(role)}`);
    console.log(`  도구: ${chalk.gray(tool)}`);

    if (skills.length > 0) {
      console.log(`  스킬: ${chalk.green(skills.join(', '))}`);
    } else {
      console.log(`  스킬: ${chalk.gray('없음')}`);
    }
    console.log('');
  }

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Enter 키를 눌러 계속...',
    },
  ]);
}

/**
 * 역할에 스킬 추가 (대화형)
 */
async function addSkillsInteractive(config: AdaConfig): Promise<void> {
  const roles = Object.keys(config.roles);
  const availableSkills = getAvailableSkills();

  if (availableSkills.length === 0) {
    console.log(chalk.yellow('\n⚠️  사용 가능한 스킬이 없습니다.'));
    console.log(chalk.gray('커뮤니티에서 스킬을 다운로드하여 ai-dev-team/skills/ 디렉토리에 추가하세요.'));
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Enter 키를 눌러 계속...',
      },
    ]);
    return;
  }

  // 역할 선택
  const { selectedRole } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedRole',
      message: '스킬을 추가할 역할을 선택하세요:',
      choices: roles.map((role) => {
        const current = getSkillsForRole(role);
        return {
          name: `${role} (현재: ${current.length > 0 ? current.join(', ') : '없음'})`,
          value: role,
        };
      }),
    },
  ]);

  const currentSkills = getSkillsForRole(selectedRole);

  // 스킬 선택 (멀티 선택)
  const { selectedSkills } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedSkills',
      message: '추가할 스킬을 선택하세요 (스페이스바로 선택):',
      choices: availableSkills.map((skill) => ({
        name: skill,
        value: skill,
        checked: currentSkills.includes(skill),
      })),
    },
  ]);

  if (selectedSkills.length === 0) {
    console.log(chalk.yellow('\n선택된 스킬이 없습니다.'));
    return;
  }

  // 스킬 설정
  setSkillsForRole(selectedRole, selectedSkills);

  console.log(chalk.green(`\n✓ ${selectedRole} 역할의 스킬 설정 완료`));
  console.log(chalk.gray(`스킬: ${selectedSkills.join(', ')}`));
}

/**
 * 역할에서 스킬 제거 (대화형)
 */
async function removeSkillsInteractive(config: AdaConfig): Promise<void> {
  const roles = Object.keys(config.roles);

  // 스킬이 있는 역할만 필터링
  const rolesWithSkills = roles.filter((role) => getSkillsForRole(role).length > 0);

  if (rolesWithSkills.length === 0) {
    console.log(chalk.yellow('\n⚠️  스킬이 설정된 역할이 없습니다.'));
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Enter 키를 눌러 계속...',
      },
    ]);
    return;
  }

  // 역할 선택
  const { selectedRole } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedRole',
      message: '스킬을 제거할 역할을 선택하세요:',
      choices: rolesWithSkills.map((role) => {
        const current = getSkillsForRole(role);
        return {
          name: `${role} (현재: ${current.join(', ')})`,
          value: role,
        };
      }),
    },
  ]);

  const currentSkills = getSkillsForRole(selectedRole);

  // 제거할 스킬 선택
  const { skillsToRemove } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'skillsToRemove',
      message: '제거할 스킬을 선택하세요:',
      choices: currentSkills.map((skill) => ({
        name: skill,
        value: skill,
      })),
    },
  ]);

  if (skillsToRemove.length === 0) {
    console.log(chalk.yellow('\n선택된 스킬이 없습니다.'));
    return;
  }

  // 스킬 제거
  removeSkillsFromRole(selectedRole, ...skillsToRemove);

  const remaining = getSkillsForRole(selectedRole);
  console.log(chalk.green(`\n✓ ${selectedRole} 역할에서 스킬 제거 완료`));
  console.log(chalk.gray(`남은 스킬: ${remaining.length > 0 ? remaining.join(', ') : '없음'}`));
}

/**
 * 역할 스킬 초기화 (대화형)
 */
async function resetRoleSkills(config: AdaConfig): Promise<void> {
  const roles = Object.keys(config.roles);

  // 스킬이 있는 역할만 필터링
  const rolesWithSkills = roles.filter((role) => getSkillsForRole(role).length > 0);

  if (rolesWithSkills.length === 0) {
    console.log(chalk.yellow('\n⚠️  스킬이 설정된 역할이 없습니다.'));
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Enter 키를 눌러 계속...',
      },
    ]);
    return;
  }

  // 역할 선택
  const { selectedRole } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedRole',
      message: '스킬을 초기화할 역할을 선택하세요:',
      choices: rolesWithSkills.map((role) => {
        const current = getSkillsForRole(role);
        return {
          name: `${role} (현재: ${current.join(', ')})`,
          value: role,
        };
      }),
    },
  ]);

  // 확인
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `${selectedRole} 역할의 모든 스킬을 제거하시겠습니까?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.gray('\n취소되었습니다.'));
    return;
  }

  // 스킬 초기화
  setSkillsForRole(selectedRole, []);

  console.log(chalk.green(`\n✓ ${selectedRole} 역할의 스킬이 초기화되었습니다.`));
}
