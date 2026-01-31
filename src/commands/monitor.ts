import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { gatherProjectState, renderDashboard } from '../ui/dashboard.js';
import { KeyHandler, waitForKey, isTTY } from '../ui/keyHandler.js';
import { executeQuickAction } from '../ui/quickActions.js';
import { isWorkspaceSetup, getWorkspaceDir } from '../utils/files.js';
import type { ProjectState } from '../types/index.js';

/**
 * 대시보드 자동 갱신 주기 (밀리초)
 */
const REFRESH_INTERVAL = 2000;

/**
 * 파일 감시 디바운스 시간 (밀리초)
 */
const DEBOUNCE_TIME = 500;

/**
 * [CLI] 모니터 명령어 핸들러
 * 실시간 대시보드 및 빠른 명령어 제공
 */
export async function monitor(): Promise<void> {
  // TTY 확인
  if (!isTTY()) {
    console.log(chalk.yellow('UI 모드는 터미널에서만 사용할 수 있습니다.'));
    console.log(chalk.gray('일반 상태 확인: ada status'));
    process.exit(1);
  }

  // Setup 확인
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('먼저 setup을 실행하세요.'));
    console.log(chalk.gray('  ada setup <template>'));
    process.exit(1);
  }

  // 상태 변수
  let currentState: ProjectState | null = null;
  let statusMessage = '시작 중...';
  let isRunningAction = false;
  let refreshTimer: NodeJS.Timeout | null = null;
  let fileWatcher: fs.FSWatcher | null = null;
  let debounceTimer: NodeJS.Timeout | null = null;
  const canAutoRefresh = process.stdout.isTTY;

  // 키 핸들러 초기화
  const keyHandler = new KeyHandler({
    onKey: async (key: string) => {
      if (isRunningAction) return;

      isRunningAction = true;
      keyHandler.pause();

      // 자동 갱신 일시 중지
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }

      try {
        statusMessage = '실행 중...';
        if (!currentState) {
          statusMessage = '오류: 상태를 불러올 수 없습니다';
          return;
        }
        const result = await executeQuickAction(key, currentState);

        if (result.error) {
          statusMessage = `오류: ${result.error}`;
        } else {
          statusMessage = '준비됨';
        }

        // 완료 후 대기 (목록 표시 후 키 대기가 필요한 명령어들)
        const waitKeys = ['h', 's', 'l', 't'];
        if (waitKeys.includes(key)) {
          await waitForKey();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        statusMessage = `오류: ${errorMessage}`;
      } finally {
        isRunningAction = false;
        keyHandler.resume();

        // 자동 갱신 재시작
        startAutoRefresh();

        // 화면 갱신
        refresh();
      }
    },
    onRefresh: () => {
      if (!isRunningAction) {
        refresh();
      }
    },
    onQuit: () => {
      cleanup();
      console.log(chalk.gray('\nUI 모드를 종료합니다.\n'));
      process.exit(0);
    }
  });

  /**
   * 화면 새로고침
   */
  function refresh(): void {
    try {
      currentState = gatherProjectState();
      renderDashboard(currentState, statusMessage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`화면 갱신 오류: ${errorMessage}`));
    }
  }

  /**
   * 자동 갱신 시작
   */
  function startAutoRefresh(): void {
    if (!canAutoRefresh) {
      return;
    }

    if (refreshTimer) {
      clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(() => {
      if (!isRunningAction) {
        refresh();
      }
    }, REFRESH_INTERVAL);
  }

  /**
   * 파일 감시 시작 (스프린트/Task 변경 감지)
   */
  function startFileWatcher(): void {
    if (!canAutoRefresh) {
      return;
    }

    try {
      const workspace = getWorkspaceDir();
      const watchPaths = [
        path.join(workspace, 'artifacts', 'sprints'),
        path.join(workspace, '.ada-status.json')
      ];

      watchPaths.forEach(watchPath => {
        if (fs.existsSync(watchPath)) {
          try {
            const watcher = fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
              // 디바운스 처리
              if (debounceTimer) {
                clearTimeout(debounceTimer);
              }

              debounceTimer = setTimeout(() => {
                if (!isRunningAction) {
                  statusMessage = '파일 변경 감지됨';
                  refresh();
                  setTimeout(() => {
                    statusMessage = '준비됨';
                  }, 1000);
                }
              }, DEBOUNCE_TIME);
            });

            // 첫 번째 watcher만 저장 (정리용)
            if (!fileWatcher) {
              fileWatcher = watcher;
            }
          } catch (e) {
            // 파일 감시 실패는 무시 (일부 플랫폼에서 지원 안됨)
          }
        }
      });
    } catch (error) {
      // 파일 감시 실패는 조용히 무시
    }
  }

  /**
   * 정리
   */
  function cleanup(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    if (fileWatcher) {
      fileWatcher.close();
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    keyHandler.stop();

    // 커서 표시
    process.stdout.write('\x1b[?25h');
  }

  // 프로세스 종료 시 정리
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  // 터미널 타이틀 설정
  process.stdout.write('\x1b]0;ADA UI Mode\x07');

  // 커서 숨기기
  process.stdout.write('\x1b[?25l');

  // 초기 렌더링
  statusMessage = canAutoRefresh
    ? '준비됨'
    : '자동 갱신 비활성화됨 (TTY 미지원)';
  refresh();

  // 키 핸들러 시작
  keyHandler.start();

  // 자동 갱신 시작
  startAutoRefresh();

  // 파일 감시 시작
  startFileWatcher();

  // 무한 대기 (이벤트 루프 유지)
  await new Promise(() => {});
}

export default monitor;
