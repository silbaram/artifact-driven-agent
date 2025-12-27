# Artifact-Driven AI Agent Framework

CLI 기반 멀티 AI 에이전트를 사용해 기획 → 설계 → 개발 → 리뷰 → QA → 관리까지
**사람 팀처럼 역할을 분리하여 개발하는 구조**를 가진다.

## 🎯 목표

- AI가 감으로 개발하지 못하게 한다
- 모든 판단을 문서 기준으로 고정한다
- **Task 단위로 반복 가능한 애자일 개발 파이프라인**을 만든다

## 💡 핵심 개념

이 구조는 AI가 똑똑해서 돌아가는 시스템이 아니다.  
**AI가 규칙을 어기지 못해서** 안정적으로 돌아간다.

---

## 📁 디렉토리 구조

```
artifact-driven-agent/
│
├── README.md
├── .gitignore
│
├── scripts/                       # 🔧 실행 스크립트
│   ├── ai-role.sh                 # Linux/Mac
│   ├── ai-role.ps1                # Windows PowerShell
│   ├── ai-role.bat                # Windows CMD
│   └── lint/
│       └── validate-docs.sh       # 문서 검증 스크립트
│
├── ai-dev-team/                   # 🎯 작업 디렉토리 (setup 후 사용)
│   ├── roles/                     # 세팅된 역할들
│   ├── artifacts/                 # 세팅된 산출물 템플릿
│   │   ├── features/              # Feature 단위 산출물
│   │   │   └── _template/         # Feature 템플릿
│   │   └── rfc/                   # RFC 변경 요청서
│   │       └── RFC-0000-template.md
│   └── rules/                     # 세팅된 규칙들
│
├── core/                          # 🔵 범용 핵심 (소스)
│   ├── roles/                     # 6개: planner, architect, developer,
│   │   │                          #       reviewer, qa, manager
│   │   ├── planner.md
│   │   ├── architect.md
│   │   ├── developer.md
│   │   ├── reviewer.md
│   │   ├── qa.md
│   │   └── manager.md
│   │
│   ├── artifacts/                 # 8개: 공통 산출물 템플릿
│   │   ├── plan.md
│   │   ├── project.md
│   │   ├── backlog.md
│   │   ├── current-sprint.md
│   │   ├── decision.md
│   │   ├── architecture-options.md
│   │   ├── review-report.md
│   │   └── qa-report.md
│   │
│   └── rules/                     # 5개: 공통 규칙
│       ├── iteration.md
│       ├── escalation.md
│       ├── rollback.md
│       ├── document-priority.md
│       └── rfc.md                 # RFC 변경 관리 규칙
│
├── templates/                     # 🟢 프로젝트 유형별 템플릿 (소스)
│   ├── web-dev/                   # 웹 서비스 개발
│   ├── library/                   # 라이브러리/SDK 개발
│   ├── game/                      # 게임 개발
│   └── cli/                       # CLI 도구 개발
│
├── docs/                          # 📖 가이드 문서
│   └── feature-structure.md       # Feature 단위 구조 가이드
│
└── examples/                      # 📚 예제 프로젝트
    └── todo-app/                  # Todo App 예제
        ├── README.md
        └── artifacts/
            ├── plan.md
            ├── project.md
            └── backlog.md
```

---

## 🚀 빠른 시작

### 1단계: 개발 스타일 세팅

```bash
# Linux/Mac
chmod +x scripts/ai-role.sh
./scripts/ai-role.sh setup

# Windows PowerShell
.\scripts\ai-role.ps1 setup

# Windows CMD
scripts\ai-role.bat setup
```

> ⚠️ **Windows PowerShell 오류 시**
> ```powershell
> # 현재 세션에서만 실행 허용
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> .\scripts\ai-role.ps1 setup
> ```

대화형으로 템플릿을 선택하거나 직접 지정:

```bash
./scripts/ai-role.sh setup web      # 웹 서비스 개발
./scripts/ai-role.sh setup library  # 라이브러리 개발
./scripts/ai-role.sh setup game     # 게임 개발
./scripts/ai-role.sh setup cli      # CLI 도구 개발
```

### 2단계: AI 에이전트 실행

```bash
# 대화형으로 역할/도구 선택
./scripts/ai-role.sh

# 또는 직접 지정
./scripts/ai-role.sh backend claude
./scripts/ai-role.sh planner codex
```

---

## 🖥 스크립트 명령어

### 세팅 명령어

| 명령어 | 설명 |
|--------|------|
| `setup` | 대화형으로 템플릿 선택 후 세팅 |
| `setup <template>` | 특정 템플릿으로 세팅 |
| `status` | 현재 세팅 상태 확인 |
| `reset` | ai-dev-team 초기화 |

### 실행 명령어

| 명령어 | 설명 |
|--------|------|
| (인자 없음) | 대화형으로 역할/도구 선택 후 실행 |
| `<role> <tool>` | 직접 역할과 도구 지정해서 실행 |

### 검증/관리 명령어

| 명령어 | 설명 |
|--------|------|
| `validate` | 산출물 문서 검증 (plan.md, project.md 등) |
| `sessions` | AI 실행 세션 목록 |
| `logs` | 가장 최근 세션 로그 확인 |
| `logs <session-id>` | 특정 세션 로그 확인 |

### 예시

```bash
# 웹 개발로 세팅
./scripts/ai-role.sh setup web

# 현재 상태 확인
./scripts/ai-role.sh status

# 문서 검증 (스프린트 시작 전 권장)
./scripts/ai-role.sh validate

# 백엔드 개발자로 Claude 실행
./scripts/ai-role.sh backend claude

# 세션 목록 확인
./scripts/ai-role.sh sessions

# 최근 로그 확인
./scripts/ai-role.sh logs
```

---

## 👥 역할 (Roles)

### Core 역할 (모든 템플릿에서 사용)

| 역할 | 파일 | 책임 |
|------|------|------|
| Planner | planner.md | 요구사항 수집, Task 분해 |
| Architect | architect.md | 규모 예측, 기술 스택 결정 |
| Developer | developer.md | 코드 구현 (범용) |
| Reviewer | reviewer.md | 코드 리뷰 |
| QA | qa.md | 수용 조건 검증 |
| Manager | manager.md | 스프린트 관리, 승인 |

### 템플릿별 특화 역할

| 템플릿 | 역할 | 책임 |
|--------|------|------|
| web | backend | API 설계, 서버 구현 |
| web | frontend | UI 구현, API 연동 |
| library | library-developer | 공개 API 설계, 버전 관리 |
| game | game-logic | 게임 시스템 설계 |
| game | rendering | 화면/이펙트 구현 |
| cli | cli-developer | 명령어 설계, 출력 형식 |

---

## 📄 산출물 (Artifacts)

### Core 산출물

| 문서 | 용도 | 관리자 |
|------|------|--------|
| plan.md | 기획서 | Planner |
| project.md | 기술 기준 (Frozen) | Architect |
| backlog.md | Task 목록 | Planner, Manager |
| current-sprint.md | 현재 스프린트 | Manager |
| decision.md | 판단 기록 | Manager |
| architecture-options.md | 아키텍처 협상 | Architect |
| review-report.md | 리뷰 결과 | Reviewer |
| qa-report.md | QA 결과 | QA |

### 템플릿별 산출물

| 템플릿 | 문서 | 용도 |
|--------|------|------|
| web | api.md | REST API 계약 |
| web | ui.md | 화면 설계 |
| library | public-api.md | 공개 인터페이스 |
| library | examples.md | 사용 예제 |
| library | changelog.md | 버전 변경 이력 |
| game | game-systems.md | 게임 시스템 |
| game | assets.md | 에셋 목록 |
| game | hud.md | HUD/UI 설계 |
| cli | commands.md | 명령어 정의 |
| cli | output-format.md | 출력 형식 |

---

## 📋 규칙 (Rules)

### Core 규칙

| 규칙 | 용도 |
|------|------|
| iteration.md | 스프린트/Task 단위 작업 |
| escalation.md | Manager 보고 기준 |
| rollback.md | REJECT/FAIL 시 되돌림 |
| document-priority.md | 문서 충돌 해결 |
| rfc.md | Frozen 문서 변경 절차 |

### 템플릿별 규칙

| 템플릿 | 규칙 | 용도 |
|--------|------|------|
| web | api-change.md | API 변경 절차 |
| library | versioning.md | Semantic Versioning |
| game | system-change.md | 게임 시스템 변경 |
| cli | command-change.md | 명령어 변경 절차 |

---

## 🔄 워크플로우

### 전체 흐름

```
Planner (plan.md + backlog.md)
    ↓
Architect (project.md)
    ↓
Manager (스프린트 시작)
    ↓
[Sprint Loop]
Developer → Reviewer → QA → Manager (Task 완료)
    ↓
Manager (스프린트 종료)
    ↓
(다음 스프린트 또는 완료)
```

### Task 상태 흐름

```
BACKLOG → READY → IN_SPRINT → IN_DEV → IN_REVIEW → IN_QA → DONE
```

---

## 🔒 RFC (변경 관리)

Frozen 상태인 `project.md`나 확정된 `plan.md`를 변경해야 할 때 사용합니다.

### RFC가 필요한 경우

- project.md 변경
- plan.md의 확정된 기능 범위 변경
- decision.md 항목 번복

### RFC 절차

1. `ai-dev-team/artifacts/rfc/RFC-NNNN-title.md` 작성
2. Manager 리뷰
3. 승인/거부 결정
4. 승인 시: 문서 업데이트 + decision.md 기록

상세 규칙: `core/rules/rfc.md`

---

## 📦 Feature 단위 구조 (대규모 프로젝트)

규모 M 이상, 기능 3개 이상일 때 Feature 단위로 산출물을 분리합니다.

```
ai-dev-team/artifacts/features/
├── F001-user-auth/
│   ├── spec.md      # Feature 스펙
│   ├── api.md       # Feature API
│   ├── ui.md        # Feature UI
│   ├── review.md    # 리뷰 기록
│   └── qa.md        # QA 기록
└── _template/       # 템플릿
```

상세 가이드: `docs/feature-structure.md`

---

## ✅ 문서 검증

스프린트 시작 전 문서 완성도를 자동 검사합니다.

```bash
./scripts/ai-role.sh validate
```

### 검사 항목

- plan.md: 필수 섹션, TBD 3개 이하
- project.md: Frozen 상태, 버전 형식
- backlog.md: Task 개수, 수용 조건
- current-sprint.md: 스프린트 번호, 목표

---

## 🔍 세션/로그 관리

AI 에이전트 실행마다 세션 ID가 부여되어 추적이 가능합니다.

```bash
# 세션 목록
./scripts/ai-role.sh sessions

# 로그 확인
./scripts/ai-role.sh logs
./scripts/ai-role.sh logs 20241227-143022-a1b2c3d4
```

### 세션 ID 형식

```
YYYYMMDD-HHMMSS-<random>
예: 20241227-143022-a1b2c3d4
```

---

## 📚 예제 프로젝트

`examples/todo-app/`에 완성된 예제가 있습니다.

- 규모: S (Small)
- 기간: 1주일
- 완료된 산출물: plan.md, project.md, backlog.md

학습 포인트:
1. 문서 순서: plan → project → 개발
2. 체크리스트로 완성도 보장
3. Task 단위 작업

---

## 📊 템플릿 비교

| 항목 | web | library | game | cli |
|------|:---:|:-------:|:----:|:---:|
| 개발자 역할 | 2개 | 1개 | 2개 | 1개 |
| API 계약 | ✅ | ✅ | - | ✅ |
| 버전 관리 | - | ✅ | - | ✅ |
| 에셋 관리 | - | - | ✅ | - |
| UI/UX 문서 | ✅ | - | ✅ | ✅ |

---

## ⚠️ 핵심 원칙

### 금지 사항

- ❌ 문서 없는 진행
- ❌ 기준 없는 판단
- ❌ 감으로 추가된 기술
- ❌ 스프린트 외 작업
- ❌ 수용 조건 외 기능 추가

### 필수 사항

- ✅ 문서 기준 판단
- ✅ 역할별 책임 분리
- ✅ Task 단위 반복 개발
- ✅ 스프린트 범위 준수

---

## 📚 추가 정보

### 문서 우선순위

```
decision.md > project.md > plan.md > backlog.md > 인터페이스 문서
```

### 에스컬레이션 기준

- project.md에 없는 기술 필요 → BLOCK
- 요구사항 모호 → BLOCK
- 예상보다 규모 큼 → 보고

### 되돌림 규칙

- Reviewer REJECT → Developer 수정
- QA FAIL → 원인에 따라 대상 결정
- 3회 반복 → Manager 개입

---

## 🤝 기여

이 프레임워크는 AI 에이전트 기반 개발의 표준화를 목표로 합니다.
새로운 템플릿이나 규칙 개선 제안은 언제나 환영합니다.
