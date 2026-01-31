/**
 * 지원되는 AI 도구 타입
 */
export type Tool = 'claude' | 'codex' | 'gemini' | 'copilot';

/**
 * 파일 잠금 정보
 */
export interface Lock {
  holder: string;
  acquiredAt: string;
}

/**
 * 알림 타입
 */
export type NotificationType = 'info' | 'warning' | 'error' | 'question';

/**
 * 질문 우선순위
 */
export type QuestionPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * 질문 상태
 */
export type QuestionStatus = 'waiting' | 'answered';

/**
 * 세션 상태
 */
export type SessionStatus = 'active' | 'idle' | 'completed' | 'error';

/**
 * 현재 페이즈
 */
export type Phase = 'planning' | 'development' | 'review' | 'documentation';
