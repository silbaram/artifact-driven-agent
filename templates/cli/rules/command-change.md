# Command Change Rules (명령어 변경 규칙)

> CLI 명령어 변경 시 따라야 할 절차
> 하위 호환성 유지 및 사용자 경험 보호

---

## 1. 명령어 변경 원칙

- commands.md는 **명령어의 단일 진실**
- **하위 호환성**을 최대한 유지
- Breaking change는 **Major 버전**에서만
- 모든 변경은 **문서에 기록**

---

## 2. 변경 유형 분류

### 2.1 Non-Breaking Change (호환)

| 유형 | 예시 | 승인 |
|------|------|------|
| 새 명령어 추가 | `myapp new-command` | 기록만 |
| 새 옵션 추가 | `--new-option` | 기록만 |
| 새 서브커맨드 추가 | `myapp config new-sub` | 기록만 |
| 기본값 변경 (호환) | 기본 출력 형식 | 기록만 |

### 2.2 Breaking Change (비호환)

| 유형 | 예시 | 승인 |
|------|------|------|
| 명령어 삭제 | `myapp old-command` 제거 | Manager |
| 명령어 이름 변경 | `old` → `new` | Manager |
| 필수 인자 추가 | 기존 명령어에 필수 인자 | Manager |
| 옵션 삭제 | `--removed-option` | Manager |
| 옵션 동작 변경 | `--flag` 의미 변경 | Manager |
| 종료 코드 변경 | 코드 의미 변경 | Manager |
| 출력 형식 변경 | 기본 출력 구조 변경 | Manager |

---

## 3. 변경 절차

### 3.1 Non-Breaking Change

```
변경 필요 발견
    ↓
commands.md에 [ADDED] 태그로 추가
    ↓
구현 진행
    ↓
문서 확정 (태그 제거)
```

### 3.2 Breaking Change

```
Breaking Change 필요 발견
    ↓
Manager에게 에스컬레이션
    ↓
commands.md에 [BREAKING] 태그로 추가
    ↓
Deprecation 계획 수립
    ↓
Manager 승인
    ↓
Deprecation 구현 (경고 출력)
    ↓
다음 Major 버전에서 제거
```

---

## 4. Deprecation 절차

### 4.1 단계

```
1. MINOR 버전: Deprecated 표시 + 경고 출력
2. 최소 1개 MINOR 버전 유지
3. 다음 MAJOR: 제거
```

### 4.2 Deprecation 경고

```bash
$ myapp old-command

⚠ Warning: 'old-command' is deprecated and will be removed in v2.0.0
  Use 'new-command' instead.

[실제 동작 수행]
```

### 4.3 문서 표시

```markdown
## old-command ⚠️ Deprecated

> **Deprecated since v1.2.0**
> v2.0.0에서 제거 예정
> 대신 `new-command`를 사용하세요.
```

---

## 5. 명령어 별칭

Breaking change를 피하기 위한 방법:

### 5.1 별칭 추가

```bash
# 새 이름이 주, 기존 이름은 별칭
myapp new-command  # 주 명령어
myapp old-command  # 별칭 (경고 없음)
```

### 5.2 Soft Deprecation

```bash
# 별칭을 유지하되 문서에서만 새 이름 권장
# 경고 출력 없음, 문서만 업데이트
```

---

## 6. 출력 형식 변경

### 6.1 JSON 출력

- JSON 스키마 변경은 Breaking
- 필드 추가는 Non-Breaking
- 필드 제거는 Breaking
- 타입 변경은 Breaking

### 6.2 Text 출력

- 레이아웃 변경은 허용
- 파싱에 의존하는 출력 변경은 Breaking

---

## 7. 버전별 변경 가이드

| 버전 유형 | 허용 변경 |
|----------|----------|
| PATCH | 버그 수정, 문서 수정 |
| MINOR | 새 명령어/옵션, Deprecation |
| MAJOR | Breaking changes, 제거 |

---

## 8. 변경 요청 형식

### Non-Breaking

```markdown
## 명령어 추가 요청

- Task: TASK-XXX
- 유형: Non-Breaking

### 추가 내용
- 명령어: `myapp new-command`
- 설명: [설명]

### 사용 예시
```bash
myapp new-command --option value
```
```

### Breaking

```markdown
## Breaking Change 요청

- Task: TASK-XXX
- 유형: Breaking

### 변경 내용
- Before: `myapp old-command`
- After: `myapp new-command`

### 변경 사유
[사유]

### 마이그레이션 가이드
1. [단계]
2. [단계]

### Deprecation 계획
- v1.2.0: Deprecated + 경고
- v2.0.0: 제거
```

---

## 9. 금지 사항

- ❌ 문서 없이 명령어 변경
- ❌ Manager 승인 없이 Breaking change
- ❌ Deprecation 없이 명령어 제거
- ❌ 경고 없이 동작 변경

---

## 10. 체크리스트

### 명령어 변경 전

- [ ] 변경 유형 분류 (Non-Breaking/Breaking)
- [ ] commands.md에 태그 추가
- [ ] (Breaking) Manager 승인
- [ ] (Breaking) Deprecation 계획

### 명령어 변경 후

- [ ] commands.md 갱신
- [ ] output-format.md 갱신 (필요 시)
- [ ] 변경 이력 기록
- [ ] 테스트 완료
