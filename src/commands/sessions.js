import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import readline from 'readline';
import { getSessionsDir, isWorkspaceSetup, getWorkspaceDir } from '../utils/files.js';
import { getActiveSessions, getPendingQuestions, readStatus, getStatusFilePath, cleanupZombieSessions } from '../utils/sessionState.js';

export async function sessions(options = {}) {
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('❌ 먼저 setup을 실행하세요.'));
    process.exit(1);
  }

  // Watch 모드
  if (options.watch) {
    return watchSessions();
  }

  const sessionsDir = getSessionsDir();

  // 좀비 세션 정리 (60분 이상 된 세션)
  const removedCount = cleanupZombieSessions(60);

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('📋 세션 상태'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  if (removedCount > 0) {
    console.log(chalk.yellow(`🧹 좀비 세션 ${removedCount}개 정리됨 (60분 이상 경과)`));
    console.log('');
  }

  // 1. 실시간 활성 세션 표시
  const activeSessions = getActiveSessions();
  if (activeSessions.length > 0) {
    console.log(chalk.yellow.bold('🟢 활성 세션 (실시간)'));
    console.log('');
    console.log(chalk.gray('  역할        도구      시작 시간           상태'));
    console.log(chalk.gray('  ' + '─'.repeat(56)));

    activeSessions.forEach(session => {
      const role = (session.role || '-').padEnd(10);
      const tool = (session.tool || '-').padEnd(8);
      const startTime = new Date(session.startedAt).toLocaleString('ko-KR');
      const status = session.status || 'active';
      const statusIcon = status === 'active' ? '🟢' : '🟡';

      console.log(`  ${role}  ${tool}  ${startTime}  ${statusIcon} ${status}`);
    });
    console.log('');
  } else {
    console.log(chalk.gray('  현재 활성 세션 없음'));
    console.log('');
  }

  // 2. 대기 중인 질문 표시
  const pendingQuestions = getPendingQuestions();
  if (pendingQuestions.length > 0) {
    console.log(chalk.yellow.bold('⚠️  대기 질문'));
    console.log('');

    pendingQuestions.forEach(q => {
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
  const activeTasks = Object.entries(taskProgress).filter(([_, info]) =>
    info.status && info.status !== 'DONE'
  );

  if (activeTasks.length > 0) {
    console.log(chalk.cyan.bold('📊 진행 중인 Task'));
    console.log('');

    activeTasks.forEach(([taskId, info]) => {
      const progress = info.progress || 0;
      const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
      console.log(`  ${taskId}: ${progressBar} ${progress}% (${info.status})`);
      if (info.assignee) {
        console.log(chalk.gray(`    담당: ${info.assignee}`));
      }
      if (info.note) {
        console.log(chalk.gray(`    메모: ${info.note}`));
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

  const sessionDirs = fs.readdirSync(sessionsDir)
    .filter(f => fs.statSync(path.join(sessionsDir, f)).isDirectory())
    .sort()
    .reverse();

  if (sessionDirs.length === 0) {
    console.log(chalk.gray('  세션 기록 없음'));
    console.log('');
    return;
  }

  console.log(chalk.cyan.bold('📜 최근 세션 기록'));
  console.log('');
  console.log(chalk.gray('  세션 ID                      역할        도구      상태'));
  console.log(chalk.gray('  ' + '─'.repeat(56)));

  for (const sessionId of sessionDirs.slice(0, 10)) {
    const sessionFile = path.join(sessionsDir, sessionId, 'session.json');

    if (fs.existsSync(sessionFile)) {
      try {
        const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
        const role = (session.role || '-').padEnd(10);
        const tool = (session.tool || '-').padEnd(8);
        const status = session.status || 'unknown';

        const statusColor = status === 'completed' ? chalk.green :
                           status === 'active' ? chalk.yellow :
                           status === 'error' ? chalk.red :
                           chalk.gray;

        console.log(`  ${sessionId}  ${role}  ${tool}  ${statusColor(status)}`);
      } catch (e) {
        console.log(`  ${sessionId}  ${chalk.gray('(읽기 실패)')}`);
      }
    } else {
      console.log(`  ${sessionId}  ${chalk.gray('(정보 없음)')}`);
    }
  }

  console.log('');

  if (sessionDirs.length > 10) {
    console.log(chalk.gray(`  ... 그 외 ${sessionDirs.length - 10}개 세션 (ada logs 명령어로 확인)`));
    console.log('');
  }
}

// Watch 모드: 실시간 세션 모니터링
async function watchSessions() {
  const statusFile = getStatusFilePath();
  let lastUpdate = '';
  let isWatching = true;

  // 키보드 입력 설정
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
  }

  // 화면 그리기 함수
  function drawScreen() {
    console.clear();

    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR');

    // 헤더
    console.log('');
    console.log(chalk.cyan('┌' + '─'.repeat(78) + '┐'));
    console.log(chalk.cyan('│') + chalk.bold.white(' 📡 Manager Watch Mode'.padEnd(78)) + chalk.cyan('│'));
    console.log(chalk.cyan('│') + chalk.gray(` ⏰ ${timeString}`.padEnd(78)) + chalk.cyan('│'));
    console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
    console.log('');

    try {
      const status = readStatus();
      const activeSessions = status.activeSessions || [];
      const pendingQuestions = status.pendingQuestions?.filter(q => q.status === 'waiting') || [];
      const taskProgress = status.taskProgress || {};
      const notifications = status.notifications || [];

      // 통계 패널
      console.log(chalk.bgBlue.white.bold(' 📊 통계 '));
      console.log('');
      console.log(chalk.white(`  활성 세션: ${chalk.yellow(activeSessions.length)}개`));
      console.log(chalk.white(`  대기 질문: ${pendingQuestions.length > 0 ? chalk.red(pendingQuestions.length) : chalk.green('0')}개`));

      const activeTasks = Object.keys(taskProgress).filter(
        taskId => taskProgress[taskId].status !== 'DONE'
      );
      console.log(chalk.white(`  진행 Task: ${chalk.cyan(activeTasks.length)}개`));
      console.log(chalk.white(`  읽지 않은 알림: ${notifications.filter(n => !n.read).length}개`));
      console.log('');

      // 활성 세션
      if (activeSessions.length > 0) {
        console.log(chalk.bgGreen.black.bold(' 🟢 활성 세션 '));
        console.log('');

        activeSessions.forEach((session, index) => {
          const startTime = new Date(session.startedAt);
          const duration = Math.floor((now - startTime) / 1000 / 60); // 분
          const statusIcon = session.status === 'active' ? '🟢' : '🟡';

          console.log(chalk.white(`  ${index + 1}. ${statusIcon} ${chalk.bold(session.role)}`));
          console.log(chalk.gray(`     도구: ${session.tool}`));
          console.log(chalk.gray(`     실행 시간: ${duration}분`));

          if (index < activeSessions.length - 1) {
            console.log('');
          }
        });
        console.log('');
      } else {
        console.log(chalk.gray('  현재 활성 세션이 없습니다.'));
        console.log('');
      }

      // 대기 질문 (강조)
      if (pendingQuestions.length > 0) {
        console.log(chalk.bgYellow.black.bold(' ⚠️  대기 질문 '));
        console.log('');

        pendingQuestions.slice(0, 3).forEach((q, index) => {
          console.log(chalk.yellow(`  [${q.id}] ${q.from} → ${q.to}`));
          console.log(chalk.white(`  질문: ${q.question}`));

          if (q.options && q.options.length > 0) {
            console.log(chalk.gray(`  옵션: ${q.options.join(' / ')}`));
          }

          const elapsed = Math.floor((now - new Date(q.createdAt)) / 1000 / 60);
          console.log(chalk.gray(`  대기 시간: ${elapsed}분`));

          if (index < Math.min(pendingQuestions.length, 3) - 1) {
            console.log('');
          }
        });

        if (pendingQuestions.length > 3) {
          console.log('');
          console.log(chalk.gray(`  ... 그 외 ${pendingQuestions.length - 3}개 질문`));
        }
        console.log('');
      }

      // 진행 중인 Task
      if (activeTasks.length > 0) {
        console.log(chalk.bgCyan.black.bold(' 📊 진행 중인 Task '));
        console.log('');

        activeTasks.slice(0, 5).forEach((taskId, index) => {
          const task = taskProgress[taskId];
          const progress = task.progress || 0;
          const bars = Math.floor(progress / 5);
          const progressBar = '█'.repeat(bars) + '░'.repeat(20 - bars);

          const statusColors = {
            'IN_DEV': chalk.blue,
            'IN_REVIEW': chalk.yellow,
            'IN_QA': chalk.magenta,
            'READY': chalk.gray,
            'IN_SPRINT': chalk.cyan
          };

          const statusColor = statusColors[task.status] || chalk.white;

          console.log(chalk.white(`  ${taskId}: ${progressBar} ${progress}%`));
          console.log(chalk.gray(`  상태: ${statusColor(task.status)} ${task.assignee ? `| 담당: ${task.assignee}` : ''}`));

          if (task.note) {
            console.log(chalk.gray(`  메모: ${task.note}`));
          }

          if (index < Math.min(activeTasks.length, 5) - 1) {
            console.log('');
          }
        });

        if (activeTasks.length > 5) {
          console.log('');
          console.log(chalk.gray(`  ... 그 외 ${activeTasks.length - 5}개 Task`));
        }
        console.log('');
      }

      // 최근 알림
      const recentNotifications = notifications.slice(-3).reverse();
      if (recentNotifications.length > 0) {
        console.log(chalk.bgMagenta.white.bold(' 🔔 최근 알림 '));
        console.log('');

        recentNotifications.forEach((notif, index) => {
          const typeIcons = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'error': '❌',
            'question': '❓',
            'complete': '✅'
          };

          const icon = typeIcons[notif.type] || 'ℹ️';
          const readStatus = notif.read ? chalk.gray('[읽음]') : chalk.yellow('[안읽음]');

          console.log(chalk.white(`  ${icon} ${readStatus} ${notif.message}`));
          console.log(chalk.gray(`     from: ${notif.from}`));

          if (index < recentNotifications.length - 1) {
            console.log('');
          }
        });
        console.log('');
      }

    } catch (error) {
      console.log(chalk.red('  상태 파일 읽기 오류'));
      console.log(chalk.gray(`  ${error.message}`));
      console.log('');
    }

    // 푸터
    console.log(chalk.cyan('─'.repeat(80)));
    console.log(chalk.gray('  [q] 종료  [r] 새로고침  [c] 화면 지우기  [h] 도움말'));
    console.log(chalk.cyan('─'.repeat(80)));

    if (lastUpdate) {
      console.log(chalk.gray(`  마지막 업데이트: ${lastUpdate}`));
    }
  }

  // 초기 화면 그리기
  drawScreen();
  lastUpdate = new Date().toLocaleTimeString('ko-KR');

  // 파일 감시
  let watcher;
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
        const removedCount = cleanupZombieSessions(60); // 60분 이상 된 세션 제거
        if (removedCount > 0) {
          lastUpdate = `${new Date().toLocaleTimeString('ko-KR')} (좀비 세션 ${removedCount}개 정리됨)`;
        }
      }

      drawScreen();
    }
  }, 2000);

  // 키보드 입력 처리
  const keyHandler = (str, key) => {
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

  process.stdin.on('keypress', keyHandler);

  // 정리 함수
  function cleanup() {
    isWatching = false;
    clearInterval(intervalId);
    if (watcher) watcher.close();

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.removeListener('keypress', keyHandler);

    console.log('');
    console.log(chalk.cyan('👋 Watch 모드를 종료합니다.'));
    console.log('');
    process.exit(0);
  }

  // 도움말 표시
  function showHelp() {
    console.clear();
    console.log('');
    console.log(chalk.cyan('┌' + '─'.repeat(78) + '┐'));
    console.log(chalk.cyan('│') + chalk.bold.white(' 📖 Watch 모드 도움말'.padEnd(78)) + chalk.cyan('│'));
    console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
    console.log('');
    console.log(chalk.white('  Watch 모드는 실시간으로 세션 상태를 모니터링합니다.'));
    console.log('');
    console.log(chalk.yellow('  키보드 단축키:'));
    console.log(chalk.white('    q       - 종료'));
    console.log(chalk.white('    r       - 수동 새로고침'));
    console.log(chalk.white('    c       - 화면 지우기'));
    console.log(chalk.white('    h       - 이 도움말'));
    console.log(chalk.white('    Ctrl+C  - 강제 종료'));
    console.log('');
    console.log(chalk.yellow('  자동 갱신:'));
    console.log(chalk.white('    - .ada-status.json 파일 변경 시 즉시 갱신'));
    console.log(chalk.white('    - 2초마다 시간 정보 자동 갱신'));
    console.log('');
    console.log(chalk.yellow('  Manager 역할:'));
    console.log(chalk.white('    - 대기 질문 확인 및 응답'));
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
