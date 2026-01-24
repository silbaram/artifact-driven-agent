import path from 'path';
import fs from 'fs-extra';
import { executeAgentSession } from '../commands/run.js';
import { getWorkspaceDir } from '../utils/files.js';
import { getToolForRole } from '../utils/config.js';
import { parseTaskMetadata } from '../utils/taskParser.js';

/**
 * Manager AI에게 현재 상황에 대한 판단을 요청
 */
export async function consultManager(context) {
  const workspace = getWorkspaceDir();
  const managerRole = 'manager';
  const tool = getToolForRole(managerRole);

  // 1. 프로젝트 상태 수집
  const projectState = gatherProjectState(workspace);

  // 2. 컨설팅을 위한 프롬프트 생성
  const prompt = buildConsultationPrompt(context, projectState);
  const promptFile = path.join(workspace, '.ada-consult-prompt.md');
  fs.writeFileSync(promptFile, prompt, 'utf-8');

  console.log('🤖 Manager AI가 상황을 분석 중입니다...');

  try {
    // 3. Manager 실행 (headless + 출력 캡처)
    const result = await executeAgentSession(managerRole, tool, {
      headless: true,
      systemPromptOverride: prompt,
      captureOutput: true
    });

    // 파일 정리
    if (fs.existsSync(promptFile)) {
      fs.unlinkSync(promptFile);
    }

    if (!result || !result.output) {
      console.warn('⚠️ Manager AI로부터 응답을 받지 못했습니다.');
      return null;
    }

    // 4. 응답 파싱 (JSON 추출)
    const decision = extractJsonFromOutput(result.output);

    if (!decision) {
      console.warn('⚠️ Manager의 응답에서 유효한 JSON을 찾을 수 없습니다.');
      console.log('원본 응답:', result.output.substring(0, 200) + '...');
      return null;
    }

    return decision;

  } catch (error) {
    console.error('Manager 컨설팅 실패:', error);
    if (fs.existsSync(promptFile)) {
      fs.unlinkSync(promptFile);
    }
    return null;
  }
}

/**
 * 프로젝트 상태 수집
 */
function gatherProjectState(workspace) {
  const state = {
    hasProject: false,
    hasPlan: false,
    currentSprint: null,
    tasks: [],
    backlogTasks: []
  };

  const artifactsDir = path.join(workspace, 'artifacts');

  // project.md 존재 확인
  state.hasProject = fs.existsSync(path.join(artifactsDir, 'project.md'));

  // plan.md 존재 확인
  state.hasPlan = fs.existsSync(path.join(artifactsDir, 'plan.md'));

  // 현재 스프린트 찾기
  const sprintsDir = path.join(artifactsDir, 'sprints');
  if (fs.existsSync(sprintsDir)) {
    const sprints = fs.readdirSync(sprintsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^sprint-\d+$/.test(d.name))
      .map(d => d.name)
      .sort((a, b) => {
        const numA = parseInt(a.split('-')[1]);
        const numB = parseInt(b.split('-')[1]);
        return numB - numA;
      });

    if (sprints.length > 0) {
      const currentSprintName = sprints[0];
      const sprintDir = path.join(sprintsDir, currentSprintName);

      state.currentSprint = {
        name: currentSprintName,
        meta: null,
        tasks: []
      };

      // meta.md 읽기
      const metaPath = path.join(sprintDir, 'meta.md');
      if (fs.existsSync(metaPath)) {
        state.currentSprint.meta = fs.readFileSync(metaPath, 'utf-8');
      }

      // 스프린트 Task 파일들 읽기
      const tasksDir = path.join(sprintDir, 'tasks');
      const reviewReportsDir = path.join(sprintDir, 'review-reports');

      if (fs.existsSync(tasksDir)) {
        const taskFiles = fs.readdirSync(tasksDir)
          .filter(f => f.endsWith('.md') && f.startsWith('task-'));

        taskFiles.forEach(taskFile => {
          const taskPath = path.join(tasksDir, taskFile);
          const content = fs.readFileSync(taskPath, 'utf-8');
          const taskInfo = parseTaskMetadata(content, taskFile);
          taskInfo.status = normalizeTaskStatus(taskInfo.status);

          // 실제 review-reports 디렉토리에서 리뷰 리포트 파일 존재 여부 확인
          const reviewReportPath = path.join(reviewReportsDir, taskFile);
          if (fs.existsSync(reviewReportPath)) {
            taskInfo.hasReviewReport = true;
          }

          state.tasks.push(taskInfo);
        });
      }
    }
  }

  // Backlog Task 파일들 읽기
  const backlogDir = path.join(artifactsDir, 'backlog');
  if (fs.existsSync(backlogDir)) {
    const backlogFiles = fs.readdirSync(backlogDir)
      .filter(f => f.endsWith('.md') && f.startsWith('task-'));

    backlogFiles.forEach(taskFile => {
      const taskPath = path.join(backlogDir, taskFile);
      const content = fs.readFileSync(taskPath, 'utf-8');
      const taskInfo = parseTaskMetadata(content, taskFile);
      taskInfo.status = normalizeTaskStatus(taskInfo.status);
      state.backlogTasks.push(taskInfo);
    });
  }

  return state;
}

/**
 * Task 파일 파싱
 */
function normalizeTaskStatus(status) {
  if (!status) return 'UNKNOWN';
  const normalized = status.toString().trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'REJECTED') return 'REJECT';
  return normalized;
}

/**
 * AI 출력에서 JSON 객체 추출 및 스키마 검증
 */
function extractJsonFromOutput(output) {
  let parsed = null;

  // 1. 직접 JSON 파싱 시도
  try {
    parsed = JSON.parse(output);
  } catch {
    // 2. Markdown 코드 블록 내 JSON 추출
    const jsonMatch = output.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        parsed = JSON.parse(jsonMatch[1]);
      } catch {
        // 무시
      }
    }

    // 3. 중괄호로 감싸진 블록 추출
    if (!parsed) {
      const firstBrace = output.indexOf('{');
      const lastBrace = output.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = output.substring(firstBrace, lastBrace + 1);
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          // 무시
        }
      }
    }
  }

  // 파싱 실패
  if (!parsed) {
    return null;
  }

  // 4. 스키마 검증
  const validationResult = validateDecisionSchema(parsed);
  if (!validationResult.valid) {
    console.warn(`⚠️ Manager 응답 스키마 검증 실패: ${validationResult.error}`);
    return null;
  }

  return parsed;
}

/**
 * Decision 객체 스키마 검증
 * @param {object} decision
 * @returns {{ valid: boolean, error?: string }}
 */
function validateDecisionSchema(decision) {
  // action 필드 검증
  const validActions = ['run_agent', 'wait', 'ask_user'];
  if (!decision.action) {
    return { valid: false, error: 'action 필드가 없습니다' };
  }
  if (!validActions.includes(decision.action)) {
    return { valid: false, error: `유효하지 않은 action: ${decision.action} (허용: ${validActions.join(', ')})` };
  }

  // run_agent인 경우 role 필수
  if (decision.action === 'run_agent') {
    const validRoles = ['planner', 'developer', 'reviewer', 'documenter', 'improver', 'qa', 'analyzer'];
    if (!decision.role) {
      return { valid: false, error: 'run_agent 액션에는 role 필드가 필수입니다' };
    }
    if (!validRoles.includes(decision.role)) {
      return { valid: false, error: `유효하지 않은 role: ${decision.role} (허용: ${validRoles.join(', ')})` };
    }
  }

  // reason 필드 검증 (필수)
  if (!decision.reason || typeof decision.reason !== 'string') {
    return { valid: false, error: 'reason 필드가 없거나 문자열이 아닙니다' };
  }

  return { valid: true };
}

/**
 * 컨설팅용 프롬프트 생성
 */
function buildConsultationPrompt(context, projectState) {
  // Task 상태별 분류
  const tasksByStatus = {
    BACKLOG: projectState.tasks.filter(t => t.status === 'BACKLOG'),
    IN_DEV: projectState.tasks.filter(t => t.status === 'IN_DEV'),
    IN_REVIEW: projectState.tasks.filter(t => t.status === 'IN_REVIEW'),
    IN_QA: projectState.tasks.filter(t => t.status === 'IN_QA'),
    DONE: projectState.tasks.filter(t => t.status === 'DONE'),
    REJECT: projectState.tasks.filter(t => t.status === 'REJECT'),
    BLOCKED: projectState.tasks.filter(t => t.status === 'BLOCKED')
  };

  // Task 요약 생성
  const taskSummary = projectState.tasks.map(t =>
    `  - ${t.id}: ${t.title} [${t.status}] ${t.priority}`
  ).join('\n') || '  (스프린트에 Task 없음)';

  // Backlog 요약
  const backlogSummary = projectState.backlogTasks.map(t =>
    `  - ${t.id}: ${t.title} [${t.status}] ${t.priority}`
  ).join('\n') || '  (Backlog 비어있음)';

  return `# Role: AI Manager (오케스트레이터)

당신은 프로젝트 상태를 분석하고 다음에 실행할 AI 에이전트 역할을 결정하는 Manager입니다.

## 프로젝트 현황

### 문서 상태
- project.md: ${projectState.hasProject ? '✅ 존재' : '❌ 없음'}
- plan.md: ${projectState.hasPlan ? '✅ 존재' : '❌ 없음'}

### 현재 스프린트
${projectState.currentSprint ? `
- 이름: ${projectState.currentSprint.name}
  - Task 현황:
  - BACKLOG: ${tasksByStatus.BACKLOG.length}개
  - IN_DEV (개발 중): ${tasksByStatus.IN_DEV.length}개
  - IN_REVIEW (리뷰 중): ${tasksByStatus.IN_REVIEW.length}개
  - IN_QA (검증 중): ${tasksByStatus.IN_QA.length}개
  - DONE (완료): ${tasksByStatus.DONE.length}개
  - REJECT (반려): ${tasksByStatus.REJECT.length}개
  - BLOCKED (차단): ${tasksByStatus.BLOCKED.length}개

### 스프린트 Task 목록
${taskSummary}
` : '❌ 활성 스프린트 없음'}

### Backlog Task 목록
${backlogSummary}

### 세션 상태
- 활성 세션: ${context.activeSessions?.length || 0}개
- 대기 중인 질문: ${context.pendingQuestions?.length || 0}개

## 역할 선택 기준

다음 기준으로 실행할 역할을 결정하세요:

1. **plan.md가 없으면** → planner 실행 (기획 필요)
2. **스프린트가 없으면** → wait (사용자가 \`ada sprint create\` 실행 필요)
3. **BACKLOG Task가 있고 IN_DEV가 없으면** → developer 실행 (개발 시작)
4. **IN_DEV Task가 있으면** → developer 실행 (개발 계속)
5. **IN_REVIEW Task가 있으면** → reviewer 실행
6. **IN_QA Task가 있으면** → qa 실행
7. **DONE Task가 있고 리뷰 안 된 것이 있으면** → reviewer 실행
8. **REJECT Task가 있으면** → developer 실행 (수정 필요)
9. **BLOCKED Task가 있으면** → ask_user (사용자 확인 필요)
10. **모든 Task가 DONE이고 리뷰 완료면** → documenter 실행 (문서화)
11. **할 일이 없으면** → wait

## 출력 형식

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 출력하세요.

\`\`\`json
{
  "action": "run_agent",
  "role": "developer",
  "reason": "task-001이 BACKLOG 상태이므로 개발 시작 필요",
  "priority": "high",
  "targetTask": "task-001"
}
\`\`\`

### action 종류
- **run_agent**: 에이전트 실행 (role 필수)
- **wait**: 대기 (사용자 조치 필요)
- **ask_user**: 사용자에게 질문 필요

### role 종류
- planner: 기획/요구사항 분석
- developer: 코드 구현
- reviewer: 코드 리뷰
- documenter: 문서 작성
- improver: 기존 코드 개선

지금 상황을 분석하고 JSON으로 응답하세요.
`;
}
