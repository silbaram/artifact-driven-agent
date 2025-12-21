#!/bin/bash
#
# ai-role.sh - AI 역할 기반 개발 세션 스크립트
#
# 사용법:
#   ./scripts/ai-role.sh <role> <ai-tool>
#   ./scripts/ai-role.sh <role> --set-only
#   ./scripts/ai-role.sh --list
#   ./scripts/ai-role.sh --current
#
# 예시:
#   ./scripts/ai-role.sh planner claude
#   ./scripts/ai-role.sh backend codex
#   ./scripts/ai-role.sh architect gemini
#   ./scripts/ai-role.sh planner --set-only
#

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정
ROLES_DIR="ai/roles"
ARTIFACTS_DIR="ai/artifacts"
CURRENT_ROLE_FILE=".current-ai-role"

# 사용 가능한 역할
AVAILABLE_ROLES=("planner" "architect" "backend" "frontend" "reviewer" "qa" "manager")

# 사용 가능한 AI 도구
AVAILABLE_TOOLS=("claude" "codex" "gemini")

# 함수: 사용법 출력
print_usage() {
    echo -e "${BLUE}AI 역할 기반 개발 세션 스크립트${NC}"
    echo ""
    echo "사용법:"
    echo "  $0 <role> <ai-tool>    역할 설정 후 AI 도구 실행"
    echo "  $0 <role> --set-only   역할만 설정 (AI 도구 실행 안 함)"
    echo "  $0 --list              사용 가능한 역할/도구 목록"
    echo "  $0 --current           현재 설정된 역할 확인"
    echo "  $0 --help              이 도움말 출력"
    echo ""
    echo "역할:"
    echo "  planner    기획자 - 요구사항 수집"
    echo "  architect  아키텍트 - 기술 스택/아키텍처 결정"
    echo "  backend    백엔드 개발자 - 서버 API 구현"
    echo "  frontend   프론트엔드 개발자 - UI 구현"
    echo "  reviewer   리뷰어 - 코드 리뷰"
    echo "  qa         QA - 기획 대비 검증"
    echo "  manager    관리자 - 진행 판단/승인"
    echo ""
    echo "AI 도구:"
    echo "  claude     Claude Code"
    echo "  codex      OpenAI Codex CLI"
    echo "  gemini     Gemini CLI"
    echo ""
    echo "예시:"
    echo "  $0 planner claude      # Planner 역할로 Claude Code 시작"
    echo "  $0 backend codex       # Backend 역할로 Codex 시작"
    echo "  $0 architect --set-only # Architect 역할만 설정"
}

# 함수: 역할/도구 목록 출력
print_list() {
    echo -e "${BLUE}사용 가능한 역할:${NC}"
    for role in "${AVAILABLE_ROLES[@]}"; do
        if [ -f "${ROLES_DIR}/${role}.md" ]; then
            echo -e "  ${GREEN}✓${NC} $role"
        else
            echo -e "  ${RED}✗${NC} $role (파일 없음)"
        fi
    done
    echo ""
    echo -e "${BLUE}사용 가능한 AI 도구:${NC}"
    for tool in "${AVAILABLE_TOOLS[@]}"; do
        if command -v "$tool" &> /dev/null; then
            echo -e "  ${GREEN}✓${NC} $tool (설치됨)"
        else
            echo -e "  ${YELLOW}?${NC} $tool (미확인)"
        fi
    done
}

# 함수: 현재 역할 확인
print_current() {
    if [ -f "$CURRENT_ROLE_FILE" ]; then
        current=$(cat "$CURRENT_ROLE_FILE")
        echo -e "현재 역할: ${GREEN}$current${NC}"
    else
        echo -e "현재 역할: ${YELLOW}설정되지 않음${NC}"
    fi
}

# 함수: 역할 유효성 검사
validate_role() {
    local role=$1
    for r in "${AVAILABLE_ROLES[@]}"; do
        if [ "$r" == "$role" ]; then
            return 0
        fi
    done
    return 1
}

# 함수: AI 도구 유효성 검사
validate_tool() {
    local tool=$1
    for t in "${AVAILABLE_TOOLS[@]}"; do
        if [ "$t" == "$tool" ]; then
            return 0
        fi
    done
    return 1
}

# 함수: 역할 파일 존재 확인
check_role_file() {
    local role=$1
    local role_file="${ROLES_DIR}/${role}.md"
    if [ ! -f "$role_file" ]; then
        echo -e "${RED}오류: 역할 파일을 찾을 수 없습니다: $role_file${NC}"
        exit 1
    fi
}

# 함수: 필수 문서 확인
check_prerequisites() {
    local role=$1
    local missing=()

    case $role in
        architect)
            [ ! -f "${ARTIFACTS_DIR}/plan.md" ] && missing+=("plan.md")
            ;;
        backend|frontend)
            [ ! -f "${ARTIFACTS_DIR}/plan.md" ] && missing+=("plan.md")
            [ ! -f "${ARTIFACTS_DIR}/project.md" ] && missing+=("project.md")
            ;;
        reviewer|qa)
            [ ! -f "${ARTIFACTS_DIR}/plan.md" ] && missing+=("plan.md")
            [ ! -f "${ARTIFACTS_DIR}/project.md" ] && missing+=("project.md")
            ;;
        manager)
            [ ! -f "${ARTIFACTS_DIR}/plan.md" ] && missing+=("plan.md")
            ;;
    esac

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${YELLOW}경고: 다음 필수 문서가 없습니다:${NC}"
        for doc in "${missing[@]}"; do
            echo -e "  - ${ARTIFACTS_DIR}/$doc"
        done
        echo ""
        read -p "계속 진행하시겠습니까? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 함수: 역할 설정
set_role() {
    local role=$1
    echo "$role" > "$CURRENT_ROLE_FILE"
    echo -e "${GREEN}✓ 역할이 '$role'로 설정되었습니다.${NC}"
}

# 함수: AI 도구 실행
run_ai_tool() {
    local role=$1
    local tool=$2
    local role_file="${ROLES_DIR}/${role}.md"
    local role_content=$(cat "$role_file")

    echo -e "${BLUE}AI 도구 실행: $tool (역할: $role)${NC}"
    echo ""

    case $tool in
        claude)
            claude --system-prompt "$role_content"
            ;;
        codex)
            codex --instructions "$role_content"
            ;;
        gemini)
            gemini -p "$role_content"
            ;;
        *)
            echo -e "${RED}오류: 알 수 없는 AI 도구: $tool${NC}"
            exit 1
            ;;
    esac
}

# 메인 로직
main() {
    # 인자 없음
    if [ $# -eq 0 ]; then
        print_usage
        exit 0
    fi

    # 옵션 처리
    case $1 in
        --help|-h)
            print_usage
            exit 0
            ;;
        --list|-l)
            print_list
            exit 0
            ;;
        --current|-c)
            print_current
            exit 0
            ;;
    esac

    # 역할 검증
    local role=$1
    if ! validate_role "$role"; then
        echo -e "${RED}오류: 알 수 없는 역할: $role${NC}"
        echo "사용 가능한 역할: ${AVAILABLE_ROLES[*]}"
        exit 1
    fi

    # 역할 파일 확인
    check_role_file "$role"

    # 두 번째 인자 처리
    if [ $# -lt 2 ]; then
        echo -e "${RED}오류: AI 도구 또는 --set-only를 지정해주세요.${NC}"
        echo "예: $0 $role claude"
        echo "예: $0 $role --set-only"
        exit 1
    fi

    local second_arg=$2

    if [ "$second_arg" == "--set-only" ]; then
        # 역할만 설정
        set_role "$role"
        exit 0
    fi

    # AI 도구 검증
    local tool=$second_arg
    if ! validate_tool "$tool"; then
        echo -e "${RED}오류: 알 수 없는 AI 도구: $tool${NC}"
        echo "사용 가능한 도구: ${AVAILABLE_TOOLS[*]}"
        exit 1
    fi

    # 필수 문서 확인
    check_prerequisites "$role"

    # 역할 설정 및 AI 도구 실행
    set_role "$role"
    run_ai_tool "$role" "$tool"
}

# 스크립트 실행
main "$@"
