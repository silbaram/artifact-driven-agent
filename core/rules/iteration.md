# Iteration Rules (스프린트/Task 단위 작업 규칙)

> 이 문서는 Task 단위 반복 개발의 규칙을 정의한다.
> 모든 역할이 이 규칙을 따른다.
> Manager가 스프린트를 관리한다.

---

## 1. 핵심 원칙

### 1.1 Task 단위 개발

```
❌ 잘못된 방식 (Waterfall)
전체 기획 → 전체 설계 → 전체 개발 → 전체 테스트

✅ 올바른 방식 (Iterative)
Task 1 완성 → Task 2 완성 → Task 3 완성 → ...
```

### 1.2 작업 범위 제한

- 각 역할은 **current-sprint.md에 정의된 Task만** 작업한다
- 스프린트 외 작업은 금지 (Manager 승인 없이)
- "김에" 작업 금지

### 1.3 완료의 정의

Task는 다음을 모두 충족해야 DONE:
- [ ] 수용 조건 100% 충족
- [ ] 구현 완료
- [ ] 문서 반영 완료
- [ ] Reviewer PASS
- [ ] QA PASS
- [ ] Manager 승인

---

## 2. 스프린트 라이프사이클

### 2.1 스프린트 시작

**트리거:** Manager가 스프린트 시작 선언

**절차:**
1. Manager가 backlog.md에서 READY 상태 Task 선택
2. 선택된 Task를 IN_SPRINT로 변경
3. current-sprint.md 생성/갱신
4. 스프린트 목표 정의
5. 역할별 작업 배정

**산출물:**
- current-sprint.md 갱신
- backlog.md 상태 갱신

### 2.2 스프린트 진행

**Task 상태 흐름:**
```
IN_SPRINT → IN_DEV → IN_REVIEW → IN_QA → DONE
               ↑          ↓          ↓
               └──────────┴──────────┘
                  (REJECT/FAIL 시)
```

**일일 확인 사항:**
- 각 Task 상태
- 차단 사항 (Blockers)
- 예상 완료 여부

### 2.3 스프린트 종료

**트리거:** 
- 모든 Task DONE, 또는
- 스프린트 종료일 도달

**절차:**
1. 완료/미완료 Task 정리
2. 미완료 Task 처리 결정 (이월/취소)
3. current-sprint.md 회고 작성
4. backlog.md 상태 갱신
5. 다음 스프린트 준비

---

## 3. 역할별 이터레이션 규칙

### 3.1 Planner

- 스프린트 중 새 요구사항 → backlog에 BACKLOG 상태로 추가
- 현재 스프린트의 Task 변경 금지 (Manager 승인 없이)
- 진행 중(IN_DEV+) Task의 수용 조건 변경 금지

### 3.2 Developer

- current-sprint.md의 내 Task만 작업
- Task 완료 후 다음 Task로 이동
- 스프린트 외 작업 금지
- 수용 조건 외 기능 추가 금지

### 3.3 Reviewer

- IN_REVIEW 상태 Task만 리뷰
- 해당 Task 범위 내 코드만 리뷰
- 스프린트 외 코드 리뷰 금지
- 수용 조건 외 요구 금지

### 3.4 QA

- IN_QA 상태 Task만 검증
- 해당 Task 수용 조건만 검증
- 스프린트 외 기능 검증 금지
- 수용 조건 외 기준으로 FAIL 금지

### 3.5 Manager

- 스프린트 시작/종료 결정
- Task 상태 전환 승인 (→ DONE)
- 긴급 Task 추가 승인
- 스프린트 범위 변경 승인

---

## 4. Task 단위 문서 갱신

### 4.1 갱신 시점

| 문서 | 갱신 시점 | 담당 |
|------|----------|------|
| backlog.md | Task 상태 변경 시 | 해당 역할 |
| current-sprint.md | 매일 / 상태 변경 시 | Manager |
| 인터페이스 문서 | Task 완료 시 | Developer |
| review-report.md | 리뷰 완료 시 | Reviewer |
| qa-report.md | QA 완료 시 | QA |
| decision.md | 판단 발생 시 | Manager |

### 4.2 Task 태그

문서 변경 시 관련 Task ID를 태그:

```markdown
## 변경 이력
| Task | 날짜 | 변경 내용 |
|------|------|----------|
| [TASK-001] | 2024-01-15 | 초기 구현 |
```

---

## 5. 예외 상황 처리

### 5.1 긴급 Task 추가

```
긴급 요청 발생
    ↓
Planner: backlog에 P0로 추가
    ↓
Manager: 긴급성 판단
    ├── 긴급 아님 → 다음 스프린트
    └── 긴급 맞음 ↓
        ↓
Manager: 현재 스프린트에 추가
    ↓
필요시 다른 Task 조정
    ↓
decision.md에 예외 기록
```

### 5.2 요구사항 변경

- 진행 중 Task: 현재 수용 조건으로 완료 후 새 Task 생성
- 미시작 Task: 수용 조건 수정 가능 (Manager 승인)

### 5.3 차단 (Blocker) 발생

```
차단 발생
    ↓
Task 상태 → BLOCKED
    ↓
Manager에게 즉시 보고
    ↓
해결 방안 결정
    ↓
해결 후 원래 상태로 복귀
```

---

## 6. 스프린트 체크리스트

### 스프린트 시작 체크리스트

- [ ] backlog.md에 READY Task 있음
- [ ] 스프린트 목표 정의됨
- [ ] current-sprint.md 생성됨
- [ ] Task 담당자 배정됨
- [ ] 의존성 확인됨

### 스프린트 종료 체크리스트

- [ ] 모든 Task 상태 확인
- [ ] 미완료 Task 처리 결정됨
- [ ] 회고 작성됨
- [ ] backlog.md 갱신됨
- [ ] 스프린트 히스토리 기록됨

---

## 7. 문서 참조 관계

```
backlog.md (전체 Task)
    │
    ├── current-sprint.md (현재 범위)
    │       │
    │       ├── 인터페이스 문서 (Task별 변경)
    │       └── 소스 코드
    │
    ├── plan.md (요구사항 출처)
    └── project.md (기술 기준)
```

---

## 8. 금지 사항 요약

| 역할 | 금지 사항 |
|------|----------|
| 전체 | 스프린트 외 작업 |
| 전체 | 수용 조건 외 기능 추가 |
| Developer | "김에" 리팩토링 |
| Reviewer | 스프린트 외 코드 리뷰 |
| QA | 스프린트 외 기능 검증 |
| Planner | 진행 중 Task 변경 |
