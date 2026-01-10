# Artifact-Driven AI Agent Framework

**문서 기반 멀티 AI 에이전트 개발 프레임워크**

5개 핵심 역할(Planner, Improver, Developer, Reviewer, Documenter)이 스프린트 단위로 협업하여 안정적인 개발 워크플로우를 만듭니다.

## 🎯 목표

- AI가 감으로 개발하지 못하게 한다
- 모든 판단을 문서 기준으로 고정한다
- **스프린트/Task 단위 반복 개발 파이프라인**을 만든다

## 💡 핵심 개념

이 구조는 AI가 똑똑해서 돌아가는 시스템이 아니다.
**AI가 규칙을 어기지 못해서** 안정적으로 돌아간다.

### 문서 기반 제약 구현

AI 에이전트 실행 시, 시스템 프롬프트에 다음을 포함합니다:

1. **모든 규칙 파일 내용** (rules/*.md)
2. **핵심 산출물 내용** (plan.md, project.md, 현재 스프린트 Task 파일)
3. **인터페이스 문서 내용** (api.md, ui.md 등)

이를 통해 AI는:
- 문서에 명시된 규칙을 따라야만 함
- 현재 스프린트 범위를 벗어날 수 없음
- project.md에 없는 기술을 추가할 수 없음

**파일명만 나열하지 않고, 내용을 포함**하는 것이 핵심입니다.

---

## 🚀 설치

### npm 설치 (권장)

```bash
# 전역 설치
npm install -g @silbaram/artifact-driven-agent

# 또는 npx로 바로 실행
npx @silbaram/artifact-driven-agent setup web
```

### 저장소 클론

```bash
git clone https://github.com/silbaram/artifact-driven-agent.git
cd artifact-driven-agent
npm install
npm link  # 전역 명령어 등록
```

### 설치 확인

```bash
ada --version
ada --help
```

---

## 🖥️ 빠른 시작

### 1. 프로젝트 세팅

```bash
ada setup web       # 웹 서비스
ada setup lib       # 라이브러리
ada setup game      # 게임
ada setup cli       # CLI 도구
```

### 2. 기획 시작

```bash
ada planner claude  # 요구사항 수집 → plan.md + backlog/*.md 생성
```

### 3. 스프린트 생성

```bash
ada sprint create                # 새 스프린트 생성
ada sprint add task-001 task-002 # Task 추가
```

### 4. 개발

```bash
ada developer claude  # Task 구현 → DONE 상태로 변경
```

### 5. 리뷰

```bash
ada reviewer claude   # 코드 리뷰 → review-reports/ 생성
```

### 6. 스프린트 종료 및 정리

```bash
# 기본: 작업 파일을 archive/ 폴더로 이동 (권장)
ada sprint close

# 옵션 1: 작업 파일 완전 삭제 (최종 문서만 유지)
ada sprint close --clean

# 옵션 2: 모든 파일 유지
ada sprint close --keep-all

# 문서 작성
ada documenter claude          # docs/ 디렉토리에 최종 문서 생성
```

**종료 후 구조 (기본):**
```
sprints/sprint-N/
├── meta.md                    # 스프린트 정보
├── docs/                      # 최종 문서 ✅
└── archive/                   # 작업 과정 보관
    ├── tasks/
    └── review-reports/
```

---

## 👥 역할 시스템

### 핵심 역할 (5개) - 모든 프로젝트 필수

| 역할 | 책임 | 산출물 |
|------|------|--------|
| **Planner** | 신규 기능 요구사항 수집, Task 분해 | plan.md, backlog/*.md |
| **Improver** | 기존 기능 개선 분석 및 기획 | improvement-reports/*.md, backlog/*.md |
| **Developer** | 코드 구현, Task 완료 | 소스 코드, Task 파일 업데이트 |
| **Reviewer** | 코드 리뷰, 품질 판정 | review-reports/*.md |
| **Documenter** | 스프린트 완료 시 문서 작성 | API Changelog, Release Notes, User Guide |

### 선택 역할 (1개) - 기존 프로젝트 도입 시

| 역할 | 책임 | 사용 시점 |
|------|------|----------|
| **Analyzer** | 기존 코드베이스 분석, project.md 역생성 | 레거시 프로젝트에 ada 도입 시 |

---

## 📂 디렉토리 구조

### 프로젝트 루트

```
artifact-driven-agent/
├── bin/cli.js              # CLI 진입점
├── src/
│   ├── commands/           # 명령어 구현
│   │   ├── setup.js
│   │   ├── run.js
│   │   ├── sprint.js      # 스프린트 관리
│   │   └── sessions.js    # 세션 모니터링
│   └── utils/
│       ├── files.js
│       └── sessionState.js
├── core/                   # 범용 핵심
│   ├── roles/              # 6개 역할
│   ├── artifacts/          # 산출물 템플릿
│   │   └── sprints/
│   │       └── _template/  # 스프린트 템플릿
│   └── rules/              # 5개 규칙
└── templates/              # 프로젝트 유형별
    ├── web-dev/
    ├── library/
    ├── game/
    └── cli/
```

### 작업 디렉토리 (setup 후)

```
ai-dev-team/
├── artifacts/
│   ├── plan.md             # 전체 요구사항
│   ├── project.md          # 기술 기준 (선택)
│   ├── backlog/            # 스프린트 미할당 Task
│   │   ├── task-001.md
│   │   └── task-002.md
│   └── sprints/            # 스프린트별 디렉토리
│       ├── sprint-1/       # 완료된 스프린트
│       │   ├── meta.md
│       │   ├── tasks/
│       │   │   ├── task-003.md
│       │   │   └── task-004.md
│       │   ├── review-reports/
│       │   │   ├── task-003.md
│       │   │   └── task-004.md
│       │   ├── docs/
│       │   │   ├── api-changelog.md
│       │   │   └── release-notes.md
│       │   └── retrospective.md
│       └── sprint-2/       # 진행 중인 스프린트
│           ├── meta.md
│           └── tasks/
│               └── task-005.md
├── roles/                  # core + template 병합
├── rules/
└── .sessions/              # 세션 이력
    ├── logs/
    └── .ada-status.json    # 멀티 세션 상태 파일
```

---

## 🖥️ CLI 명령어

### 기본 명령어

| 명령어 | 설명 |
|--------|------|
| `ada` | 대화형 모드 |
| `ada setup [template]` | 템플릿 세팅 (web, lib, game, cli) |
| `ada status` | 상태 확인 |
| `ada validate [doc]` | 문서 검증 |
| `ada reset [-f]` | 초기화 |

### 스프린트 관리

| 명령어 | 설명 |
|--------|------|
| `ada sprint create` | 새 스프린트 생성 |
| `ada sprint add task-001 ...` | Task 추가 |
| `ada sprint close` | 스프린트 종료 (작업 파일 archive/) |
| `ada sprint close --clean` | 스프린트 종료 (작업 파일 삭제) |
| `ada sprint close --keep-all` | 스프린트 종료 (파일 유지) |
| `ada sprint list` | 스프린트 목록 |

### AI 에이전트 실행

```bash
# 정식 형식
ada run <role> <tool>

# 단축 형식 (run 생략)
ada <role> <tool>

# 예시
ada planner claude      # 신규 기능 기획
ada improver claude     # 기존 기능 개선 기획
ada developer codex
ada reviewer gemini
ada documenter claude
```

**지원 도구:** claude, codex, gemini, copilot

### 세션 모니터링

```bash
# 세션 목록 및 상태
ada sessions

# 실시간 모니터링 대시보드
ada sessions --watch
ada sessions -w

# 세션 로그 확인
ada logs
ada logs [session-id]
```

---

## 🔄 워크플로우

### 신규 프로젝트

```
1. Planner: 요구사항 수집
   → plan.md + backlog/*.md 생성

2. 사용자: 스프린트 생성
   → ada sprint create
   → ada sprint add task-001 task-002

3. Developer: Task 구현
   → 코드 작성
   → Task 상태를 DONE으로 변경

4. Reviewer: 코드 리뷰
   → review-reports/*.md 생성
   → PASS/REJECT 판정

5. 사용자: 스프린트 종료
   → ada sprint close

6. Documenter: 문서 작성
   → docs/*.md 생성 (API Changelog, Release Notes 등)

7. 다음 스프린트 시작
   → ada sprint create
```

### 기존 프로젝트

```
0. Analyzer: 코드베이스 분석
   → project.md 역생성

1. Planner: 추가 기능 기획
   → plan.md 업데이트
   → backlog/*.md 생성

2. 이후 신규 프로젝트와 동일
```

### Task 상태 흐름

```
BACKLOG → IN_DEV → DONE → (리뷰 후) → 스프린트 완료
```

---

## 📋 규칙 시스템

### Core 규칙 (5개)

| 규칙 | 용도 |
|------|------|
| `iteration.md` | 스프린트/Task 단위 작업 규칙 |
| `escalation.md` | 에스컬레이션 기준 |
| `rollback.md` | REJECT 시 처리 절차 |
| `document-priority.md` | 문서 충돌 시 우선순위 |
| `rfc.md` | Frozen 문서 변경 절차 |

### 템플릿별 규칙

| 템플릿 | 규칙 | 용도 |
|--------|------|------|
| web-dev | `api-change.md` | API 변경 절차 |
| library | `versioning.md` | Semantic Versioning |
| game | `system-change.md` | 게임 시스템 변경 |
| cli | `command-change.md` | CLI 명령어 변경 |

---

## 📄 산출물

### Core 산출물

| 문서 | 관리자 | 용도 |
|------|--------|------|
| plan.md | Planner | 전체 요구사항 |
| project.md | 사용자/팀 (선택) | 기술 기준 (Frozen) |
| backlog/*.md | Planner | 스프린트 미할당 Task |
| sprints/sprint-N/meta.md | 자동 생성 | 스프린트 메타정보 |
| sprints/sprint-N/tasks/*.md | Developer | Task별 상세 정보 |
| sprints/sprint-N/review-reports/*.md | Reviewer | 리뷰 결과 |
| sprints/sprint-N/docs/*.md | Documenter | 릴리스 문서 |
| sprints/sprint-N/retrospective.md | 사용자 | 회고 |

### 템플릿별 산출물

| 템플릿 | 문서 | 용도 |
|--------|------|------|
| web-dev | api.md, ui.md | API 계약, 화면 설계 |
| library | public-api.md, changelog.md | 공개 API, 변경 이력 |
| game | game-systems.md, assets.md | 시스템, 에셋 |
| cli | commands.md, output-format.md | 명령어, 출력 형식 |

---

## 🖥️ 멀티 세션 모드

여러 터미널에서 동시에 다른 역할을 실행할 수 있습니다.

### 사용 예시

```bash
# 터미널 1: Planner
ada planner claude

# 터미널 2: Developer
ada developer codex

# 터미널 3: Reviewer
ada reviewer gemini

# 터미널 4: 실시간 모니터링
ada sessions --watch
```

### 자동 세션 관리

**세션 시작 시:**
- `.ada-status.json`에 자동 등록
- 터미널 타이틀 설정 (예: "ADA: developer (codex)")
- 역할 이모지 배너 표시

**세션 종료 시:**
- 상태 파일에서 자동 제거
- 세션 로그 저장

### 상태 파일

```
ai-dev-team/.sessions/.ada-status.json
```

모든 세션이 이 파일을 통해 상태를 공유합니다.

**구성:**
- `activeSessions[]`: 실행 중인 세션
- `notifications[]`: 세션 간 알림
- (기존 Manager 관련 필드는 제거됨)

---

## ⚠️ 핵심 원칙

### 금지 사항

- ❌ 문서 없는 진행
- ❌ 기준 없는 판단
- ❌ 감으로 추가된 기술
- ❌ 스프린트 외 작업
- ❌ "김에" 리팩토링
- ❌ 역할 간 경계 침범

### 필수 사항

- ✅ 문서 기준 판단
- ✅ 역할별 책임 분리
- ✅ Task 단위 반복 개발
- ✅ 스프린트 단위 관리
- ✅ REJECT 시 원인 분석

---

## 📊 템플릿 비교

| 템플릿 | 설명 | 특화 문서 |
|--------|------|----------|
| **web-dev** | 웹 서비스/API 서버 | api.md, ui.md |
| **library** | npm/pip 라이브러리 | public-api.md, changelog.md |
| **game** | 게임 개발 | game-systems.md, assets.md |
| **cli** | CLI 도구 | commands.md, output-format.md |

---

## 🎯 주요 개선 사항 (v0.2.0)

### 역할 시스템 간소화

**이전 (v0.1.x):**
- 7개 Core 역할 + 템플릿별 특화 역할 (총 13개)
- Manager 중심의 복잡한 승인 프로세스
- 역할 간 blocking 문제 (backend ↔ frontend)

**현재 (v0.2.x):**
- 5개 핵심 역할 (planner, improver, developer, reviewer, documenter)
- 사용자 직접 스프린트 관리 (CLI 명령어)
- 단순화된 워크플로우
- 신규 기능(Planner)과 개선(Improver) 분리

### 스프린트 기반 구조

**이전:**
- 단일 파일 (backlog.md, current-sprint.md)
- Git 충돌 위험
- Task별 독립성 부족

**현재:**
- 디렉토리 기반 (sprints/sprint-N/)
- Task별 개별 파일 (task-NNN.md)
- 리뷰/문서도 Task별 분리
- 완료된 스프린트는 불변 (이력 보존)
- 종료 시 작업 파일 자동 정리 (archive/ 또는 삭제)

### 자동화 개선

**추가된 CLI 명령어:**
- `ada sprint create` - 스프린트 자동 생성
- `ada sprint add` - Task 자동 추가
- `ada sprint close` - 스프린트 종료 및 작업 파일 정리 (archive/clean/keep-all 옵션)
- `ada sprint list` - 스프린트 목록 확인

---

## 🔧 개발 환경

### 필수 요구사항

- Node.js 18+
- npm 7+

### 로컬 개발

```bash
git clone https://github.com/silbaram/artifact-driven-agent.git
cd artifact-driven-agent
npm install
npm link  # 전역 ada 명령어 등록
```

### 테스트

```bash
npm test   # Node.js 내장 test runner 사용
```

---

## 📄 문서

- **CLAUDE.md**: Claude Code AI를 위한 상세 가이드
- **core/roles/*.md**: 각 역할의 상세 규칙
- **core/rules/*.md**: 핵심 규칙 문서
- **templates/*/**: 템플릿별 특화 문서

---

## 🤝 기여

이슈 및 PR 환영합니다!

**보고 위치:**
- GitHub Issues: https://github.com/silbaram/artifact-driven-agent/issues

---

## 📄 라이선스

MIT License

---

## 📮 연락처

- GitHub: [@silbaram](https://github.com/silbaram)
- npm: [@silbaram/artifact-driven-agent](https://www.npmjs.com/package/@silbaram/artifact-driven-agent)
