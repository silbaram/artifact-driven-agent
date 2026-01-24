import test from 'node:test';
import assert from 'node:assert';
import { parseTaskMetadata } from './taskParser.js';

test('parseTaskMetadata - 표준 포맷 파싱', (t) => {
  const content = `
# TASK-001: 로그인 기능

| 항목 | 값 |
|------|-----|
| 상태 | IN_DEV |
| 우선순위 | P1 |
| 크기 | M |
| 담당 | developer |

## 내용
...
`;
  const result = parseTaskMetadata(content, 'task-001.md');
  
  assert.strictEqual(result.id, 'task-001');
  assert.strictEqual(result.title, '로그인 기능');
  assert.strictEqual(result.status, 'IN_DEV');
  assert.strictEqual(result.priority, 'P1');
  assert.strictEqual(result.size, 'M');
  assert.strictEqual(result.assignee, 'developer');
});

test('parseTaskMetadata - 템플릿 값 잔존 (선택지 포함)', (t) => {
  const content = `
| 상태 | DONE / REJECTED |
`;
  // "DONE / REJECTED" 처럼 되어 있으면 첫 번째 값인 DONE을 가져와야 함 (일반적인 AI 수정 패턴)
  // 하지만 유틸리티 구현상 split('/')[0]을 하므로 DONE이 됨.
  const result = parseTaskMetadata(content, 'task-002.md');
  assert.strictEqual(result.status, 'DONE');
});

test('parseTaskMetadata - 제목 파싱 변형', (t) => {
  // # TASK-NNN 없이 그냥 # 제목 인 경우
  const content = `# 회원가입 API 구현`;
  const result = parseTaskMetadata(content, 'task-003.md');
  assert.strictEqual(result.title, '회원가입 API 구현');
  assert.strictEqual(result.id, 'task-003'); // 파일명에서 추출
});

test('parseTaskMetadata - 공백 불규칙 허용', (t) => {
  const content = `
|상태|  DONE  |
|  우선순위|P0|
`;
  const result = parseTaskMetadata(content, 'task-004.md');
  assert.strictEqual(result.status, 'DONE');
  assert.strictEqual(result.priority, 'P0');
});

test('parseTaskMetadata - 영문 키 지원 여부 확인', (t) => {
  // AI가 실수로 영문 템플릿을 사용하거나 영문으로 바꾼 경우
  const content = `
| Status | IN_DEV |
| Priority | P2 |
`;
  const result = parseTaskMetadata(content, 'task-005.md');

  assert.strictEqual(result.status, 'IN_DEV');
  assert.strictEqual(result.priority, 'P2');
});

test('parseTaskMetadata - 리뷰 리포트 존재 감지', (t) => {
  const content = `
## Review
- PASS
`;
  const result = parseTaskMetadata(content, 'task-006.md');
  assert.strictEqual(result.hasReviewReport, true);
});
