# AI Role-Based Development Pipeline

이 프로젝트는 **CLI 기반 멀티 AI 에이전트**를 사용해  
기획 → 아키텍처 → 개발 → 리뷰 → QA → 관리까지  
**사람 팀처럼 역할을 분리하여 개발하는 구조**를 가진다.

## 목표

- AI가 감으로 개발하지 못하게 한다
- 모든 판단을 문서 기준으로 고정한다
- 기능 단위로 반복 가능한 개발 파이프라인을 만든다

## 핵심 개념

이 구조는 AI가 똑똑해서 돌아가는 시스템이 아니다.  
**AI가 규칙을 어기지 못해서** 안정적으로 돌아간다.

- 사용자는 CLI 대화만 한다
- AI는 역할(Role)에 따라 행동한다
- 모든 결정과 결과는 문서로 남긴다
- 다음 단계 진행 여부는 Manager가 판단한다

---

## 디렉토리 구조

```
project-root/
├── ai/
│   ├── roles/                    # AI 역할 정의 (행동 규칙)
│   │   ├── planner.md            # 기획자
│   │   ├── architect.md          # 아키텍트
│   │   ├── backend.md            # 백엔드 개발자
│   │   ├── frontend.md           # 프론트엔드 개발자
│   │   ├── reviewer.md           # 리뷰어
│   │   ├── qa.md                 # QA
│   │   └── manager.md            # 관리자
│   │
│   └── artifacts/                # 산출물 (문서 기준)
│       ├── plan.md               # 기획 결과 (단일 진실)
│       ├── architecture-options.md  # 아키텍처 제안/협상
│       ├── project.md            # 확정된 개발 기준 (헌법)
│       ├── api.md                # 백엔드 ↔ 프론트 API 계약
│       ├── ui.md                 # 프론트엔드 화면 요약
│       ├── review-report.md      # 리뷰 결과
│       ├── qa-report.md          # QA 결과
│       └── decision.md           # 관리자 판단 기록
│
├── scripts/
│   ├── ai-role.sh                # Linux/Mac 스크립트
│   ├── ai-role.bat               # Windows CMD 스크립트
│   └── ai-role.ps1               # Windows PowerShell 스크립트
│
└── src/                          # 프로젝트 소스 코드
```

---

## 역할(Role) 설명

| 역할 | 파일 | 담당 업무 | 산출물 |
|------|------|----------|--------|
| **Planner** | planner.md | 사용자와 CLI 대화로 요구사항 수집. 기술/구현에는 관여 안 함 | plan.md |
| **Architect** | architect.md | 규모(S/M/L) 예측, 기술/아키텍처 선택지 제안 | project.md |
| **Backend** | backend.md | plan.md, project.md 기준으로 서버 구현 | api.md, 서버 코드 |
| **Frontend** | frontend.md | plan.md, api.md, project.md 기준으로 UI 구현 | ui.md, 클라이언트 코드 |
| **Reviewer** | reviewer.md | 기술/구조 관점 검토. REJECT 시 QA 진행 불가 | review-report.md |
| **QA** | qa.md | "기획대로 되었는지"만 검증 | qa-report.md |
| **Manager** | manager.md | 전체 파이프라인 Gatekeeper. 진행/중단/되돌림 판단 | decision.md |

---

## 전체 개발 흐름

```
사용자
  ↓ (CLI 대화)
Planner
  ↓ plan.md
Architect
  ↓ architecture-options.md → project.md (Freeze)
Backend / Frontend
  ↓ api.md / ui.md
Reviewer
  ↓ review-report.md
QA
  ↓ qa-report.md
Manager
  ↓ decision.md
```

---

## AI 도구 사용법

지원하는 AI CLI 도구: **Codex**, **Claude Code**, **Gemini CLI**

### 방법 1: 스크립트로 역할 전환 (권장)

프로젝트 루트에서 스크립트를 실행하면 역할 설정과 AI 도구 실행을 한 번에 처리한다.

**Linux/Mac:**
```bash
# 사용법
./scripts/ai-role.sh <role> <ai-tool>

# 예시
./scripts/ai-role.sh planner claude      # Planner 역할로 Claude Code 시작
./scripts/ai-role.sh backend codex       # Backend 역할로 Codex 시작
./scripts/ai-role.sh architect gemini    # Architect 역할로 Gemini 시작

# 유틸리티
./scripts/ai-role.sh planner --set-only  # 역할만 설정 (AI 실행 안 함)
./scripts/ai-role.sh --list              # 사용 가능한 역할/도구 목록
./scripts/ai-role.sh --current           # 현재 설정된 역할 확인
```

**Windows (PowerShell, 권장):**
```powershell
# 사용법
.\scripts\ai-role.ps1 <role> <ai-tool>

# 예시
.\scripts\ai-role.ps1 planner claude
.\scripts\ai-role.ps1 backend codex

# 유틸리티
.\scripts\ai-role.ps1 -List
.\scripts\ai-role.ps1 -Current
```

**Windows (CMD):**
```cmd
scripts\ai-role.bat planner claude
scripts\ai-role.bat backend codex
```

### 방법 2: CLI 옵션으로 직접 역할 주입

스크립트 없이 프로젝트 루트에서 직접 실행할 수도 있다.

**Linux/Mac:**
```bash
# Claude Code
claude --system-prompt "$(cat ai/roles/planner.md)"

# Codex
codex --instructions "$(cat ai/roles/planner.md)"

# Gemini CLI
gemini -p "$(cat ai/roles/planner.md)"
```

**Windows (PowerShell):**
```powershell
# Claude Code
claude --system-prompt (Get-Content ai/roles/planner.md -Raw)

# Codex
codex --instructions (Get-Content ai/roles/planner.md -Raw)

# Gemini CLI
gemini -p (Get-Content ai/roles/planner.md -Raw)
```

---

## AI 도구별 상세 설정

### Codex CLI

| 방법 | 설명 |
|------|------|
| `AGENTS.md` | 프로젝트 루트에 두면 자동 인식 |
| `--instructions` | CLI 옵션으로 직접 전달 |
| 첫 프롬프트 | "ai/roles/planner.md 읽고 역할 수행해" |

### Claude Code

| 방법 | 설명 |
|------|------|
| `CLAUDE.md` | 프로젝트 루트에 두면 자동 인식 |
| `--system-prompt` | CLI 옵션으로 직접 전달 |
| `/add-context` | 세션 중 파일 추가: `/add-context ai/roles/planner.md` |

### Gemini CLI

| 방법 | 설명 |
|------|------|
| `GEMINI.md` | 프로젝트 루트에 두면 자동 인식 |
| `-p` | CLI 옵션으로 직접 전달 |
| `@파일명` | 세션 중 파일 참조: `@ai/roles/planner.md` |

### 요약 표

| 도구 | 자동 인식 파일 | CLI 옵션 | 런타임 주입 |
|------|---------------|----------|------------|
| Codex | `AGENTS.md` | `--instructions` | 첫 프롬프트 |
| Claude Code | `CLAUDE.md` | `--system-prompt` | `/add-context` |
| Gemini CLI | `GEMINI.md` | `-p` | `@파일명` |

---

## 실전 운영 가이드

### 1) 기획 세션 (사용자 ↔ Planner)

```bash
./scripts/ai-role.sh planner claude
```

**목표:** 대화로 요구사항 확정 → `plan.md` 완성

**세션 동작:**
- Planner가 질문 1~3개씩
- 사용자 답변
- Planner가 plan.md 갱신
- "미확정"을 최대한 줄임

**종료 조건:** plan.md에 핵심 기능 목록, 사용자 흐름, 미확정 항목이 정리됨

> ⚠️ 기획 단계에서 기술 얘기 나오면 Planner가 **거절**해야 정상

---

### 2) 아키텍처 세션 (사용자 ↔ Architect)

```bash
./scripts/ai-role.sh architect claude
```

**목표:** 규모 예측, 스택/인프라 선택 → `project.md` 확정(Frozen)

**세션 동작:**
- Architect가 규모 판단 근거 제시
- A/B/C 옵션 제안
- 사용자가 선택/수정 지시
- `architecture-options.md` 갱신 반복
- 확정되면 `project.md` 고정

**종료 조건 (필수):** project.md에 규모, 백엔드/프론트 스택, DB/캐시/메시징 명시, 금지사항 포함

> ⚠️ 여기까지 안 끝나면 개발 들어가면 안 됨. 무조건 흔들림.

---

### 3) 개발 세션 (Backend / Frontend)

```bash
./scripts/ai-role.sh backend codex
./scripts/ai-role.sh frontend codex
```

**백엔드 작업 순서:**
1. `api.md` 먼저 작성/갱신 (계약서)
2. 계약서 기준으로 구현
3. 테스트/실행

**시작 지시 예시:**
> "plan.md와 project.md 기준으로 api.md부터 만들고, 그 다음 구현 진행해줘"

---

### 4) 리뷰 → QA → 승인

```bash
./scripts/ai-role.sh reviewer claude   # review-report.md
./scripts/ai-role.sh qa claude         # qa-report.md
./scripts/ai-role.sh manager claude    # decision.md
```

---

## 기능 단위 반복 (Iteration)

이 구조는 **기능 하나씩 완성하며 반복**한다.

### 기능 추가 시 동작 방식
1. 사용자: 새 기능 요구 (CLI)
2. Planner: `plan.md`에 기능 추가
3. Manager: 아키텍처 재검토 필요 여부 판단
4. Backend / Frontend: `api.md`, `ui.md` 증분 업데이트
5. Reviewer → QA → Manager 순서로 검증
6. `decision.md`에 "Feature 완료" 기록

### 규칙
- `project.md`는 대부분 유지
- Breaking change는 **Manager 승인 없이는 금지**
- 문서 없는 진행은 불가

---

## 핵심 원칙

**금지:**
- ❌ 문서 없는 진행
- ❌ 기준 없는 판단
- ❌ 감으로 추가된 기술
- ❌ "MVP니까 괜찮음"

**필수:**
- ✅ 문서 기준 판단
- ✅ 역할별 책임 분리
- ✅ 기능 단위 반복 개발

---

## 주의사항

### 프로젝트 루트에서 실행
반드시 프로젝트 루트 디렉토리에서 스크립트를 실행해야 코드 전체에 접근 가능하다.

### 역할 간 문서 의존성
각 역할은 이전 단계의 문서가 있어야 정상 동작한다.

| 역할 | 필요 문서 |
|------|----------|
| Architect | plan.md |
| Backend | plan.md, project.md |
| Frontend | plan.md, project.md, api.md |
| Reviewer | plan.md, project.md |
| QA | plan.md, project.md |
| Manager | plan.md |

### 역할별 금지사항 (CRITICAL)
각 역할은 자신의 범위를 넘어서는 수정이 금지된다:
- Planner: 기술 스택 선택 금지
- Architect: 요구사항 변경 금지
- Backend/Frontend: project.md에 없는 기술 도입 금지

---

## 역할별 권장 AI 도구

| 역할 | 권장 도구 | 이유 |
|------|----------|------|
| Planner | Claude, Gemini | 자연어 대화에 강함 |
| Architect | Claude | 구조적 분석/제안에 적합 |
| Backend | Codex, Claude | 코드 생성에 강함 |
| Frontend | Codex, Claude | 코드 생성에 강함 |
| Reviewer | Claude | 코드 분석/리뷰에 적합 |
| QA | Gemini, Claude | 문서 기반 검증에 적합 |
| Manager | Claude | 판단/의사결정에 적합 |
