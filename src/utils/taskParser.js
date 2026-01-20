import path from 'path';

/**
 * Task 파일(.md) 내용을 파싱하여 메타데이터 객체를 반환합니다.
 * @param {string} content - 파일 내용
 * @param {string} filename - 파일 이름 (예: task-001.md)
 * @returns {object} 파싱된 Task 정보
 */
export function parseTaskMetadata(content, filename) {
  const lines = content.split('\n');

  // 1. ID 및 제목 파싱 (첫 줄: # TASK-NNN: [Task 이름])
  // 파일명에서 ID 추출을 우선 시도 (파일명이 더 신뢰도 높음)
  let id = filename ? path.basename(filename, '.md') : '';
  
  // 제목 줄 파싱
  const titleLine = lines.find(line => line.startsWith('# '));
  let title = '제목 없음';
  
  if (titleLine) {
    // "# TASK-001: 제목" 형태인 경우
    const match = titleLine.match(/^#\s*(TASK-\d+)?[:\s]*\s*(.+)$/i);
    if (match) {
      if (!id && match[1]) id = match[1]; // 파일명이 없으면 제목에서 ID 추출
      title = match[2].trim();
    } else {
      title = titleLine.replace(/^#\s*/, '').trim();
    }
  }

  if (!id) id = 'unknown';

  // 2. 메타 테이블 파싱 (| 항목 | 값 |)
  const status = parseTableValue(content, ['상태', 'Status'], null) ??
    parseInlineValue(content, ['상태', 'Status']) ?? 'BACKLOG';
  const priority = parseTableValue(content, ['우선순위', 'Priority'], null) ??
    parseInlineValue(content, ['우선순위', 'Priority']) ?? 'P2';
  const size = parseTableValue(content, ['크기', 'Size'], null) ??
    parseInlineValue(content, ['크기', 'Size']) ?? 'M';
  const assignee = parseTableValue(content, ['담당', 'Assignee'], null) ??
    parseInlineValue(content, ['담당', 'Assignee']) ?? '-';

  // 3. 추가 정보 (리뷰 리포트 존재 여부 추론 등)
  // 간단히 내용에 '## Review' 등이 있는지 확인 (orchestrate.js 로직 반영)
  const hasReviewReport = content.includes('## Review') || 
                         content.includes('## QA') ||
                         content.includes('리뷰 결과');

  return {
    id,
    title,
    status,
    priority,
    size,
    assignee,
    hasReviewReport
  };
}

/**
 * 마크다운 테이블에서 특정 키의 값을 추출
 * @param {string} content 
 * @param {string} key 
 * @param {string} defaultValue 
 */
function parseTableValue(content, key, defaultValue) {
  // 예: | 상태 | BACKLOG / ... |
  // 공백 유연하게 대응
  const keys = Array.isArray(key) ? key : [key];
  for (const keyItem of keys) {
    const escapedKey = escapeRegExp(keyItem);
    const regex = new RegExp(`\\|\\s*${escapedKey}\\s*\\|\\s*([^\\|]+)\\s*\\|`, 'i');
    const match = content.match(regex);

    if (match) {
      // "BACKLOG / IN_DEV" 처럼 슬래시로 옵션이 나열된 경우 첫 번째 값 사용
      // 또는 단순히 값이 하나만 있는 경우
      // 템플릿 값("BACKLOG / ...")이 그대로 남아있으면 첫번째 값(BACKLOG) 선택
      let val = match[1].trim();
      if (val.includes('/')) {
          // "BACKLOG / IN_DEV" 형태라면 현재 선택된 값이 무엇인지 모호할 수 있음.
          // 하지만 보통 사람이 편집할 때 나머지를 지우거나, 
          // 템플릿 상태라면 첫번째가 기본값이라고 가정.
          // 만약 사용자가 "DONE"만 남겼다면 "/"가 없음.
          val = val.split('/')[0].trim();
      }
      return val;
    }
  }
  
  return defaultValue;
}

/**
 * 인라인 형식 (예: Status: DONE) 값 추출
 * @param {string} content
 * @param {string|string[]} key
 */
function parseInlineValue(content, key) {
  const keys = Array.isArray(key) ? key : [key];
  for (const keyItem of keys) {
    const escapedKey = escapeRegExp(keyItem);
    const regex = new RegExp(`^\\s*${escapedKey}\\s*:\\s*(.+)$`, 'mi');
    const match = content.match(regex);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
