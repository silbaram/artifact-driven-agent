import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import {
  getLogsDir,
  getSessionsDir,
  isWorkspaceSetup,
} from '../utils/files.js';

export async function logs(sessionId?: string): Promise<void> {
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('❌ 먼저 setup을 실행하세요.'));
    process.exit(1);
  }

  const logsDir = getLogsDir();
  const sessionsDir = getSessionsDir();

  // 세션 ID가 없으면 가장 최근 세션 찾기
  let targetSessionId = sessionId;
  if (!targetSessionId) {
    if (fs.existsSync(sessionsDir)) {
      const sessions = fs
        .readdirSync(sessionsDir)
        .filter((f) => fs.statSync(path.join(sessionsDir, f)).isDirectory())
        .sort()
        .reverse();

      if (sessions.length > 0) {
        targetSessionId = sessions[0];
      }
    }
  }

  if (!targetSessionId) {
    console.log(chalk.yellow('⚠️  세션 기록이 없습니다.'));
    return;
  }

  const logFile = path.join(logsDir, `${targetSessionId}.log`);

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold(`📄 로그: ${targetSessionId}`));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  if (!fs.existsSync(logFile)) {
    console.log(chalk.gray('  로그 파일 없음'));
    console.log('');

    // 세션 정보라도 표시
    const sessionFile = path.join(sessionsDir, targetSessionId, 'session.json');
    if (fs.existsSync(sessionFile)) {
      try {
        const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
        console.log(chalk.white.bold('  세션 정보:'));
        console.log(chalk.gray(`    역할: ${session.role || '-'}`));
        console.log(chalk.gray(`    도구: ${session.tool || '-'}`));
        console.log(chalk.gray(`    템플릿: ${session.template || '-'}`));
        console.log(chalk.gray(`    시작: ${session.started_at || '-'}`));
        console.log(chalk.gray(`    상태: ${session.status || '-'}`));
        console.log('');
      } catch {
        // ignore
      }
    }
    return;
  }

  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.includes('[ERROR]')) {
      console.log(chalk.red(line));
    } else if (line.includes('[WARN]')) {
      console.log(chalk.yellow(line));
    } else if (line.includes('[INFO]')) {
      console.log(chalk.gray(line));
    } else {
      console.log(line);
    }
  }

  console.log('');
}
