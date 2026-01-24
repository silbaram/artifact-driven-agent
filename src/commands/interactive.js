import chalk from 'chalk';
import inquirer from 'inquirer';
import { setup } from './setup.js';
import { run } from './run.js';
import { status } from './status.js';
import { sessions } from './sessions.js';
import { logs } from './logs.js';
import { config } from './config.js';
import { monitor } from './monitor.js';
import { upgrade } from './upgrade.js';
import { validate } from './validate.js';
import sprintCommand from './sprint.js';
import docsCommand from './docs.js';
import {
  isWorkspaceSetup,
  getAvailableRoles,
  getAvailableTools
} from '../utils/files.js';
import { getToolForRole } from '../utils/config.js';

/**
 * 대화형 메인 메뉴 (ada 명령어 인자 없이 실행 시)
 */
export async function interactive() {
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('🤖 Artifact-Driven AI Agent Framework'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  // 1. 세팅 확인
  if (!isWorkspaceSetup()) {
    console.log(chalk.yellow('⚠️  프로젝트가 세팅되지 않았습니다.'));
    console.log('');

    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'doSetup',
        message: '지금 프로젝트를 세팅하시겠습니까?',
        default: true
      }
    ]);

    if (answer.doSetup) {
      await setup();
    } else {
      console.log(chalk.gray('나중에 `ada setup`으로 세팅할 수 있습니다.'));
    }
    return;
  }

  // 2. 메인 메뉴 루프
  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '작업을 선택하세요:',
        pageSize: 12,
        choices: [
          new inquirer.Separator('── 핵심 기능 ──'),
          { name: '🤖 역할별 에이전트 실행 (설정 도구)', value: 'run' },
          
          new inquirer.Separator('── 관리 기능 ──'),
          { name: '🏃 스프린트 관리 (Sprint)', value: 'sprint' },
          { name: '📊 상태 및 모니터링 (Status & Sessions)', value: 'monitor' },
          { name: '📝 문서 관리 (Docs)', value: 'docs' },
          
          new inquirer.Separator('── 설정 및 기타 ──'),
          { name: '⚙️  설정 (Config)', value: 'config' },
          { name: '🛠️  프로젝트 관리 (Upgrade/Validate)', value: 'project' },
          { name: '❌ 종료', value: 'exit' }
        ]
      }
    ]);

    if (action === 'exit') {
      console.log(chalk.gray('안녕히 가세요! 👋'));
      break;
    }

    try {
      await handleMenuAction(action);
    } catch (err) {
      console.error(chalk.red(`❌ 오류 발생: ${err.message}`));
    }
    
    // 작업 완료 후 줄바꿈
    console.log('');
  }
}

async function handleMenuAction(action) {
  switch (action) {
    case 'run':
      await handleRunAgent();
      break;

    case 'sprint':
      await handleSprintMenu();
      break;

    case 'monitor':
      await handleMonitorMenu();
      break;
      
    case 'docs':
      await handleDocsMenu();
      break;

    case 'config':
      await config();
      break;

    case 'project':
      await handleProjectMenu();
      break;
  }
}

/**
 * 2. 에이전트 실행 메뉴
 */
async function handleRunAgent() {
  const roles = getAvailableRoles();
  const tools = getAvailableTools();

  if (roles.length === 0) {
    console.log(chalk.red('❌ 사용 가능한 역할이 없습니다.'));
    return;
  }

  const { role } = await inquirer.prompt([
    {
      type: 'list',
      message: '실행할 역할을 선택하세요:',
      pageSize: 10,
      choices: roles.map(r => ({
        name: `${getRoleDescription(r)} (설정: ${getToolForRole(r)})`,
        value: r
      }))
    }
  ]);

  const configuredTool = getToolForRole(role);
  let selectedTool = configuredTool;

  if (!tools.includes(configuredTool)) {
    console.log(chalk.yellow(`⚠️  설정된 도구(${configuredTool})가 지원 목록에 없습니다.`));
    const { tool } = await inquirer.prompt([
      {
        type: 'list',
        name: 'tool',
        message: '사용할 AI 도구를 선택하세요:',
        choices: tools.map(t => ({
          name: getToolDescription(t),
          value: t
        }))
      }
    ]);
    selectedTool = tool;
  } else {
    const { runMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'runMode',
        message: `선택된 도구: ${configuredTool}. 어떻게 실행할까요?`,
        choices: [
          { name: `바로 실행 (${configuredTool})`, value: 'configured' },
          { name: '도구 변경 후 실행', value: 'manual' },
          { name: '🔙 뒤로가기', value: 'back' }
        ]
      }
    ]);

    if (runMode === 'back') return;

    if (runMode === 'manual') {
      const { tool } = await inquirer.prompt([
        {
          type: 'list',
          name: 'tool',
          message: 'AI 도구를 선택하세요:',
          choices: tools.map(t => ({
            name: getToolDescription(t),
            value: t
          })),
          default: configuredTool
        }
      ]);
      selectedTool = tool;
    }
  }

  console.log('');
  await run(role, selectedTool);
}

/**
 * 3. 스프린트 메뉴
 */
async function handleSprintMenu() {
  const { subAction } = await inquirer.prompt([{
    type: 'list',
    name: 'subAction',
    message: '스프린트 작업:',
    choices: [
      { name: '🆕 스프린트 생성 (Create)', value: 'create' },
      { name: '➕ Task 추가 (Add)', value: 'add' },
      { name: '📋 목록 보기 (List)', value: 'list' },
      { name: '🔄 동기화 (Sync Meta)', value: 'sync' },
      { name: '🚪 스프린트 종료 (Close)', value: 'close' },
      { name: '🔙 뒤로가기', value: 'back' }
    ]
  }]);

  if (subAction === 'back') return;

  // 스프린트 명령어 호출 (인자 처리 필요)
  if (subAction === 'add') {
    const { taskIds } = await inquirer.prompt([{
      type: 'input',
      name: 'taskIds',
      message: '추가할 Task ID를 공백으로 구분하여 입력하세요 (예: task-001 task-002):'
    }]);
    if (taskIds.trim()) {
      await sprintCommand('add', taskIds.split(' '));
    }
  } else if (subAction === 'close') {
     const { closeOpt } = await inquirer.prompt([{
      type: 'list',
      name: 'closeOpt',
      message: '종료 옵션:',
      choices: [
        { name: '기본 (작업파일 보관)', value: [] },
        { name: '정리 (작업파일 삭제)', value: ['--clean'] },
        { name: '유지 (모든파일 유지)', value: ['--keep-all'] }
      ]
    }]);
    // close는 내부적으로 commander program 객체 구조에 의존할 수 있으므로 직접 호출 시 주의 필요
    // 여기서는 cli.js를 통하지 않고 직접 함수 호출하므로, sprintCommand 구현 확인 필요
    // sprintCommand는 (action, tasks, options) 시그니처를 가짐 (commander action wrapper)
    // 하지만 commander action은 (arg1, arg2..., options) 형태임.
    
    // 단순화를 위해 여기서는 sprint.js의 로직을 직접 호출하는게 좋지만,
    // 현재 구조상 sprintCommand는 commander action 핸들러임.
    // 임시로 옵션 객체 흉내내서 전달
    const options = {};
    if (closeOpt.includes('--clean')) options.clean = true;
    if (closeOpt.includes('--keep-all')) options.keepAll = true;
    
    await sprintCommand('close', [], options);

  } else {
    await sprintCommand(subAction, []);
  }
}

/**
 * 5. 모니터링 메뉴
 */
async function handleMonitorMenu() {
  const { subAction } = await inquirer.prompt([{
    type: 'list',
    name: 'subAction',
    message: '모니터링:',
    choices: [
      { name: '📊 전체 상태 확인 (Status)', value: 'status' },
      { name: '🖥️  실시간 대시보드 (Dashboard)', value: 'dashboard' },
      { name: '📋 세션 목록 (Sessions)', value: 'sessions' },
      { name: '📜 최근 로그 (Logs)', value: 'logs' },
      { name: '🧹 세션 정리 (Clean)', value: 'clean' },
      { name: '🔙 뒤로가기', value: 'back' }
    ]
  }]);

  if (subAction === 'back') return;

  if (subAction === 'status') await status();
  else if (subAction === 'dashboard') await monitor();
  else if (subAction === 'sessions') await sessions({});
  else if (subAction === 'logs') await logs();
  else if (subAction === 'clean') await sessions({ clean: true });
}

/**
 * 6. 문서 메뉴
 */
async function handleDocsMenu() {
   const { subAction } = await inquirer.prompt([{
    type: 'list',
    name: 'subAction',
    message: '문서 작업:',
    choices: [
      { name: '🏗️  문서 사이트 초기화 (Init)', value: 'init' },
      { name: '📄 문서 생성/갱신 (Generate)', value: 'generate' },
      { name: '🌐 로컬 미리보기 (Serve)', value: 'serve' },
      { name: '🚀 배포 (Publish)', value: 'publish' },
      { name: '🔙 뒤로가기', value: 'back' }
    ]
  }]);

  if (subAction === 'back') return;

  // docsCommand도 commander action 핸들러임
  if (subAction === 'init') {
     const { generator } = await inquirer.prompt([{
      type: 'list',
      name: 'generator',
      message: '생성기 선택:',
      choices: ['mkdocs', 'jekyll']
    }]);
    await docsCommand('init', { generator });
  } else {
    await docsCommand(subAction, {});
  }
}

/**
 * 8. 프로젝트 관리 메뉴
 */
async function handleProjectMenu() {
  const { subAction } = await inquirer.prompt([{
    type: 'list',
    name: 'subAction',
    message: '프로젝트 관리:',
    choices: [
      { name: '✅ 문서 검증 (Validate)', value: 'validate' },
      { name: '⬆️  업그레이드 (Upgrade)', value: 'upgrade' },
      { name: '🔙 뒤로가기', value: 'back' }
    ]
  }]);

  if (subAction === 'back') return;

  if (subAction === 'validate') await validate();
  else if (subAction === 'upgrade') await upgrade({});
}

// --- Helpers ---

function getRoleDescription(role) {
  const descriptions = {
    planner: 'planner      - 요구사항 수집, Task 분해',
    improver: 'improver     - 기존 기능 개선 기획',
    developer: 'developer    - 코드 구현 (범용)',
    reviewer: 'reviewer     - 코드 리뷰',
    documenter: 'documenter   - 문서 작성',
    analyzer: 'analyzer     - 코드베이스 분석',
    manager: 'manager      - (수동) 프로젝트 관리',
    backend: 'backend      - API 설계, 서버 구현',
    frontend: 'frontend     - UI 구현, API 연동',
  };
  return descriptions[role] || role;
}

function getToolDescription(tool) {
  const descriptions = {
    claude: 'Claude       - Anthropic Claude CLI',
    codex: 'Codex        - OpenAI Codex CLI',
    gemini: 'Gemini       - Google Gemini CLI',
    copilot: 'Copilot      - GitHub Copilot CLI'
  };
  return descriptions[tool] || tool;
}
