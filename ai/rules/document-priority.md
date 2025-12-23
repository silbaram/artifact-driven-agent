# Document Priority Rules (문서 우선순위 규칙)

> 이 문서는 산출물 간 충돌 시 어떤 문서가 우선하는지 정의한다.
> 모든 역할은 판단 시 이 우선순위를 따른다.

---

## 1. 문서 우선순위 (높은 순)

```
1. decision.md        (Manager 판단) ─────── 최우선
2. project.md         (Frozen 상태일 때) ─── 기술 기준
3. plan.md            (기획 기준) ────────── 요구사항 기준
4. api.md             (API 계약) ─────────── 구현 계약
5. architecture-options.md ────────────────── 참고용 (확정 전)
6. ui.md              (프론트 명세) ───────── 구현 결과
7. review-report.md   (리뷰 결과) ─────────── 검증 결과
8. qa-report.md       (QA 결과) ──────────── 검증 결과
```

---

## 2. 충돌 해결 규칙

### 2.1 기본 원칙

- **상위 문서가 하위 문서보다 우선**한다
- 충돌 발견 시 **하위 문서를 수정**한다
- 상위 문서 수정이 필요하면 **Manager 승인** 필요

### 2.2 충돌 유형별 처리

| 충돌 상황 | 우선 문서 | 수정 대상 | 담당 |
|----------|----------|----------|------|
| plan.md ↔ api.md | plan.md | api.md | Backend |
| plan.md ↔ ui.md | plan.md | ui.md | Frontend |
| project.md ↔ api.md | project.md | api.md | Backend |
| project.md ↔ ui.md | project.md | ui.md | Frontend |
| api.md ↔ ui.md | api.md | ui.md | Frontend |
| decision.md ↔ 모든 문서 | decision.md | 해당 문서 | 해당 역할 |

### 2.3 예외 상황

| 상황 | 처리 방법 |
|------|----------|
| 상위 문서가 명백히 잘못된 경우 | Manager에게 에스컬레이션 후 상위 문서 수정 |
| 두 문서 모두 유효하지만 해석이 다른 경우 | Manager가 해석 확정 → decision.md 기록 |
| Frozen 문서 수정이 필요한 경우 | Manager 승인 → 새 버전 생성 |

---

## 3. 문서별 수정 권한

### 3.1 수정 권한 매트릭스

| 문서 | 생성 권한 | 수정 권한 | 승인 필요 |
|------|----------|----------|----------|
| plan.md | Planner | Planner | 확정 후 수정 시 Manager |
| architecture-options.md | Architect | Architect | - |
| project.md | Architect | Manager만 | 항상 Manager |
| api.md | Backend | Backend | Breaking change 시 Manager |
| ui.md | Frontend | Frontend | - |
| review-report.md | Reviewer | Reviewer | - |
| qa-report.md | QA | QA | - |
| decision.md | Manager | Manager | - |

### 3.2 Frozen 문서 규칙

project.md가 Frozen 상태일 때:
- **수정 금지** (원칙)
- 수정 필요 시 **Manager 승인 필수**
- 승인 시 **새 버전으로 생성** (v1.0 → v1.1)
- 변경 이력에 **사유와 승인자 기록**

---

## 4. 문서 참조 규칙

### 4.1 역할별 필수 참조 문서

| 역할 | 필수 참조 (읽기) | 생성/수정 대상 |
|------|-----------------|---------------|
| Planner | - | plan.md |
| Architect | plan.md | architecture-options.md, project.md |
| Backend | plan.md, project.md | api.md |
| Frontend | plan.md, project.md, api.md | ui.md |
| Reviewer | project.md, api.md | review-report.md |
| QA | plan.md, project.md, api.md, ui.md | qa-report.md |
| Manager | 모든 문서 | decision.md |

### 4.2 참조 순서

```
작업 시작
    ↓
decision.md 확인 (최근 판단 사항)
    ↓
상위 문서부터 순서대로 확인
    ↓
작업 수행
    ↓
하위 문서 생성/수정
```

---

## 5. 문서 상태 정의

### 5.1 문서 상태 유형

| 상태 | 설명 | 수정 가능 |
|------|------|----------|
| Draft | 작성 중 | 자유롭게 수정 가능 |
| Review | 검토 중 | 피드백 반영만 가능 |
| Confirmed | 확정됨 | Manager 승인 시 수정 |
| Frozen | 고정됨 | 새 버전 생성만 가능 |
| Deprecated | 폐기됨 | 수정 불가 (참고용) |

### 5.2 상태 전이 규칙

```
Draft → Review → Confirmed → Frozen
                     ↓
                 Deprecated
```

| 전이 | 조건 | 승인자 |
|------|------|--------|
| Draft → Review | 작성 완료 | 작성 역할 |
| Review → Confirmed | 검토 완료 | 해당 단계 역할 |
| Confirmed → Frozen | 개발 단계 진입 | Manager |
| Frozen → (새 버전) | 변경 필요 | Manager |
| * → Deprecated | 더 이상 유효하지 않음 | Manager |

---

## 6. 버전 관리 규칙

### 6.1 버전 표기

- Major.Minor 형식 사용 (예: v1.0, v1.1, v2.0)
- **Major 증가**: 구조/범위 변경
- **Minor 증가**: 내용 수정/보완

### 6.2 버전 이력 관리

각 문서 하단에 변경 이력 섹션 유지:

```markdown
## 변경 이력

| 버전 | 날짜 | 변경 내용 | 승인 |
|------|------|----------|------|
| v1.0 | 2025-01-15 | 초기 확정 | Manager |
| v1.1 | 2025-01-20 | 기능 X 추가 | Manager |
```

---

## 7. 충돌 감지 및 보고

### 7.1 충돌 감지 책임

| 역할 | 감지 대상 |
|------|----------|
| Backend | api.md ↔ plan.md, api.md ↔ project.md |
| Frontend | ui.md ↔ plan.md, ui.md ↔ api.md |
| Reviewer | 구현 ↔ project.md, 구현 ↔ api.md |
| QA | 구현 ↔ plan.md |
| Manager | 모든 문서 간 충돌 |

### 7.2 충돌 보고 형식

```markdown
## Document Conflict Report

- Date: YYYY-MM-DD
- Reporter: [역할]
- Documents: [문서1] ↔ [문서2]

### Conflict Description
[충돌 내용 설명]

### Document 1 Says
[문서1 내용 인용]

### Document 2 Says
[문서2 내용 인용]

### Suggested Resolution
[해결 제안 - 우선순위 규칙 기반]
```

---

## 8. 빠른 참조 표

### 문서 충돌 시 빠른 판단

```
Q: 어떤 문서가 맞나요?

decision.md에 관련 내용 있음?
├── Yes → decision.md 따름
└── No ↓

project.md (Frozen)와 충돌?
├── Yes → project.md 따름 (또는 Manager 에스컬레이션)
└── No ↓

plan.md와 충돌?
├── Yes → plan.md 따름
└── No ↓

api.md와 충돌?
├── Yes → api.md 따름
└── No → 하위 문서 기준으로 판단
```
