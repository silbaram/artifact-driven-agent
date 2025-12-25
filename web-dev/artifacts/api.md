# API Contract (Backend ↔ Frontend)

> 이 문서는 프론트엔드와 백엔드의 공식 계약이다.
> - 프론트엔드는 이 문서를 기준으로 구현한다.
> - 백엔드는 구현 변경 시 반드시 이 문서를 갱신한다.
> - Breaking change는 금지 (필요 시 Manager 승인 + rules/api-change.md 절차).

---

## 0. 문서 메타

| 항목 | 값 |
|------|-----|
| Service Name | [서비스명] |
| API Version | v1 |
| Last Updated | YYYY-MM-DD |
| Status | Draft / Confirmed / Frozen |

### Owners
- Backend: [담당자]
- Frontend: [담당자]

### Environments
| 환경 | Base URL |
|------|----------|
| Local | http://localhost:8080 |
| Dev | https://dev-api.example.com |
| Prod | https://api.example.com |

---

## 1. 공통 규칙

### 1.1 Base URL
```
/api/v1
```

### 1.2 Content-Type
| 방향 | Content-Type |
|------|--------------|
| Request | `application/json` |
| Response | `application/json` |

### 1.3 공통 헤더

**필수 헤더:**
| 헤더 | 설명 | 예시 |
|------|------|------|
| `Content-Type` | 요청 본문 타입 | `application/json` |

**선택 헤더:**
| 헤더 | 설명 | 예시 |
|------|------|------|
| `Authorization` | 인증 토큰 | `Bearer eyJhbGc...` |
| `X-Request-Id` | 요청 추적 ID | `uuid-v4` |
| `X-Client-Version` | 클라이언트 버전 | `1.0.0` |

### 1.4 Timeout / Retry

| 항목 | 값 |
|------|-----|
| Client Timeout | 30초 (기본) |
| Retry Policy | 최대 3회, 지수 백오프 |

**Retry 가능 (Idempotent):**
- GET 전체
- PUT (멱등성 보장 시)
- DELETE (멱등성 보장 시)

**Retry 금지:**
- POST (생성)
- 결제/송금 관련

---

## 2. 인증/권한

> 서비스에 인증이 없다면 "미사용"으로 명시한다. 비워두지 말 것.

| 항목 | 값 |
|------|-----|
| Status | 사용 / 미사용 |
| Scheme | Bearer Token / Cookie Session / API Key |
| Token Location | `Authorization: Bearer <token>` |

### 권한 모델
- [ ] 역할 기반 (RBAC)
- [ ] 권한 스코프
- [ ] 없음 (공개 API)

### 인증 관련 에러
| HTTP Status | 에러 코드 | 설명 |
|-------------|----------|------|
| 401 | `UNAUTHORIZED` | 인증 필요 또는 토큰 만료 |
| 403 | `FORBIDDEN` | 권한 없음 |

---

## 3. 응답 규격 (Response Envelope)

> 모든 API는 통일된 응답 포맷을 사용한다.

### 3.1 Success Response

```json
{
  "success": true,
  "data": { },
  "error": null,
  "meta": {
    "requestId": "uuid",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `success` | boolean | 항상 `true` |
| `data` | object / array | 실제 응답 데이터 |
| `error` | null | 성공 시 null |
| `meta` | object | 메타 정보 (선택) |

### 3.2 Failure Response

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자에게 표시할 메시지",
    "details": { }
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `success` | boolean | 항상 `false` |
| `data` | null | 실패 시 null |
| `error.code` | string | 에러 코드 (프론트 분기용) |
| `error.message` | string | 사용자 표시 메시지 |
| `error.details` | object | 추가 정보 (선택) |

---

## 4. 공통 에러 코드

> 프론트엔드는 `error.code`로 분기 처리한다.

### 4.1 클라이언트 에러 (4xx)

| HTTP | 에러 코드 | 설명 | 프론트 처리 |
|------|----------|------|------------|
| 400 | `BAD_REQUEST` | 잘못된 요청 | 입력값 검증 메시지 표시 |
| 400 | `VALIDATION_ERROR` | 유효성 검사 실패 | 필드별 에러 표시 |
| 401 | `UNAUTHORIZED` | 인증 필요 | 로그인 페이지 이동 |
| 401 | `TOKEN_EXPIRED` | 토큰 만료 | 토큰 갱신 또는 재로그인 |
| 403 | `FORBIDDEN` | 권한 없음 | 권한 없음 안내 |
| 404 | `NOT_FOUND` | 리소스 없음 | 404 페이지 또는 안내 |
| 409 | `CONFLICT` | 충돌 (중복 등) | 충돌 사유 안내 |
| 422 | `UNPROCESSABLE_ENTITY` | 처리 불가 | 비즈니스 로직 에러 표시 |
| 429 | `RATE_LIMITED` | 요청 제한 초과 | 잠시 후 재시도 안내 |

### 4.2 서버 에러 (5xx)

| HTTP | 에러 코드 | 설명 | 프론트 처리 |
|------|----------|------|------------|
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 | "잠시 후 다시 시도해주세요" |
| 502 | `BAD_GATEWAY` | 게이트웨이 오류 | "잠시 후 다시 시도해주세요" |
| 503 | `SERVICE_UNAVAILABLE` | 서비스 점검 중 | 점검 안내 페이지 |
| 504 | `GATEWAY_TIMEOUT` | 타임아웃 | "잠시 후 다시 시도해주세요" |

### 4.3 Validation Error 상세

`VALIDATION_ERROR` 발생 시 `error.details` 형식:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해주세요",
    "details": {
      "fields": [
        { "field": "email", "message": "올바른 이메일 형식이 아닙니다" },
        { "field": "password", "message": "8자 이상 입력해주세요" }
      ]
    }
  }
}
```

---

## 5. 페이지네이션

> 목록 조회 API에 적용한다.

### 5.1 Request 파라미터

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `page` | integer | 1 | 페이지 번호 (1부터 시작) |
| `size` | integer | 20 | 페이지 크기 (최대 100) |
| `sort` | string | - | 정렬 기준 (예: `createdAt,desc`) |

### 5.2 Response 형식

```json
{
  "success": true,
  "data": {
    "items": [ ],
    "pagination": {
      "page": 1,
      "size": 20,
      "totalItems": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 6. API 엔드포인트 정의

> 아래 형식에 따라 각 API를 정의한다.

---

### [예시] POST /auth/login

사용자 로그인

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `email` | string | ✅ | 이메일 주소 |
| `password` | string | ✅ | 비밀번호 (8자 이상) |

**Response (Success):**
```http
HTTP/1.1 200 OK
```

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 3600,
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "홍길동"
    }
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `accessToken` | string | 액세스 토큰 |
| `refreshToken` | string | 리프레시 토큰 |
| `expiresIn` | integer | 토큰 만료 시간 (초) |
| `user` | object | 사용자 정보 |

**Response (Failure):**

| HTTP | 에러 코드 | 상황 |
|------|----------|------|
| 400 | `VALIDATION_ERROR` | 이메일/비밀번호 형식 오류 |
| 401 | `INVALID_CREDENTIALS` | 이메일 또는 비밀번호 불일치 |
| 429 | `RATE_LIMITED` | 로그인 시도 횟수 초과 |

---

### [Template] METHOD /path

[API 설명]

**Request:**
```http
METHOD /api/v1/path
Content-Type: application/json
Authorization: Bearer <token>  (필요시)
```

```json
{
  "field": "value"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `field` | type | ✅/❌ | 설명 |

**Response (Success):**
```http
HTTP/1.1 200 OK
```

```json
{
  "success": true,
  "data": { }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `field` | type | 설명 |

**Response (Failure):**

| HTTP | 에러 코드 | 상황 |
|------|----------|------|
| 4xx | `CODE` | 설명 |

---

## 7. API 목록 요약

> 구현된 API를 여기에 요약한다.

| Method | Endpoint | 설명 | 인증 | 상태 |
|--------|----------|------|:----:|------|
| POST | `/auth/login` | 로그인 | ❌ | ✅ 완료 |
| POST | `/auth/logout` | 로그아웃 | ✅ | 🚧 진행중 |
| GET | `/users/me` | 내 정보 조회 | ✅ | 📝 예정 |

**상태:**
- ✅ 완료: 구현 및 테스트 완료
- 🚧 진행중: 구현 중
- 📝 예정: 미구현
- ⚠️ Deprecated: 삭제 예정

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| YYYY-MM-DD | v1.0 | 최초 작성 | [이름] |

---

## 9. 비고

### 9.1 Breaking Change 정의

다음은 Breaking Change로 분류되며 Manager 승인 필수:

- ❌ 기존 엔드포인트 URL 변경
- ❌ 기존 필드 삭제 또는 타입 변경
- ❌ 필수 필드 추가 (Request)
- ❌ 에러 코드 변경

다음은 Non-Breaking으로 분류:

- ✅ 새 엔드포인트 추가
- ✅ Response에 optional 필드 추가
- ✅ 새 에러 코드 추가

### 9.2 문서 작성 규칙

1. 모든 API는 위 템플릿 형식을 따른다
2. Request/Response 예시는 실제 데이터 형태로 작성한다
3. 에러 케이스는 빠짐없이 정의한다
4. 변경 시 변경 이력을 반드시 기록한다
5. 상태(완료/진행중/예정)를 API 목록에 표시한다
