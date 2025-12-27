# Output Format Specification

> CLI 출력 형식 정의
> 일관된 사용자 경험을 위한 표준

---

## 0. 문서 메타

| 항목 | 값 |
|------|-----|
| 버전 | v1.0 |
| 최종 수정 | YYYY-MM-DD |

---

## 1. 출력 스트림

### 1.1 stdout (표준 출력)

**용도:** 명령어의 실제 결과

```bash
# 결과 데이터
[program] list
item1
item2
item3
```

### 1.2 stderr (표준 에러)

**용도:** 에러, 경고, 진행 상황

```bash
# 에러
Error: Something went wrong

# 진행 상황
Processing... 50%
```

---

## 2. 메시지 유형

### 2.1 성공

```
✓ Operation completed successfully
```

### 2.2 에러

```
✗ Error: [에러 메시지]

[상세 설명 (있는 경우)]

Usage: [올바른 사용법]
```

### 2.3 경고

```
⚠ Warning: [경고 메시지]
```

### 2.4 정보

```
ℹ [정보 메시지]
```

### 2.5 진행 상황

```
⠋ Processing file.txt...
[████████░░░░░░░░] 50%
```

---

## 3. 출력 형식

### 3.1 Text (기본)

사람이 읽기 좋은 형식:

```
Name:    John Doe
Email:   john@example.com
Created: 2024-01-15
```

### 3.2 JSON

스크립트/파이프용:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "created": "2024-01-15"
}
```

### 3.3 Table

정렬된 목록:

```
NAME       EMAIL                CREATED
─────────────────────────────────────────
John Doe   john@example.com     2024-01-15
Jane Doe   jane@example.com     2024-01-16
```

### 3.4 Quiet

최소 출력 (파이프용):

```
john@example.com
jane@example.com
```

---

## 4. 색상 사용

### 4.1 색상 코드

| 용도 | 색상 |
|------|------|
| 성공 | 초록 |
| 에러 | 빨강 |
| 경고 | 노랑 |
| 정보 | 파랑 |
| 강조 | 볼드 |
| 경로/코드 | 시안 |

### 4.2 색상 비활성화

```bash
# 환경 변수
NO_COLOR=1 [program] list

# 옵션
[program] list --no-color

# 파이프 시 자동 비활성화
[program] list | grep "item"
```

---

## 5. 대화형 프롬프트

### 5.1 확인 (Y/N)

```
? Are you sure? (y/N) 
```

### 5.2 선택

```
? Select an option:
  ❯ Option 1
    Option 2
    Option 3
```

### 5.3 입력

```
? Enter your name: █
```

### 5.4 비대화형 모드

```bash
# 모든 확인 자동 수락
[program] delete --yes

# 또는
echo "y" | [program] delete
```

---

## 6. 진행 상황

### 6.1 스피너

```
⠋ Loading...
⠙ Loading...
⠹ Loading...
⠸ Loading...
```

### 6.2 프로그레스 바

```
Downloading [████████░░░░░░░░] 50% (5.0 MB / 10.0 MB)
```

### 6.3 단계 표시

```
[1/3] Downloading dependencies...
[2/3] Building project...
[3/3] Running tests...
```

---

## 7. 에러 출력

### 7.1 기본 에러

```
✗ Error: File not found: config.json
```

### 7.2 상세 에러 (--verbose)

```
✗ Error: File not found: config.json

   at readConfig (/path/to/file.js:10)
   at main (/path/to/file.js:5)

Cause: ENOENT: no such file or directory
```

### 7.3 사용법 에러

```
✗ Error: Missing required argument: <name>

Usage: [program] create <name> [options]

For more information, try '--help'
```

---

## 8. 도움말

### 8.1 전체 도움말

```
[program-name] v1.0.0 - [설명]

Usage: [program] <command> [options]

Commands:
  init      Initialize a new project
  config    Manage configuration
  run       Run the project

Options:
  -h, --help     Show help
  -V, --version  Show version

Run '[program] <command> --help' for more information
```

### 8.2 명령어 도움말

```
Usage: [program] init [directory] [options]

Initialize a new project

Arguments:
  directory    Target directory (default: .)

Options:
  -t, --template <name>  Template to use
  -f, --force            Overwrite existing files
  --no-git               Skip git initialization

Examples:
  [program] init
  [program] init my-project --template typescript
```

---

## 9. 변경 이력

| Task | 날짜 | 변경 내용 |
|------|------|----------|
| [TASK-001] | YYYY-MM-DD | 초기 출력 형식 정의 |
