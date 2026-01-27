# Document Priority Rules (문서 우선순위 규칙)

> 이 문서는 문서 간 충돌 시 우선순위를 정의한다.
> 모든 역할이 이 규칙을 따른다.

---

## 1. 문서 우선순위 (높은 순)

```
1. decision.md                          (사용자/팀 판단) ───── 최우선
2. project.md                           (Frozen 상태) ───────── 기술 기준
3. plan.md                              (기획 기준) ─────────── 요구사항 기준
4. backlog/task-NNN.md                  (Task 정의) ─────────── 수용 조건
5. 인터페이스 문서                       ─────────────────────── 구현 계약
6. sprints/sprint-N/meta.md             ─────────────────────── 현재 범위
7. sprints/sprint-N/review-reports/*.md ─────────────────────── 리뷰 결과
```

---

## 2. 충돌 해결 규칙

### 2.1 상위 문서 우선

- 충돌 시 **상위 문서가 정답**
- 하위 문서를 상위에 맞게 수정
- 수정 불가 시 사용자에게 질문

### 2.2 충돌 유형별 처리

| 충돌 | 우선 | 조치 |
|------|------|------|
| decision.md ↔ 모든 문서 | decision.md | 다른 문서 수정 |
| project.md ↔ plan.md | project.md | plan.md 조정 또는 사용자 질문 |
| plan.md ↔ Task 파일 | plan.md | Task 파일 수정 |
| Task 파일 ↔ 인터페이스 | Task 파일 | 인터페이스 수정 |

### 2.3 예외 상황

| 상황 | 처리 |
|------|------|
| 상위 문서가 오류 | 사용자에게 보고 |
| 양쪽 모두 합리적 | 사용자 판단 요청 |
| 해석 차이 | 사용자에게 명확화 요청 |

---

## 3. 문서별 수정 권한

| 문서 | 작성 | 수정 | 승인 |
|------|------|------|------|
| decision.md | 사용자/팀 | 사용자/팀 | - |
| project.md | 사용자/팀 | 금지 (RFC 필요) | 사용자 |
| plan.md | Planner | Planner | 사용자 |
| backlog/task-NNN.md | Planner | Planner/Developer | - |
| 인터페이스 문서 | Developer | Developer | - |
| sprints/sprint-N/meta.md | 자동 생성 | 사용자 (CLI) | - |
| review-reports/task-NNN.md | Reviewer | Reviewer | - |

---

## 4. 문서 참조 규칙

### 4.1 역할별 필수 참조

| 역할 | 필수 참조 |
|------|----------|
| Planner | (이전 plan.md) |
| Developer | plan.md, project.md (있으면), sprints/sprint-N/meta.md, tasks/task-NNN.md |
| Reviewer | plan.md, project.md (있으면), tasks/task-NNN.md |
| Documenter | plan.md, sprints/sprint-N/meta.md, tasks/*.md |

### 4.2 참조 순서

작업 시작 시:
1. decision.md 확인 (사용자 판단 기록)
2. sprints/sprint-N/meta.md 확인 (현재 스프린트)
3. 관련 Task 파일 확인
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
- 리뷰 중 기준 확인 시

### 7.2 충돌 보고 형식

Task 파일에 이슈로 기록하거나 사용자에게 직접 질문:

```markdown
## 이슈: 문서 충돌 발견

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

→ 사용자 승인 대기
```

---

## 8. 빠른 참조 표

### 문서 간 관계

```
decision.md
    ↓ (최우선)
project.md ←── Frozen (선택)
    ↓
plan.md
    ↓
backlog/task-NNN.md
    ↓
sprints/sprint-N/meta.md ←→ 인터페이스 문서
    ↓
sprints/sprint-N/tasks/task-NNN.md
    ↓
sprints/sprint-N/review-reports/task-NNN.md
```

### 충돌 시 판단 흐름

```
충돌 발생
    ↓
decision.md에 관련 판단 있음?
├── Yes → decision.md 따름
└── No ↓

project.md와 충돌?
├── Yes → project.md 따름 (있으면)
└── No ↓

plan.md와 충돌?
├── Yes → plan.md 따름
└── No ↓

Task 파일과 충돌?
├── Yes → Task 파일 따름
└── No → 하위 문서 기준으로 판단
```

