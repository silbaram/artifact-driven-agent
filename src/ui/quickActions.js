import chalk from 'chalk';
import { executeAgentSession } from '../commands/run.js';
import { config } from '../commands/config.js';
import sprint from '../commands/sprint.js';
import { sessions } from '../commands/sessions.js';
import { logs } from '../commands/logs.js';
import { status } from '../commands/status.js';
import { validate } from '../commands/validate.js';
import { getToolForRole } from '../utils/config.js';
import { syncSprint } from '../utils/sprintUtils.js';
import { getWorkspaceDir } from '../utils/files.js';
import path from 'path';
import inquirer from 'inquirer';
import { answerQuestion, getPendingQuestions } from '../utils/sessionState.js';

/**
 * Quick Action 정의
 */
export const QUICK_ACTIONS = {
  '2': {
    label: '1회 실행 (추천)',
    description: '추천 역할 1회 실행',
    handler: runOnceRecommended
  },
  '3': {
    label: 'planner',
    description: 'Planner 역할 실행',
    handler: () => runRole('planner')
  },
  '4': {
    label: 'developer',
    description: 'Developer 역할 실행',
    handler: () => runRole('developer')
  },
  '5': {
    label: 'reviewer',
    description: 'Reviewer 역할 실행',
    handler: () => runRole('reviewer')
  },
  '6': {
    label: 'documenter',
    description: 'Documenter 역할 실행',
    handler: () => runRole('documenter')
  },
  '7': {
    label: 'sprint list',
    description: '스프린트 목록 표시',
    handler: runSprintList
  },
  '8': {
    label: 'sprint sync',
    description: '스프린트 상태 동기화',
    handler: runSprintSync
  },
  '9': {
    label: 'config',
    description: '설정 관리',
    handler: runConfig
  },
  '0': {
    label: '새로고침',
    description: '화면 새로고침',
    handler: null // 특수 처리
  },
  'r': {
    label: '새로고침',
    description: '화면 새로고침',
    handler: null // 특수 처리 (0과 동일)
  },
  'q': {
    label: '종료',
    description: '대시보드 종료',
    handler: null // 특수 처리
  },
  'h': {
    label: '도움말',
    description: '도움말 표시',
    handler: showHelp
  },
  '?': {
    label: '질문 응답',
    description: '대기 질문에 응답',
    handler: handleQuestions
  },
  // 알파벳 키 추가 명령어
  's': {
    label: 'sessions',
    description: '활성 세션 목록',
    handler: runSessions
  },
  'l': {
    label: 'logs',
    description: '최근 세션 로그',
    handler: runLogs
  },
  't': {
    label: 'status',
    description: '프로젝트 상태 확인',
    handler: runStatus
  },
  'c': {
    label: 'sprint create',
    description: '새 스프린트 생성',
    handler: runSprintCreate
  },
  'a': {
    label: 'sprint add',
    description: 'Task를 스프린트에 추가',
    handler: runSprintAdd
  },
  'v': {
    label: 'validate',
    description: '문서 검증',
    handler: runValidate
  }
};

/**
 * 추천 역할 1회 실행
 */
async function runOnceRecommended(state) {
  if (!state || !state.nextRecommendation) {
    console.log(chalk.yellow('\n추천 액션이 없습니다.\n'));
    return;
  }

  const rec = state.nextRecommendation;

  if (rec.action) {
    if (rec.action === 'setup') {
      console.log(chalk.yellow('\n먼저 setup을 실행하세요: ada setup <template>\n'));
    } else if (rec.action === 'sprint') {
      console.log(chalk.yellow('\n스프린트를 생성하세요: ada sprint create\n'));
    }
    return;
  }

  if (rec.role) {
    await runRole(rec.role);
  }
}

/**
 * 특정 역할 실행
 */
async function runRole(role) {
  const tool = getToolForRole(role);
  console.log(chalk.cyan(`\n${role} (${tool}) 실행 중...\n`));

  try {
    await executeAgentSession(role, tool, { headless: false });
    console.log(chalk.green(`\n${role} 작업 완료\n`));
  } catch (error) {
    console.error(chalk.red(`\n${role} 실행 오류: ${error.message}\n`));
  }
}

/**
 * 스프린트 목록 표시
 */
async function runSprintList() {
  console.log('');
  await sprint('list');
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * 스프린트 동기화
 */
async function runSprintSync() {
  console.log(chalk.cyan('\n스프린트 상태 동기화 중...\n'));

  try {
    const workspace = getWorkspaceDir();
    const sprintsDir = path.join(workspace, 'artifacts', 'sprints');
    const result = await syncSprint(sprintsDir, true);

    if (result && result.synced) {
      console.log(chalk.green('스프린트 상태가 동기화되었습니다.\n'));
    } else {
      console.log(chalk.gray('동기화할 변경사항이 없습니다.\n'));
    }
  } catch (error) {
    console.error(chalk.red(`동기화 오류: ${error.message}\n`));
  }
}

/**
 * 설정 관리 실행
 */
async function runConfig() {
  console.log('');
  await config();
  console.log('');
}

/**
 * 세션 목록 표시
 */
async function runSessions() {
  console.log('');
  await sessions({});
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * 로그 확인
 */
async function runLogs() {
  console.log('');
  await logs();
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * 프로젝트 상태 확인
 */
async function runStatus() {
  console.log('');
  await status();
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * 스프린트 생성
 */
async function runSprintCreate() {
  console.log('');
  await sprint('create');
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * 스프린트에 Task 추가
 */
async function runSprintAdd() {
  console.log('');

  // Task ID 입력 받기
  const { taskIds } = await inquirer.prompt([{
    type: 'input',
    name: 'taskIds',
    message: '추가할 Task ID들 (공백으로 구분):',
    validate: (input) => input.trim() ? true : 'Task ID를 입력하세요'
  }]);

  const tasks = taskIds.trim().split(/\s+/);
  await sprint('add', tasks);
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * 문서 검증
 */
async function runValidate() {
  console.log('');
  await validate();
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * 도움말 표시
 */
async function showHelp() {
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold(' ADA UI Mode 도움말'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');
  console.log(chalk.white.bold(' 숫자 키 (역할):'));
  console.log('   2 - 추천 역할 1회 실행');
  console.log('   3 - Planner 역할 실행');
  console.log('   4 - Developer 역할 실행');
  console.log('   5 - Reviewer 역할 실행');
  console.log('   6 - Documenter 역할 실행');
  console.log('   7 - 스프린트 목록 보기');
  console.log('   8 - 스프린트 상태 동기화');
  console.log('   9 - 설정 관리');
  console.log('');
  console.log(chalk.white.bold(' 알파벳 키 (관리/모니터링):'));
  console.log('   s - 활성 세션 목록');
  console.log('   l - 최근 세션 로그');
  console.log('   t - 프로젝트 상태 확인');
  console.log('   c - 새 스프린트 생성');
  console.log('   a - 스프린트에 Task 추가');
  console.log('   v - 문서 검증');
  console.log('');
  console.log(chalk.white.bold(' 기타 키:'));
  console.log('   0, r - 화면 새로고침');
  console.log('   q    - UI 모드 종료');
  console.log('   h    - 이 도움말 표시');
  console.log('   ?    - 대기 중인 질문에 응답');
  console.log('');
  console.log(chalk.gray(' 화면은 2초마다 자동 갱신됩니다.'));
  console.log(chalk.gray(' 에이전트 실행 중에는 UI가 일시 정지됩니다.'));
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * 대기 질문 응답 처리
 */
async function handleQuestions() {
  const questions = getPendingQuestions();

  if (questions.length === 0) {
    console.log(chalk.gray('\n대기 중인 질문이 없습니다.\n'));
    return;
  }

  console.log(chalk.cyan('\n━ 대기 중인 질문 ━\n'));

  for (const q of questions) {
    console.log(chalk.yellow(`[${q.id}] ${q.from}의 질문:`));
    console.log(chalk.white(`  ${q.question}`));

    if (q.options && q.options.length > 0) {
      const { answer } = await inquirer.prompt([{
        type: 'list',
        name: 'answer',
        message: '응답을 선택하세요:',
        choices: [...q.options, '직접 입력']
      }]);

      let finalAnswer = answer;
      if (answer === '직접 입력') {
        const { customAnswer } = await inquirer.prompt([{
          type: 'input',
          name: 'customAnswer',
          message: '응답:'
        }]);
        finalAnswer = customAnswer;
      }

      answerQuestion(q.id, finalAnswer);
      console.log(chalk.green(`응답됨: ${finalAnswer}\n`));
    } else {
      const { answer } = await inquirer.prompt([{
        type: 'input',
        name: 'answer',
        message: '응답:'
      }]);

      answerQuestion(q.id, answer);
      console.log(chalk.green(`응답됨: ${answer}\n`));
    }
  }
}

/**
 * Quick Action 실행
 */
export async function executeQuickAction(key, state) {
  const action = QUICK_ACTIONS[key];
  if (!action) {
    return { handled: false };
  }

  if (action.handler === null) {
    // 특수 처리 (refresh, quit)
    return { handled: true, special: key };
  }

  try {
    await action.handler(state);
    return { handled: true };
  } catch (error) {
    console.error(chalk.red(`액션 실행 오류: ${error.message}`));
    return { handled: true, error: error.message };
  }
}
