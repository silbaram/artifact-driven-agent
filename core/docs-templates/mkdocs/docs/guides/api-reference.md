# API 레퍼런스

## 개요

[프로젝트명]의 완전한 API 레퍼런스입니다.

## REST API

### 인증

```http
POST /api/auth/login
```

**요청:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**응답:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### 엔드포인트

#### GET /api/resource

[설명]

**매개변수:**
- `param1` (string, 필수): 설명
- `param2` (number, 선택): 설명

**응답:**
```json
{
  "data": []
}
```

## SDK/라이브러리 API

### 클래스: MainClass

```javascript
const instance = new MainClass(options);
```

#### 메서드

##### method1(param1, param2)

[설명]

**매개변수:**
- `param1` (타입): 설명
- `param2` (타입): 설명

**반환값:** 타입

**예시:**
```javascript
const result = instance.method1('value1', 123);
```

## 에러 코드

| 코드 | 메시지 | 설명 |
|------|--------|------|
| 400 | Bad Request | 잘못된 요청 |
| 401 | Unauthorized | 인증 필요 |
| 404 | Not Found | 리소스를 찾을 수 없음 |
| 500 | Internal Server Error | 서버 오류 |
