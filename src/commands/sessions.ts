import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import readline from 'readline';
import {
  getSessionsDir,
  isWorkspaceSetup,
  getWorkspaceDir,
} from '../utils/files.js';
import {
  getActiveSessions,
  getPendingQuestions,
  readStatus,
  getStatusFilePath,
  cleanupZombieSessions,
  answerQuestion,
} from '../utils/sessionState.js';
import type { Question, SessionInfo, TaskProgressInfo } from '../types/index.js';

export interface SessionsOptions {
  watch?: boolean;
  clean?: boolean;
}

export async function sessions(options: SessionsOptions = {}): Promise<void> {
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('❌ 먼저 setup을 실행하세요.'));
    process.exit(1);
  }

  // Watch 모드
  if (options.watch) {
    return watchSessions();
  }

  // Clean 모드
  if (options.clean) {
    return cleanupCompletedSessions();
  }

  const sessionsDir = getSessionsDir();

  // 좀비 세션 정리 (비활성/오래된 세션)
  const removedCount = cleanupZombieSessions(60);

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('세션 상태'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  if (removedCount > 0) {
    console.log(chalk.yellow(`좀비 세션 ${removedCount}개 정리됨 (비활성/오래됨)`));
    console.log('');
  }

  // 1. 실시간 활성 세션 표시
  const activeSessions = getActiveSessions();
  if (activeSessions.length > 0) {
    console.log(chalk.yellow.bold('활성 세션 (실시간)'));
    console.log('');
    console.log(chalk.gray('  역할        도구      시작 시간           상태'));
    console.log(chalk.gray('  ' + '─'.repeat(56)));

    activeSessions.forEach((session) => {
      const role = (session.role || '-').padEnd(10);
      const tool = (session.tool || '-').padEnd(8);
      const startTime = new Date(session.startedAt).toLocaleString('ko-KR');
      const status = session.status || 'active';
      const statusIcon = status === 'active' ? '+' : '-';

      console.log(
        `  ${role}  ${tool}  ${startTime}  ${statusIcon} ${status}`
      );
    });
    console.log('');
  } else {
    console.log(chalk.gray('  현재 활성 세션 없음'));
    console.log('');
  }

  // 2. 대기 중인 질문 표시
  const pendingQuestions = getPendingQuestions();
  if (pendingQuestions.length > 0) {
    console.log(chalk.yellow.bold('대기 질문'));
    console.log('');

    pendingQuestions.forEach((q) => {
      console.log(chalk.yellow(`  [${q.id}] ${q.from} → ${q.to}`));
      console.log(chalk.white(`  질문: ${q.question}`));
      if (q.options && q.options.length > 0) {
        console.log(chalk.gray(`  옵션: ${q.options.join(', ')}`));
      }
      console.log('');
    });
  }

  // 3. Task 진행 상황 표시
  const status = readStatus();
  const taskProgress = status.taskProgress || {};
  const activeTasks = Object.entries(taskProgress).filter(([_, info]) => {
    const s = (info.status || '').toUpperCase();
    return s && s !== 'DONE' && s !== 'REJECTED';
  });

  if (activeTasks.length > 0) {
    console.log(chalk.cyan.bold('진행 중인 Task'));
    console.log('');

    activeTasks.forEach(([taskId, info]) => {
      const normalizedStatus = info.status === 'IN_QA' ? 'IN_REVIEW' : info.status;
      const statusColor =
        normalizedStatus === 'DONE'
          ? chalk.green
          : normalizedStatus === 'IN_DEV'
            ? chalk.yellow
            : normalizedStatus === 'IN_REVIEW'
              ? chalk.blue
              : chalk.white;

      console.log(`  ${taskId}: [${statusColor(normalizedStatus || '')}]`);
      if ((info as Record<string, unknown>).assignee) {
        console.log(chalk.gray(`    담당: ${(info as Record<string, unknown>).assignee}`));
      }
      if ((info as Record<string, unknown>).note) {
        console.log(chalk.gray(`    메모: ${(info as Record<string, unknown>).note}`));
      }
    });
    console.log('');
  }

  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  // 4. 최근 세션 기록 (히스토리)
  if (!fs.existsSync(sessionsDir)) {
    console.log(chalk.gray('  세션 기록 없음'));
    console.log('');
    return;
  }

  const sessionDirs = fs
    .readdirSync(sessionsDir)
    .filter((f) => fs.statSync(path.join(sessionsDir, f)).isDirectory())
    .sort()
    .reverse();

  if (sessionDirs.length === 0) {
    console.log(chalk.gray('  세션 기록 없음'));
    console.log('');
    return;
  }

  console.log(chalk.cyan.bold('최근 세션 기록'));
  console.log('');
  console.log(
    chalk.gray('  세션 ID                      역할        도구      상태')
  );
  console.log(chalk.gray('  ' + '─'.repeat(56)));

  for (const sessionId of sessionDirs.slice(0, 10)) {
    const sessionFile = path.join(sessionsDir, sessionId, 'session.json');

    if (fs.existsSync(sessionFile)) {
      try {
        const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
        const role = (session.role || '-').padEnd(10);
        const tool = (session.tool || '-').padEnd(8);
        const sessionStatus = session.status || 'unknown';

        const statusColor =
          sessionStatus === 'completed'
            ? chalk.green
            : sessionStatus === 'active'
              ? chalk.yellow
              : sessionStatus === 'error'
                ? chalk.red
                : chalk.gray;

        console.log(
          `  ${sessionId}  ${role}  ${tool}  ${statusColor(sessionStatus)}`
        );
      } catch {
        console.log(`  ${sessionId}  ${chalk.gray('(읽기 실패)')}`);
      }
    } else {
      console.log(`  ${sessionId}  ${chalk.gray('(정보 없음)')}`);
    }
  }

  console.log('');

  if (sessionDirs.length > 10) {
    console.log(
      chalk.gray(
        `  ... 그 외 ${sessionDirs.length - 10}개 세션 (ada logs 명령어로 확인)`
      )
    );
    console.log('');
  }
}

// Watch 모드: 실시간 세션 모니터링
async function watchSessions(): Promise<void> {
  const statusFile = getStatusFilePath();
  let lastUpdate = '';
  let isWatching = true;
  let isPrompting = false;
  const promptQueue: Question[] = [];
  const promptedQuestions = new Set<string>();

  interface KeyInfo {
    ctrl?: boolean;
    name?: string;
  }

  function pauseWatch(): void {
    isWatching = false;
  }

  function resumeWatch(): void {
    isWatching = true;
    drawScreen();
    lastUpdate = new Date().toLocaleTimeString('ko-KR');
  }

  function disableKeypressHandling(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.removeListener('keypress', keyHandler);
  }

  function enableKeypressHandling(): void {
    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
    }
    process.stdin.on('keypress', keyHandler);
  }

  function enqueueQuestions(questions: Question[]): void {
    questions.forEach((question) => {
      if (!promptedQuestions.has(question.id)) {
        promptQueue.push(question);
        promptedQuestions.add(question.id);
      }
    });
  }

  async function processPromptQueue(): Promise<void> {
    if (isPrompting || promptQueue.length === 0) {
      return;
    }

    isPrompting = true;
    pauseWatch();
    disableKeypressHandling();

    while (promptQueue.length > 0) {
      const nextQuestion = promptQueue.shift();
      if (nextQuestion) {
        await promptQuestion(nextQuestion);
      }
    }

    enableKeypressHandling();
    isPrompting = false;
    resumeWatch();
  }

  async function promptQuestion(question: Question): Promise<void> {
    const status = readStatus();
    const currentQuestion = status.pendingQuestions?.find(
      (q) => q.id === question.id
    );

    if (!currentQuestion || currentQuestion.status !== 'waiting') {
      return;
    }

    console.log('');
    console.log(chalk.yellow('━'.repeat(60)));
    console.log(chalk.yellow.bold('질문 응답 필요'));
    console.log(chalk.yellow('━'.repeat(60)));
    console.log(chalk.white(`  ID: ${currentQuestion.id}`));
    console.log(
      chalk.white(`  요청: ${currentQuestion.from} → ${currentQuestion.to}`)
    );
    console.log(chalk.white(`  질문: ${currentQuestion.question}`));

    if (currentQuestion.options && currentQuestion.options.length > 0) {
      console.log(chalk.gray('  옵션:'));
      currentQuestion.options.forEach((option, index) => {
        console.log(chalk.gray(`    ${index + 1}) ${option}`));
      });
    }

    const promptText =
      currentQuestion.options && currentQuestion.options.length > 0
        ? '  답변(번호 또는 직접 입력): '
        : '  답변: ';

    const answerInput = await askInput(chalk.cyan(promptText));
    let answer = (answerInput || '').trim();

    if (currentQuestion.options && currentQuestion.options.length > 0) {
      const optionIndex = Number.parseInt(answer, 10);
      if (
        !Number.isNaN(optionIndex) &&
        optionIndex >= 1 &&
        optionIndex <= currentQuestion.options.length
      ) {
        answer = currentQuestion.options[optionIndex - 1];
      }
    }

    if (!answer) {
      answer = '(응답 없음)';
    }

    answerQuestion(currentQuestion.id, answer);

    // 처리 완료 메시지
    console.log(chalk.green(`  ✓ 저장 완료: ${currentQuestion.id}`));
    console.log(chalk.gray(`  ✓ 관련 알림 읽음 처리됨`));
    console.log('');
  }

  function askInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  // 화면 그리기 함수
  function drawScreen(): void {
    console.clear();

    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR');
    let pendingQs: Question[] = [];

    // 헤더
    console.log('');
    console.log(chalk.cyan('┌' + '─'.repeat(78) + '┐'));
    console.log(
      chalk.cyan('│') +
        chalk.bold.white(' Manager Watch Mode'.padEnd(78)) +
        chalk.cyan('│')
    );
    console.log(
      chalk.cyan('│') +
        chalk.gray(` 시간: ${timeString}`.padEnd(78)) +
        chalk.cyan('│')
    );
    console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
    console.log('');

    try {
      const status = readStatus();
      const activeSessionsList = status.activeSessions || [];
      pendingQs =
        status.pendingQuestions?.filter((q) => q.status === 'waiting') || [];
      const taskProgress = status.taskProgress || {};
      const notifications = status.notifications || [];

      // 통계 패널
      console.log(chalk.bgBlue.white.bold(' 통계 '));
      console.log('');
      console.log(
        chalk.white(`  활성 세션: ${chalk.yellow(activeSessionsList.length)}개`)
      );
      console.log(
        chalk.white(
          `  대기 질문: ${pendingQs.length > 0 ? chalk.red(pendingQs.length) : chalk.green('0')}개`
        )
      );

      const activeTaskList = Object.keys(taskProgress).filter(
        (taskId) => taskProgress[taskId].status !== 'DONE'
      );
      console.log(
        chalk.white(`  진행 Task: ${chalk.cyan(activeTaskList.length)}개`)
      );
      console.log(
        chalk.white(
          `  읽지 않은 알림: ${notifications.filter((n) => !n.read).length}개`
        )
      );
      console.log('');

      // 활성 세션
      if (activeSessionsList.length > 0) {
        console.log(chalk.bgGreen.black.bold(' 활성 세션 '));
        console.log('');

        activeSessionsList.forEach((session, index) => {
          const startTime = new Date(session.startedAt);
          const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
          const statusIcon = session.status === 'active' ? '+' : '-';

          console.log(
            chalk.white(`  ${index + 1}. ${statusIcon} ${chalk.bold(session.role)}`)
          );
          console.log(chalk.gray(`     도구: ${session.tool}`));
          console.log(chalk.gray(`     실행 시간: ${duration}분`));

          if (index < activeSessionsList.length - 1) {
            console.log('');
          }
        });
        console.log('');
      } else {
        console.log(chalk.gray('  현재 활성 세션이 없습니다.'));
        console.log('');
      }

      // 대기 질문 (강조)
      if (pendingQs.length > 0) {
        console.log(chalk.bgYellow.black.bold(' 대기 질문 '));
        console.log('');

        pendingQs.slice(0, 3).forEach((q, index) => {
          console.log(chalk.yellow(`  [${q.id}] ${q.from} → ${q.to}`));
          console.log(chalk.white(`  질문: ${q.question}`));

          if (q.options && q.options.length > 0) {
            console.log(chalk.gray(`  옵션: ${q.options.join(' / ')}`));
          }

          const elapsed = Math.floor(
            (now.getTime() - new Date(q.createdAt).getTime()) / 1000 / 60
          );
          console.log(chalk.gray(`  대기 시간: ${elapsed}분`));

          if (index < Math.min(pendingQs.length, 3) - 1) {
            console.log('');
          }
        });

        if (pendingQs.length > 3) {
          console.log('');
          console.log(chalk.gray(`  ... 그 외 ${pendingQs.length - 3}개 질문`));
        }
        console.log('');
      }

      // 진행 중인 Task
      if (activeTaskList.length > 0) {
        console.log(chalk.bgCyan.black.bold(' 진행 중인 Task '));
        console.log('');

        activeTaskList.slice(0, 5).forEach((taskId, index) => {
          const task = taskProgress[taskId];

          const statusColors: Record<string, typeof chalk.blue> = {
            IN_DEV: chalk.blue,
            IN_REVIEW: chalk.yellow,
            READY: chalk.gray,
            IN_SPRINT: chalk.cyan,
          };

          const normalizedStatus =
            task.status === 'IN_QA' ? 'IN_REVIEW' : task.status;
          const statusColor =
            statusColors[normalizedStatus || ''] || chalk.white;

          console.log(
            chalk.white(`  ${taskId}: [${statusColor(normalizedStatus || '')}]`)
          );
          if ((task as Record<string, unknown>).assignee) {
            console.log(chalk.gray(`     담당: ${(task as Record<string, unknown>).assignee}`));
          }

          if ((task as Record<string, unknown>).note) {
            console.log(chalk.gray(`     메모: ${(task as Record<string, unknown>).note}`));
          }

          if (index < Math.min(activeTaskList.length, 5) - 1) {
            console.log('');
          }
        });

        if (activeTaskList.length > 5) {
          console.log('');
          console.log(
            chalk.gray(`  ... 그 외 ${activeTaskList.length - 5}개 Task`)
          );
        }
        console.log('');
      }

      // 최근 알림
      const recentNotifications = notifications.slice(-3).reverse();
      if (recentNotifications.length > 0) {
        console.log(chalk.bgMagenta.white.bold(' 최근 알림 '));
        console.log('');

        recentNotifications.forEach((notif, index) => {
          const typeIcons: Record<string, string> = {
            info: 'i',
            warning: '!',
            error: 'x',
            question: '?',
            complete: 'v',
          };

          const icon = typeIcons[notif.type] || '?';
          const readStat = notif.read
            ? chalk.gray('[읽음]')
            : chalk.yellow('[안읽음]');

          console.log(chalk.white(`  ${icon} ${readStat} ${notif.message}`));
          console.log(chalk.gray(`     from: ${notif.from}`));

          if (index < recentNotifications.length - 1) {
            console.log('');
          }
        });
        console.log('');
      }
    } catch (error) {
      console.log(chalk.red('  상태 파일 읽기 오류'));
      console.log(
        chalk.gray(`  ${error instanceof Error ? error.message : String(error)}`)
      );
      console.log('');
    }

    // 푸터
    console.log(chalk.cyan('─'.repeat(80)));
    console.log(
      chalk.gray('  [q] 종료  [r] 새로고침  [c] 화면 지우기  [h] 도움말')
    );
    console.log(chalk.cyan('─'.repeat(80)));

    if (lastUpdate) {
      console.log(chalk.gray(`  마지막 업데이트: ${lastUpdate}`));
    }

    enqueueQuestions(pendingQs);
    processPromptQueue();
  }

  // 키보드 입력 처리
  const keyHandler = (str: string | undefined, key: KeyInfo): void => {
    if (key.ctrl && key.name === 'c') {
      cleanup();
    } else if (key.name === 'q') {
      cleanup();
    } else if (key.name === 'r') {
      drawScreen();
      lastUpdate = new Date().toLocaleTimeString('ko-KR');
    } else if (key.name === 'c') {
      console.clear();
      drawScreen();
    } else if (key.name === 'h') {
      showHelp();
    }
  };

  enableKeypressHandling();

  // 초기 화면 그리기
  drawScreen();
  lastUpdate = new Date().toLocaleTimeString('ko-KR');

  // 파일 감시
  let watcher: fs.FSWatcher | undefined;
  if (fs.existsSync(statusFile)) {
    watcher = fs.watch(statusFile, (eventType) => {
      if (eventType === 'change' && isWatching) {
        drawScreen();
        lastUpdate = new Date().toLocaleTimeString('ko-KR');
      }
    });
  }

  // 2초마다 화면 갱신 (시간 표시 업데이트)
  // 30초마다 좀비 세션 정리 (15번째 호출마다)
  let tickCount = 0;
  const intervalId = setInterval(() => {
    if (isWatching) {
      tickCount++;

      // 30초마다 좀비 세션 정리 (2초 × 15 = 30초)
      if (tickCount % 15 === 0) {
        const removed = cleanupZombieSessions(60);
        if (removed > 0) {
          lastUpdate = `${new Date().toLocaleTimeString('ko-KR')} (좀비 세션 ${removed}개 정리됨)`;
        }
      }

      drawScreen();
    }
  }, 2000);

  // 정리 함수
  function cleanup(): void {
    isWatching = false;
    clearInterval(intervalId);
    if (watcher) watcher.close();

    disableKeypressHandling();

    console.log('');
    console.log(chalk.cyan('Watch 모드를 종료합니다.'));
    console.log('');
    process.exit(0);
  }

  // 도움말 표시
  function showHelp(): void {
    console.clear();
    console.log('');
    console.log(chalk.cyan('┌' + '─'.repeat(78) + '┐'));
    console.log(
      chalk.cyan('│') +
        chalk.bold.white(' Watch 모드 도움말'.padEnd(78)) +
        chalk.cyan('│')
    );
    console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
    console.log('');
    console.log(
      chalk.white('  Watch 모드는 실시간으로 세션 상태를 모니터링합니다.')
    );
    console.log('');
    console.log(chalk.yellow('  키보드 단축키:'));
    console.log(chalk.white('    q       - 종료'));
    console.log(chalk.white('    r       - 수동 새로고침'));
    console.log(chalk.white('    c       - 화면 지우기'));
    console.log(chalk.white('    h       - 이 도움말'));
    console.log(chalk.white('    Ctrl+C  - 강제 종료'));
    console.log('');
    console.log(chalk.yellow('  자동 갱신:'));
    console.log(
      chalk.white('    - .ada-status.json 파일 변경 시 즉시 갱신')
    );
    console.log(chalk.white('    - 2초마다 시간 정보 자동 갱신'));
    console.log('');
    console.log(chalk.yellow('  Manager 역할:'));
    console.log(chalk.white('    - 대기 질문 확인 및 응답'));
    console.log(chalk.white('    - 질문 발생 시 자동 응답 프롬프트 표시'));
    console.log(chalk.white('    - Task 진행 상황 모니터링'));
    console.log(chalk.white('    - 세션 상태 실시간 추적'));
    console.log('');
    console.log(chalk.gray('  아무 키나 눌러서 계속...'));

    process.stdin.once('keypress', () => {
      drawScreen();
    });
  }

  // 프로세스 종료 처리
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

/**
 * 완료된 세션 정리
 */
async function cleanupCompletedSessions(): Promise<void> {
  const sessionsDir = getSessionsDir();

  if (!fs.existsSync(sessionsDir)) {
    console.log(chalk.yellow('⚠️  세션 디렉토리가 없습니다.'));
    return;
  }

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('완료된 세션 정리 (status: completed)'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  const sessionDirs = fs
    .readdirSync(sessionsDir)
    .filter((f) => fs.statSync(path.join(sessionsDir, f)).isDirectory())
    .sort();

  let completedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const sessionId of sessionDirs) {
    const sessionPath = path.join(sessionsDir, sessionId);
    const sessionFile = path.join(sessionPath, 'session.json');

    try {
      // session.json 확인
      if (!fs.existsSync(sessionFile)) {
        console.log(chalk.gray(`  ${sessionId}: session.json 없음 (건너뜀)`));
        skippedCount++;
        continue;
      }

      // 세션 정보 읽기
      const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));

      // 완료 상태가 아니면 건너뜀
      if (session.status !== 'completed') {
        console.log(
          chalk.yellow(
            `  ${sessionId}: 완료 아님 (${session.status || 'unknown'}) - 유지`
          )
        );
        skippedCount++;
        continue;
      }

      // 세션 디렉토리 삭제
      fs.removeSync(sessionPath);
      console.log(chalk.green(`  ✓ ${sessionId}: 삭제됨 (${session.status})`));
      completedCount++;
    } catch (error) {
      console.log(
        chalk.red(
          `  ✗ ${sessionId}: 오류 - ${error instanceof Error ? error.message : String(error)}`
        )
      );
      errorCount++;
    }
  }

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.white(`  삭제됨: ${chalk.green(completedCount)}개`));
  console.log(chalk.white(`  유지됨: ${chalk.gray(skippedCount)}개`));
  if (errorCount > 0) {
    console.log(chalk.white(`  오류: ${chalk.red(errorCount)}개`));
  }
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');
}
