# Iteration Rules (애자일 워크플로우)

> 이 문서는 Task 단위 반복 개발의 규칙을 정의한다.
> - 모든 역할이 이 규칙을 따른다.
> - Manager가 스프린트를 관리한다.

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
- "ついでに(ついでに)" 작업 금지

### 1.3 완료의 정의

Task는 다음을 모두 충족해야 DONE:
- [ ] 수용 조건 100% 충족
- [ ] 코드 구현 완료
- [ ] api.md / ui.md 반영 완료
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
                ↑         │         │
                └─────────┴─────────┘
                    (수정 필요 시)
```

**역할별 작업:**
| 역할 | 작업 | 상태 전환 |
|------|------|----------|
| Backend/Frontend | 구현 | IN_DEV → IN_REVIEW |
| Reviewer | 리뷰 | IN_REVIEW → IN_QA 또는 IN_DEV |
| QA | 검증 | IN_QA → DONE 또는 IN_DEV |
| Manager | 승인 | 최종 DONE 확정 |

### 2.3 스프린트 종료

**트리거:** 
- 모든 Task DONE, 또는
- 스프린트 종료일 도달

**절차:**
1. Manager가 current-sprint.md 회고 섹션 작성
2. 미완료 Task 처리 결정 (이월/취소)
3. backlog.md 갱신
4. 다음 스프린트 준비

---

## 3. 역할별 이터레이션 규칙

### 3.1 Planner

**스프린트 중 역할:**
- 신규 요구사항 → backlog.md에 추가 (BACKLOG 상태)
- 진행 중 Task 변경 요청 → Manager 에스컬레이션
- 요구사항 명확화 요청 시 지원

**금지:**
- ❌ 진행 중 Task의 수용 조건 변경
- ❌ 스프린트 범위 임의 확대

### 3.2 Architect

**스프린트 중 역할:**
- 기술적 질문 지원
- 아키텍처 결정 필요 시 자문
- Breaking change 영향도 분석

**금지:**
- ❌ project.md 임의 변경
- ❌ 스프린트 외 기술 결정

### 3.3 Backend / Frontend

**스프린트 중 역할:**
- current-sprint.md의 Task만 구현
- Task별 api.md / ui.md 갱신
- 완료 시 IN_REVIEW로 상태 변경

**필수 확인:**
```
작업 시작 전:
1. current-sprint.md 확인 → 내 Task 확인
2. backlog.md 확인 → 수용 조건 확인
3. 의존성 확인 → 선행 Task 완료 여부
```

**금지:**
- ❌ 스프린트에 없는 기능 구현
- ❌ "ついでに" 리팩토링
- ❌ 수용 조건 외 기능 추가

### 3.4 Reviewer

**스프린트 중 역할:**
- IN_REVIEW 상태 Task만 리뷰
- Task 단위로 리뷰 (전체 코드 X)
- 수용 조건 기준으로 검토

**리뷰 범위:**
```
✅ 리뷰 대상:
- 해당 Task 관련 코드만
- 해당 Task의 api.md/ui.md 변경분

❌ 리뷰 대상 아님:
- 다른 Task 코드
- 스프린트 외 개선사항
```

### 3.5 QA

**스프린트 중 역할:**
- IN_QA 상태 Task만 검증
- 수용 조건 체크리스트로 검증
- Task 단위로 PASS/FAIL 판정

**검증 범위:**
```
✅ 검증 대상:
- 해당 Task의 수용 조건만
- 해당 Task 관련 화면/API만

❌ 검증 대상 아님:
- 다른 Task 기능
- 전체 회귀 테스트 (별도 진행)
```

### 3.6 Manager

**스프린트 중 역할:**
- 스프린트 시작/종료 관리
- Task 상태 최종 승인
- 차단 사항 해결
- 범위 변경 결정

**권한:**
- Task 상태 강제 변경
- 스프린트 범위 조정
- 긴급 Task 추가/제거

---

## 4. Task 단위 문서 갱신

### 4.1 api.md 갱신 시점

| 시점 | 작업 | 담당 |
|------|------|------|
| IN_DEV 시작 | [PROPOSED] 태그로 추가 | Backend |
| IN_REVIEW 통과 | [PROPOSED] 제거 | Backend |
| IN_QA 통과 | 상태 "✅ 완료"로 변경 | Backend |

### 4.2 ui.md 갱신 시점

| 시점 | 작업 | 담당 |
|------|------|------|
| IN_DEV 시작 | 화면 구조 추가 | Frontend |
| IN_REVIEW 통과 | 최종 확정 | Frontend |

### 4.3 backlog.md 갱신 시점

| 시점 | 작업 | 담당 |
|------|------|------|
| 신규 요구사항 | Task 추가 (BACKLOG) | Planner |
| 요구사항 명확화 | BACKLOG → READY | Planner |
| 스프린트 배정 | READY → IN_SPRINT | Manager |
| 상태 변경 | 각 상태 전환 | 해당 역할 |
| 완료 | DONE + Archive 이동 | Manager |

---

## 5. 예외 상황 처리

### 5.1 스프린트 중 신규 긴급 Task

```
발견 → Manager에게 보고 → 긴급도 판단
    ↓
긴급 (P0): 현재 스프린트에 추가
일반 (P1+): backlog에 추가, 다음 스프린트
```

### 5.2 Task 수용 조건 변경 필요

```
변경 요청 → Manager 승인 → backlog.md 갱신
    ↓
변경 범위가 크면:
- Task 분할 검토
- 스프린트 범위 재조정
```

### 5.3 Task 차단 발생

```
차단 발견 → BLOCKED 상태로 변경 → 차단 사유 기록
    ↓
Manager가 해결책 결정:
- 다른 Task 먼저 진행
- 차단 해제 작업 우선
- 스프린트에서 제외
```

### 5.4 스프린트 목표 달성 불가 예상

```
예상 시점 → Manager에게 즉시 보고
    ↓
Manager 결정:
- 범위 축소 (일부 Task 이월)
- 기간 연장 (예외적)
- 리소스 조정
```

---

## 6. 스프린트 체크리스트

### 6.1 스프린트 시작 체크리스트 (Manager)

- [ ] backlog.md에서 READY Task 선택
- [ ] Task 우선순위/의존성 확인
- [ ] 스프린트 목표 정의
- [ ] current-sprint.md 갱신
- [ ] 역할별 작업 배정
- [ ] 킥오프 (사용자에게 안내)

### 6.2 스프린트 종료 체크리스트 (Manager)

- [ ] 모든 DONE Task 확인
- [ ] 미완료 Task 처리 결정
- [ ] current-sprint.md 회고 작성
- [ ] backlog.md 정리 (Archive 이동)
- [ ] 다음 스프린트 준비

### 6.3 Task 완료 체크리스트 (공통)

- [ ] 수용 조건 100% 충족
- [ ] 관련 문서 갱신 완료
- [ ] Reviewer PASS
- [ ] QA PASS
- [ ] Manager 최종 승인

---

## 7. 문서 참조 관계

```
backlog.md (전체 Task 목록)
    │
    ├── current-sprint.md (현재 작업 범위)
    │       │
    │       ├── api.md (Task별 API 변경)
    │       ├── ui.md (Task별 화면 변경)
    │       └── 소스 코드
    │
    ├── plan.md (요구사항 원본)
    └── project.md (기술 기준)
```

---

## 8. 금지 사항 요약

| 역할 | 금지 사항 |
|------|----------|
| 전체 | 스프린트 외 작업 |
| 전체 | 수용 조건 외 기능 추가 |
| 개발자 | "ついでに" 리팩토링 |
| Reviewer | 스프린트 외 코드 리뷰 |
| QA | 스프린트 외 기능 검증 |
| Planner | 진행 중 Task 변경 |
