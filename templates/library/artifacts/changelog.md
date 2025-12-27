# Changelog

> 모든 버전의 변경 사항 기록
> [Semantic Versioning](https://semver.org/) 준수

---

## [Unreleased]

### Added
- (새 기능 추가 시 여기에 기록)

### Changed
- (변경 사항 기록)

### Deprecated
- (deprecated 예정 기능)

### Removed
- (제거된 기능)

### Fixed
- (버그 수정)

### Security
- (보안 관련 수정)

---

## [1.0.0] - YYYY-MM-DD

### Added
- 초기 릴리스
- `mainFunction()` 추가 [TASK-001]
- `helperFunction()` 추가 [TASK-002]
- 기본 설정 시스템 [TASK-003]

### Documentation
- public-api.md 작성
- examples.md 작성
- README.md 작성

---

## 버전 관리 규칙

### 버전 형식

```
MAJOR.MINOR.PATCH

예: 1.2.3
```

### 버전 증가 기준

| 변경 유형 | 버전 | 예시 |
|----------|------|------|
| 버그 수정 | PATCH | 1.0.0 → 1.0.1 |
| 새 기능 (호환) | MINOR | 1.0.1 → 1.1.0 |
| Breaking change | MAJOR | 1.1.0 → 2.0.0 |

### 카테고리 정의

| 카테고리 | 설명 |
|----------|------|
| Added | 새로 추가된 기능 |
| Changed | 기존 기능의 변경 |
| Deprecated | 곧 제거될 기능 |
| Removed | 제거된 기능 |
| Fixed | 버그 수정 |
| Security | 보안 관련 수정 |

---

## 릴리스 체크리스트

- [ ] 모든 Task 완료
- [ ] 테스트 통과
- [ ] public-api.md 갱신
- [ ] examples.md 갱신
- [ ] changelog.md 갱신
- [ ] 버전 번호 증가
- [ ] 태그 생성
