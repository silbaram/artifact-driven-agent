# Backlog (Task 목록)

> 모든 Task의 단일 진실 (Single Source of Truth)
> Planner가 생성, Manager가 상태 관리

---

## 0. 문서 메타

| 항목 | 값 |
|------|-----|
| 총 Task 수 | N개 |
| READY | N개 |
| IN_SPRINT | N개 |
| DONE | N개 |
| 최종 갱신 | YYYY-MM-DD |

---

## 1. Task 상태 정의

| 상태 | 설명 | 다음 상태 |
|------|------|----------|
| BACKLOG | 정의됨, 상세화 필요 | READY |
| READY | 스프린트 투입 가능 | IN_SPRINT |
| IN_SPRINT | 현재 스프린트에 포함 | IN_DEV |
| IN_DEV | 개발 중 | IN_REVIEW |
| IN_REVIEW | 리뷰 중 | IN_QA, IN_DEV |
| IN_QA | QA 검증 중 | DONE, IN_DEV |
| DONE | 완료 | - |
| BLOCKED | 차단됨 | (해결 후 원래 상태) |
| DEFERRED | 보류/이월 | BACKLOG |

---

## 2. Task 목록

### TASK-001: [Task 이름]

| 항목 | 값 |
|------|-----|
| 상태 | BACKLOG |
| 우선순위 | P0 / P1 / P2 |
| 크기 | S / M / L |
| 출처 | F001 (plan.md 기능 ID) |
| 담당 | - |
| 의존성 | - |

**수용 조건 (Acceptance Criteria):**
- [ ] 조건 1
- [ ] 조건 2
- [ ] 조건 3

---

### TASK-002: [Task 이름]

| 항목 | 값 |
|------|-----|
| 상태 | BACKLOG |
| 우선순위 | P1 |
| 크기 | M |
| 출처 | F001 |
| 담당 | - |
| 의존성 | TASK-001 |

**수용 조건:**
- [ ] 조건 1
- [ ] 조건 2

---

### TASK-003: [Task 이름]

| 항목 | 값 |
|------|-----|
| 상태 | BACKLOG |
| 우선순위 | P1 |
| 크기 | S |
| 출처 | F002 |
| 담당 | - |
| 의존성 | - |

**수용 조건:**
- [ ] 조건 1
- [ ] 조건 2

---

## 3. 완료된 Task (Archive)

> DONE 상태 Task는 여기로 이동

### ~~TASK-000: [Task 이름]~~ ✅

| 항목 | 값 |
|------|-----|
| 상태 | DONE |
| 완료일 | YYYY-MM-DD |
| 스프린트 | Sprint 1 |

---

## 4. Task 작성 규칙

### 4.1 Task 분해 원칙

- 기능 1개 = Task 1개 이상
- Task는 독립적으로 완료 가능해야 함
- 의존성이 있으면 명시

### 4.2 크기 기준

| 크기 | 설명 | 예상 시간 |
|:----:|------|----------|
| S | 단순 구현 | 1-2시간 |
| M | 일반 기능 | 반나절 |
| L | 복합 기능 | 1일+ |

### 4.3 수용 조건 규칙

- 검증 가능해야 함 (테스트 가능)
- 구체적이어야 함 (모호함 금지)
- 완료 기준이 명확해야 함

---

## 5. 상태 전환 규칙

### 5.1 전환 권한

| 전환 | 권한 |
|------|------|
| BACKLOG → READY | Planner |
| READY → IN_SPRINT | Manager |
| IN_SPRINT → IN_DEV | Developer |
| IN_DEV → IN_REVIEW | Developer |
| IN_REVIEW → IN_QA | Reviewer (PASS 시) |
| IN_REVIEW → IN_DEV | Reviewer (REJECT 시) |
| IN_QA → DONE | Manager (PASS 후 승인) |
| IN_QA → IN_DEV | QA (FAIL 시) |
| * → BLOCKED | 누구나 (사유 명시) |
| * → DEFERRED | Manager |

### 5.2 역전환 규칙

- REJECT/FAIL 시에만 역전환 가능
- 역전환 시 사유 필수 기록

---

## 6. 변경 이력

| 날짜 | Task ID | 변경 내용 | 작성자 |
|------|---------|----------|--------|
| YYYY-MM-DD | TASK-001 | 생성 | Planner |
| YYYY-MM-DD | TASK-001 | BACKLOG → READY | Planner |
| YYYY-MM-DD | TASK-001 | READY → IN_SPRINT | Manager |
