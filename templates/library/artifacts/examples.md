# Examples (사용 예제)

> 라이브러리 사용 예제 모음
> 실제 동작하는 코드로 작성

---

## 0. 문서 메타

| 항목 | 값 |
|------|-----|
| 라이브러리 버전 | v1.0.0 |
| 최종 수정 | YYYY-MM-DD |

---

## 1. 빠른 시작 (Quick Start)

### 1.1 설치

```bash
pip install [library-name]
```

### 1.2 기본 사용

```python
from library import main_function

# 가장 간단한 사용법
result = main_function("hello")
print(result.value)  # 출력: processed: hello
```

---

## 2. 기본 예제

### 2.1 예제: [시나리오 이름]

**목적:** [이 예제가 보여주는 것]

```python
from library import main_function, Config

# 설정
config = Config(timeout=30)

# 실행
result = main_function("input", config=config)

# 결과 확인
if result.status == "success":
    print(f"성공: {result.value}")
else:
    print(f"실패: {result.error}")
```

**실행 결과:**
```
성공: processed: input
```

---

### 2.2 예제: [다른 시나리오]

**목적:** [설명]

```python
# 예제 코드
```

---

## 3. 고급 예제

### 3.1 비동기 처리

```python
import asyncio
from library import async_function

async def main():
    result = await async_function("data")
    print(result)

asyncio.run(main())
```

### 3.2 에러 처리

```python
from library import main_function, LibraryError

try:
    result = main_function("")
except LibraryError as e:
    print(f"에러 발생: {e.message}")
    print(f"에러 코드: {e.code}")
```

### 3.3 커스텀 설정

```python
from library import configure, main_function

# 전역 설정
configure(
    timeout=60,
    retries=5,
    debug=True
)

# 설정이 적용된 상태로 실행
result = main_function("data")
```

---

## 4. 통합 예제

### 4.1 [프레임워크]와 함께 사용

```python
# 프레임워크 통합 예제
```

### 4.2 다른 라이브러리와 함께

```python
# 다른 라이브러리와 조합 예제
```

---

## 5. FAQ 및 팁

### Q: [자주 묻는 질문]?

```python
# 해결 방법 코드
```

### Q: [다른 질문]?

```python
# 해결 방법 코드
```

---

## 6. 변경 이력

| 버전 | 날짜 | 변경 내용 | Task |
|------|------|----------|------|
| v1.0.0 | YYYY-MM-DD | 초기 예제 작성 | - |
