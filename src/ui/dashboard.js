import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { getWorkspaceDir, isWorkspaceSetup } from '../utils/files.js';
import { readStatus, getActiveSessions, getPendingQuestions } from '../utils/sessionState.js';
import { parseTaskMetadata } from '../utils/taskParser.js';
import { getToolForRole } from '../utils/config.js';

/**
 * 대시보드 UI 구성 상수
 */
const DASHBOARD_WIDTH = 80;
const HALF_WIDTH = Math.floor(DASHBOARD_WIDTH / 2);

/**
 * 프로젝트 상태 정보 수집
 */
export function gatherProjectState() {
  const result = {
    isSetup: false,
    template: null,
    currentSprint: null,
    tasks: {
      backlog: [],
      inDev: [],
      inReview: [],
      inQa: [],
      done: [],
      reject: [],
      blocked: []
    },
    sessions: [],
    pendingQuestions: [],
    nextRecommendation: null
  };

  if (!isWorkspaceSetup()) {
    return result;
  }

  result.isSetup = true;
  const workspace = getWorkspaceDir();

  // 템플릿 확인
  const templateFile = path.join(workspace, '.current-template');
  if (fs.existsSync(templateFile)) {
    result.template = fs.readFileSync(templateFile, 'utf-8').trim();
  }

  // 활성 세션
  result.sessions = getActiveSessions();

  // 대기 질문
  result.pendingQuestions = getPendingQuestions();

  // 스프린트 정보
  const artifactsDir = path.join(workspace, 'artifacts');
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
      result.currentSprint = currentSprintName;

      // Task 파싱
      const tasksDir = path.join(sprintDir, 'tasks');
      if (fs.existsSync(tasksDir)) {
        const taskFiles = fs.readdirSync(tasksDir)
          .filter(f => f.endsWith('.md') && f.startsWith('task-'));

        taskFiles.forEach(taskFile => {
          const taskPath = path.join(tasksDir, taskFile);
          const content = fs.readFileSync(taskPath, 'utf-8');
          const taskInfo = parseTaskMetadata(content, taskFile);

          const status = taskInfo.status.toUpperCase();
          if (status === 'BACKLOG') result.tasks.backlog.push(taskInfo);
          else if (status === 'IN_DEV') result.tasks.inDev.push(taskInfo);
          else if (status === 'IN_REVIEW') result.tasks.inReview.push(taskInfo);
          else if (status === 'IN_QA') result.tasks.inQa.push(taskInfo);
          else if (status === 'DONE') result.tasks.done.push(taskInfo);
          else if (status === 'REJECTED' || status === 'REJECT') result.tasks.reject.push(taskInfo);
          else if (status === 'BLOCKED') result.tasks.blocked.push(taskInfo);
          else result.tasks.backlog.push(taskInfo);
        });
      }
    }
  }

  // 다음 추천 액션 결정
  result.nextRecommendation = determineNextAction(result);

  return result;
}

/**
 * 다음 추천 액션 결정
 */
function determineNextAction(state) {
  if (!state.isSetup) {
    return { action: 'setup', reason: 'Setup 필요' };
  }

  if (state.tasks.reject.length > 0) {
    return { role: 'developer', reason: `REJECT ${state.tasks.reject.length}개 수정` };
  }

  if (state.tasks.inReview.length > 0) {
    return { role: 'reviewer', reason: `IN_REVIEW ${state.tasks.inReview.length}개 리뷰` };
  }

  if (state.tasks.inQa.length > 0) {
    return { role: 'qa', reason: `IN_QA ${state.tasks.inQa.length}개 테스트` };
  }

  if (state.tasks.backlog.length > 0 && state.tasks.inDev.length === 0) {
    return { role: 'developer', reason: `BACKLOG ${state.tasks.backlog.length}개 개발 시작` };
  }

  if (state.tasks.inDev.length > 0) {
    return { role: 'developer', reason: `IN_DEV ${state.tasks.inDev.length}개 개발 계속` };
  }

  if (state.tasks.done.length > 0) {
    const needsReview = state.tasks.done.filter(t => !t.hasReviewReport);
    if (needsReview.length > 0) {
      return { role: 'reviewer', reason: `완료 ${needsReview.length}개 리뷰 필요` };
    }
    return { role: 'documenter', reason: '모든 Task 완료, 문서화' };
  }

  if (!state.currentSprint) {
    return { action: 'sprint', reason: '스프린트 생성 필요' };
  }

  return { role: 'planner', reason: 'Task 추가 또는 기획' };
}

/**
 * 박스 문자 (유니코드)
 */
const BOX = {
  topLeft: '\u250C',
  topRight: '\u2510',
  bottomLeft: '\u2514',
  bottomRight: '\u2518',
  horizontal: '\u2500',
  vertical: '\u2502',
  teeRight: '\u251C',
  teeLeft: '\u2524',
  teeDown: '\u252C',
  teeUp: '\u2534',
  cross: '\u253C'
};

/**
 * 수평선 생성
 */
function horizontalLine(width, left = BOX.teeRight, right = BOX.teeLeft) {
  return left + BOX.horizontal.repeat(width - 2) + right;
}

/**
 * 텍스트 패딩 (왼쪽 정렬)
 */
function padText(text, width) {
  const visibleLength = stripAnsi(text).length;
  const padding = width - visibleLength;
  if (padding > 0) {
    return text + ' '.repeat(padding);
  }
  return text.substring(0, width);
}

/**
 * ANSI 코드 제거
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 문자열 자르기 (말줄임)
 */
function truncate(str, maxLength) {
  if (!str) return '';
  if (stripAnsi(str).length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + '\u2026';
}

/**
 * 경과 시간 계산
 */
function getElapsedTime(startedAt) {
  if (!startedAt) return '?';
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분`;
}

/**
 * 현재 시간 문자열
 */
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

/**
 * 대시보드 렌더링
 */
export function renderDashboard(state, statusMessage = '준비됨') {
  const lines = [];
  const innerWidth = DASHBOARD_WIDTH - 2;
  const leftPanelWidth = HALF_WIDTH - 1;
  const rightPanelWidth = DASHBOARD_WIDTH - leftPanelWidth - 3;

  // 화면 지우기
  process.stdout.write('\x1b[2J\x1b[H');

  // 상단 헤더
  lines.push(
    chalk.cyan(BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight)
  );

  const titleText = 'ADA UI Mode';
  const timeText = `[${getCurrentTime()}]`;
  const titleLine = ` ${titleText}${' '.repeat(innerWidth - titleText.length - timeText.length - 1)}${timeText}`;
  lines.push(chalk.cyan(BOX.vertical) + chalk.cyan.bold(titleLine) + chalk.cyan(BOX.vertical));

  // 구분선
  lines.push(chalk.cyan(horizontalLine(DASHBOARD_WIDTH, BOX.teeRight, BOX.teeLeft)));

  // 중간 패널 (스프린트 | 세션)
  const sprintLines = renderSprintPanel(state, leftPanelWidth);
  const sessionLines = renderSessionPanel(state, rightPanelWidth);

  const maxPanelLines = Math.max(sprintLines.length, sessionLines.length);
  for (let i = 0; i < maxPanelLines; i++) {
    const leftLine = sprintLines[i] || ' '.repeat(leftPanelWidth);
    const rightLine = sessionLines[i] || ' '.repeat(rightPanelWidth);
    lines.push(
      chalk.cyan(BOX.vertical) +
      padText(leftLine, leftPanelWidth) +
      chalk.cyan(BOX.vertical) +
      padText(rightLine, rightPanelWidth) +
      chalk.cyan(BOX.vertical)
    );
  }

  // Quick Actions 섹션
  lines.push(chalk.cyan(horizontalLine(DASHBOARD_WIDTH, BOX.teeRight, BOX.teeLeft)));
  const quickActionsLines = renderQuickActions(innerWidth);
  quickActionsLines.forEach(line => {
    lines.push(chalk.cyan(BOX.vertical) + padText(line, innerWidth) + chalk.cyan(BOX.vertical));
  });

  // 상태 바
  lines.push(chalk.cyan(horizontalLine(DASHBOARD_WIDTH, BOX.teeRight, BOX.teeLeft)));

  const nextRec = state.nextRecommendation;
  let nextText = '';
  if (nextRec) {
    if (nextRec.action) {
      nextText = `${nextRec.action} (${nextRec.reason})`;
    } else if (nextRec.role) {
      nextText = `${nextRec.role} (${nextRec.reason})`;
    }
  }

  const statusLine = ` STATUS: ${statusMessage} | ${chalk.green('다음 추천:')} ${nextText}`;
  lines.push(chalk.cyan(BOX.vertical) + padText(statusLine, innerWidth) + chalk.cyan(BOX.vertical));

  // 하단
  lines.push(
    chalk.cyan(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight)
  );

  // 출력
  console.log(lines.join('\n'));
}

/**
 * 스프린트 패널 렌더링
 */
function renderSprintPanel(state, width) {
  const lines = [];
  const contentWidth = width - 2;

  if (!state.isSetup) {
    lines.push(chalk.yellow(' SPRINT: Setup 필요'));
    lines.push(chalk.gray(' ada setup <template>'));
    return lines;
  }

  if (!state.currentSprint) {
    lines.push(chalk.yellow(' SPRINT: 없음'));
    lines.push(chalk.gray(' ada sprint create'));
    return lines;
  }

  lines.push(chalk.white.bold(` SPRINT: ${chalk.cyan(state.currentSprint)}`));

  const taskStats = [
    { label: 'BACKLOG', count: state.tasks.backlog.length, color: chalk.gray },
    { label: 'IN_DEV', count: state.tasks.inDev.length, color: chalk.yellow },
    { label: 'IN_REVIEW', count: state.tasks.inReview.length, color: chalk.blue },
    { label: 'DONE', count: state.tasks.done.length, color: chalk.green },
    { label: 'REJECT', count: state.tasks.reject.length, color: chalk.red }
  ];

  taskStats.forEach(stat => {
    if (stat.count > 0) {
      let taskList = [];
      if (stat.label === 'BACKLOG') taskList = state.tasks.backlog;
      else if (stat.label === 'IN_DEV') taskList = state.tasks.inDev;
      else if (stat.label === 'REJECT') taskList = state.tasks.reject;

      const taskIds = taskList.slice(0, 3).map(t => t.id).join(', ');
      const extra = taskList.length > 3 ? `...` : '';
      lines.push(stat.color(` \u251C\u2500 ${stat.label}: ${stat.count}개`));
      if (taskIds) {
        lines.push(stat.color(` \u2502  (${truncate(taskIds + extra, contentWidth - 6)})`));
      }
    }
  });

  if (state.tasks.blocked.length > 0) {
    lines.push(chalk.red(` \u2514\u2500 BLOCKED: ${state.tasks.blocked.length}개`));
  }

  return lines;
}

/**
 * 세션 패널 렌더링
 */
function renderSessionPanel(state, width) {
  const lines = [];

  lines.push(chalk.white.bold(' SESSIONS'));

  if (state.sessions.length === 0) {
    lines.push(chalk.gray(' (활성 세션 없음)'));
  } else {
    state.sessions.forEach(session => {
      const elapsed = getElapsedTime(session.startedAt);
      const icon = session.status === 'active' ? '+' : '-';
      const roleText = `${session.role} (${session.tool})`;
      lines.push(chalk.green(` ${icon} ${truncate(roleText, width - 10)} - ${elapsed}`));
    });
  }

  lines.push('');

  const qCount = state.pendingQuestions.length;
  if (qCount > 0) {
    lines.push(chalk.yellow(` QUESTIONS: ${qCount}개 대기`));
  } else {
    lines.push(chalk.gray(' QUESTIONS: 없음'));
  }

  return lines;
}

/**
 * Quick Actions 렌더링
 */
function renderQuickActions(width) {
  const lines = [];

  lines.push(chalk.white.bold(' QUICK ACTIONS'));
  lines.push('');

  // 3열 레이아웃 - 숫자 키
  const col1 = [
    chalk.cyan('[1]') + ' 자동화 시작',
    chalk.cyan('[2]') + ' 1회 실행 (추천)',
    chalk.cyan('[3]') + ' planner'
  ];

  const col2 = [
    chalk.cyan('[4]') + ' developer',
    chalk.cyan('[5]') + ' reviewer',
    chalk.cyan('[6]') + ' documenter'
  ];

  const col3 = [
    chalk.cyan('[7]') + ' sprint list',
    chalk.cyan('[8]') + ' sprint sync',
    chalk.cyan('[9]') + ' config'
  ];

  const colWidth = Math.floor((width - 4) / 3);

  for (let i = 0; i < 3; i++) {
    const c1 = padText(' ' + (col1[i] || ''), colWidth);
    const c2 = padText(col2[i] || '', colWidth);
    const c3 = padText(col3[i] || '', colWidth);
    lines.push(c1 + c2 + c3);
  }

  lines.push('');

  // 알파벳 키
  const alphaCol1 = [
    chalk.yellow('[s]') + ' sessions',
    chalk.yellow('[c]') + ' sprint create'
  ];

  const alphaCol2 = [
    chalk.yellow('[l]') + ' logs',
    chalk.yellow('[a]') + ' sprint add'
  ];

  const alphaCol3 = [
    chalk.yellow('[t]') + ' status',
    chalk.yellow('[v]') + ' validate'
  ];

  for (let i = 0; i < 2; i++) {
    const c1 = padText(' ' + (alphaCol1[i] || ''), colWidth);
    const c2 = padText(alphaCol2[i] || '', colWidth);
    const c3 = padText(alphaCol3[i] || '', colWidth);
    lines.push(c1 + c2 + c3);
  }

  lines.push('');
  lines.push(
    ' ' + chalk.cyan('[0]') + ' 새로고침  ' +
    chalk.cyan('[q]') + ' 종료  ' +
    chalk.cyan('[h]') + ' 도움말  ' +
    chalk.cyan('[?]') + ' 질문  ' +
    chalk.cyan('[o]') + ' 오케스트레이션'
  );

  return lines;
}
