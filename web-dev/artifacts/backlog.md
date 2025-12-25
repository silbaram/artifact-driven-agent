# Product Backlog

> 전체 기능 목록과 상태를 관리하는 단일 진실 문서.
> - Planner가 신규 Task를 추가한다.
> - Manager가 상태를 전환한다.
> - 모든 역할이 이 문서를 참조하여 현재 상태를 파악한다.

---

## 0. 문서 메타

| 항목 | 값 |
|------|-----|
| 프로젝트명 | [프로젝트명] |
| 최종 수정일 | YYYY-MM-DD |
| 현재 스프린트 | Sprint N |

---

## 1. Task 상태 정의

| 상태 | 아이콘 | 설명 |
|------|:------:|------|
| `BACKLOG` | 📋 | 정의됨, 우선순위 미정 |
| `READY` | ✅ | 스프린트 투입 가능 (요구사항 명확) |
| `IN_SPRINT` | 🏃 | 현재 스프린트에서 진행 중 |
| `IN_DEV` | 💻 | 개발 진행 중 |
| `IN_REVIEW` | 🔍 | 리뷰 진행 중 |
| `IN_QA` | 🧪 | QA 진행 중 |
| `DONE` | ✅ | 완료 (Manager 승인) |
| `BLOCKED` | 🚫 | 차단됨 (사유 명시 필수) |
| `DEFERRED` | ⏸️ | 보류 (다음 스프린트 이후) |

---

## 2. Task 목록

### 2.1 전체 요약

| 상태 | 개수 |
|------|:----:|
| BACKLOG | 0 |
| READY | 0 |
| IN_SPRINT | 0 |
| IN_DEV | 0 |
| IN_REVIEW | 0 |
| IN_QA | 0 |
| DONE | 0 |
| BLOCKED | 0 |

---

### 2.2 Task 상세

> 아래 형식으로 각 Task를 정의한다.

---

#### TASK-001: [Task 제목]

| 항목 | 값 |
|------|-----|
| 상태 | 📋 BACKLOG |
| 우선순위 | P0 / P1 / P2 |
| 예상 규모 | S / M / L |
| 담당 | Backend / Frontend / Both |
| 스프린트 | - |
| 생성일 | YYYY-MM-DD |
| 완료일 | - |

**설명:**
[Task에 대한 상세 설명]

**수용 조건 (Acceptance Criteria):**
- [ ] 조건 1
- [ ] 조건 2
- [ ] 조건 3

**의존성:**
- 선행 Task: 없음 / TASK-XXX
- API 변경: 필요 / 불필요
- Breaking Change: 예 / 아니오

**관련 문서:**
- plan.md 섹션: X.X
- api.md 엔드포인트: `POST /xxx`

---

#### TASK-002: [Task 제목]

| 항목 | 값 |
|------|-----|
| 상태 | ✅ READY |
| 우선순위 | P1 |
| 예상 규모 | M |
| 담당 | Both |
| 스프린트 | - |
| 생성일 | YYYY-MM-DD |
| 완료일 | - |

**설명:**
[설명]

**수용 조건 (Acceptance Criteria):**
- [ ] 조건 1
- [ ] 조건 2

**의존성:**
- 선행 Task: TASK-001
- API 변경: 필요
- Breaking Change: 아니오

---

## 3. 완료된 Task (Archive)

> DONE 상태가 된 Task는 여기로 이동한다.

### Sprint 1 완료

(없음)

---

## 4. Task 작성 규칙

### 4.1 Task ID 규칙
- 형식: `TASK-XXX` (3자리 숫자)
- 순차 증가, 재사용 금지

### 4.2 우선순위 기준

| 우선순위 | 기준 |
|----------|------|
| P0 | 없으면 서비스 불가 (MVP 필수) |
| P1 | 1차 릴리즈에 포함되어야 함 |
| P2 | 있으면 좋음 (시간 되면) |

### 4.3 규모 기준

| 규모 | 기준 | 예상 시간 |
|------|------|----------|
| S | 단순 기능, API 1~2개 | 반나절 |
| M | 중간 복잡도, API 3~5개 | 1~2일 |
| L | 복잡한 기능, 다중 화면 | 3일+ |

### 4.4 수용 조건 작성 규칙
- 검증 가능한 형태로 작성
- "~할 수 있다", "~가 표시된다" 형식
- 모호한 표현 금지 ("잘 동작한다" ❌)

---

## 5. 상태 전환 규칙

```
BACKLOG → READY      : Planner가 요구사항 명확화 완료
READY → IN_SPRINT    : Manager가 스프린트에 배정
IN_SPRINT → IN_DEV   : 개발자가 작업 시작
IN_DEV → IN_REVIEW   : 개발자가 구현 완료
IN_REVIEW → IN_QA    : Reviewer가 PASS 판정
IN_REVIEW → IN_DEV   : Reviewer가 REJECT (수정 필요)
IN_QA → DONE         : QA PASS + Manager 승인
IN_QA → IN_DEV       : QA FAIL (수정 필요)
ANY → BLOCKED        : 차단 사유 발생
BLOCKED → 이전 상태   : 차단 해제
```

---

## 6. 변경 이력

| 날짜 | Task ID | 변경 내용 | 작성자 |
|------|---------|----------|--------|
| YYYY-MM-DD | TASK-001 | 생성 | Planner |
| YYYY-MM-DD | TASK-001 | BACKLOG → READY | Planner |
| YYYY-MM-DD | TASK-001 | READY → IN_SPRINT | Manager |
