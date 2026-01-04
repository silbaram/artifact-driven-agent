import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateBacklog, validateSprint } from './validate.js';

function createArtifactsDir(t) {
  const baseDir = path.join(process.cwd(), 'tmp', 'validate-tests');
  fs.mkdirSync(baseDir, { recursive: true });

  const rootDir = fs.mkdtempSync(path.join(baseDir, 'case-'));
  const artifactsDir = path.join(rootDir, 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  return artifactsDir;
}

test('validateBacklog: backlog/의 task-*.md를 검증한다', (t) => {
  const artifactsDir = createArtifactsDir(t);
  const backlogDir = path.join(artifactsDir, 'backlog');
  fs.mkdirSync(backlogDir, { recursive: true });

  fs.writeFileSync(
    path.join(backlogDir, 'task-001.md'),
    '# TASK-001\n\n## Acceptance Criteria\n- [ ] 준비\n'
  );

  const result = validateBacklog(artifactsDir);
  assert.equal(result.fail, 0);
  assert.equal(result.warn, 0);
  assert.ok(result.pass > 0);
});

test('validateBacklog: Task가 없으면 경고한다', (t) => {
  const artifactsDir = createArtifactsDir(t);
  const backlogDir = path.join(artifactsDir, 'backlog');
  fs.mkdirSync(backlogDir, { recursive: true });

  const result = validateBacklog(artifactsDir);
  assert.equal(result.fail, 0);
  assert.ok(result.warn >= 1);
});

test('validateSprint: 최신 스프린트 meta.md와 tasks를 확인한다', (t) => {
  const artifactsDir = createArtifactsDir(t);
  const sprintDir = path.join(artifactsDir, 'sprints', 'sprint-1');
  const tasksDir = path.join(sprintDir, 'tasks');
  fs.mkdirSync(tasksDir, { recursive: true });

  fs.writeFileSync(
    path.join(sprintDir, 'meta.md'),
    [
      '# Sprint 1 메타정보',
      '',
      '| 항목 | 값 |',
      '|------|-----|',
      '| 스프린트 번호 | 1 |',
      '| 상태 | active |',
      '| 시작일 | 2025-01-01 |',
      '| 종료 예정 | 2025-01-07 |',
      '| 목표 | 검증 |',
      '',
      '## Task 요약',
      '',
      '| Task | 상태 | 담당 | 우선순위 | 크기 |',
      '|------|:----:|------|:--------:|:----:|',
      '| task-001 | BACKLOG | - | P0 | S |',
      ''
    ].join('\n')
  );

  fs.writeFileSync(
    path.join(tasksDir, 'task-001.md'),
    '# TASK-001\n\n## Acceptance Criteria\n- [ ] 준비\n'
  );

  const result = validateSprint(artifactsDir);
  assert.equal(result.fail, 0);
  assert.equal(result.warn, 0);
});
