# Commands Specification

> CLI 명령어 정의 문서
> 모든 명령어의 단일 진실

---

## 0. 문서 메타

| 항목 | 값 |
|------|-----|
| 프로그램명 | [program-name] |
| 버전 | v1.0.0 |
| 최종 수정 | YYYY-MM-DD |

---

## 1. 전역 옵션

모든 명령어에서 사용 가능한 옵션:

| 옵션 | 축약 | 설명 |
|------|------|------|
| --help | -h | 도움말 표시 |
| --version | -V | 버전 표시 |
| --verbose | -v | 상세 출력 |
| --quiet | -q | 최소 출력 |
| --config | -c | 설정 파일 경로 |
| --format | -f | 출력 형식 (text/json/table) |

---

## 2. 명령어 목록

| 명령어 | 설명 | 상태 | Task |
|--------|------|:----:|------|
| init | 프로젝트 초기화 | ✅ | TASK-001 |
| config | 설정 관리 | ⏳ | TASK-002 |
| run | 실행 | 📋 | TASK-003 |

---

## 3. init

프로젝트를 초기화합니다.

### 사용법

```bash
[program] init [directory] [options]
```

### 인자

| 인자 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| directory | path | ❌ | 대상 디렉토리 (기본: .) |

### 옵션

| 옵션 | 축약 | 타입 | 기본값 | 설명 |
|------|------|------|--------|------|
| --template | -t | string | default | 템플릿 이름 |
| --force | -f | flag | false | 기존 파일 덮어쓰기 |
| --no-git | | flag | false | git 초기화 건너뛰기 |

### 예시

```bash
# 현재 디렉토리에 초기화
[program] init

# 특정 디렉토리에 초기화
[program] init my-project

# 템플릿 사용
[program] init --template typescript

# 강제 덮어쓰기
[program] init --force
```

### 종료 코드

| 코드 | 의미 |
|:----:|------|
| 0 | 성공 |
| 1 | 초기화 실패 |
| 2 | 디렉토리가 비어있지 않음 (--force 없이) |

---

## 4. config

설정을 관리합니다.

### 사용법

```bash
[program] config <subcommand> [options]
```

### 서브커맨드

#### config get

```bash
[program] config get <key>
```

설정 값을 조회합니다.

| 인자 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| key | string | ✅ | 설정 키 |

#### config set

```bash
[program] config set <key> <value> [options]
```

설정 값을 저장합니다.

| 인자 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| key | string | ✅ | 설정 키 |
| value | string | ✅ | 설정 값 |

| 옵션 | 설명 |
|------|------|
| --global | 전역 설정에 저장 |

#### config list

```bash
[program] config list [options]
```

모든 설정을 표시합니다.

| 옵션 | 설명 |
|------|------|
| --global | 전역 설정만 표시 |
| --local | 로컬 설정만 표시 |

### 예시

```bash
# 설정 조회
[program] config get user.name

# 설정 저장
[program] config set user.name "John Doe"

# 전역 설정
[program] config set user.email "john@example.com" --global

# 모든 설정 표시
[program] config list
```

### 종료 코드

| 코드 | 의미 |
|:----:|------|
| 0 | 성공 |
| 1 | 설정 오류 |
| 2 | 키를 찾을 수 없음 |

---

## 5. run

프로젝트를 실행합니다.

### 사용법

```bash
[program] run [script] [options] [-- args]
```

### 인자

| 인자 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| script | string | ❌ | 스크립트 이름 (기본: default) |

### 옵션

| 옵션 | 축약 | 타입 | 기본값 | 설명 |
|------|------|------|--------|------|
| --watch | -w | flag | false | 파일 변경 감시 |
| --env | -e | string | development | 환경 |

### 예시

```bash
# 기본 실행
[program] run

# 특정 스크립트 실행
[program] run build

# 감시 모드
[program] run --watch

# 인자 전달
[program] run test -- --coverage
```

### 종료 코드

| 코드 | 의미 |
|:----:|------|
| 0 | 성공 |
| 1 | 실행 실패 |
| 127 | 스크립트를 찾을 수 없음 |

---

## 6. 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| [PROGRAM]_CONFIG | 설정 파일 경로 | ~/.config/[program] |
| [PROGRAM]_HOME | 홈 디렉토리 | ~ |
| [PROGRAM]_DEBUG | 디버그 모드 | false |
| NO_COLOR | 색상 출력 비활성화 | - |

---

## 7. 설정 파일

### 위치 (우선순위)

1. --config 옵션
2. ./[program].config
3. $[PROGRAM]_CONFIG
4. ~/.config/[program]/config

### 형식

```yaml
# [program].config
user:
  name: "John Doe"
  email: "john@example.com"

defaults:
  template: typescript
  env: development
```

---

## 8. 변경 이력

| Task | 날짜 | 변경 내용 |
|------|------|----------|
| [TASK-001] | YYYY-MM-DD | init 명령어 추가 |
| [TASK-002] | YYYY-MM-DD | config 명령어 추가 |
