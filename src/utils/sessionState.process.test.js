import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs-extra';
import path from 'path';
import {
  cleanupZombieSessions,
  readStatus,
  writeStatus,
  getStatusFilePath
} from './sessionState.js';
import { getSessionsDir } from './files.js';

describe('좀비 세션 정리 - 프로세스 확인', () => {
  let originalCwd;
  let testDir;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = path.join(process.cwd(), '.test-workspace');
    fs.ensureDirSync(testDir);
    process.chdir(testDir);

    fs.ensureDirSync(path.join(testDir, 'ai-dev-team'));

    const initialStatus = {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      currentPhase: 'planning',
      activeSessions: [],
      pendingQuestions: [],
      taskProgress: {},
      notifications: [],
      locks: {}
    };
    const statusFilePath = getStatusFilePath();
    fs.ensureDirSync(path.dirname(statusFilePath));
    fs.writeFileSync(statusFilePath, JSON.stringify(initialStatus, null, 2));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.removeSync(testDir);
  });

  test('실행 중 pid는 오래돼도 유지', () => {
    const status = readStatus();
    status.activeSessions = [
      {
        sessionId: 'sess-live',
        role: 'developer',
        tool: 'codex',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        pid: process.pid
      }
    ];
    writeStatus(status);

    const removed = cleanupZombieSessions(60);
    assert.strictEqual(removed, 0);

    const updated = readStatus();
    assert.strictEqual(updated.activeSessions.length, 1);
    assert.strictEqual(updated.activeSessions[0].sessionId, 'sess-live');
  });

  test('종료된 pid는 즉시 정리되고 세션 상태가 error로 기록됨', () => {
    const pid = 9999999;
    const sessionId = 'sess-dead';
    const status = readStatus();
    status.activeSessions = [
      {
        sessionId,
        role: 'developer',
        tool: 'codex',
        startedAt: new Date().toISOString(),
        status: 'active',
        pid
      }
    ];
    writeStatus(status);

    const sessionDir = path.join(getSessionsDir(), sessionId);
    fs.ensureDirSync(sessionDir);
    fs.writeFileSync(
      path.join(sessionDir, 'session.json'),
      JSON.stringify({ session_id: sessionId, status: 'active' }, null, 2)
    );

    const removed = cleanupZombieSessions(60);
    assert.strictEqual(removed, 1);

    const updated = readStatus();
    assert.strictEqual(updated.activeSessions.length, 0);

    const updatedSession = JSON.parse(fs.readFileSync(path.join(sessionDir, 'session.json'), 'utf-8'));
    assert.strictEqual(updatedSession.status, 'error');
    assert.ok(updatedSession.ended_at);
    assert.ok(updatedSession.error);
  });
});
