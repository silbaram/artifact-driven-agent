import fs from 'fs-extra';
import path from 'path';
import { getWorkspaceDir, getSessionsDir, getTimestamp } from './files.js';
import type {
  AdaStatus,
  Notification,
  NotificationType,
  Question,
  QuestionPriority,
  SessionInfo,
  SessionUpdateOptions,
  TaskProgressUpdate,
} from '../types/index.js';

/**
 * .ada-status.json 파일 경로 반환
 */
export function getStatusFilePath(): string {
  return path.join(getWorkspaceDir(), '.ada-status.json');
}

/**
 * 상태 파일 템플릿
 */
function getEmptyStatus(): AdaStatus {
  return {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    currentPhase: 'planning',
    activeSessions: [],
    pendingQuestions: [],
    taskProgress: {},
    notifications: [],
    locks: {},
  };
}

/**
 * 상태 파일 읽기 (없으면 초기화)
 * 동시 접근 시 재시도 로직 포함
 */
export function readStatus(retries = 3): AdaStatus {
  const statusFile = getStatusFilePath();

  for (let i = 0; i < retries; i++) {
    try {
      if (!fs.existsSync(statusFile)) {
        const initialStatus = getEmptyStatus();
        fs.writeFileSync(statusFile, JSON.stringify(initialStatus, null, 2));
        return initialStatus;
      }

      let content = fs.readFileSync(statusFile, 'utf-8');
      try {
        const status = JSON.parse(content) as AdaStatus;
        // 스키마 검증 및 누락된 필드 추가
        const emptyStatus = getEmptyStatus();
        (Object.keys(emptyStatus) as Array<keyof AdaStatus>).forEach((key) => {
          if (status[key] === undefined) {
            (status as Record<string, unknown>)[key] = emptyStatus[key];
          }
        });
        return status;
      } catch (parseError) {
        if (
          parseError instanceof SyntaxError &&
          parseError.message.includes('JSON')
        ) {
          // 파일 내용에서 백슬래시 이스케이프 처리
          content = content.replace(/\\/g, '\\\\');
          const status = JSON.parse(content) as AdaStatus;

          // 스키마 검증 및 누락된 필드 추가
          const emptyStatus = getEmptyStatus();
          (Object.keys(emptyStatus) as Array<keyof AdaStatus>).forEach(
            (key) => {
              if (status[key] === undefined) {
                (status as Record<string, unknown>)[key] = emptyStatus[key];
              }
            }
          );

          // 복구된 파일 저장
          fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
          return status;
        }
        throw parseError;
      }
    } catch (err) {
      if (i === retries - 1) {
        console.error(
          '⚠️  상태 파일 읽기 실패:',
          err instanceof Error ? err.message : String(err)
        );
        return getEmptyStatus();
      }
      // 짧은 대기 후 재시도
      const delay = Math.random() * 100;
      const start = Date.now();
      while (Date.now() - start < delay) {
        /* busy wait */
      }
    }
  }

  return getEmptyStatus();
}

/**
 * 상태 파일 쓰기
 * 동시 접근 시 재시도 로직 포함
 */
export function writeStatus(status: AdaStatus, retries = 3): boolean {
  const statusFile = getStatusFilePath();
  status.updatedAt = new Date().toISOString();

  for (let i = 0; i < retries; i++) {
    try {
      // 임시 파일에 먼저 쓰고 atomic rename
      const tempFile = `${statusFile}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(status, null, 2));
      fs.renameSync(tempFile, statusFile);
      return true;
    } catch (err) {
      if (i === retries - 1) {
        console.error(
          '⚠️  상태 파일 쓰기 실패:',
          err instanceof Error ? err.message : String(err)
        );
        return false;
      }
      // 짧은 대기 후 재시도
      const delay = Math.random() * 100;
      const start = Date.now();
      while (Date.now() - start < delay) {
        /* busy wait */
      }
    }
  }

  return false;
}

/**
 * 세션 등록
 */
export function registerSession(
  sessionId: string,
  role: string,
  tool: string
): AdaStatus {
  const status = readStatus();

  // 기존 세션 중복 확인
  const existing = status.activeSessions.find(
    (s) => s.sessionId === sessionId
  );
  if (existing) {
    return status;
  }

  status.activeSessions.push({
    sessionId,
    role,
    tool,
    startedAt: new Date().toISOString(),
    status: 'active',
  });

  writeStatus(status);
  return status;
}

/**
 * 세션 제거
 */
export function unregisterSession(sessionId: string): AdaStatus {
  const status = readStatus();

  status.activeSessions = status.activeSessions.filter(
    (s) => s.sessionId !== sessionId
  );

  // 해당 세션이 보유한 잠금 해제
  Object.keys(status.locks).forEach((file) => {
    if (status.locks[file].holder === sessionId) {
      delete status.locks[file];
    }
  });

  writeStatus(status);
  return status;
}

/**
 * 세션 상태 업데이트
 */
export function updateSessionStatus(
  sessionId: string,
  newStatus: SessionInfo['status']
): AdaStatus {
  return updateSessionDetails(sessionId, { status: newStatus });
}

/**
 * 세션 메타데이터 업데이트
 */
export function updateSessionDetails(
  sessionId: string,
  updates: SessionUpdateOptions = {}
): AdaStatus {
  const status = readStatus();

  const session = status.activeSessions.find((s) => s.sessionId === sessionId);
  if (session) {
    Object.assign(session, updates);
    session.lastUpdate = new Date().toISOString();
    writeStatus(status);
  }

  return status;
}

/**
 * 질문 추가
 */
export function addQuestion(
  from: string,
  to: string,
  question: string,
  options: string[] = [],
  priority: QuestionPriority = 'normal'
): string {
  const status = readStatus();

  const questionId = `Q${from.substring(0, 1).toUpperCase()}${String(status.pendingQuestions.length + 1).padStart(3, '0')}`;

  const newQuestion: Question = {
    id: questionId,
    from,
    to,
    question,
    options,
    priority,
    status: 'waiting',
    createdAt: new Date().toISOString(),
  };

  status.pendingQuestions.push(newQuestion);

  // 알림 추가 (to 대상 지정)
  addNotificationInternal(
    status,
    'question',
    from,
    `새 질문 [${questionId}]: ${question}`,
    to
  );

  writeStatus(status);
  return questionId;
}

/**
 * 질문 응답
 */
export function answerQuestion(questionId: string, answer: string): AdaStatus {
  const status = readStatus();

  const question = status.pendingQuestions.find((q) => q.id === questionId);
  if (question) {
    question.status = 'answered';
    question.answer = answer;
    question.answeredAt = new Date().toISOString();

    // 질문 관련 알림을 읽음으로 표시
    status.notifications.forEach((n) => {
      if (n.message.includes(questionId) && !n.read) {
        n.read = true;
        n.readAt = new Date().toISOString();
      }
    });

    // 응답 알림 추가 (질문자에게)
    addNotificationInternal(
      status,
      'info',
      'manager',
      `질문 ${questionId} 응답됨: ${answer}`,
      question.from
    );

    writeStatus(status);
  }

  return status;
}

/**
 * Task 진행률 업데이트
 */
export function updateTaskProgress(
  taskId: string,
  updates: TaskProgressUpdate
): AdaStatus {
  const status = readStatus();

  if (!status.taskProgress[taskId]) {
    status.taskProgress[taskId] = { lastUpdate: new Date().toISOString() };
  }

  Object.assign(status.taskProgress[taskId], updates, {
    lastUpdate: new Date().toISOString(),
  });

  writeStatus(status);
  return status;
}

/**
 * 알림 추가 (내부용)
 */
function addNotificationInternal(
  status: AdaStatus,
  type: NotificationType,
  from: string,
  message: string,
  to = 'all'
): void {
  const notificationId = `N${String(status.notifications.length + 1).padStart(3, '0')}`;

  status.notifications.push({
    id: notificationId,
    type,
    from,
    to,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });

  // 알림은 최근 50개만 유지
  if (status.notifications.length > 50) {
    status.notifications = status.notifications.slice(-50);
  }
}

/**
 * 알림 추가 (외부용)
 */
export function addNotification(
  type: NotificationType,
  from: string,
  message: string,
  to = 'all'
): AdaStatus {
  const status = readStatus();
  addNotificationInternal(status, type, from, message, to);
  writeStatus(status);
  return status;
}

/**
 * 알림을 읽음으로 표시
 */
export function markNotificationAsRead(notificationId: string): boolean {
  const status = readStatus();

  const notification = status.notifications.find(
    (n) => n.id === notificationId
  );
  if (notification && !notification.read) {
    notification.read = true;
    notification.readAt = new Date().toISOString();
    writeStatus(status);
    return true;
  }

  return false;
}

/**
 * 여러 알림을 읽음으로 표시
 */
export function markNotificationsAsRead(notificationIds: string[]): number {
  const status = readStatus();
  let markedCount = 0;

  notificationIds.forEach((id) => {
    const notification = status.notifications.find((n) => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
      markedCount++;
    }
  });

  if (markedCount > 0) {
    writeStatus(status);
  }

  return markedCount;
}

/**
 * 특정 조건에 맞는 알림을 읽음으로 표시
 */
export function markNotificationsByFilter(
  filter: (n: Notification) => boolean
): number {
  const status = readStatus();
  let markedCount = 0;

  status.notifications.forEach((n) => {
    if (!n.read && filter(n)) {
      n.read = true;
      n.readAt = new Date().toISOString();
      markedCount++;
    }
  });

  if (markedCount > 0) {
    writeStatus(status);
  }

  return markedCount;
}

/**
 * 파일 잠금 획득
 */
export function acquireLock(
  sessionId: string,
  filePath: string,
  timeoutMs = 30000
): boolean {
  const status = readStatus();

  // 기존 잠금 확인
  if (status.locks[filePath]) {
    const lock = status.locks[filePath];
    const lockAge = Date.now() - new Date(lock.acquiredAt).getTime();

    // 타임아웃 초과 시 강제 해제
    if (lockAge > timeoutMs) {
      addNotificationInternal(
        status,
        'warning',
        'system',
        `파일 잠금 타임아웃: ${filePath} (${lock.holder})`
      );
      delete status.locks[filePath];
    } else {
      // 다른 세션이 잠금 보유 중
      return false;
    }
  }

  // 잠금 획득
  status.locks[filePath] = {
    holder: sessionId,
    acquiredAt: new Date().toISOString(),
  };

  writeStatus(status);
  return true;
}

/**
 * 파일 잠금 해제
 */
export function releaseLock(sessionId: string, filePath: string): boolean {
  const status = readStatus();

  if (
    status.locks[filePath] &&
    status.locks[filePath].holder === sessionId
  ) {
    delete status.locks[filePath];
    writeStatus(status);
    return true;
  }

  return false;
}

/**
 * 읽지 않은 알림 개수
 */
export function getUnreadNotificationCount(): number {
  const status = readStatus();
  return status.notifications.filter((n) => !n.read).length;
}

/**
 * 활성 세션 목록
 */
export function getActiveSessions(): SessionInfo[] {
  const status = readStatus();
  return status.activeSessions;
}

/**
 * 대기 중인 질문 목록
 */
export function getPendingQuestions(): Question[] {
  const status = readStatus();
  return status.pendingQuestions.filter((q) => q.status === 'waiting');
}

/**
 * 좀비 세션 정리 (프로세스 종료/오래된 세션 제거)
 */
export function cleanupZombieSessions(maxAgeMinutes = 60): number {
  const status = readStatus();
  const now = Date.now();

  const removedSessions: Array<{ sessionId: string; reason: string }> = [];

  status.activeSessions = status.activeSessions.filter((session) => {
    const pidStatus = isProcessAlive(session.pid);
    if (pidStatus === false) {
      removedSessions.push({ sessionId: session.sessionId, reason: 'process' });
      return false;
    }
    if (pidStatus === true) {
      return true;
    }

    const startedAtMs = new Date(session.startedAt).getTime();
    if (Number.isNaN(startedAtMs)) {
      removedSessions.push({ sessionId: session.sessionId, reason: 'time' });
      return false;
    }

    const age = now - startedAtMs;
    if (age >= maxAgeMinutes * 60 * 1000) {
      removedSessions.push({ sessionId: session.sessionId, reason: 'time' });
      return false;
    }

    return true;
  });

  if (removedSessions.length > 0) {
    removedSessions.forEach(({ sessionId, reason }) => {
      if (reason === 'process') {
        markSessionFileAsError(sessionId, '프로세스 종료 감지로 정리됨');
      } else {
        markSessionFileAsError(sessionId, '오래된 세션 정리됨');
      }
    });

    addNotificationInternal(
      status,
      'info',
      'system',
      `좀비 세션 ${removedSessions.length}개 정리됨`
    );
    writeStatus(status);
  }

  return removedSessions.length;
}

function isProcessAlive(pid: number | undefined): boolean | null {
  const parsedPid =
    typeof pid === 'string' ? Number.parseInt(pid, 10) : pid;
  if (!Number.isFinite(parsedPid) || !parsedPid || parsedPid <= 0) {
    return null;
  }

  try {
    process.kill(parsedPid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPERM') {
      return true;
    }
    return false;
  }
}

function markSessionFileAsError(sessionId: string, reason: string): void {
  const sessionsDir = getSessionsDir();
  const sessionFile = path.join(sessionsDir, sessionId, 'session.json');
  if (!fs.existsSync(sessionFile)) {
    return;
  }

  try {
    const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    if (session.status && session.status !== 'active') {
      return;
    }
    session.status = 'error';
    session.error = reason;
    if (!session.ended_at) {
      session.ended_at = getTimestamp();
    }
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
  } catch {
    // 세션 파일 오류는 무시
  }
}
