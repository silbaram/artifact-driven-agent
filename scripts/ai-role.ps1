#===============================================================================
# AI Role Launcher - Setup & Run (PowerShell)
# 개발 스타일을 세팅하고 AI 에이전트를 실행합니다.
#===============================================================================

param(
    [Parameter(Position=0)]
    [string]$Command,
    [Parameter(Position=1)]
    [string]$Arg1,
    [Parameter(Position=2)]
    [string]$Arg2,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# 스크립트 위치 기준으로 프로젝트 루트 찾기
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# 디렉토리 설정
$CoreDir = Join-Path $ProjectRoot "core"
$TemplatesDir = Join-Path $ProjectRoot "templates"
$WorkspaceDir = Join-Path $ProjectRoot "ai-dev-team"
$ConfigFile = Join-Path $WorkspaceDir ".current-template"

#===============================================================================
# 템플릿 정의
#===============================================================================

$Templates = @{
    "web"     = @{ Dir = "web-dev"; Desc = "웹 서비스 개발 (Backend/Frontend 분리)" }
    "library" = @{ Dir = "library"; Desc = "라이브러리/SDK 개발" }
    "game"    = @{ Dir = "game"; Desc = "게임 개발 (Logic/Rendering 분리)" }
    "cli"     = @{ Dir = "cli"; Desc = "CLI 도구 개발" }
}

$CoreRoles = @("planner", "architect", "developer", "reviewer", "qa", "manager")

$TemplateRoles = @{
    "web-dev" = @("backend", "frontend")
    "library" = @("library-developer")
    "game"    = @("game-logic", "rendering")
    "cli"     = @("cli-developer")
}

$AITools = @{
    "claude" = "Claude Code"
    "codex"  = "OpenAI Codex CLI"
    "gemini" = "Google Gemini CLI"
}

#===============================================================================
# 함수들
#===============================================================================

function Show-Banner {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║              AI Dev Team - Role Launcher                       ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Write-Host "사용법:" -ForegroundColor Green
    Write-Host ""
    Write-Host "세팅 명령어:" -ForegroundColor Yellow
    Write-Host "  .\ai-role.ps1 setup              # 대화형으로 템플릿 선택"
    Write-Host "  .\ai-role.ps1 setup <template>   # 특정 템플릿으로 세팅"
    Write-Host "  .\ai-role.ps1 status             # 현재 세팅 확인"
    Write-Host "  .\ai-role.ps1 reset              # ai-dev-team 초기화"
    Write-Host ""
    Write-Host "실행 명령어:" -ForegroundColor Yellow
    Write-Host "  .\ai-role.ps1                    # 대화형으로 역할/도구 선택"
    Write-Host "  .\ai-role.ps1 <role> <tool>      # 직접 실행"
    Write-Host ""
    Write-Host "템플릿: web, library, game, cli" -ForegroundColor Green
    Write-Host "Core 역할: planner, architect, developer, reviewer, qa, manager" -ForegroundColor Green
    Write-Host "AI 도구: claude, codex, gemini" -ForegroundColor Green
}

function Get-CurrentTemplate {
    if (Test-Path $ConfigFile) {
        return Get-Content $ConfigFile
    }
    return $null
}

function Show-Status {
    $current = Get-CurrentTemplate
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "📊 현재 상태" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $current) {
        Write-Host "  세팅: " -NoNewline
        Write-Host "미설정" -ForegroundColor Red
        Write-Host ""
        Write-Host "  먼저 '.\ai-role.ps1 setup' 명령어로 템플릿을 선택하세요." -ForegroundColor Yellow
    } else {
        $parts = $current -split ":"
        $templateKey = $parts[0]
        $templateDir = $parts[1]
        Write-Host "  템플릿: $templateKey ($templateDir)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  [사용 가능한 역할]" -ForegroundColor Blue
        Write-Host "  Core: $($CoreRoles -join ', ')"
        Write-Host "  전용: $($TemplateRoles[$templateDir] -join ', ')"
    }
    Write-Host ""
}

function Do-Setup {
    param([string]$TemplateKey)
    
    if (-not $Templates.ContainsKey($TemplateKey)) {
        Write-Host "알 수 없는 템플릿: $TemplateKey" -ForegroundColor Red
        Write-Host "사용 가능: web, library, game, cli"
        exit 1
    }
    
    $templateDir = $Templates[$TemplateKey].Dir
    $templateDesc = $Templates[$TemplateKey].Desc
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "🔧 ai-dev-team 세팅 중..." -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  템플릿: $TemplateKey - $templateDesc" -ForegroundColor Cyan
    Write-Host ""
    
    # 기존 파일 정리
    Get-ChildItem -Path (Join-Path $WorkspaceDir "roles") -Filter "*.md" -ErrorAction SilentlyContinue | Remove-Item -Force
    Get-ChildItem -Path (Join-Path $WorkspaceDir "artifacts") -Filter "*.md" -ErrorAction SilentlyContinue | Remove-Item -Force
    Get-ChildItem -Path (Join-Path $WorkspaceDir "rules") -Filter "*.md" -ErrorAction SilentlyContinue | Remove-Item -Force
    
    # Core 파일 복사
    Write-Host "  [1/2] Core 파일 복사 중..." -ForegroundColor Blue
    Copy-Item -Path (Join-Path $CoreDir "roles\*.md") -Destination (Join-Path $WorkspaceDir "roles") -ErrorAction SilentlyContinue
    Copy-Item -Path (Join-Path $CoreDir "artifacts\*.md") -Destination (Join-Path $WorkspaceDir "artifacts") -ErrorAction SilentlyContinue
    Copy-Item -Path (Join-Path $CoreDir "rules\*.md") -Destination (Join-Path $WorkspaceDir "rules") -ErrorAction SilentlyContinue
    
    # 템플릿 파일 복사
    $templatePath = Join-Path $TemplatesDir $templateDir
    Write-Host "  [2/2] 템플릿 파일 복사 중... ($templateDir)" -ForegroundColor Blue
    
    if (Test-Path (Join-Path $templatePath "roles")) {
        Copy-Item -Path (Join-Path $templatePath "roles\*.md") -Destination (Join-Path $WorkspaceDir "roles") -ErrorAction SilentlyContinue
    }
    if (Test-Path (Join-Path $templatePath "artifacts")) {
        Copy-Item -Path (Join-Path $templatePath "artifacts\*.md") -Destination (Join-Path $WorkspaceDir "artifacts") -ErrorAction SilentlyContinue
    }
    if (Test-Path (Join-Path $templatePath "rules")) {
        Copy-Item -Path (Join-Path $templatePath "rules\*.md") -Destination (Join-Path $WorkspaceDir "rules") -ErrorAction SilentlyContinue
    }
    
    # 현재 템플릿 저장
    "$TemplateKey`:$templateDir" | Set-Content $ConfigFile
    
    Write-Host ""
    Write-Host "✓ 세팅 완료!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  위치: ai-dev-team/" -ForegroundColor Cyan
    Write-Host ""
    
    $rolesCount = (Get-ChildItem -Path (Join-Path $WorkspaceDir "roles") -Filter "*.md" -ErrorAction SilentlyContinue).Count
    $artifactsCount = (Get-ChildItem -Path (Join-Path $WorkspaceDir "artifacts") -Filter "*.md" -ErrorAction SilentlyContinue).Count
    $rulesCount = (Get-ChildItem -Path (Join-Path $WorkspaceDir "rules") -Filter "*.md" -ErrorAction SilentlyContinue).Count
    
    Write-Host "  [설치된 파일]" -ForegroundColor Blue
    Write-Host "  - roles:     ${rolesCount}개"
    Write-Host "  - artifacts: ${artifactsCount}개"
    Write-Host "  - rules:     ${rulesCount}개"
    Write-Host ""
}

function Select-Template {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "📦 개발 스타일을 선택하세요:" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host ""
    
    $i = 1
    $keys = @($Templates.Keys)
    foreach ($key in $keys) {
        Write-Host "  $i) $key - $($Templates[$key].Desc)" -ForegroundColor Cyan
        $i++
    }
    Write-Host ""
    
    $choice = Read-Host "선택 (1-$($keys.Count))"
    $index = [int]$choice - 1
    
    if ($index -ge 0 -and $index -lt $keys.Count) {
        return $keys[$index]
    } else {
        Write-Host "잘못된 선택입니다." -ForegroundColor Red
        exit 1
    }
}

function Select-Role {
    $current = Get-CurrentTemplate
    $parts = $current -split ":"
    $templateKey = $parts[0]
    $templateDir = $parts[1]
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "👤 역할을 선택하세요:" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "[Core 역할]" -ForegroundColor Blue
    $allRoles = @()
    $i = 1
    
    foreach ($role in $CoreRoles) {
        $allRoles += $role
        Write-Host "  $i) $role" -ForegroundColor Cyan
        $i++
    }
    
    $templateRoleList = $TemplateRoles[$templateDir]
    if ($templateRoleList) {
        Write-Host ""
        Write-Host "[$templateKey 전용 역할]" -ForegroundColor Blue
        foreach ($role in $templateRoleList) {
            $allRoles += $role
            Write-Host "  $i) $role" -ForegroundColor Cyan
            $i++
        }
    }
    
    Write-Host ""
    $choice = Read-Host "선택 (1-$($allRoles.Count))"
    $index = [int]$choice - 1
    
    if ($index -ge 0 -and $index -lt $allRoles.Count) {
        return $allRoles[$index]
    } else {
        Write-Host "잘못된 선택입니다." -ForegroundColor Red
        exit 1
    }
}

function Select-Tool {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "🤖 AI 도구를 선택하세요:" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host ""
    
    $i = 1
    $keys = @($AITools.Keys)
    foreach ($key in $keys) {
        Write-Host "  $i) $key - $($AITools[$key])" -ForegroundColor Cyan
        $i++
    }
    Write-Host ""
    
    $choice = Read-Host "선택 (1-$($keys.Count))"
    $index = [int]$choice - 1
    
    if ($index -ge 0 -and $index -lt $keys.Count) {
        return $keys[$index]
    } else {
        Write-Host "잘못된 선택입니다." -ForegroundColor Red
        exit 1
    }
}

function Build-SystemPrompt {
    param([string]$Role)
    
    $prompt = ""
    
    # 규칙 로드
    Get-ChildItem -Path (Join-Path $WorkspaceDir "rules") -Filter "*.md" | ForEach-Object {
        $prompt += (Get-Content $_.FullName -Raw) + "`n`n"
    }
    
    # 역할 로드
    $roleFile = Join-Path $WorkspaceDir "roles" "$Role.md"
    if (Test-Path $roleFile) {
        $prompt += Get-Content $roleFile -Raw
    } else {
        Write-Host "역할 파일을 찾을 수 없습니다: $roleFile" -ForegroundColor Red
        exit 1
    }
    
    return $prompt
}

function Invoke-AITool {
    param([string]$Role, [string]$Tool)
    
    $current = Get-CurrentTemplate
    $parts = $current -split ":"
    $templateKey = $parts[0]
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "🚀 AI 에이전트 시작" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  템플릿: $templateKey" -ForegroundColor Cyan
    Write-Host "  역할:   $Role" -ForegroundColor Cyan
    Write-Host "  도구:   $Tool" -ForegroundColor Cyan
    Write-Host "  작업공간: ai-dev-team/" -ForegroundColor Cyan
    Write-Host ""
    
    $prompt = Build-SystemPrompt -Role $Role
    
    switch ($Tool) {
        "claude" {
            if (Get-Command claude -ErrorAction SilentlyContinue) {
                claude --system-prompt $prompt
            } else {
                Write-Host "Claude Code가 설치되어 있지 않습니다." -ForegroundColor Red
                exit 1
            }
        }
        "codex" {
            if (Get-Command codex -ErrorAction SilentlyContinue) {
                codex --instructions $prompt
            } else {
                Write-Host "Codex CLI가 설치되어 있지 않습니다." -ForegroundColor Red
                exit 1
            }
        }
        "gemini" {
            if (Get-Command gemini -ErrorAction SilentlyContinue) {
                gemini -p $prompt
            } else {
                Write-Host "Gemini CLI가 설치되어 있지 않습니다." -ForegroundColor Red
                exit 1
            }
        }
    }
}

#===============================================================================
# 메인 실행
#===============================================================================

Show-Banner

if ($Help) {
    Show-Help
    exit 0
}

switch ($Command) {
    "setup" {
        if ($Arg1) {
            Do-Setup -TemplateKey $Arg1
        } else {
            $selected = Select-Template
            Do-Setup -TemplateKey $selected
        }
        exit 0
    }
    "status" {
        Show-Status
        exit 0
    }
    "reset" {
        Get-ChildItem -Path (Join-Path $WorkspaceDir "roles") -Filter "*.md" -ErrorAction SilentlyContinue | Remove-Item -Force
        Get-ChildItem -Path (Join-Path $WorkspaceDir "artifacts") -Filter "*.md" -ErrorAction SilentlyContinue | Remove-Item -Force
        Get-ChildItem -Path (Join-Path $WorkspaceDir "rules") -Filter "*.md" -ErrorAction SilentlyContinue | Remove-Item -Force
        Remove-Item $ConfigFile -ErrorAction SilentlyContinue
        Write-Host "✓ 초기화 완료" -ForegroundColor Green
        exit 0
    }
}

# 세팅 확인
$current = Get-CurrentTemplate
if (-not $current) {
    Write-Host "⚠️  아직 템플릿이 세팅되지 않았습니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "먼저 '.\ai-role.ps1 setup' 명령어로 개발 스타일을 선택하세요." -ForegroundColor Cyan
    exit 1
}

# 직접 실행 모드
if ($Command -and $Arg1) {
    Invoke-AITool -Role $Command -Tool $Arg1
    exit 0
}

# 대화형 모드
if (-not $Command) {
    Show-Status
    $selectedRole = Select-Role
    $selectedTool = Select-Tool
    Invoke-AITool -Role $selectedRole -Tool $selectedTool
    exit 0
}

Write-Host "잘못된 인자입니다." -ForegroundColor Red
Show-Help
