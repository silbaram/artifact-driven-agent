# Document Priority Rules (문서 우선순위 규칙)

> 이 문서는 문서 간 충돌 시 우선순위를 정의한다.
> 모든 역할이 이 규칙을 따른다.

---

## 1. 문서 우선순위 (높은 순)

```
1. decision.md        (Manager 판단) ─────── 최우선
2. project.md         (Frozen 상태) ──────── 기술 기준
3. plan.md            (기획 기준) ─────────── 요구사항 기준
4. backlog.md         (Task 정의) ─────────── 수용 조건
5. 인터페이스 문서    ────────────────────── 구현 계약
6. current-sprint.md  ────────────────────── 현재 범위
7. architecture-options.md ────────────────── 참고용
8. review/qa-report.md ───────────────────── 결과물
```

---

## 2. 충돌 해결 규칙

### 2.1 상위 문서 우선

- 충돌 시 **상위 문서가 정답**
- 하위 문서를 상위에 맞게 수정
- 수정 불가 시 Manager 에스컬레이션

### 2.2 충돌 유형별 처리

| 충돌 | 우선 | 조치 |
|------|------|------|
| decision.md ↔ 모든 문서 | decision.md | 다른 문서 수정 |
| project.md ↔ plan.md | project.md | plan.md 조정 또는 에스컬레이션 |
| plan.md ↔ backlog.md | plan.md | backlog.md 수정 |
| backlog.md ↔ 인터페이스 | backlog.md | 인터페이스 수정 |

### 2.3 예외 상황

| 상황 | 처리 |
|------|------|
| 상위 문서가 오류 | Manager 에스컬레이션 |
| 양쪽 모두 합리적 | Manager 판단 |
| 해석 차이 | 역할 간 협의 후 Manager 확인 |

---

## 3. 문서별 수정 권한

| 문서 | 작성 | 수정 | 승인 |
|------|------|------|------|
| decision.md | Manager | Manager | - |
| project.md | Architect | 금지 | Manager |
| plan.md | Planner | Planner | Manager |
| backlog.md | Planner | Planner/Manager | - |
| 인터페이스 문서 | Developer | Developer | - |
| current-sprint.md | Manager | Manager | - |
| review-report.md | Reviewer | Reviewer | - |
| qa-report.md | QA | QA | - |

---

## 4. 문서 참조 규칙

### 4.1 역할별 필수 참조

| 역할 | 필수 참조 |
|------|----------|
| Planner | (이전 plan.md) |
| Architect | plan.md |
| Developer | plan.md, project.md, backlog.md, current-sprint.md |
| Reviewer | plan.md, project.md, backlog.md |
| QA | plan.md, backlog.md |
| Manager | 전체 |

### 4.2 참조 순서

작업 시작 시:
1. decision.md 확인 (Manager 지시사항)
2. current-sprint.md 확인 (현재 작업)
3. 관련 상위 문서 확인
4. 작업 수행

---

## 5. 문서 상태 정의

| 상태 | 설명 | 수정 가능 |
|------|------|:--------:|
| Draft | 작성 중 | ✅ |
| Review | 검토 중 | ⚠️ 제한적 |
| Confirmed | 확정됨 | ⚠️ 승인 필요 |
| Frozen | 동결됨 | ❌ |

### 상태 전환

```
Draft → Review → Confirmed → (Frozen)
  ↑        ↓
  └────────┘ (수정 필요 시)
```

---

## 6. 버전 관리 규칙

### 6.1 버전 형식

```
v[Major].[Minor]

예: v1.0, v1.1, v2.0
```

### 6.2 버전 증가 기준

| 변경 | 버전 |
|------|------|
| 오타/서식 수정 | 변경 없음 |
| 내용 추가/수정 | Minor +1 |
| 구조 변경 | Major +1 |

---

## 7. 충돌 감지 및 보고

### 7.1 충돌 감지 시점

- 작업 시작 전 문서 확인 시
- 작업 중 참조 문서 확인 시
- 리뷰/QA 중 기준 확인 시

### 7.2 충돌 보고 형식

```markdown
## Document Conflict Report

- 발견자: [역할]
- 일시: YYYY-MM-DD

### 충돌 내용
- 문서 A: [문서명] - [내용]
- 문서 B: [문서명] - [내용]

### 충돌 유형
- [ ] 해석 차이
- [ ] 명시적 불일치
- [ ] 누락

### 제안
[해결 제안]
```

---

## 8. 빠른 참조 표

### 문서 간 관계

```
decision.md
    ↓ (최우선)
project.md ←── Frozen
    ↓
plan.md
    ↓
backlog.md
    ↓
current-sprint.md ←→ 인터페이스 문서
    ↓
review-report.md / qa-report.md
```

### 충돌 시 판단 흐름

```
충돌 발생
    ↓
decision.md에 관련 판단 있음?
├── Yes → decision.md 따름
└── No ↓

project.md와 충돌?
├── Yes → project.md 따름
└── No ↓

plan.md와 충돌?
├── Yes → plan.md 따름
└── No ↓

backlog.md와 충돌?
├── Yes → backlog.md 따름
└── No → 하위 문서 기준으로 판단
```
