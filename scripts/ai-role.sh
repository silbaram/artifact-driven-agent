#!/bin/bash

#===============================================================================
# AI Role Launcher - Setup & Run
# 개발 스타일을 세팅하고 AI 에이전트를 실행합니다.
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 스크립트 위치 기준으로 프로젝트 루트 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 디렉토리 설정
CORE_DIR="$PROJECT_ROOT/core"
TEMPLATES_DIR="$PROJECT_ROOT/templates"
WORKSPACE_DIR="$PROJECT_ROOT/ai-dev-team"
CONFIG_FILE="$WORKSPACE_DIR/.current-template"

#===============================================================================
# 템플릿 정의
#===============================================================================

declare -A TEMPLATES
TEMPLATES["web"]="web-dev:웹 서비스 개발 (Backend/Frontend 분리)"
TEMPLATES["library"]="library:라이브러리/SDK 개발"
TEMPLATES["game"]="game:게임 개발 (Logic/Rendering 분리)"
TEMPLATES["cli"]="cli:CLI 도구 개발"

#===============================================================================
# 템플릿별 역할
#===============================================================================

declare -A TEMPLATE_ROLES
TEMPLATE_ROLES["web-dev"]="backend frontend"
TEMPLATE_ROLES["library"]="library-developer"
TEMPLATE_ROLES["game"]="game-logic rendering"
TEMPLATE_ROLES["cli"]="cli-developer"

# Core 역할
CORE_ROLES="planner architect developer reviewer qa manager"

#===============================================================================
# AI 도구 정의
#===============================================================================

declare -A AI_TOOLS
AI_TOOLS["claude"]="claude:Claude Code"
AI_TOOLS["codex"]="codex:OpenAI Codex CLI"
AI_TOOLS["gemini"]="gemini:Google Gemini CLI"

#===============================================================================
# 함수들
#===============================================================================

show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              AI Dev Team - Role Launcher                       ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

show_help() {
    echo -e "${GREEN}사용법:${NC}"
    echo ""
    echo -e "${YELLOW}세팅 명령어:${NC}"
    echo "  $0 setup                # 대화형으로 템플릿 선택"
    echo "  $0 setup <template>     # 특정 템플릿으로 세팅"
    echo "  $0 status               # 현재 세팅 확인"
    echo "  $0 reset                # ai-dev-team 초기화"
    echo ""
    echo -e "${YELLOW}실행 명령어:${NC}"
    echo "  $0                      # 대화형으로 역할/도구 선택"
    echo "  $0 <role> <tool>        # 직접 실행"
    echo ""
    echo -e "${GREEN}템플릿:${NC}"
    echo "  web      - 웹 서비스 개발"
    echo "  library  - 라이브러리/SDK 개발"
    echo "  game     - 게임 개발"
    echo "  cli      - CLI 도구 개발"
    echo ""
    echo -e "${GREEN}Core 역할 (모든 템플릿):${NC}"
    echo "  planner, architect, developer, reviewer, qa, manager"
    echo ""
    echo -e "${GREEN}템플릿별 역할:${NC}"
    echo "  web:     backend, frontend"
    echo "  library: library-developer"
    echo "  game:    game-logic, rendering"
    echo "  cli:     cli-developer"
    echo ""
    echo -e "${GREEN}AI 도구:${NC}"
    echo "  claude, codex, gemini"
    echo ""
    echo -e "${GREEN}예시:${NC}"
    echo "  $0 setup web           # 웹 개발로 세팅"
    echo "  $0 backend claude      # 백엔드 역할로 실행"
    echo "  $0 planner codex       # 플래너 역할로 실행"
}

get_current_template() {
    if [ -f "$CONFIG_FILE" ]; then
        cat "$CONFIG_FILE"
    else
        echo ""
    fi
}

show_status() {
    local current=$(get_current_template)
    
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📊 현재 상태${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ -z "$current" ]; then
        echo -e "  세팅: ${RED}미설정${NC}"
        echo ""
        echo -e "  ${YELLOW}먼저 '$0 setup' 명령어로 템플릿을 선택하세요.${NC}"
    else
        IFS=':' read -r template_key template_dir <<< "$current"
        echo -e "  템플릿: ${CYAN}$template_key${NC} ($template_dir)"
        echo ""
        echo -e "  ${BLUE}[사용 가능한 역할]${NC}"
        echo -e "  Core: $CORE_ROLES"
        echo -e "  전용: ${TEMPLATE_ROLES[$template_dir]}"
    fi
    echo ""
}

select_template() {
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📦 개발 스타일을 선택하세요:${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local i=1
    local template_keys=()
    for key in "${!TEMPLATES[@]}"; do
        template_keys+=("$key")
        IFS=':' read -r dir desc <<< "${TEMPLATES[$key]}"
        echo -e "  ${CYAN}$i)${NC} $key - $desc"
        ((i++))
    done
    echo ""
    
    read -p "선택 (1-${#TEMPLATES[@]}): " choice
    
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#TEMPLATES[@]} ]; then
        SELECTED_TEMPLATE="${template_keys[$((choice-1))]}"
    else
        echo -e "${RED}잘못된 선택입니다.${NC}"
        exit 1
    fi
}

do_setup() {
    local template_key="$1"
    
    # 템플릿 검증
    if [ -z "${TEMPLATES[$template_key]}" ]; then
        echo -e "${RED}알 수 없는 템플릿: $template_key${NC}"
        echo "사용 가능: web, library, game, cli"
        exit 1
    fi
    
    IFS=':' read -r template_dir template_desc <<< "${TEMPLATES[$template_key]}"
    
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🔧 ai-dev-team 세팅 중...${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  템플릿: ${CYAN}$template_key${NC} - $template_desc"
    echo ""
    
    # 기존 파일 정리 (.gitkeep과 .current-template, README.md 제외)
    find "$WORKSPACE_DIR/roles" -type f ! -name '.gitkeep' -delete 2>/dev/null || true
    find "$WORKSPACE_DIR/artifacts" -type f ! -name '.gitkeep' -delete 2>/dev/null || true
    find "$WORKSPACE_DIR/rules" -type f ! -name '.gitkeep' -delete 2>/dev/null || true
    
    # 1. Core 파일 복사
    echo -e "  ${BLUE}[1/2]${NC} Core 파일 복사 중..."
    cp "$CORE_DIR/roles/"*.md "$WORKSPACE_DIR/roles/" 2>/dev/null || true
    cp "$CORE_DIR/artifacts/"*.md "$WORKSPACE_DIR/artifacts/" 2>/dev/null || true
    cp "$CORE_DIR/rules/"*.md "$WORKSPACE_DIR/rules/" 2>/dev/null || true
    
    # 2. 템플릿 파일 복사 (덮어쓰기)
    local template_path="$TEMPLATES_DIR/$template_dir"
    echo -e "  ${BLUE}[2/2]${NC} 템플릿 파일 복사 중... ($template_dir)"
    
    if [ -d "$template_path/roles" ]; then
        cp "$template_path/roles/"*.md "$WORKSPACE_DIR/roles/" 2>/dev/null || true
    fi
    if [ -d "$template_path/artifacts" ]; then
        cp "$template_path/artifacts/"*.md "$WORKSPACE_DIR/artifacts/" 2>/dev/null || true
    fi
    if [ -d "$template_path/rules" ]; then
        cp "$template_path/rules/"*.md "$WORKSPACE_DIR/rules/" 2>/dev/null || true
    fi
    
    # 현재 템플릿 저장
    echo "$template_key:$template_dir" > "$CONFIG_FILE"
    
    echo ""
    echo -e "${GREEN}✓ 세팅 완료!${NC}"
    echo ""
    echo -e "  위치: ${CYAN}ai-dev-team/${NC}"
    echo ""
    echo -e "  ${BLUE}[설치된 파일]${NC}"
    echo -e "  - roles:     $(ls -1 "$WORKSPACE_DIR/roles/"*.md 2>/dev/null | wc -l)개"
    echo -e "  - artifacts: $(ls -1 "$WORKSPACE_DIR/artifacts/"*.md 2>/dev/null | wc -l)개"
    echo -e "  - rules:     $(ls -1 "$WORKSPACE_DIR/rules/"*.md 2>/dev/null | wc -l)개"
    echo ""
    echo -e "  ${BLUE}[사용 가능한 역할]${NC}"
    echo -e "  Core: $CORE_ROLES"
    echo -e "  전용: ${TEMPLATE_ROLES[$template_dir]}"
    echo ""
    echo -e "  이제 ${CYAN}'$0 <role> <tool>'${NC} 명령어로 AI를 실행하세요."
    echo ""
}

do_reset() {
    echo -e "${YELLOW}ai-dev-team 디렉토리를 초기화합니다...${NC}"
    
    find "$WORKSPACE_DIR/roles" -type f ! -name '.gitkeep' -delete 2>/dev/null || true
    find "$WORKSPACE_DIR/artifacts" -type f ! -name '.gitkeep' -delete 2>/dev/null || true
    find "$WORKSPACE_DIR/rules" -type f ! -name '.gitkeep' -delete 2>/dev/null || true
    rm -f "$CONFIG_FILE"
    
    echo -e "${GREEN}✓ 초기화 완료${NC}"
}

select_role() {
    local current=$(get_current_template)
    IFS=':' read -r template_key template_dir <<< "$current"
    
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}👤 역할을 선택하세요:${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${BLUE}[Core 역할]${NC}"
    local i=1
    local all_roles=()
    
    for role in $CORE_ROLES; do
        all_roles+=("$role")
        echo -e "  ${CYAN}$i)${NC} $role"
        ((i++))
    done
    
    # 템플릿별 역할
    local template_roles="${TEMPLATE_ROLES[$template_dir]}"
    if [ -n "$template_roles" ]; then
        echo ""
        echo -e "${BLUE}[$template_key 전용 역할]${NC}"
        for role in $template_roles; do
            all_roles+=("$role")
            echo -e "  ${CYAN}$i)${NC} $role"
            ((i++))
        done
    fi
    
    echo ""
    read -p "선택 (1-$((i-1))): " choice
    
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -lt "$i" ]; then
        SELECTED_ROLE="${all_roles[$((choice-1))]}"
        echo -e "${GREEN}✓ 선택됨: $SELECTED_ROLE${NC}"
    else
        echo -e "${RED}잘못된 선택입니다.${NC}"
        exit 1
    fi
}

select_tool() {
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🤖 AI 도구를 선택하세요:${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local i=1
    local tool_keys=()
    for key in "${!AI_TOOLS[@]}"; do
        tool_keys+=("$key")
        IFS=':' read -r cmd desc <<< "${AI_TOOLS[$key]}"
        echo -e "  ${CYAN}$i)${NC} $key - $desc"
        ((i++))
    done
    echo ""
    
    read -p "선택 (1-${#AI_TOOLS[@]}): " choice
    
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#AI_TOOLS[@]} ]; then
        SELECTED_TOOL="${tool_keys[$((choice-1))]}"
        echo -e "${GREEN}✓ 선택됨: $SELECTED_TOOL${NC}"
    else
        echo -e "${RED}잘못된 선택입니다.${NC}"
        exit 1
    fi
}

build_system_prompt() {
    local role="$1"
    local prompt=""
    
    # 1. 규칙들 로드
    for rule_file in "$WORKSPACE_DIR/rules/"*.md; do
        if [ -f "$rule_file" ]; then
            prompt+="$(cat "$rule_file")"$'\n\n'
        fi
    done
    
    # 2. 역할 파일 로드
    local role_file="$WORKSPACE_DIR/roles/$role.md"
    
    if [ -f "$role_file" ]; then
        prompt+="$(cat "$role_file")"
    else
        echo -e "${RED}역할 파일을 찾을 수 없습니다: $role_file${NC}"
        echo "사용 가능한 역할:"
        ls -1 "$WORKSPACE_DIR/roles/"*.md 2>/dev/null | xargs -n1 basename | sed 's/\.md$//'
        exit 1
    fi
    
    echo "$prompt"
}

run_ai_tool() {
    local role="$1"
    local tool="$2"
    
    local current=$(get_current_template)
    IFS=':' read -r template_key template_dir <<< "$current"
    
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🚀 AI 에이전트 시작${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  템플릿: ${CYAN}$template_key${NC}"
    echo -e "  역할:   ${CYAN}$role${NC}"
    echo -e "  도구:   ${CYAN}$tool${NC}"
    echo -e "  작업공간: ${CYAN}ai-dev-team/${NC}"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local prompt=$(build_system_prompt "$role")
    
    case "$tool" in
        claude)
            if command -v claude &> /dev/null; then
                claude --system-prompt "$prompt"
            else
                echo -e "${RED}Claude Code가 설치되어 있지 않습니다.${NC}"
                echo "설치: npm install -g @anthropic-ai/claude-code"
                exit 1
            fi
            ;;
        codex)
            if command -v codex &> /dev/null; then
                codex --instructions "$prompt"
            else
                echo -e "${RED}Codex CLI가 설치되어 있지 않습니다.${NC}"
                exit 1
            fi
            ;;
        gemini)
            if command -v gemini &> /dev/null; then
                gemini -p "$prompt"
            else
                echo -e "${RED}Gemini CLI가 설치되어 있지 않습니다.${NC}"
                exit 1
            fi
            ;;
        *)
            echo -e "${RED}알 수 없는 도구: $tool${NC}"
            exit 1
            ;;
    esac
}

#===============================================================================
# 메인 실행
#===============================================================================

main() {
    show_banner
    
    # 명령어 처리
    case "$1" in
        -h|--help)
            show_help
            exit 0
            ;;
        setup)
            if [ -z "$2" ]; then
                select_template
                do_setup "$SELECTED_TEMPLATE"
            else
                do_setup "$2"
            fi
            exit 0
            ;;
        status)
            show_status
            exit 0
            ;;
        reset)
            do_reset
            exit 0
            ;;
    esac
    
    # 세팅 확인
    local current=$(get_current_template)
    if [ -z "$current" ]; then
        echo -e "${RED}⚠️  아직 템플릿이 세팅되지 않았습니다.${NC}"
        echo ""
        echo -e "먼저 ${CYAN}'$0 setup'${NC} 명령어로 개발 스타일을 선택하세요."
        echo ""
        exit 1
    fi
    
    # 직접 실행 모드 (2개 인자: role tool)
    if [ $# -eq 2 ]; then
        SELECTED_ROLE="$1"
        SELECTED_TOOL="$2"
        run_ai_tool "$SELECTED_ROLE" "$SELECTED_TOOL"
        exit 0
    fi
    
    # 대화형 모드
    if [ $# -eq 0 ]; then
        show_status
        select_role
        select_tool
        run_ai_tool "$SELECTED_ROLE" "$SELECTED_TOOL"
        exit 0
    fi
    
    # 잘못된 인자
    echo -e "${RED}잘못된 인자입니다.${NC}"
    show_help
    exit 1
}

main "$@"
