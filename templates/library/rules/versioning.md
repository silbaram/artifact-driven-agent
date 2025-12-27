# Versioning Rules (버전 관리 규칙)

> 라이브러리 버전 관리 규칙
> Semantic Versioning 2.0.0 기반

---

## 1. 버전 형식

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

예시:
1.0.0
2.1.3
1.0.0-alpha.1
1.0.0-beta.2+build.123
```

---

## 2. 버전 증가 규칙

### 2.1 MAJOR (주 버전)

하위 호환되지 않는 변경 시 증가:

| 변경 유형 | 예시 |
|----------|------|
| 공개 API 제거 | `removeFunction()` 삭제 |
| 공개 API 시그니처 변경 | 파라미터 타입 변경 |
| 동작 변경 | 반환값 의미 변경 |
| 필수 파라미터 추가 | 기존 함수에 필수 인자 |

### 2.2 MINOR (부 버전)

하위 호환되는 기능 추가 시 증가:

| 변경 유형 | 예시 |
|----------|------|
| 새 기능 추가 | 새 함수/클래스 |
| 선택적 파라미터 추가 | 기본값 있는 인자 |
| Deprecation 표시 | 제거 예고 |

### 2.3 PATCH (수정 버전)

하위 호환되는 버그 수정 시 증가:

| 변경 유형 | 예시 |
|----------|------|
| 버그 수정 | 동작 오류 수정 |
| 성능 개선 | API 변경 없는 최적화 |
| 문서 수정 | 오타, 설명 보완 |

---

## 3. Pre-release 버전

### 3.1 단계

```
alpha → beta → rc → release

예시:
1.0.0-alpha.1
1.0.0-alpha.2
1.0.0-beta.1
1.0.0-rc.1
1.0.0
```

### 3.2 Pre-release 규칙

- alpha: 불안정, API 변경 가능
- beta: 기능 완료, 버그 수정 중
- rc: 릴리스 후보, 중요 버그만 수정

---

## 4. Deprecation 절차

### 4.1 Deprecation 단계

```
1. MINOR 버전에서 Deprecated 표시
2. 경고 메시지 출력 (런타임)
3. 최소 1개 MINOR 버전 유지
4. 다음 MAJOR에서 제거
```

### 4.2 Deprecation 표시

```markdown
## public-api.md

### oldFunction() ⚠️ Deprecated

> **Deprecated since v1.2.0**
> v2.0.0에서 제거 예정
> 대신 `newFunction()`을 사용하세요.
```

### 4.3 changelog.md 기록

```markdown
## [1.2.0] - YYYY-MM-DD

### Deprecated
- `oldFunction()` - v2.0.0에서 제거 예정, `newFunction()` 사용 권장
```

---

## 5. 변경 유형별 버전 결정

| 변경 | MAJOR | MINOR | PATCH |
|------|:-----:|:-----:|:-----:|
| API 제거 | ✅ | | |
| API 시그니처 변경 | ✅ | | |
| 동작 변경 (비호환) | ✅ | | |
| 새 기능 추가 | | ✅ | |
| API Deprecation | | ✅ | |
| 버그 수정 | | | ✅ |
| 문서 수정 | | | ✅ |
| 내부 리팩토링 | | | ✅ |

---

## 6. changelog.md 형식

```markdown
# Changelog

모든 주요 변경 사항을 기록합니다.
[Keep a Changelog](https://keepachangelog.com) 형식을 따릅니다.

## [Unreleased]

### Added
- [TASK-XXX] 새 기능

### Changed
- [TASK-XXX] 변경 사항

### Deprecated
- [TASK-XXX] 제거 예정 기능

### Removed
- [TASK-XXX] 제거된 기능

### Fixed
- [TASK-XXX] 버그 수정

## [1.1.0] - YYYY-MM-DD

### Added
- [TASK-001] 초기 기능
```

---

## 7. 릴리스 체크리스트

### 릴리스 전

- [ ] 모든 Task 완료 (DONE)
- [ ] changelog.md 갱신
- [ ] public-api.md 갱신
- [ ] examples.md 갱신 (필요 시)
- [ ] 테스트 통과
- [ ] 버전 번호 결정

### 릴리스 후

- [ ] 버전 태그 생성
- [ ] 패키지 배포
- [ ] 릴리스 노트 공개

---

## 8. 금지 사항

- ❌ PATCH에서 새 기능 추가
- ❌ MINOR에서 Breaking change
- ❌ Deprecation 없이 API 제거
- ❌ changelog.md 갱신 없이 릴리스
