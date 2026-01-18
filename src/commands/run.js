import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
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
  getPendingQuestions
} from '../utils/sessionState.js';
import { getToolForRole } from '../utils/config.js';

/**
 * [API] AI 에이전트 세션 실행 (핵심 로직)
 * 오케스트레이터나 다른 모듈에서 호출하여 사용
 * @param {string} role - 실행할 역할 (예: 'developer')
 * @param {string} tool - 사용할 도구 (예: 'claude')
 * @param {object} options - 추가 옵션
 * @returns {Promise<object>} 세션 결과 정보
 */
export async function executeAgentSession(role, tool, options = {}) {
  const roles = getAvailableRoles();
  const tools = ['claude', 'codex', 'gemini', 'copilot'];

  // 역할 검증
  if (!roles.includes(role)) {
    throw new Error(`알 수 없는 역할입니다: ${role} (사용 가능: ${roles.join(', ')})`);
  }

  // 도구 검증
  if (!tools.includes(tool)) {
    throw new Error(`알 수 없는 도구입니다: ${tool} (사용 가능: ${tools.join(', ')})`);
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

  // 세션 정보 객체
  const sessionInfo = {
    session_id: sessionId,
    role: role,
    tool: tool,
    template: template,
    started_at: getTimestamp(),
    status: 'active'
  };
  fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(sessionInfo, null, 2));

  // 로그 헬퍼
  const logFile = path.join(logsDir, `${sessionId}.log`);
  const logMessage = (level, msg) => {
    const line = `[${getTimestamp()}] [${level}] ${msg}\n`;
    fs.appendFileSync(logFile, line);
    // 옵션에 따라 콘솔 출력 제어 가능 (현재는 항상 출력)
  };

  try {
    logMessage('INFO', `세션 시작: role=${role}, tool=${tool}, template=${template}`);

    // 멀티 세션 등록
    registerSession(sessionId, role, tool);
    logMessage('INFO', `세션 등록: ${sessionId}`);

    // 역할 파일 로드 (옵션으로 오버라이드 가능)
    let systemPrompt;
    if (options.systemPromptOverride) {
      systemPrompt = options.systemPromptOverride;
      logMessage('INFO', '시스템 프롬프트 오버라이드 사용됨');
    } else {
      const roleFile = path.join(workspace, 'roles', `${role}.md`);
      if (!fs.existsSync(roleFile)) {
        throw new Error(`역할 파일이 존재하지 않습니다: ${roleFile}`);
      }
      const roleContent = fs.readFileSync(roleFile, 'utf-8');
      systemPrompt = buildSystemPrompt(workspace, role, roleContent);
    }

    // 프롬프트 파일 저장
    const promptFile = path.join(sessionDir, 'system-prompt.md');
    fs.writeFileSync(promptFile, systemPrompt, 'utf-8');
    logMessage('INFO', `시스템 프롬프트 저장: ${promptFile}`);

    // 터미널 UI 출력 (Headless 모드가 아닐 때만)
    if (!options.headless) {
      printSessionBanner(role, tool, sessionId, template);
    }

    // AI 도구 프로세스 실행
    const output = await launchTool(tool, systemPrompt, promptFile, logMessage, options);

    // 정상 종료 처리
    sessionInfo.status = 'completed';
    sessionInfo.ended_at = getTimestamp();
    // 캡처된 출력이 있으면 세션 정보에 저장 (선택 사항)
    if (output) {
      sessionInfo.output = output;
    }
    fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(sessionInfo, null, 2));
    logMessage('INFO', '세션 종료');

    unregisterSession(sessionId);
    logMessage('INFO', `세션 해제: ${sessionId}`);

    // 캡처된 출력 반환
    return { ...sessionInfo, output };

  } catch (error) {
    // 에러 처리
    sessionInfo.status = 'error';
    sessionInfo.error = error.message;
    fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(sessionInfo, null, 2));
    logMessage('ERROR', error.message);

    unregisterSession(sessionId);
    logMessage('INFO', `세션 해제 (에러): ${sessionId}`);

    throw error;
  }
}

/**
 * [CLI] 실행 명령어 핸들러
 * 사용자 입력을 처리하고 executeAgentSession을 호출
 */
export async function runCommand(role, tool) {
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('❌ 먼저 setup을 실행하세요.'));
    console.log(chalk.gray('  ada setup'));
    process.exit(1);
  }

  try {
    // 1. 역할 선택 (입력 없으면 질문)
    if (!role) {
      const roles = getAvailableRoles();
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'role',
          message: '실행할 역할을 선택하세요:',
          choices: roles
        }
      ]);
      role = answer.role;
    }

    // 2. 도구 자동 선택 (입력 없으면 설정 파일 참조)
    if (!tool) {
      tool = getToolForRole(role);
      console.log(chalk.gray(`ℹ️  설정된 기본 도구를 사용합니다: ${tool}`));
    }

    // 3. 세션 실행
    await executeAgentSession(role, tool);

  } catch (error) {
    console.error(chalk.red('\n❌ 실행 중 오류가 발생했습니다:'));
    console.error(chalk.white(error.message));
    process.exit(1);
  }
}

// 기존 CLI 호환성을 위해 run이라는 이름으로 export
export { runCommand as run };
// 시스템 프롬프트 생성 로직도 외부에서 쓸 수 있게 export
export { buildSystemPrompt };


// ============================================================================ 
// 내부 헬퍼 함수들
// ============================================================================ 

function printSessionBanner(role, tool, sessionId, template) {
  // 다른 활성 세션 정보
  const activeSessions = getActiveSessions().filter(s => s.sessionId !== sessionId);
  const pendingQuestions = getPendingQuestions();

  // 터미널 타이틀
  const terminalTitle = `ADA: ${role} (${tool})`;
  process.stdout.write(`\x1b]0;${terminalTitle}\x07`);

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('🚀 AI 에이전트 실행'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  const roleEmojis = {
    'analyzer': '🔍',
    'planner': '📋',
    'improver': '🔧',
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
  console.log(chalk.white(`  로그:     ${chalk.gray('.sessions/logs/' + sessionId + '.log')}`));
  console.log('');

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
}

function buildSystemPrompt(workspace, role, roleContent) {
  const artifactsDir = path.join(workspace, 'artifacts');
  const rulesDir = path.join(workspace, 'rules');

  let prompt = `# Role: ${role}\n\n`;
  prompt += roleContent;
  prompt += '\n\n---\n\n';

  // 1. 규칙 문서 - 역할별 필수 규칙만 포함
  const roleRules = {
    planner: ['iteration.md', 'escalation.md', 'document-priority.md'],
    improver: ['iteration.md', 'escalation.md', 'document-priority.md', 'rfc.md'],
    developer: ['iteration.md', 'escalation.md', 'rollback.md', 'document-priority.md', 'rfc.md'],
    reviewer: ['iteration.md', 'rollback.md', 'escalation.md', 'document-priority.md'],
    documenter: ['escalation.md', 'document-priority.md'],
    analyzer: ['escalation.md', 'document-priority.md'],
    manager: ['escalation.md', 'document-priority.md', 'rfc.md']  // Manager는 모든 규칙 참고
  };

  const requiredRules = roleRules[role] || [];

  prompt += '# 규칙 (Rules)\n\n';
  prompt += `이 역할에 적용되는 필수 규칙: ${requiredRules.join(', ')}\n\n`;

  if (fs.existsSync(rulesDir) && requiredRules.length > 0) {
    requiredRules.forEach(ruleFile => {
      const rulePath = path.join(rulesDir, ruleFile);
      if (fs.existsSync(rulePath)) {
        try {
          const content = fs.readFileSync(rulePath, 'utf-8');
          prompt += `## ${ruleFile}\n\n`;
          prompt += content;
          prompt += '\n\n---\n\n';
        } catch (err) {
          prompt += `## ${ruleFile} (읽기 실패)\n\n`;
        }
      } else {
        prompt += `## ${ruleFile} (파일 없음)\n\n`;
      }
    });
  } else if (requiredRules.length === 0) {
    prompt += '(이 역할에 필수 규칙이 지정되지 않았습니다)\n\n';
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
  prompt += '# 현재 스프린트 정보\n\n';

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

      // 스프린트의 Task 파일 전체 포함
      const sprintTasksDir = path.join(sprintsDir, activeSprint, 'tasks');
      if (fs.existsSync(sprintTasksDir)) {
        const taskFiles = fs.readdirSync(sprintTasksDir)
          .filter(f => f.endsWith('.md') && !f.includes('template'));

        if (taskFiles.length > 0) {
          prompt += `## 현재 스프린트 Task 파일들\n\n`;

          // 각 Task 파일 내용 포함
          taskFiles.forEach(f => {
            const taskPath = path.join(sprintTasksDir, f);
            try {
              const taskContent = fs.readFileSync(taskPath, 'utf-8');
              prompt += `### ${f}\n\n`;
              prompt += taskContent;
              prompt += '\n\n---\n\n';
            } catch (err) {
              prompt += `### ${f} (읽기 실패)\n\n`;
            }
          });
        } else {
          // Task 파일이 없는 경우
          prompt += `## ⚠️ 스프린트에 Task 없음\n\n`;
          prompt += `현재 스프린트(${activeSprint})에 할당된 Task가 없습니다.\n\n`;
          prompt += '**다음 단계:**\n';
          prompt += '1. `ada sprint add task-001 task-002` 명령으로 Task 할당\n';
          prompt += '2. Developer 세션 재시작\n\n';
          prompt += '---\n\n';
        }
      } else {
        // tasks 디렉토리가 없는 경우
        prompt += `## ⚠️ tasks 디렉토리 없음\n\n`;
        prompt += `현재 스프린트(${activeSprint})에 tasks 디렉토리가 없습니다.\n\n`;
        prompt += '스프린트 구조가 올바르지 않습니다. `ada sprint create` 명령으로 재생성하세요.\n\n';
        prompt += '---\n\n';
      }
    } else {
      // 스프린트가 없는 경우
      prompt += '## ⚠️ 현재 활성 스프린트 없음\n\n';
      prompt += '스프린트가 아직 생성되지 않았습니다.\n\n';
      prompt += '**다음 단계:**\n';
      prompt += '1. Planner가 plan.md와 backlog/ Task를 작성했는지 확인\n';
      prompt += '2. `ada sprint create` 명령으로 스프린트 생성\n';
      prompt += '3. `ada sprint add task-001 task-002` 명령으로 Task 할당\n';
      prompt += '4. Developer 세션 재시작\n\n';
      prompt += '**참고:** Developer는 스프린트가 있어야 작업할 수 있습니다.\n';
      prompt += '스프린트 없이는 어떤 Task를 해야 할지 알 수 없습니다.\n\n';
      prompt += '---\n\n';
    }
  } else {
    // sprints 디렉토리 자체가 없는 경우
    prompt += '## ⚠️ sprints 디렉토리 없음\n\n';
    prompt += 'sprints 디렉토리가 존재하지 않습니다.\n\n';
    prompt += '**다음 단계:**\n';
    prompt += '1. `ada sprint create` 명령으로 첫 스프린트 생성\n';
    prompt += '2. Task를 스프린트에 추가\n';
    prompt += '3. Developer 세션 재시작\n\n';
    prompt += '---\n\n';
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

async function launchTool(tool, systemPrompt, promptFile, logMessage, options = {}) {
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

  // 도구 존재 확인 (Windows: where, Unix: which)
  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  const which = spawn(whichCmd, [cmd], { shell: true });

  return new Promise((resolve, reject) => {
    which.on('close', (code) => {
      if (code !== 0) {
        // ... (기존 에러 처리 로직 유지) ...
        console.log(chalk.yellow(`⚠️  ${tool} CLI가 설치되어 있지 않습니다.`));
        // ...
        logMessage('WARN', `${tool} CLI not found, prompt displayed`);
        resolve(null); // 캡처 모드일 경우 null 반환
        return;
      }

      if (!options.captureOutput) {
        // ... (기존 안내 메시지 출력 로직 유지) ...
        console.log('');
        if (config.automation === 'perfect') {
          console.log(chalk.green('━'.repeat(60)));
          console.log(chalk.green.bold('✓ 역할이 자동으로 설정됩니다'));
          console.log(chalk.green('━'.repeat(60)));
          console.log('');
          console.log(chalk.gray(`시스템 프롬프트: ${relativePromptPath}`));
          console.log('');
        } else {
           // ...
        }
        console.log(chalk.green(`✓ ${tool} 실행 중...`));
        console.log('');
      }
      
      logMessage('INFO', `${tool} CLI 실행 (automation: ${config.automation})`);

      // 환경 변수 병합
      const envVars = {
        ...process.env,
        ADA_SYSTEM_PROMPT: systemPrompt,
        ...(config.env || {})
      };

      // 캡처 모드에 따라 stdio 설정 변경
      const stdioConfig = options.captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit';

      const child = spawn(cmd, args, {
        stdio: stdioConfig,
        shell: true,
        env: envVars
      });

      let capturedOutput = '';
      let capturedError = '';

      if (options.captureOutput) {
        child.stdout.on('data', (data) => {
          capturedOutput += data.toString();
        });
        child.stderr.on('data', (data) => {
          capturedError += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(options.captureOutput ? capturedOutput : null);
        } else {
          // 캡처 모드일 때는 에러 메시지도 포함해서 reject
          const errorMsg = options.captureOutput 
            ? `${tool} exited with code ${code}. Stderr: ${capturedError}`
            : `${tool} exited with code ${code}`;
          reject(new Error(errorMsg));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  });
}
