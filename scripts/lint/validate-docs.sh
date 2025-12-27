#!/bin/bash

#===============================================================================
# Document Validator - 산출물 문서 검증
# 필수 섹션 존재 여부, 체크리스트 완료 여부 검사
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 스크립트 위치
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
WORKSPACE_DIR="$PROJECT_ROOT/ai-dev-team"

# 카운터
PASS=0
FAIL=0
WARN=0

#===============================================================================
# 유틸리티 함수
#===============================================================================

log_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

check_section_exists() {
    local file="$1"
    local section="$2"
    
    if grep -q "^## .*${section}" "$file" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

count_unchecked() {
    local file="$1"
    grep -c '\- \[ \]' "$file" 2>/dev/null || echo "0"
}

count_checked() {
    local file="$1"
    grep -c '\- \[x\]' "$file" 2>/dev/null || echo "0"
}

#===============================================================================
# plan.md 검증
#===============================================================================

validate_plan() {
    local file="$WORKSPACE_DIR/artifacts/plan.md"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 plan.md 검증${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ ! -f "$file" ]; then
        log_fail "plan.md 파일이 존재하지 않습니다"
        return
    fi
    
    # 필수 섹션 검사
    local required_sections=(
        "서비스 개요"
        "기능 목록"
        "사용자 흐름"
        "비기능 요구사항"
        "제약 사항"
        "미확정 항목"
    )
    
    for section in "${required_sections[@]}"; do
        if check_section_exists "$file" "$section"; then
            log_pass "섹션 존재: $section"
        else
            log_fail "섹션 누락: $section"
        fi
    done
    
    # TBD 개수 검사
    local tbd_count=$(grep -c 'TBD-[0-9]' "$file" 2>/dev/null || echo "0")
    if [ "$tbd_count" -le 3 ]; then
        log_pass "TBD 항목: ${tbd_count}개 (3개 이하)"
    else
        log_fail "TBD 항목: ${tbd_count}개 (3개 초과 - Architect 진행 불가)"
    fi
    
    # 체크리스트 완료율
    local unchecked=$(count_unchecked "$file")
    local checked=$(count_checked "$file")
    local total=$((unchecked + checked))
    
    if [ "$total" -gt 0 ]; then
        local pct=$((checked * 100 / total))
        if [ "$unchecked" -eq 0 ]; then
            log_pass "체크리스트: 100% 완료 (${checked}/${total})"
        else
            log_warn "체크리스트: ${pct}% 완료 (${checked}/${total})"
        fi
    fi
}

#===============================================================================
# project.md 검증
#===============================================================================

validate_project() {
    local file="$WORKSPACE_DIR/artifacts/project.md"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 project.md 검증${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ ! -f "$file" ]; then
        log_fail "project.md 파일이 존재하지 않습니다"
        return
    fi
    
    # 필수 섹션 검사
    local required_sections=(
        "프로젝트 규모 정의"
        "기술 스택"
        "아키텍처 규칙"
        "품질 기준"
        "제약 및 금지 사항"
    )
    
    for section in "${required_sections[@]}"; do
        if check_section_exists "$file" "$section"; then
            log_pass "섹션 존재: $section"
        else
            log_fail "섹션 누락: $section"
        fi
    done
    
    # Frozen 상태 확인
    if grep -q "Frozen" "$file"; then
        log_pass "Frozen 상태 표시 존재"
    else
        log_warn "Frozen 상태 표시 없음"
    fi
    
    # 버전 형식 검사 (1.x 같은 모호한 버전 금지)
    if grep -qE '\| [0-9]+\.x' "$file"; then
        log_fail "모호한 버전 표기 발견 (예: 1.x) - 구체적 버전 필요"
    else
        log_pass "버전 표기 형식 적절"
    fi
}

#===============================================================================
# backlog.md 검증
#===============================================================================

validate_backlog() {
    local file="$WORKSPACE_DIR/artifacts/backlog.md"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 backlog.md 검증${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ ! -f "$file" ]; then
        log_fail "backlog.md 파일이 존재하지 않습니다"
        return
    fi
    
    # Task 개수 확인
    local task_count=$(grep -c '^### TASK-[0-9]' "$file" 2>/dev/null || echo "0")
    if [ "$task_count" -gt 0 ]; then
        log_pass "Task 정의: ${task_count}개"
    else
        log_warn "정의된 Task 없음"
    fi
    
    # 수용 조건 없는 Task 검사
    local tasks_without_ac=$(grep -B5 '^### TASK-' "$file" | grep -c '수용 조건' 2>/dev/null || echo "0")
    if [ "$tasks_without_ac" -ge "$task_count" ] && [ "$task_count" -gt 0 ]; then
        log_pass "모든 Task에 수용 조건 존재"
    elif [ "$task_count" -gt 0 ]; then
        log_warn "일부 Task에 수용 조건 누락 가능"
    fi
}

#===============================================================================
# current-sprint.md 검증
#===============================================================================

validate_sprint() {
    local file="$WORKSPACE_DIR/artifacts/current-sprint.md"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 current-sprint.md 검증${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ ! -f "$file" ]; then
        log_warn "current-sprint.md 파일이 존재하지 않습니다 (스프린트 시작 전)"
        return
    fi
    
    # 스프린트 번호 확인
    if grep -qE 'Sprint [0-9]+' "$file"; then
        log_pass "스프린트 번호 존재"
    else
        log_fail "스프린트 번호 없음"
    fi
    
    # 목표 확인
    if check_section_exists "$file" "스프린트 목표"; then
        log_pass "스프린트 목표 섹션 존재"
    else
        log_fail "스프린트 목표 섹션 누락"
    fi
}

#===============================================================================
# 전체 검증
#===============================================================================

validate_all() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║           Document Validator - 산출물 검증                      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "작업 디렉토리: ${YELLOW}$WORKSPACE_DIR${NC}"
    
    validate_plan
    validate_project
    validate_backlog
    validate_sprint
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 검증 결과${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${GREEN}PASS${NC}: $PASS"
    echo -e "  ${RED}FAIL${NC}: $FAIL"
    echo -e "  ${YELLOW}WARN${NC}: $WARN"
    echo ""
    
    if [ "$FAIL" -gt 0 ]; then
        echo -e "${RED}❌ 검증 실패 - $FAIL개 항목 수정 필요${NC}"
        exit 1
    elif [ "$WARN" -gt 0 ]; then
        echo -e "${YELLOW}⚠️ 검증 통과 (경고 $WARN개)${NC}"
        exit 0
    else
        echo -e "${GREEN}✅ 검증 완료 - 모든 항목 통과${NC}"
        exit 0
    fi
}

#===============================================================================
# 메인
#===============================================================================

case "${1:-all}" in
    plan)
        validate_plan
        ;;
    project)
        validate_project
        ;;
    backlog)
        validate_backlog
        ;;
    sprint)
        validate_sprint
        ;;
    all|*)
        validate_all
        ;;
esac
