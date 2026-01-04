# Rollback Rules (되돌림 규칙)

> 이 문서는 REJECT/FAIL 발생 시 되돌림 절차를 정의한다.
> Manager가 되돌림을 관리한다.

---

## 1. 되돌림 원칙

- REJECT/FAIL은 정상적인 피드백
- 되돌림은 품질 보장 과정
- 되돌림 시 원인 분석 필수
- 반복 되돌림 시 프로세스 점검

---

## 2. Reviewer REJECT 시 되돌림

### 2.1 REJECT 유형별 처리

| REJECT 유형 | 되돌림 대상 | Manager 개입 |
|-------------|------------|:------------:|
| 수용 조건 미충족 | Developer | 불필요 |
| project.md 규칙 위반 | Developer | 불필요 |
| 구조적 문제 | Architect | 필요 |
| 설계 수준 문제 | Architect | 필요 |

### 2.2 REJECT 처리 절차

```
Reviewer REJECT
    ↓
Task 상태: IN_REVIEW → IN_DEV
    ↓
review-report.md에 REJECT 사유 기록
    ↓
Developer가 수정
    ↓
Task 상태: IN_DEV → IN_REVIEW
    ↓
Reviewer 재리뷰
```

### 2.3 구조적 REJECT 시

```
Reviewer: 구조적 문제로 REJECT
    ↓
Manager에게 에스컬레이션
    ↓
Manager: Architect 재검토 결정
    ↓
C0acC6a9C790: project.md 또는 설계 수정
    ↓
Developer: 수정된 설계로 재구현
```

---

## 3. Reviewer REJECT 시 되돌림

### 3.1 FAIL 유형별 처리

| FAIL 유형 | 되돌림 대상 | 조치 |
|-----------|------------|------|
| 구현 누락 | Developer | 누락 기능 구현 |
| 버그 | Developer | 버그 수정 |
| 조건 모호 | Planner | 조건 명확화 |
| 기술적 불가 | Architect | 설계 재검토 |

### 3.2 FAIL 처리 절차

```
Reviewer REJECT
    ↓
Task 상태: IN_QA → IN_DEV
    ↓
review-report.md에 FAIL 사유 기록
    ↓
원인에 따라 담당자 결정
    ↓
수정 후 재리뷰 → 재QA
```

---

## 4. BLOCK 시 되돌림

### 4.1 BLOCK 상황

| 상황 | 처리 |
|------|------|
| 기술적 불가 | Architect 재검토 |
| 요구사항 불명확 | Planner 명확화 |
| 외부 의존성 | 대기 또는 우회 |

### 4.2 BLOCK 처리 절차

```
BLOCK 발생
    ↓
Task 상태 → BLOCKED
    ↓
Manager에게 에스컬레이션
    ↓
Manager: 원인 분석 및 대상 결정
    ↓
해당 역할이 문제 해결
    ↓
Task 상태 복원 → 재진행
```

---

## 5. 문서 수정 시 연쇄 영향

### 5.1 plan.md 수정 시

| 영향 | 조치 |
|------|------|
| 기존 Task 영향 | backlog.md 수용 조건 검토 |
| 새 기능 추가 | 새 Task 생성 |
| 기능 삭제 | 관련 Task 취소 검토 |

### 5.2 project.md 수정 시

| 영향 | 조치 |
|------|------|
| 기술 스택 변경 | 전체 코드 검토 필요 |
| 규칙 변경 | 영향받는 Task 재리뷰 |
| 구조 변경 | 영향받는 코드 수정 |

> ⚠️ project.md는 Frozen이므로 수정 시 Manager 승인 필수

### 5.3 연쇄 영향 흐름

```
상위 문서 수정
    ↓
영향받는 하위 문서 식별
    ↓
영향받는 Task 식별
    ↓
Task 상태에 따른 처리:
├── DONE → 재검증 필요 여부 판단
├── IN_QA/IN_REVIEW → 재검증
├── IN_DEV → 수정 반영
└── IN_SPRINT/READY → 문서만 갱신
```

---

## 6. 되돌림 제한 규칙

### 6.1 반복 되돌림

| 횟수 | 조치 |
|:----:|------|
| 1-2회 | 정상 피드백 |
| 3회 | Manager 개입, 원인 분석 |
| 4회+ | 프로세스/역량 점검 |

### 6.2 되돌림 제한

- 같은 사유로 3회 이상 되돌림 금지
- 3회 도달 시 근본 원인 해결 필수
- Manager가 되돌림 패턴 모니터링

---

## 7. 되돌림 기록 형식

### decision.md 기록

```markdown
## Rollback #[번호]

| 항목 | 값 |
|------|-----|
| 일시 | YYYY-MM-DD |
| Task | TASK-XXX |
| 유형 | REJECT / FAIL / BLOCK |
| 원인 | [원인] |

### 상세
- 문제: [문제 설명]
- 원인 분석: [원인]
- 되돌림 대상: [역할]
- 조치: [조치 내용]

### 재발 방지
- [방지 조치]
```

---

## 8. 되돌림 흐름 요약

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  REJECT / FAIL / BLOCK 발생                                     │
│         ↓                                                       │
│  원인 분석                                                      │
│         ↓                                                       │
│  되돌림 대상 결정                                               │
│  (Developer / Planner / Architect)                              │
│         ↓                                                       │
│  decision.md 기록                                               │
│         ↓                                                       │
│  수정 수행                                                      │
│         ↓                                                       │
│  재검증 (영향받는 단계부터)                                     │
│         ↓                                                       │
│  완료 또는 재되돌림                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
