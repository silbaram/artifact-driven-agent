import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs-extra';
import path from 'path';
import {
  addQuestion,
  answerQuestion,
  addNotification,
  markNotificationAsRead,
  markNotificationsAsRead,
  markNotificationsByFilter,
  readStatus,
  writeStatus,
  getStatusFilePath
} from './sessionState.js';

describe('알림 읽음 처리 기능', () => {
  let originalCwd;
  let testDir;

  beforeEach(() => {
    // 테스트용 임시 디렉토리 생성
    originalCwd = process.cwd();
    testDir = path.join(process.cwd(), '.test-workspace');
    fs.ensureDirSync(testDir);
    process.chdir(testDir);

    // ai-dev-team 디렉토리 생성
    fs.ensureDirSync(path.join(testDir, 'ai-dev-team'));

    // 초기 상태 파일 생성
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
    // 테스트 디렉토리 정리
    process.chdir(originalCwd);
    fs.removeSync(testDir);
  });

  test('알림 추가 시 to 필드가 포함됨', () => {
    addNotification('info', 'planner', '테스트 알림', 'developer');

    const status = readStatus();
    assert.strictEqual(status.notifications.length, 1);
    assert.strictEqual(status.notifications[0].to, 'developer');
    assert.strictEqual(status.notifications[0].read, false);
  });

  test('markNotificationAsRead로 알림 읽음 처리', () => {
    addNotification('info', 'planner', '테스트 알림', 'developer');
    const status = readStatus();
    const notifId = status.notifications[0].id;

    const result = markNotificationAsRead(notifId);

    assert.strictEqual(result, true);

    const updatedStatus = readStatus();
    assert.strictEqual(updatedStatus.notifications[0].read, true);
    assert.ok(updatedStatus.notifications[0].readAt);
  });

  test('이미 읽은 알림은 다시 처리하지 않음', () => {
    addNotification('info', 'planner', '테스트 알림', 'developer');
    const status = readStatus();
    const notifId = status.notifications[0].id;

    markNotificationAsRead(notifId);
    const firstReadAt = readStatus().notifications[0].readAt;

    // 약간의 지연
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    return delay(10).then(() => {
      const result = markNotificationAsRead(notifId);
      assert.strictEqual(result, false);

      const secondReadAt = readStatus().notifications[0].readAt;
      assert.strictEqual(firstReadAt, secondReadAt);
    });
  });

  test('markNotificationsAsRead로 여러 알림 읽음 처리', () => {
    addNotification('info', 'planner', '알림 1', 'developer');
    addNotification('info', 'planner', '알림 2', 'developer');
    addNotification('info', 'planner', '알림 3', 'developer');

    const status = readStatus();
    const ids = status.notifications.map(n => n.id);

    const markedCount = markNotificationsAsRead(ids);

    assert.strictEqual(markedCount, 3);

    const updatedStatus = readStatus();
    updatedStatus.notifications.forEach(n => {
      assert.strictEqual(n.read, true);
    });
  });

  test('markNotificationsByFilter로 조건부 읽음 처리', () => {
    addNotification('info', 'planner', '알림 1', 'developer');
    addNotification('warning', 'reviewer', '알림 2', 'developer');
    addNotification('info', 'planner', '알림 3', 'manager');

    // developer에게 온 알림만 읽음 처리
    const markedCount = markNotificationsByFilter(n => n.to === 'developer');

    assert.strictEqual(markedCount, 2);

    const status = readStatus();
    assert.strictEqual(status.notifications[0].read, true); // developer
    assert.strictEqual(status.notifications[1].read, true); // developer
    assert.strictEqual(status.notifications[2].read, false); // manager
  });

  test('질문 추가 시 알림의 to가 질문 대상으로 설정됨', () => {
    addQuestion('planner', 'developer', 'API 엔드포인트는?', ['POST /users', 'GET /users']);

    const status = readStatus();
    assert.strictEqual(status.notifications.length, 1);
    assert.strictEqual(status.notifications[0].to, 'developer');
    assert.ok(status.notifications[0].message.includes('QP001'));
  });

  test('질문 응답 시 관련 알림 자동 읽음 처리', () => {
    const questionId = addQuestion('planner', 'developer', 'API 엔드포인트는?');

    // 질문 전 상태 확인
    let status = readStatus();
    assert.strictEqual(status.notifications[0].read, false);

    // 질문 응답
    answerQuestion(questionId, 'POST /users');

    // 질문 관련 알림이 읽음 처리되었는지 확인
    status = readStatus();
    const questionNotif = status.notifications.find(n => n.message.includes(questionId));
    assert.strictEqual(questionNotif.read, true);
    assert.ok(questionNotif.readAt);
  });

  test('질문 응답 시 응답 알림이 질문자에게 전달됨', () => {
    const questionId = addQuestion('planner', 'developer', 'API 엔드포인트는?');

    answerQuestion(questionId, 'POST /users');

    const status = readStatus();
    const answerNotif = status.notifications.find(n => n.message.includes('응답됨'));
    assert.ok(answerNotif);
    assert.strictEqual(answerNotif.to, 'planner'); // 질문자에게 전달
    assert.strictEqual(answerNotif.from, 'manager');
  });

  test('통계: 읽지 않은 알림 개수 정확함', () => {
    addNotification('info', 'planner', '알림 1', 'developer');
    addNotification('info', 'planner', '알림 2', 'developer');
    addNotification('info', 'planner', '알림 3', 'developer');

    let status = readStatus();
    const unreadCount1 = status.notifications.filter(n => !n.read).length;
    assert.strictEqual(unreadCount1, 3);

    // 하나 읽음 처리
    markNotificationAsRead(status.notifications[0].id);

    status = readStatus();
    const unreadCount2 = status.notifications.filter(n => !n.read).length;
    assert.strictEqual(unreadCount2, 2);
  });
});
