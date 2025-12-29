# Rule: 역할별 상태 관리 (Role State Protocol)

모든 역할이 따라야 하는 상태 관리 규칙.
멀티 터미널 환경에서 세션 간 통신을 위해 사용.

---

## 1. 세션 시작 시

모든 역할은 세션 시작 시 다음을 수행:

```
1. .ada-status.json 확인 (없으면 템플릿으로 생성)
2. activeSessions에 자신 등록
3. 파일 저장
4. CLI에 등록 완료 표시
```

### 등록 예시

```json
{
  "role": "developer",
  "tool": "codex",
  "startedAt": "2024-01-15T10:00:00Z",
  "status": "active"
}
```

### CLI 출력

```
📡 세션 등록됨 (Developer/codex)
   Manager 모니터링 시 표시됩니다.
```

---

## 2. 질문 등록

사용자에게 중요한 결정을 물어야 할 때:

### 절차

```
1. 질문 생성
2. pendingQuestions에 추가
3. notifications에 알림 추가
4. 파일 저장
5. 응답 대기 또는 현재 터미널에서 직접 응답 받기
```

### 질문 형식

```json
{
  "id": "Q[역할약자][순번]",
  "from": "역할명",
  "to": "user",
  "question": "질문 내용",
  "options": ["옵션1", "옵션2"],
  "context": "추가 설명 (선택)",
  "priority": "normal",
  "status": "waiting",
  "createdAt": "ISO8601"
}
```

### CLI 출력 (질문 등록 후)

```
━━━━━━━━━━━━━━━━━━━━━━
📨 질문 등록됨 [QD001]
━━━━━━━━━━━━━━━━━━━━━━
질문: Redis 캐시를 적용할까요?
옵션: (y) 적용 / (n) 미적용

Manager 세션에서 응답 가능합니다.
또는 이 터미널에서 응답: (y/n): _
```

---

## 3. 응답 확인

질문 등록 후 응답을 기다리는 방법:

### 옵션 A: 현재 터미널에서 직접 응답

```
사용자가 바로 응답 입력
→ pendingQuestions 업데이트
→ 작업 계속 진행
```

### 옵션 B: Manager 세션에서 응답 대기

```
1. 주기적으로 .ada-status.json 확인 (5초 간격)
2. 자신의 질문 상태 확인
3. status가 "answered"면 answer 읽기
4. 작업 계속 진행
```

### CLI 출력 (대기 중)

```
⏳ Manager 응답 대기 중... (Ctrl+C로 취소)
   또는 여기서 직접 응답: _
```

### CLI 출력 (응답 수신)

```
✅ 응답 수신: "y" (Manager)
   → Redis 캐시 적용으로 진행합니다.
```

---

## 4. Task 진행 상황 업데이트

작업 진행 시 상태 갱신:

### 업데이트 시점

- 작업 시작 시
- 주요 마일스톤 도달 시
- 작업 완료 시
- 문제 발생 시

### 형식

```json
{
  "T001": {
    "status": "IN_DEV",
    "assignee": "developer",
    "progress": 50,
    "lastUpdate": "ISO8601",
    "note": "API 구현 완료, DB 연동 중"
  }
}
```

### CLI 출력

```
📊 진행 상황 업데이트: T001 (50%)
```

---

## 5. 알림 전송

다른 세션에 알림을 보내야 할 때:

### 알림 유형

| 타입 | 용도 |
|------|------|
| info | 일반 정보 (작업 시작/완료) |
| warning | 주의 필요 (30초 잠금 초과) |
| error | 오류 발생 (파일 충돌) |
| question | 질문 등록됨 |
| complete | 단계 완료 (Review PASS 등) |

### 형식

```json
{
  "id": "N001",
  "type": "complete",
  "from": "reviewer",
  "message": "T001 리뷰 완료 - PASS",
  "read": false,
  "createdAt": "ISO8601"
}
```

---

## 6. 파일 잠금

동시 수정 방지:

### 잠금 필요 파일

- `current-sprint.md`
- `backlog.md`
- `decision.md`

### 잠금 절차

```
1. locks에 파일 등록
2. 작업 수행
3. 잠금 해제
```

### 형식

```json
{
  "ai-dev-team/artifacts/current-sprint.md": {
    "holder": "developer",
    "acquiredAt": "ISO8601"
  }
}
```

### 충돌 시

```
⚠️ 파일 잠금 충돌
   current-sprint.md가 Manager에 의해 잠겨 있습니다.
   대기 중... (10초)
```

---

## 7. 세션 종료 시

```
1. activeSessions에서 자신 제거
2. 미응답 질문 처리:
   - 취소 표시 또는
   - 다음 세션에서 응답 가능하도록 유지
3. 잠금 해제
4. 파일 저장
```

### CLI 출력

```
📡 세션 종료됨 (Developer/codex)
   작업 시간: 45분
   완료 Task: T001
```

---

## 8. 에러 처리

### 상태 파일 읽기 실패

```
⚠️ .ada-status.json 읽기 실패
   → 새 파일 생성
```

### 동시 쓰기 충돌

```
⚠️ 상태 파일 충돌 감지
   → 재시도 (3회)
   → 실패 시 강제 갱신
```

---

## 9. CLI 공통 표시

### 세션 시작 헤더

```
━━━━━━━━━━━━━━━━━━━━━━
🔧 Developer 세션 시작
━━━━━━━━━━━━━━━━━━━━━━
📡 세션 등록: Developer/codex
🔗 활성 세션: Manager(claude), Reviewer(gemini)
```

### 다른 세션 알림 수신

```
━━━━━━━━━━━━━━━━━━━━━━
🔔 알림 [Manager]
━━━━━━━━━━━━━━━━━━━━━━
T002가 스프린트에 추가되었습니다.
```
