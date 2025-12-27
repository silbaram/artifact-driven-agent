# API Change Rules (API 변경 규칙)

> 이 문서는 api.md 변경 시 따라야 할 절차를 정의한다.
> API는 Backend와 Frontend의 계약이므로 일방적 변경은 금지된다.

---

## 1. API 변경 원칙

- api.md는 **Backend와 Frontend의 공식 계약**
- 변경은 **양측 합의** 후에만 가능
- **Breaking change는 Manager 승인** 필수
- 모든 변경은 **문서에 기록**

---

## 2. 변경 유형 분류

### 2.1 Non-Breaking Change (하위 호환)

| 유형 | 예시 | 승인 |
|------|------|------|
| 새 엔드포인트 추가 | POST /api/v1/new | Frontend 통보 |
| 응답에 optional 필드 추가 | 기존 + new_field | Frontend 통보 |
| 새 에러 코드 추가 | ERROR_NEW | Frontend 통보 |
| 요청에 optional 파라미터 | ?new_param=value | Frontend 통보 |

### 2.2 Breaking Change (하위 비호환)

| 유형 | 예시 | 승인 |
|------|------|------|
| 엔드포인트 삭제/변경 | /v1/old → /v2/new | Manager 필수 |
| 필수 필드 추가 | required 필드 | Manager 필수 |
| 필드 삭제 | 기존 필드 제거 | Manager 필수 |
| 필드 타입 변경 | string → number | Manager 필수 |
| 에러 코드 변경/삭제 | 기존 코드 변경 | Manager 필수 |

---

## 3. 변경 절차

### 3.1 Non-Breaking Change

```
Backend 변경 필요 발견
    ↓
api.md에 [PROPOSED] 태그로 추가
    ↓
Frontend에 통보
    ↓
Frontend 확인 (48시간 내)
    ├── 이의 없음 → [PROPOSED] 제거, 확정
    └── 이의 있음 → 협의 후 조정
    ↓
api.md 갱신 → 구현 진행
```

### 3.2 Breaking Change

```
Breaking Change 필요 발견
    ↓
Manager에게 에스컬레이션
    ↓
api.md에 [BREAKING] 태그로 추가
    ↓
Manager 검토
    ├── 승인 → Frontend 통보 → 마이그레이션 계획
    └── 거부 → 대안 검토
    ↓
양측 합의 후 구현
```

---

## 4. 변경 요청 형식

### 4.1 Non-Breaking 변경 통보

```markdown
## API 변경 통보

- 유형: Non-Breaking
- Task: TASK-XXX
- 대상: [엔드포인트]

### 변경 내용
[변경 설명]

### 영향
- 기존 동작: 영향 없음
- 추가 사항: [내용]

### 일정
- 적용 예정: YYYY-MM-DD
```

### 4.2 Breaking 변경 요청

```markdown
## API Breaking Change 요청

- 유형: Breaking
- Task: TASK-XXX
- 대상: [엔드포인트]

### 변경 내용
- Before: [현재]
- After: [변경 후]

### 변경 사유
[필요 이유]

### 영향 분석
- 영향받는 화면: [목록]
- Frontend 수정 필요: [내용]

### 마이그레이션 계획
1. [단계]
2. [단계]

### 일정
- 승인 필요: YYYY-MM-DD
- 적용 예정: YYYY-MM-DD
```

---

## 5. 역할별 책임

| 역할 | 책임 |
|------|------|
| Backend | 변경 제안, api.md 갱신, 구현 |
| Frontend | 변경 검토, 영향 분석, 적용 |
| Manager | Breaking change 승인, 일정 조정 |

---

## 6. 버전 관리

### 6.1 URL 버전

- 현재: /api/v1
- Major Breaking 시: /api/v2

### 6.2 하위 호환 기간

- Breaking change 시 구버전 유지: 최소 2주
- 양측 합의 시 단축 가능

---

## 7. 긴급 변경

### 긴급 상황

- 보안 취약점
- 심각한 버그

### 긴급 절차

```
긴급 상황 발생
    ↓
Manager에게 즉시 보고
    ↓
Manager 판단 (1시간 내)
    ↓
승인 시: 즉시 변경 + 사후 문서화
```

---

## 8. 금지 사항

- ❌ Frontend 통보 없이 API 변경
- ❌ Manager 승인 없이 Breaking change
- ❌ 문서 갱신 없이 구현 변경
- ❌ 합의 없이 일정 변경

---

## 9. 체크리스트

### API 변경 전 체크리스트

- [ ] 변경 유형 분류 (Non-Breaking / Breaking)
- [ ] api.md에 [PROPOSED]/[BREAKING] 태그 추가
- [ ] Frontend 통보 완료
- [ ] (Breaking인 경우) Manager 승인 완료
- [ ] 마이그레이션 계획 수립 (필요 시)

### API 변경 후 체크리스트

- [ ] api.md 갱신 (태그 제거)
- [ ] 변경 이력 기록
- [ ] Frontend 구현 완료 확인
- [ ] 테스트 완료
