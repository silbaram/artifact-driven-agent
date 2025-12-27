# Public API Specification

> 라이브러리의 공개 인터페이스 정의
> 사용자에게 노출되는 모든 API를 문서화

---

## 0. 문서 메타

| 항목 | 값 |
|------|-----|
| 라이브러리명 | [이름] |
| 현재 버전 | v1.0.0 |
| 최종 수정 | YYYY-MM-DD |

---

## 1. 개요

### 1.1 라이브러리 소개

[라이브러리 한 줄 설명]

### 1.2 설치

```bash
# npm
npm install [package-name]

# pip
pip install [package-name]

# 기타
[설치 명령]
```

### 1.3 빠른 시작

```python
# 기본 사용 예시
import library

result = library.main_function()
```

---

## 2. 공개 API 목록

| API | 설명 | 버전 | 상태 |
|-----|------|------|:----:|
| `mainFunction()` | 주요 기능 | v1.0.0 | ✅ |
| `helperFunction()` | 보조 기능 | v1.0.0 | ✅ |
| `oldFunction()` | 이전 기능 | v1.0.0 | ⚠️ Deprecated |

상태: ✅ 안정 / ⚠️ Deprecated / 🧪 실험적

---

## 3. API 상세

### 3.1 mainFunction

```python
def main_function(param1: str, param2: int = 10) -> Result:
    """
    주요 기능 설명
    
    Args:
        param1: 첫 번째 파라미터 설명
        param2: 두 번째 파라미터 (기본값: 10)
    
    Returns:
        Result: 결과 객체
    
    Raises:
        ValueError: param1이 빈 문자열인 경우
        TypeError: param2가 정수가 아닌 경우
    
    Example:
        >>> result = main_function("hello", 20)
        >>> print(result.value)
        'processed: hello'
    """
```

**파라미터:**

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|:----:|--------|------|
| param1 | str | ✅ | - | 첫 번째 파라미터 |
| param2 | int | ❌ | 10 | 두 번째 파라미터 |

**반환값:**

| 타입 | 설명 |
|------|------|
| Result | 결과 객체 |

**예외:**

| 예외 | 조건 |
|------|------|
| ValueError | param1이 빈 문자열 |
| TypeError | param2가 정수 아님 |

**예시:**

```python
# 기본 사용
result = main_function("hello")

# 옵션 지정
result = main_function("hello", param2=20)
```

---

### 3.2 helperFunction

(동일 형식으로 작성)

---

## 4. 데이터 타입

### 4.1 Result

```python
class Result:
    value: str       # 처리 결과
    status: str      # 상태 ("success" | "error")
    metadata: dict   # 추가 정보
```

**필드:**

| 필드 | 타입 | 설명 |
|------|------|------|
| value | str | 처리 결과 |
| status | str | 상태 |
| metadata | dict | 추가 정보 |

---

## 5. 상수 및 설정

### 5.1 상수

| 상수 | 값 | 설명 |
|------|-----|------|
| DEFAULT_TIMEOUT | 30 | 기본 타임아웃 (초) |
| MAX_RETRIES | 3 | 최대 재시도 횟수 |

### 5.2 설정

```python
# 전역 설정
library.configure(
    timeout=60,
    debug=True
)
```

---

## 6. Deprecated API

> 다음 Major 버전에서 제거 예정

### 6.1 oldFunction (Deprecated since v1.2.0)

```python
# ⚠️ Deprecated: main_function() 사용 권장
def old_function(param):
    ...
```

**대체 방법:**

```python
# Before (deprecated)
old_function(param)

# After (recommended)
main_function(param)
```

---

## 7. 변경 이력

| 버전 | 날짜 | 변경 내용 | Task |
|------|------|----------|------|
| v1.0.0 | YYYY-MM-DD | 초기 릴리스 | - |
| v1.1.0 | YYYY-MM-DD | helperFunction 추가 | TASK-003 |
| v1.2.0 | YYYY-MM-DD | oldFunction deprecated | TASK-005 |
