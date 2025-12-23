# API Change Rules (API 계약 변경 규칙)

> 이 문서는 api.md 변경 시 따라야 할 절차를 정의한다.
> API는 Backend와 Frontend의 계약이므로 일방적 변경은 금지된다.

---

## 1. API 변경 원칙

- api.md는 **Backend와 Frontend의 공식 계약**이다
- 변경은 **양측 합의** 후에만 가능하다
- **Breaking change는 Manager 승인** 필수
- 모든 변경은 **문서에 기록**한다

---

## 2. 변경 유형 분류

### 2.1 Non-Breaking Change (하위 호환)

| 유형 | 예시 | 승인 필요 |
|------|------|----------|
| 새 엔드포인트 추가 | POST /api/v1/new-feature | Frontend 통보 |
| 응답에 새 필드 추가 (optional) | 기존 응답 + new_field | Frontend 통보 |
| 새 에러 코드 추가 | ERROR_NEW_CASE | Frontend 통보 |
| 요청에 optional 파라미터 추가 | ?new_param=value | Frontend 통보 |

### 2.2 Breaking Change (하위 비호환)

| 유형 | 예시 | 승인 필요 |
|------|------|----------|
| 엔드포인트 삭제/변경 | DELETE /api/v1/old → /api/v2/new | Manager 필수 |
| 필수 필드 추가 | 요청에 required 필드 추가 | Manager 필수 |
| 필드 삭제 | 응답에서 기존 필드 제거 | Manager 필수 |
| 필드 타입 변경 | string → number | Manager 필수 |
| 에러 코드 변경/삭제 | ERROR_OLD → ERROR_NEW | Manager 필수 |
| 인증 방식 변경 | Bearer → Cookie | Manager 필수 |

---

## 3. 변경 절차

### 3.1 Non-Breaking Change

```
Backend 변경 필요 발견
    ↓
api.md에 [PROPOSED] 태그로 변경 내용 추가
    ↓
Frontend에 통보 (동기화 필요 여부 확인)
    ↓
Frontend 확인 (48시간 내)
    ├── 이의 없음 → [PROPOSED] 제거, 확정
    └── 이의 있음 → 협의 후 조정
    ↓
api.md 갱신
    ↓
구현 진행
```

### 3.2 Breaking Change

```
Breaking Change 필요 발견
    ↓
Manager에게 에스컬레이션
    ↓
┌─────────────────────────────────────────────────┐
│ 에스컬레이션 내용                                │
├─────────────────────────────────────────────────┤
│ - 변경 사유                                      │
│ - 영향 범위 (어떤 화면/기능에 영향)               │
│ - 대안 검토 여부                                 │
│ - 마이그레이션 계획 (필요 시)                     │
└─────────────────────────────────────────────────┘
    ↓
Manager 판단
    ├── 승인 → 변경 진행
    ├── 거부 → 대안 모색
    └── 보류 → 추가 검토
    ↓
승인 시:
    ↓
api.md에 [BREAKING] 태그로 변경 내용 추가
    ↓
Backend + Frontend 동시 작업 계획
    ↓
구현 및 테스트
    ↓
api.md 갱신 ([BREAKING] 제거)
```

---

## 4. 변경 요청 형식

### 4.1 api.md 내 제안 표기

```markdown
## Endpoints

### [PROPOSED] POST /api/v1/new-feature
> 제안일: 2025-01-15
> 제안자: Backend
> 사유: plan.md 기능 추가 반영

**Request**
...

**Response**
...
```

### 4.2 Breaking Change 표기

```markdown
### [BREAKING] POST /api/v1/users (변경)
> 제안일: 2025-01-15
> 승인일: 2025-01-16
> 승인자: Manager
> 사유: 인증 체계 변경

**변경 전**
- Request: { name: string }

**변경 후**
- Request: { name: string, email: string (required) }

**마이그레이션**
- Frontend: 로그인 폼에 email 필드 추가 필요
- 배포 순서: Backend 먼저 → Frontend
```

---

## 5. 역할별 책임

### Backend
- API 설계 및 api.md 초안 작성
- 변경 필요 시 [PROPOSED] 태그로 제안
- Breaking change 발견 시 Manager 에스컬레이션
- 변경 확정 후 구현

### Frontend
- api.md 기준으로 구현
- 변경 제안 검토 및 피드백 (48시간 내)
- Breaking change 영향 범위 분석
- 변경 확정 후 화면 수정

### Manager
- Breaking change 승인/거부
- 변경 영향 범위 최종 판단
- 배포 순서 결정
- decision.md에 기록

---

## 6. 버전 관리

### 6.1 API 버전 전략

```
/api/v1/...  ← 현재 버전
/api/v2/...  ← Breaking change 시 새 버전
```

### 6.2 버전 전환 규칙

| 상황 | 전략 |
|------|------|
| Minor 변경 (하위 호환) | 같은 버전 유지 |
| Breaking change (단일) | 엔드포인트만 v2 |
| Breaking change (대규모) | 전체 API v2 전환 |
| 레거시 지원 필요 | v1, v2 병행 운영 (기간 명시) |

---

## 7. 긴급 변경

### 7.1 긴급 변경 조건
- 프로덕션 장애 대응
- 보안 취약점 수정
- 법적 요구사항 대응

### 7.2 긴급 변경 절차

```
긴급 상황 발생
    ↓
Manager 즉시 보고
    ↓
Manager 긴급 승인 (구두 가능)
    ↓
변경 구현 (Backend + Frontend 동시)
    ↓
api.md 사후 갱신
    ↓
decision.md에 긴급 변경 기록
```

---

## 8. 금지 사항

- ❌ api.md 없이 API 구현 변경
- ❌ Frontend 통보 없이 응답 구조 변경
- ❌ Manager 승인 없이 Breaking change
- ❌ [PROPOSED] 상태에서 구현 배포
- ❌ 버전 없이 Breaking change 적용

---

## 9. 체크리스트

### API 변경 전 체크리스트

- [ ] 변경 유형 분류 (Breaking / Non-Breaking)
- [ ] api.md에 [PROPOSED] 또는 [BREAKING] 추가
- [ ] 영향받는 화면/기능 목록 작성
- [ ] Frontend 통보 완료
- [ ] (Breaking인 경우) Manager 승인 완료
- [ ] 마이그레이션 계획 수립 (필요 시)

### API 변경 후 체크리스트

- [ ] api.md 갱신 ([PROPOSED]/[BREAKING] 제거)
- [ ] 변경 이력 기록
- [ ] Frontend 구현 완료 확인
- [ ] 테스트 완료
