import type {
  Lock,
  NotificationType,
  Phase,
  QuestionPriority,
  QuestionStatus,
  SessionStatus,
  Tool,
} from './common.js';

/**
 * 세션 정보
 */
export interface SessionInfo {
  sessionId: string;
  role: string;
  tool: Tool | string;
  startedAt: string;
  status: SessionStatus;
  pid?: number;
  lastUpdate?: string;
  currentTask?: string;
  currentTaskDescription?: string;
}

/**
 * 질문 정보
 */
export interface Question {
  id: string;
  from: string;
  to: string;
  question: string;
  options: string[];
  priority: QuestionPriority;
  status: QuestionStatus;
  createdAt: string;
  answer?: string;
  answeredAt?: string;
}

/**
 * 알림 정보
 */
export interface Notification {
  id: string;
  type: NotificationType;
  from: string;
  to: string;
  message: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

/**
 * Task 진행률 정보
 */
export interface TaskProgressInfo {
  status?: string;
  progress?: number;
  lastUpdate: string;
  [key: string]: unknown;
}

/**
 * Ada 상태 파일 구조 (.ada-status.json)
 */
export interface AdaStatus {
  version: string;
  updatedAt: string;
  currentPhase: Phase;
  activeSessions: SessionInfo[];
  pendingQuestions: Question[];
  taskProgress: Record<string, TaskProgressInfo>;
  notifications: Notification[];
  locks: Record<string, Lock>;
  [key: string]: unknown;
}

/**
 * 세션 파일 구조 (session.json)
 */
export interface SessionFile {
  sessionId: string;
  role: string;
  tool: Tool | string;
  started_at: string;
  ended_at?: string;
  status: SessionStatus;
  error?: string;
}

/**
 * 세션 업데이트 옵션
 */
export interface SessionUpdateOptions {
  status?: SessionStatus;
  currentTask?: string;
  currentTaskDescription?: string;
  [key: string]: unknown;
}
