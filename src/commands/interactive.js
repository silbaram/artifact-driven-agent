import chalk from 'chalk';
import inquirer from 'inquirer';
import { setup } from './setup.js';
import { run } from './run.js';
import {
  isWorkspaceSetup,
  getAvailableRoles,
  getAvailableTools,
  getAvailableTemplates
} from '../utils/files.js';

export async function interactive() {
  console.log('');
  console.log(chalk.cyan('━'.repeat(50)));
  console.log(chalk.cyan.bold('🤖 Artifact-Driven AI Agent'));
  console.log(chalk.cyan('━'.repeat(50)));
  console.log('');

  // 세팅되지 않은 경우
  if (!isWorkspaceSetup()) {
    console.log(chalk.yellow('⚠️  프로젝트가 세팅되지 않았습니다.'));
    console.log('');

    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'doSetup',
        message: '지금 세팅하시겠습니까?',
        default: true
      }
    ]);

    if (answer.doSetup) {
      await setup();
    } else {
      console.log(chalk.gray('나중에 `ada setup`으로 세팅할 수 있습니다.'));
      return;
    }
  }

  // 역할 선택
  const roles = getAvailableRoles();
  const tools = getAvailableTools();

  if (roles.length === 0) {
    console.log(chalk.red('❌ 사용 가능한 역할이 없습니다.'));
    console.log(chalk.gray('`ada setup`으로 다시 세팅하세요.'));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'role',
      message: '역할을 선택하세요:',
      choices: roles.map(r => ({
        name: getRoleDescription(r),
        value: r
      }))
    },
    {
      type: 'list',
      name: 'tool',
      message: 'AI 도구를 선택하세요:',
      choices: tools.map(t => ({
        name: getToolDescription(t),
        value: t
      }))
    }
  ]);

  await run(answers.role, answers.tool);
}

function getRoleDescription(role) {
  const descriptions = {
    planner: 'planner      - 요구사항 수집, Task 분해',
    architect: 'architect    - 규모 예측, 기술 스택 결정',
    developer: 'developer    - 코드 구현 (범용)',
    reviewer: 'reviewer     - 코드 리뷰',
    qa: 'qa           - 수용 조건 검증',
    manager: 'manager      - 스프린트 관리, 승인',
    backend: 'backend      - API 설계, 서버 구현',
    frontend: 'frontend     - UI 구현, API 연동',
    'library-developer': 'library-dev  - 공개 API 설계, 버전 관리',
    'game-logic': 'game-logic   - 게임 시스템 설계',
    rendering: 'rendering    - 화면/이펙트 구현',
    'cli-developer': 'cli-dev      - 명령어 설계, 출력 형식'
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
