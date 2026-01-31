/**
 * Task 상태
 */
export type TaskStatus =
  | 'BACKLOG'
  | 'IN_DEV'
  | 'IN_REVIEW'
  | 'DONE'
  | 'REJECT'
  | 'BLOCKED'
  | 'UNKNOWN';

/**
 * Task 우선순위
 */
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Task 크기
 */
export type TaskSize = 'XS' | 'S' | 'M' | 'L' | 'XL';

/**
 * Task 메타데이터
 */
export interface TaskMetadata {
  id: string;
  title: string;
  status: TaskStatus | string;
  priority: TaskPriority | string;
  size: TaskSize | string;
  assignee: string;
  hasReviewReport: boolean;
}

/**
 * Task 진행률 업데이트 옵션
 */
export interface TaskProgressUpdate {
  status?: string;
  progress?: number;
  [key: string]: unknown;
}
