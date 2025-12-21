# API Contract (Backend ↔ Frontend)

> 이 문서는 프론트엔드와 백엔드의 공식 계약이다.
> - 프론트엔드는 이 문서를 기준으로 구현한다.
> - 백엔드는 구현 변경 시 반드시 이 문서를 갱신한다.
> - Breaking change는 금지(필요 시 manager 승인 + 버전 전략 반영).

---

## 0. 문서 메타

- Service Name:
- API Version: v1
- Last Updated: YYYY-MM-DD
- Owners:
  - Backend:
  - Frontend:
- Environments:
  - Local:
  - Dev:
  - Prod:

---

## 1. 공통 규칙

### 1.1 Base URL
- `/api/v1`

### 1.2 Content-Type
- Request: `application/json`
- Response: `application/json`

### 1.3 Timeouts / Retries (옵션)
- Client timeout:
- Retry policy:
- Retry-safe endpoints:
- Retry forbidden endpoints:

### 1.4 공통 헤더 규칙 (권장)
- `X-Request-Id`: 요청 추적 ID (클라이언트가 생성하거나 서버가 생성)
- `X-Client-Version`: 클라이언트 버전(선택)
- `Authorization`: 인증 토큰(선택)

---

## 2. 인증/권한 (Optional)

> 서비스에 인증이 없다면 "미사용"으로 명시한다. 비워두지 말 것.

- Status: 미사용 / 사용
- Scheme: Bearer Token / Cookie Session / 기타
- Token location: `Authorization: Bearer <token>`
- 권한 모델:
  - 역할 기반(RBAC) / 권한 스코프 / 기타
- 인증 실패 응답:
  - 401: UNAUTHORIZED
  - 403: FORBIDDEN

---

## 3. 응답 규격 (Response Envelope)

> 통일된 응답 포맷을 사용한다. (권장)
> 만약 Envelope를 쓰지 않는다면 여기서 "미사용"을 명시하고,
> 각 API Response를 직접 정의한다.

### 3.1 Success
```json
{
  "success": true,
  "data": {},
  "error": null
}
