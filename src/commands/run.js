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
import {
  registerSession,
  unregisterSession,
  updateSessionStatus,
  getActiveSessions,
  getPendingQuestions,
  addQuestion,
  readStatus,
  writeStatus
} from '../utils/sessionState.js';

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

  // 멀티 세션: 상태 파일에 세션 등록
  registerSession(sessionId, role, tool);
  logMessage('INFO', `세션 등록: ${sessionId}`);

  // 역할 파일 경로
  const roleFile = path.join(workspace, 'roles', `${role}.md`);
  const roleContent = fs.readFileSync(roleFile, 'utf-8');

  // 시스템 프롬프트 생성
  const systemPrompt = buildSystemPrompt(workspace, role, roleContent);

  // 시스템 프롬프트를 파일로 저장 (AI 도구가 읽을 수 있도록)
  const promptFile = path.join(sessionDir, 'system-prompt.md');
  fs.writeFileSync(promptFile, systemPrompt, 'utf-8');
  logMessage('INFO', `시스템 프롬프트 저장: ${promptFile}`);

  // 다른 활성 세션 확인
  const activeSessions = getActiveSessions().filter(s => s.sessionId !== sessionId);
  const pendingQuestions = getPendingQuestions();

  // 터미널 타이틀 설정
  const terminalTitle = `ADA: ${role} (${tool})`;
  process.stdout.write(`\x1b]0;${terminalTitle}\x07`);

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('🚀 AI 에이전트 실행'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  // 역할 강조 표시
  const roleEmojis = {
    'analyzer': '🔍',
    'planner': '📋',
    'architect': '🏛️',
    'developer': '💻',
    'backend': '⚙️',
    'frontend': '🎨',
    'reviewer': '👀',
    'qa': '🧪',
    'manager': '👔',
    'library-developer': '📚',
    'game-logic': '🎮',
    'rendering': '🎬',
    'cli-developer': '⌨️'
  };

  const roleEmoji = roleEmojis[role] || '🤖';
  console.log(chalk.bgCyan.black.bold(`  ${roleEmoji} 역할: ${role.toUpperCase()}  `));
  console.log('');

  console.log(chalk.white(`  세션 ID:  ${chalk.yellow(sessionId)}`));
  console.log(chalk.white(`  템플릿:   ${chalk.green(template)}`));
  console.log(chalk.white(`  도구:     ${chalk.green(tool)}`));
  console.log(chalk.white(`  작업공간: ${chalk.gray('ai-dev-team/')}`));
  console.log(chalk.white(`  로그:     ${chalk.gray(`.sessions/logs/${sessionId}.log`)}`));
  console.log('');

  // 멀티 세션 정보 표시
  if (activeSessions.length > 0) {
    console.log(chalk.white(`  🔗 활성 세션: ${chalk.yellow(activeSessions.length)}개`));
    activeSessions.forEach(s => {
      console.log(chalk.gray(`     - ${s.role} (${s.tool})`));
    });
    console.log('');
  }

  if (pendingQuestions.length > 0) {
    console.log(chalk.yellow(`  ⚠️  대기 질문: ${pendingQuestions.length}개`));
    console.log('');
  }

  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  // 도구별 실행
  try {
    await launchTool(tool, systemPrompt, promptFile, logMessage);

    // 세션 완료 처리
    sessionInfo.status = 'completed';
    sessionInfo.ended_at = getTimestamp();
    fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(sessionInfo, null, 2));
    logMessage('INFO', '세션 종료');

    // 멀티 세션: 상태 파일에서 세션 제거
    unregisterSession(sessionId);
    logMessage('INFO', `세션 해제: ${sessionId}`);

    // Planner 완료 시 스프린트 준비 질문 등록
    if (role === 'planner') {
      maybeNotifySprintSetup(workspace, logMessage);
    }
  } catch (error) {
    sessionInfo.status = 'error';
    sessionInfo.error = error.message;
    fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(sessionInfo, null, 2));
    logMessage('ERROR', error.message);

    // 멀티 세션: 에러 시에도 세션 제거
    unregisterSession(sessionId);
    logMessage('INFO', `세션 해제 (에러): ${sessionId}`);

    throw error;
  }
}

function maybeNotifySprintSetup(workspace, logMessage) {
  const artifactsDir = path.join(workspace, 'artifacts');
  const planFile = path.join(artifactsDir, 'plan.md');

  if (!fs.existsSync(planFile)) {
    return;
  }

  const content = fs.readFileSync(planFile, 'utf-8');
  if (!isPlanConfirmed(content)) {
    return;
  }

  const status = readStatus();
  if (status.meta?.planConfirmedPrompted) {
    return;
  }

  addQuestion(
    'planner',
    'manager',
    'plan.md가 Confirmed 상태입니다. 스프린트를 생성하고 Task를 할당할까요?',
    ['예, 처리합니다', '아니오'],
    'high',
    { action: 'sprint_setup', payload: { source: 'plan_confirmed' } }
  );

  const updatedStatus = readStatus();
  updatedStatus.meta = updatedStatus.meta || {};
  updatedStatus.meta.planConfirmedPrompted = true;
  writeStatus(updatedStatus);

  logMessage('INFO', '스프린트 생성/Task 할당 질문 등록');
}

function isPlanConfirmed(content) {
  return (
    /문서 상태:\s*Confirmed\b/i.test(content) ||
    /상태\s*\|\s*Confirmed\b/i.test(content) ||
    /상태\s*:\s*Confirmed\b/i.test(content) ||
    /문서 상태:\s*확정/.test(content) ||
    /상태\s*\|\s*확정/.test(content)
  );
}

function buildSystemPrompt(workspace, role, roleContent) {
  const artifactsDir = path.join(workspace, 'artifacts');
  const rulesDir = path.join(workspace, 'rules');

  let prompt = `# Role: ${role}\n\n`;
  prompt += roleContent;
  prompt += '\n\n---\n\n';

  // 1. 규칙 문서 전체 포함 (규칙은 반드시 알아야 함)
  prompt += '# 규칙 (Rules)\n\n';
  if (fs.existsSync(rulesDir)) {
    const rules = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'));
    rules.forEach(ruleFile => {
      const rulePath = path.join(rulesDir, ruleFile);
      try {
        const content = fs.readFileSync(rulePath, 'utf-8');
        prompt += `## ${ruleFile}\n\n`;
        prompt += content;
        prompt += '\n\n---\n\n';
      } catch (err) {
        prompt += `## ${ruleFile} (읽기 실패)\n\n`;
      }
    });
  }

  // 2. 핵심 산출물 전체 포함 (우선순위 높은 문서)
  prompt += '# 핵심 산출물 (Core Artifacts)\n\n';

  const priorityArtifacts = [
    'decision.md',        // 최우선 문서
    'project.md',         // 기술 기준 (Frozen)
    'plan.md'             // 요구사항
  ];

  priorityArtifacts.forEach(artifactFile => {
    const artifactPath = path.join(artifactsDir, artifactFile);
    if (fs.existsSync(artifactPath)) {
      try {
        const content = fs.readFileSync(artifactPath, 'utf-8');
        prompt += `## ${artifactFile}\n\n`;
        prompt += content;
        prompt += '\n\n---\n\n';
      } catch (err) {
        prompt += `## ${artifactFile} (읽기 실패)\n\n`;
      }
    } else {
      prompt += `## ${artifactFile} (아직 작성되지 않음)\n\n`;
    }
  });

  // 2.1 현재 활성 스프린트 포함
  const sprintsDir = path.join(artifactsDir, 'sprints');
  if (fs.existsSync(sprintsDir)) {
    const sprints = fs.readdirSync(sprintsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
      .map(dirent => dirent.name);

    // 가장 최근 스프린트 찾기 (sprint-N 형식)
    const activeSprint = sprints
      .filter(name => /^sprint-\d+$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.split('-')[1]);
        const numB = parseInt(b.split('-')[1]);
        return numB - numA;
      })[0];

    if (activeSprint) {
      const sprintMetaPath = path.join(sprintsDir, activeSprint, 'meta.md');
      if (fs.existsSync(sprintMetaPath)) {
        try {
          const content = fs.readFileSync(sprintMetaPath, 'utf-8');
          prompt += `## 현재 스프린트: ${activeSprint}/meta.md\n\n`;
          prompt += content;
          prompt += '\n\n---\n\n';
        } catch (err) {
          prompt += `## ${activeSprint}/meta.md (읽기 실패)\n\n`;
        }
      }

      // 스프린트의 Task 파일 목록
      const sprintTasksDir = path.join(sprintsDir, activeSprint, 'tasks');
      if (fs.existsSync(sprintTasksDir)) {
        const taskFiles = fs.readdirSync(sprintTasksDir)
          .filter(f => f.endsWith('.md') && !f.includes('template'));

        if (taskFiles.length > 0) {
          prompt += `## 현재 스프린트 Task 파일 목록\n\n`;
          prompt += `다음 Task 파일들을 필요 시 읽어서 확인하세요:\n`;
          taskFiles.forEach(f => {
            prompt += `- sprints/${activeSprint}/tasks/${f}\n`;
          });
          prompt += '\n---\n\n';
        }
      }
    }
  }

  // 2.2 Backlog Task 목록
  const backlogDir = path.join(artifactsDir, 'backlog');
  if (fs.existsSync(backlogDir)) {
    const backlogFiles = fs.readdirSync(backlogDir)
      .filter(f => f.endsWith('.md') && f.startsWith('task-'));

    if (backlogFiles.length > 0) {
      prompt += `## Backlog Task 목록\n\n`;
      prompt += `다음 Task 파일들을 필요 시 읽어서 확인하세요:\n`;
      backlogFiles.forEach(f => {
        prompt += `- backlog/${f}\n`;
      });
      prompt += '\n---\n\n';
    }
  }

  // 3. 인터페이스 문서 전체 포함 (api.md, ui.md 등)
  prompt += '# 인터페이스 산출물 (Interface Artifacts)\n\n';

  const interfaceArtifacts = ['api.md', 'ui.md', 'public-api.md', 'commands.md', 'output-format.md',
                               'game-systems.md', 'assets.md', 'hud.md', 'examples.md', 'changelog.md'];

  let hasInterfaceDoc = false;
  interfaceArtifacts.forEach(artifactFile => {
    const artifactPath = path.join(artifactsDir, artifactFile);
    if (fs.existsSync(artifactPath)) {
      hasInterfaceDoc = true;
      try {
        const content = fs.readFileSync(artifactPath, 'utf-8');
        prompt += `## ${artifactFile}\n\n`;
        prompt += content;
        prompt += '\n\n---\n\n';
      } catch (err) {
        prompt += `## ${artifactFile} (읽기 실패)\n\n`;
      }
    }
  });

  if (!hasInterfaceDoc) {
    prompt += '(인터페이스 문서 없음)\n\n';
  }

  // 4. 나머지 산출물은 목록만 (필요 시 AI가 파일 읽기 도구 사용)
  prompt += '# 기타 산출물 (목록)\n\n';

  if (fs.existsSync(artifactsDir)) {
    const allArtifacts = fs.readdirSync(artifactsDir, { withFileTypes: true });
    const otherFiles = allArtifacts
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.md'))
      .map(dirent => dirent.name)
      .filter(name => !priorityArtifacts.includes(name) && !interfaceArtifacts.includes(name));

    if (otherFiles.length > 0) {
      prompt += '다음 산출물들은 필요 시 파일을 읽어서 확인하세요:\n';
      otherFiles.forEach(f => {
        prompt += `- artifacts/${f}\n`;
      });
      prompt += '\n';
    }

    // features 디렉토리 확인
    const featuresDir = path.join(artifactsDir, 'features');
    if (fs.existsSync(featuresDir)) {
      const features = fs.readdirSync(featuresDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
        .map(dirent => dirent.name);

      if (features.length > 0) {
        prompt += '\n**Features 디렉토리:**\n';
        features.forEach(feature => {
          prompt += `- features/${feature}/\n`;
        });
        prompt += '\n필요한 Feature 문서는 파일을 직접 읽어서 확인하세요.\n';
      }
    }

    // RFC 디렉토리 확인
    const rfcDir = path.join(artifactsDir, 'rfc');
    if (fs.existsSync(rfcDir)) {
      const rfcs = fs.readdirSync(rfcDir)
        .filter(f => f.endsWith('.md') && !f.includes('template'));

      if (rfcs.length > 0) {
        prompt += '\n**RFC 문서:**\n';
        rfcs.forEach(rfc => {
          prompt += `- rfc/${rfc}\n`;
        });
      }
    }
  }

  prompt += '\n---\n\n';
  prompt += '# 작업 지침\n\n';
  prompt += '- **문서 기준 판단**: 위에 포함된 문서 내용을 기준으로 판단하세요.\n';
  prompt += '- **추측 금지**: 문서에 없는 내용은 추측하지 말고 사용자에게 에스컬레이션하세요.\n';
  prompt += '- **규칙 준수**: 모든 규칙(Rules)을 반드시 따라야 합니다.\n';
  prompt += '- **우선순위**: 문서 간 충돌 시 document-priority.md의 우선순위를 따르세요.\n';
  prompt += '- **현재 범위**: 현재 스프린트 meta.md에 정의된 Task만 작업하세요.\n';
  prompt += '- **파일 읽기**: 필요한 경우 목록에 표시된 산출물을 파일 읽기 도구로 확인하세요.\n';
  prompt += '\n';
  prompt += '## 멀티 세션 상태 관리\n\n';
  prompt += '여러 터미널에서 동시에 다른 역할이 작업할 수 있습니다.\n';
  prompt += '상태 공유를 위해 `ai-dev-team/.ada-status.json` 파일을 사용하세요.\n\n';
  prompt += '**주요 작업:**\n';
  prompt += '1. **Task 진행 상황 업데이트**: 작업 시작/완료 시 taskProgress 업데이트\n';
  prompt += '2. **질문 등록**: 사용자에게 질문이 필요하면 pendingQuestions에 추가\n';
  prompt += '3. **알림 전송**: 다른 역할에게 알릴 사항이 있으면 notifications 추가\n';
  prompt += '4. **상태 파일**: .ada-status.json을 통해 세션 간 상태 공유\n';

  return prompt;
}

async function launchTool(tool, systemPrompt, promptFile, logMessage) {
  // 프롬프트 파일의 상대 경로 (작업 디렉토리 기준)
  const relativePromptPath = path.relative(process.cwd(), promptFile);

  // 도구별 설정
  const commands = {
    claude: {
      cmd: 'claude',
      args: ['--system-prompt-file', promptFile],
      automation: 'perfect'
    },
    gemini: {
      cmd: 'gemini',
      args: [],
      env: {
        GEMINI_SYSTEM_MD: promptFile  // 시스템 프롬프트 파일 경로
      },
      automation: 'perfect'
    },
    codex: {
      cmd: 'codex',
      args: [],
      automation: 'manual',
      instruction: `@${relativePromptPath}`
    },
    copilot: {
      cmd: 'gh',
      args: ['copilot'],
      automation: 'manual',
      instruction: `@${relativePromptPath}`
    }
  };

  const config = commands[tool];
  const { cmd, args } = config;

  // 도구 존재 확인
  const which = spawn('which', [cmd], { shell: true });

  return new Promise((resolve, reject) => {
    which.on('close', (code) => {
      if (code !== 0) {
        console.log(chalk.yellow(`⚠️  ${tool} CLI가 설치되어 있지 않습니다.`));
        console.log('');
        console.log(chalk.white('시스템 프롬프트가 다음 파일에 저장되었습니다:'));
        console.log(chalk.cyan(`  ${relativePromptPath}`));
        console.log('');
        console.log(chalk.gray('─'.repeat(60)));
        console.log(systemPrompt);
        console.log(chalk.gray('─'.repeat(60)));
        console.log('');
        console.log(chalk.gray('위 내용을 복사하여 AI 도구에 붙여넣거나, 파일을 읽도록 하세요.'));
        logMessage('WARN', `${tool} CLI not found, prompt displayed`);
        resolve();
        return;
      }

      // 도구별 안내 메시지
      console.log('');
      if (config.automation === 'perfect') {
        // 완전 자동화: 간단한 성공 메시지
        console.log(chalk.green('━'.repeat(60)));
        console.log(chalk.green.bold('✓ 역할이 자동으로 설정됩니다'));
        console.log(chalk.green('━'.repeat(60)));
        console.log('');
        console.log(chalk.gray(`시스템 프롬프트: ${relativePromptPath}`));
        console.log('');
      } else {
        // 수동 입력 필요: 명확한 안내
        console.log(chalk.yellow('━'.repeat(60)));
        console.log(chalk.yellow.bold('⚠️  중요: AI 도구 시작 후 다음을 입력하세요'));
        console.log(chalk.yellow('━'.repeat(60)));
        console.log('');
        console.log(chalk.cyan.bold(`  ${config.instruction}`));
        console.log('');
        console.log(chalk.gray('그 다음 Enter를 눌러 역할을 수행하도록 하세요.'));
        console.log('');
        console.log(chalk.yellow('━'.repeat(60)));
        console.log('');
      }

      // CLI 실행
      console.log(chalk.green(`✓ ${tool} 실행 중...`));
      console.log('');
      logMessage('INFO', `${tool} CLI 실행 (automation: ${config.automation})`);

      // 환경 변수 병합 (도구별 커스텀 환경 변수 포함)
      const envVars = {
        ...process.env,
        ADA_SYSTEM_PROMPT: systemPrompt,
        ...(config.env || {})  // 도구별 환경 변수 추가
      };

      const child = spawn(cmd, args, {
        stdio: 'inherit',
        shell: true,
        env: envVars
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
