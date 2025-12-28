import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getSessionsDir, isWorkspaceSetup } from '../utils/files.js';

export async function sessions() {
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('❌ 먼저 setup을 실행하세요.'));
    process.exit(1);
  }

  const sessionsDir = getSessionsDir();

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('📋 세션 목록'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

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

  // 헤더
  console.log(chalk.gray('  세션 ID                      역할        도구      상태'));
  console.log(chalk.gray('  ' + '─'.repeat(56)));

  for (const sessionId of sessionDirs.slice(0, 20)) {
    const sessionFile = path.join(sessionsDir, sessionId, 'session.json');
    
    if (fs.existsSync(sessionFile)) {
      try {
        const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
        const role = (session.role || '-').padEnd(10);
        const tool = (session.tool || '-').padEnd(8);
        const status = session.status || 'unknown';
        
        const statusColor = status === 'completed' ? chalk.green :
                           status === 'active' ? chalk.yellow :
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
  
  if (sessionDirs.length > 20) {
    console.log(chalk.gray(`  ... 그 외 ${sessionDirs.length - 20}개 세션`));
    console.log('');
  }
}
