# 설정

## 설정 파일

설정 파일은 일반적으로 `config.yml` 또는 `.configrc`에 위치합니다.

```yaml
# 설정 예시
option1: value1
option2: value2
```

## 설정 옵션

### 기본 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `option1` | string | `"default"` | 설명 |
| `option2` | number | `0` | 설명 |

### 고급 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `advanced1` | boolean | `false` | 설명 |
| `advanced2` | array | `[]` | 설명 |

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `ENV_VAR_1` | 설명 | - |
| `ENV_VAR_2` | 설명 | - |

## 예시

### 개발 환경 설정

```yaml
mode: development
debug: true
```

### 프로덕션 환경 설정

```yaml
mode: production
debug: false
optimization: true
```
