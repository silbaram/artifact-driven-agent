import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import {
  getWorkspaceDir,
  getSessionsDir,
  getLogsDir,
  getCurrentTemplate,
  getAvailableRoles,
  generateSessionId,
  getTimestamp,
  isWorkspaceSetup
} from '../utils/files.js';

export async function run(role, tool) {
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('❌ 먼저 setup을 실행하세요.'));
    console.log(chalk.gray('  ada setup'));
    process.exit(1);
  }

  const roles = getAvailableRoles();
  const tools = ['claude', 'codex', 'gemini', 'copilot'];

  // 역할 검증
  if (!roles.includes(role)) {
    console.log(chalk.red(`❌ 알 수 없는 역할: ${role}`));
    console.log(chalk.gray(`사용 가능: ${roles.join(', ')}`));
    process.exit(1);
  }

  // 도구 검증
  if (!tools.includes(tool)) {
    console.log(chalk.red(`❌ 알 수 없는 도구: ${tool}`));
    console.log(chalk.gray(`사용 가능: ${tools.join(', ')}`));
    process.exit(1);
  }

  const workspace = getWorkspaceDir();
  const template = getCurrentTemplate();
  const sessionId = generateSessionId();
  const sessionsDir = getSessionsDir();
  const logsDir = getLogsDir();

  // 세션 디렉토리 생성
  const sessionDir = path.join(sessionsDir, sessionId);
  fs.ensureDirSync(sessionDir);
  fs.ensureDirSync(logsDir);

  // 세션 정보 저장
  const sessionInfo = {
    session_id: sessionId,
    role: role,
    tool: tool,
    template: template,
    started_at: getTimestamp(),
    status: 'active'
  };
  fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(sessionInfo, null, 2));

  // 로그 파일 초기화
  const logFile = path.join(logsDir, `${sessionId}.log`);
  const logMessage = (level, msg) => {
    const line = `[${getTimestamp()}] [${level}] ${msg}\n`;
    fs.appendFileSync(logFile, line);
  };

  logMessage('INFO', `세션 시작: role=${role}, tool=${tool}, template=${template}`);

  // 역할 파일 경로
  const roleFile = path.join(workspace, 'roles', `${role}.md`);
  const roleContent = fs.readFileSync(roleFile, 'utf-8');

  // 시스템 프롬프트 생성
  const systemPrompt = buildSystemPrompt(workspace, role, roleContent);

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('🚀 AI 에이전트 실행'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');
  console.log(chalk.white(`  세션 ID:  ${chalk.yellow(sessionId)}`));
  console.log(chalk.white(`  템플릿:   ${chalk.green(template)}`));
  console.log(chalk.white(`  역할:     ${chalk.green(role)}`));
  console.log(chalk.white(`  도구:     ${chalk.green(tool)}`));
  console.log(chalk.white(`  작업공간: ${chalk.gray('ai-dev-team/')}`));
  console.log(chalk.white(`  로그:     ${chalk.gray(`logs/${sessionId}.log`)}`));
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  // 도구별 실행
  try {
    await launchTool(tool, systemPrompt, logMessage);
    
    // 세션 완료 처리
    sessionInfo.status = 'completed';
    sessionInfo.ended_at = getTimestamp();
    fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(sessionInfo, null, 2));
    logMessage('INFO', '세션 종료');
  } catch (error) {
    sessionInfo.status = 'error';
    sessionInfo.error = error.message;
    fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(sessionInfo, null, 2));
    logMessage('ERROR', error.message);
    throw error;
  }
}

function buildSystemPrompt(workspace, role, roleContent) {
  const artifactsDir = path.join(workspace, 'artifacts');
  const rulesDir = path.join(workspace, 'rules');
  
  let prompt = `# Role: ${role}\n\n`;
  prompt += roleContent;
  prompt += '\n\n---\n\n';
  prompt += '# 참조 문서\n\n';

  // 산출물 목록
  if (fs.existsSync(artifactsDir)) {
    const artifacts = fs.readdirSync(artifactsDir).filter(f => f.endsWith('.md'));
    prompt += '## 산출물 (artifacts/)\n';
    artifacts.forEach(a => {
      prompt += `- ${a}\n`;
    });
    prompt += '\n';
  }

  // 규칙 목록
  if (fs.existsSync(rulesDir)) {
    const rules = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'));
    prompt += '## 규칙 (rules/)\n';
    rules.forEach(r => {
      prompt += `- ${r}\n`;
    });
    prompt += '\n';
  }

  prompt += '---\n\n';
  prompt += '위 역할과 규칙에 따라 작업을 수행하세요.\n';
  prompt += '문서를 기준으로 판단하고, 문서에 없는 내용은 추측하지 마세요.\n';

  return prompt;
}

async function launchTool(tool, systemPrompt, logMessage) {
  const commands = {
    claude: { cmd: 'claude', args: [] },
    codex: { cmd: 'codex', args: [] },
    gemini: { cmd: 'gemini', args: [] },
    copilot: { cmd: 'gh', args: ['copilot', 'suggest'] }
  };

  const { cmd, args } = commands[tool];

  // 도구 존재 확인
  const which = spawn('which', [cmd], { shell: true });
  
  return new Promise((resolve, reject) => {
    which.on('close', (code) => {
      if (code !== 0) {
        console.log(chalk.yellow(`⚠️  ${tool} CLI가 설치되어 있지 않습니다.`));
        console.log('');
        console.log(chalk.white('시스템 프롬프트를 출력합니다:'));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(systemPrompt);
        console.log(chalk.gray('─'.repeat(60)));
        console.log('');
        console.log(chalk.gray('위 내용을 복사하여 AI 도구에 붙여넣으세요.'));
        logMessage('WARN', `${tool} CLI not found, prompt displayed`);
        resolve();
        return;
      }

      // CLI 실행
      console.log(chalk.green(`✓ ${tool} 실행 중...`));
      logMessage('INFO', `${tool} CLI 실행`);

      const child = spawn(cmd, args, {
        stdio: 'inherit',
        shell: true,
        env: {
          ...process.env,
          ADA_SYSTEM_PROMPT: systemPrompt
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${tool} exited with code ${code}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  });
}
