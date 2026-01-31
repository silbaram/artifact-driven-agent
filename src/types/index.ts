// Common types
export type {
  Lock,
  NotificationType,
  Phase,
  QuestionPriority,
  QuestionStatus,
  SessionStatus,
  Tool,
} from './common.js';

// Session types
export type {
  AdaStatus,
  Notification,
  Question,
  SessionFile,
  SessionInfo,
  SessionUpdateOptions,
  TaskProgressInfo,
} from './session.js';

// Task types
export type {
  TaskMetadata,
  TaskPriority,
  TaskProgressUpdate,
  TaskSize,
  TaskStatus,
} from './task.js';

// Config types
export type {
  AdaConfig,
  DefaultsConfig,
  RoleToolConfig,
  VersionInfo,
} from './config.js';

// Dashboard/UI types
import type { TaskMetadata } from './task.js';
import type { Question, SessionInfo } from './session.js';

/**
 * Task 카테고리별 목록
 */
export interface TaskCategories {
  backlog: TaskMetadata[];
  inDev: TaskMetadata[];
  inReview: TaskMetadata[];
  done: TaskMetadata[];
  reject: TaskMetadata[];
  blocked: TaskMetadata[];
}

/**
 * 세션 로그 정보
 */
export interface SessionLog {
  sessionId: string;
  lines: string[];
}

/**
 * 다음 추천 액션
 */
export interface NextRecommendation {
  action?: string;
  role?: string;
  reason: string;
}

/**
 * 프로젝트 상태 (대시보드용)
 */
export interface ProjectState {
  isSetup: boolean;
  template: string | null;
  currentSprint: string | null;
  tasks: TaskCategories;
  sessions: SessionInfo[];
  sessionLogs: SessionLog[];
  pendingQuestions: Question[];
  nextRecommendation: NextRecommendation | null;
}

/**
 * 문서 생성기 타입
 */
export type DocsGenerator = 'mkdocs' | 'jekyll';

/**
 * 템플릿 별칭
 */
export type TemplateAlias = 'web' | 'lib' | 'web-dev' | 'library' | 'game' | 'cli';
