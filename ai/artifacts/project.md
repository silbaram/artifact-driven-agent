# Project Spec (Frozen for Development)

> 이 문서는 프로젝트의 최종 아키텍처 및 개발 기준이다.
> 백엔드/프론트엔드/QA 에이전트는 반드시 이 문서를 기준으로 작업한다.
> 이 문서가 확정(Frozen)되기 전까지 개발을 시작해서는 안 된다.

---

## 0. 프로젝트 규모 정의 (Mandatory)

- 예측 규모: S / M / L
- 규모 산정 근거 요약:
- 이 규모를 기준으로 모든 설계/구현을 진행한다
- 규모 변경 시 본 문서는 재작성된다

---

## 1. 선택 요약 (Decision Summary)

- 선택한 아키텍처 옵션: (A / B / C + 커스터마이징)
- 선택 이유 (Trade-off):
- MVP 범위 요약:

---

## 2. 기술 스택 (Frozen)

### Backend
- Language:
- Framework:
- Build Tool:
- Runtime:
- API Style:
- Serialization:
- Validation:
- Authentication (있다면):
- Database:
- Migration Tool:
- Cache (있다면):
- Messaging/Event (있다면):

### Frontend
- Framework:
- State Management:
- Build Tool:
- API Client 규칙:

---

## 3. 소프트웨어 아키텍처 규칙

> 백엔드/프론트 모두 적용

- 레이어 구조 규칙:
- 도메인 모델링 규칙:
- DTO 규칙:
- Error 모델/코드 규칙:
- 트랜잭션 경계 규칙:
- 동시성/멱등성 정책(해당 시):

---

## 4. 인프라 구성 (Logical)

- DB 구성:
- Cache 구성:
- Messaging 구성:
- 배포 방식:
- 네트워크/보안(개요):

---

## 5. 운영 및 관측성

- Logging:
- Metrics:
- Tracing:
- 알람 최소 기준:

---

## 6. 개발 및 품질 기준

- 테스트 최소 기준 (unit/integration/e2e):
- 코드 포맷/린트:
- 브랜치/PR 규칙:
- CI/CD 개요:

---

## 7. 제약 및 금지 사항 (Enforcement)

- 본 문서에 없는 기술 도입 금지
- 스택 변경은 관리자 승인 필수
- 인프라 추가는 재설계 절차 필요
- 임의 최적화/확장 금지

---

## 8. 변경 이력

| 버전 | 날짜       | 변경 내용 | 승인    |
| ---- | ---------- | --------- | ------- |
| v1.0 | YYYY-MM-DD | 초기 확정 | Manager |
