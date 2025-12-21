<#
.SYNOPSIS
    AI 역할 기반 개발 세션 스크립트 (PowerShell)

.DESCRIPTION
    AI CLI 도구(Claude Code, Codex, Gemini)를 역할 기반으로 실행합니다.

.PARAMETER Role
    사용할 역할 (planner, architect, backend, frontend, reviewer, qa, manager)

.PARAMETER Tool
    사용할 AI 도구 (claude, codex, gemini) 또는 --set-only

.PARAMETER List
    사용 가능한 역할/도구 목록 출력

.PARAMETER Current
    현재 설정된 역할 확인

.EXAMPLE
    .\ai-role.ps1 planner claude
    .\ai-role.ps1 backend codex
    .\ai-role.ps1 architect --set-only
    .\ai-role.ps1 -List
    .\ai-role.ps1 -Current

.NOTES
    프로젝트 루트에서 실행해야 합니다.
#>

[CmdletBinding(DefaultParameterSetName = 'Run')]
param(
    [Parameter(ParameterSetName = 'Run', Position = 0)]
    [ValidateSet('planner', 'architect', 'backend', 'frontend', 'reviewer', 'qa', 'manager')]
    [string]$Role,

    [Parameter(ParameterSetName = 'Run', Position = 1)]
    [string]$Tool,

    [Parameter(ParameterSetName = 'List')]
    [switch]$List,

    [Parameter(ParameterSetName = 'Current')]
    [switch]$Current
)

# 설정
$RolesDir = "ai\roles"
$ArtifactsDir = "ai\artifacts"
$CurrentRoleFile = ".current-ai-role"

$AvailableRoles = @('planner', 'architect', 'backend', 'frontend', 'reviewer', 'qa', 'manager')
$AvailableTools = @('claude', 'codex', 'gemini')

$RoleDescriptions = @{
    'planner'   = '기획자 - 요구사항 수집'
    'architect' = '아키텍트 - 기술 스택/아키텍처 결정'
    'backend'   = '백엔드 개발자 - 서버 API 구현'
    'frontend'  = '프론트엔드 개발자 - UI 구현'
    'reviewer'  = '리뷰어 - 코드 리뷰'
    'qa'        = 'QA - 기획 대비 검증'
    'manager'   = '관리자 - 진행 판단/승인'
}

# 함수: 역할/도구 목록 출력
function Show-List {
    Write-Host "`n사용 가능한 역할:" -ForegroundColor Cyan
    foreach ($r in $AvailableRoles) {
        $roleFile = Join-Path $RolesDir "$r.md"
        if (Test-Path $roleFile) {
            Write-Host "  [O] $r - $($RoleDescriptions[$r])" -ForegroundColor Green
        } else {
            Write-Host "  [X] $r (파일 없음)" -ForegroundColor Red
        }
    }

    Write-Host "`n사용 가능한 AI 도구:" -ForegroundColor Cyan
    foreach ($t in $AvailableTools) {
        $cmd = Get-Command $t -ErrorAction SilentlyContinue
        if ($cmd) {
            Write-Host "  [O] $t (설치됨)" -ForegroundColor Green
        } else {
            Write-Host "  [?] $t (미확인)" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# 함수: 현재 역할 확인
function Show-Current {
    if (Test-Path $CurrentRoleFile) {
        $currentRole = Get-Content $CurrentRoleFile -Raw
        Write-Host "현재 역할: $($currentRole.Trim())" -ForegroundColor Green
    } else {
        Write-Host "현재 역할: 설정되지 않음" -ForegroundColor Yellow
    }
}

# 함수: 필수 문서 확인
function Test-Prerequisites {
    param([string]$RoleName)
    
    $missing = @()
    
    switch ($RoleName) {
        'architect' {
            if (-not (Test-Path "$ArtifactsDir\plan.md")) { $missing += 'plan.md' }
        }
        { $_ -in @('backend', 'frontend') } {
            if (-not (Test-Path "$ArtifactsDir\plan.md")) { $missing += 'plan.md' }
            if (-not (Test-Path "$ArtifactsDir\project.md")) { $missing += 'project.md' }
        }
        { $_ -in @('reviewer', 'qa') } {
            if (-not (Test-Path "$ArtifactsDir\plan.md")) { $missing += 'plan.md' }
            if (-not (Test-Path "$ArtifactsDir\project.md")) { $missing += 'project.md' }
        }
        'manager' {
            if (-not (Test-Path "$ArtifactsDir\plan.md")) { $missing += 'plan.md' }
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "`n[경고] 다음 필수 문서가 없습니다:" -ForegroundColor Yellow
        foreach ($doc in $missing) {
            Write-Host "  - $ArtifactsDir\$doc" -ForegroundColor Yellow
        }
        Write-Host ""
        $response = Read-Host "계속 진행하시겠습니까? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            return $false
        }
    }
    return $true
}

# 함수: 역할 설정
function Set-AIRole {
    param([string]$RoleName)
    $RoleName | Out-File -FilePath $CurrentRoleFile -NoNewline -Encoding UTF8
    Write-Host "[완료] 역할이 '$RoleName'로 설정되었습니다." -ForegroundColor Green
}

# 함수: AI 도구 실행
function Start-AITool {
    param(
        [string]$RoleName,
        [string]$ToolName
    )
    
    $roleFile = Join-Path $RolesDir "$RoleName.md"
    $roleContent = Get-Content $roleFile -Raw -Encoding UTF8
    
    Write-Host "`nAI 도구 실행: $ToolName (역할: $RoleName)" -ForegroundColor Cyan
    Write-Host ""
    
    switch ($ToolName) {
        'claude' {
            & claude --system-prompt $roleContent
        }
        'codex' {
            & codex --instructions $roleContent
        }
        'gemini' {
            & gemini -p $roleContent
        }
    }
}

# 메인 로직
if ($List) {
    Show-List
    exit 0
}

if ($Current) {
    Show-Current
    exit 0
}

if (-not $Role) {
    Write-Host @"

AI 역할 기반 개발 세션 스크립트

사용법:
  .\ai-role.ps1 <role> <ai-tool>    역할 설정 후 AI 도구 실행
  .\ai-role.ps1 <role> --set-only   역할만 설정 (AI 도구 실행 안 함)
  .\ai-role.ps1 -List               사용 가능한 역할/도구 목록
  .\ai-role.ps1 -Current            현재 설정된 역할 확인

역할: planner, architect, backend, frontend, reviewer, qa, manager
AI 도구: claude, codex, gemini

예시:
  .\ai-role.ps1 planner claude      # Planner 역할로 Claude Code 시작
  .\ai-role.ps1 backend codex       # Backend 역할로 Codex 시작
  .\ai-role.ps1 architect --set-only # Architect 역할만 설정

"@
    exit 0
}

# 역할 파일 확인
$roleFile = Join-Path $RolesDir "$Role.md"
if (-not (Test-Path $roleFile)) {
    Write-Host "[오류] 역할 파일을 찾을 수 없습니다: $roleFile" -ForegroundColor Red
    exit 1
}

# Tool 인자 확인
if (-not $Tool) {
    Write-Host "[오류] AI 도구 또는 --set-only를 지정해주세요." -ForegroundColor Red
    Write-Host "예: .\ai-role.ps1 $Role claude"
    Write-Host "예: .\ai-role.ps1 $Role --set-only"
    exit 1
}

# --set-only 처리
if ($Tool -eq '--set-only') {
    Set-AIRole -RoleName $Role
    exit 0
}

# AI 도구 검증
if ($Tool -notin $AvailableTools) {
    Write-Host "[오류] 알 수 없는 AI 도구: $Tool" -ForegroundColor Red
    Write-Host "사용 가능한 도구: $($AvailableTools -join ', ')"
    exit 1
}

# 필수 문서 확인
if (-not (Test-Prerequisites -RoleName $Role)) {
    exit 1
}

# 역할 설정 및 AI 도구 실행
Set-AIRole -RoleName $Role
Start-AITool -RoleName $Role -ToolName $Tool
