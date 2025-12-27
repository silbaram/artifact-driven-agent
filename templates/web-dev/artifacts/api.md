# API Specification

> Backend와 Frontend의 공식 계약 문서
> 변경 시 rules/api-change.md 절차를 따른다

---

## 0. 문서 메타

| 항목 | 값 |
|------|-----|
| 버전 | v1.0 |
| Base URL | /api/v1 |
| 최종 수정 | YYYY-MM-DD |

---

## 1. 공통 규칙

### 1.1 HTTP 메서드

| 메서드 | 용도 | 멱등성 |
|--------|------|:------:|
| GET | 조회 | ✅ |
| POST | 생성 | ❌ |
| PUT | 전체 수정 | ✅ |
| PATCH | 부분 수정 | ❌ |
| DELETE | 삭제 | ✅ |

### 1.2 경로 규칙

- 리소스명: 복수형 소문자 (예: `/users`, `/posts`)
- 단일 리소스: `/{resource}/{id}`
- 중첩 리소스: `/{parent}/{parentId}/{child}`

---

## 2. 인증/권한

| 항목 | 값 |
|------|-----|
| Status | 사용 / 미사용 |
| Scheme | Bearer Token / Cookie / API Key |
| Token Location | Authorization: Bearer {token} |

---

## 3. 응답 규격 (Response Envelope)

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

---

## 4. 공통 에러 코드

| HTTP | 에러 코드 | 설명 |
|------|----------|------|
| 400 | BAD_REQUEST | 잘못된 요청 |
| 400 | VALIDATION_ERROR | 유효성 검사 실패 |
| 401 | UNAUTHORIZED | 인증 필요 |
| 403 | FORBIDDEN | 권한 없음 |
| 404 | NOT_FOUND | 리소스 없음 |
| 409 | CONFLICT | 충돌 |
| 500 | INTERNAL_ERROR | 서버 오류 |

---

## 5. 페이지네이션

### Request

```
GET /resources?page=1&size=20&sort=createdAt,desc
```

### Response

```json
{
  "success": true,
  "data": {
    "content": [...],
    "page": {
      "number": 1,
      "size": 20,
      "totalElements": 100,
      "totalPages": 5
    }
  }
}
```

---

## 6. API 엔드포인트 정의

### 6.1 [리소스명]

#### GET /resources

**설명:** 목록 조회

**Request:**
```
Query Parameters:
- page: number (default: 1)
- size: number (default: 20)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "name": "string",
        "createdAt": "datetime"
      }
    ],
    "page": { ... }
  }
}
```

**에러:**
| 상황 | 코드 |
|------|------|
| 잘못된 파라미터 | BAD_REQUEST |

---

#### POST /resources

**설명:** 생성

**Request:**
```json
{
  "name": "string (required)",
  "description": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "createdAt": "datetime"
  }
}
```

**에러:**
| 상황 | 코드 |
|------|------|
| 필수 필드 누락 | VALIDATION_ERROR |
| 중복 | CONFLICT |

---

## 7. API 목록 요약

| 메서드 | 경로 | 설명 | 상태 | Task |
|--------|------|------|:----:|------|
| GET | /resources | 목록 조회 | ✅ | TASK-001 |
| POST | /resources | 생성 | ⏳ | TASK-001 |
| GET | /resources/{id} | 단일 조회 | 📋 | TASK-002 |

상태: ✅ 완료 / ⏳ 진행중 / 📋 예정

---

## 8. 변경 이력

| Task | 날짜 | 변경 내용 |
|------|------|----------|
| [TASK-001] | YYYY-MM-DD | 초기 API 작성 |
