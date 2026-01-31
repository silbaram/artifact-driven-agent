import chalk from 'chalk';
import { sessions } from '../commands/sessions.js';
import { logs } from '../commands/logs.js';
import { status } from '../commands/status.js';
import type { ProjectState } from '../types/index.js';

/**
 * Quick Action 결과
 */
export interface QuickActionResult {
  handled: boolean;
  special?: string;
  error?: string;
}

/**
 * Quick Action 정의
 */
export interface QuickAction {
  label: string;
  description: string;
  handler: ((state: ProjectState) => Promise<void>) | null;
}

/**
 * Quick Action 정의
 */
export const QUICK_ACTIONS: Record<string, QuickAction> = {
  q: {
    label: '종료',
    description: '대시보드 종료',
    handler: null, // 특수 처리
  },
  h: {
    label: '도움말',
    description: '도움말 표시',
    handler: showHelp,
  },
  // 알파벳 키 추가 명령어
  s: {
    label: 'sessions',
    description: '활성 세션 목록',
    handler: runSessions,
  },
  l: {
    label: 'logs',
    description: '최근 세션 로그',
    handler: runLogs,
  },
  t: {
    label: 'status',
    description: '프로젝트 상태 확인',
    handler: runStatus,
  },
};

/**
 * 세션 목록 표시
 */
async function runSessions(): Promise<void> {
  console.log('');
  await sessions({});
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * 로그 확인
 */
async function runLogs(): Promise<void> {
  console.log('');
  await logs();
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * 프로젝트 상태 확인
 */
async function runStatus(): Promise<void> {
  console.log('');
  await status();
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * 도움말 표시
 */
async function showHelp(): Promise<void> {
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold(' ADA UI Mode 도움말'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');
  console.log(chalk.white.bold(' 알파벳 키 (관리/모니터링):'));
  console.log('   s - 활성 세션 목록');
  console.log('   l - 최근 세션 로그');
  console.log('   t - 프로젝트 상태 확인');
  console.log('');
  console.log(chalk.white.bold(' 기타 키:'));
  console.log('   q    - UI 모드 종료');
  console.log('   h    - 이 도움말 표시');
  console.log('');
  console.log(chalk.gray(' 화면은 2초마다 자동 갱신됩니다.'));
  console.log(chalk.gray(' 에이전트 실행 중에는 UI가 일시 정지됩니다.'));
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('\n계속하려면 아무 키나 누르세요...');
}

/**
 * Quick Action 실행
 */
export async function executeQuickAction(
  key: string,
  state: ProjectState
): Promise<QuickActionResult> {
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
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`액션 실행 오류: ${message}`));
    return { handled: true, error: message };
  }
}
