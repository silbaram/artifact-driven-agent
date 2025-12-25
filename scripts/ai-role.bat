@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ===============================================================================
REM AI Role Launcher - Setup & Run (Batch)
REM 개발 스타일을 세팅하고 AI 에이전트를 실행합니다.
REM ===============================================================================

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "CORE_DIR=%PROJECT_ROOT%\core"
set "TEMPLATES_DIR=%PROJECT_ROOT%\templates"
set "WORKSPACE_DIR=%PROJECT_ROOT%\ai-dev-team"
set "CONFIG_FILE=%WORKSPACE_DIR%\.current-template"

REM ===============================================================================
REM 배너 출력
REM ===============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║              AI Dev Team - Role Launcher                       ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM 명령어 처리
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="/?" goto :show_help
if "%~1"=="setup" goto :do_setup
if "%~1"=="status" goto :show_status
if "%~1"=="reset" goto :do_reset

REM 세팅 확인
if not exist "%CONFIG_FILE%" (
    echo ⚠️  아직 템플릿이 세팅되지 않았습니다.
    echo.
    echo 먼저 'ai-role.bat setup' 명령어로 개발 스타일을 선택하세요.
    exit /b 1
)

REM 직접 실행 모드 (2개 인자: role tool)
if not "%~2"=="" (
    set "SELECTED_ROLE=%~1"
    set "SELECTED_TOOL=%~2"
    goto :run_ai
)

REM 대화형 모드
if "%~1"=="" goto :interactive_mode

echo 잘못된 인자입니다.
goto :show_help

REM ===============================================================================
REM 도움말
REM ===============================================================================

:show_help
echo 사용법:
echo.
echo 세팅 명령어:
echo   ai-role.bat setup              # 대화형으로 템플릿 선택
echo   ai-role.bat setup ^<template^>   # 특정 템플릿으로 세팅
echo   ai-role.bat status             # 현재 세팅 확인
echo   ai-role.bat reset              # ai-dev-team 초기화
echo.
echo 실행 명령어:
echo   ai-role.bat                    # 대화형으로 역할/도구 선택
echo   ai-role.bat ^<role^> ^<tool^>      # 직접 실행
echo.
echo 템플릿: web, library, game, cli
echo Core 역할: planner, architect, developer, reviewer, qa, manager
echo AI 도구: claude, codex, gemini
echo.
echo 예시:
echo   ai-role.bat setup web
echo   ai-role.bat backend claude
exit /b 0

REM ===============================================================================
REM Setup
REM ===============================================================================

:do_setup
if "%~2"=="" goto :select_template_for_setup

set "TEMPLATE_KEY=%~2"
goto :execute_setup

:select_template_for_setup
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 📦 개발 스타일을 선택하세요:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo   1) web      - 웹 서비스 개발 (Backend/Frontend 분리)
echo   2) library  - 라이브러리/SDK 개발
echo   3) game     - 게임 개발 (Logic/Rendering 분리)
echo   4) cli      - CLI 도구 개발
echo.

set /p TEMPLATE_CHOICE="선택 (1-4): "

if "%TEMPLATE_CHOICE%"=="1" set "TEMPLATE_KEY=web"
if "%TEMPLATE_CHOICE%"=="2" set "TEMPLATE_KEY=library"
if "%TEMPLATE_CHOICE%"=="3" set "TEMPLATE_KEY=game"
if "%TEMPLATE_CHOICE%"=="4" set "TEMPLATE_KEY=cli"

if "%TEMPLATE_KEY%"=="" (
    echo 잘못된 선택입니다.
    exit /b 1
)

:execute_setup
REM 템플릿 디렉토리 결정
if "%TEMPLATE_KEY%"=="web" set "TEMPLATE_DIR=web-dev"
if "%TEMPLATE_KEY%"=="library" set "TEMPLATE_DIR=library"
if "%TEMPLATE_KEY%"=="game" set "TEMPLATE_DIR=game"
if "%TEMPLATE_KEY%"=="cli" set "TEMPLATE_DIR=cli"

if "%TEMPLATE_DIR%"=="" (
    echo 알 수 없는 템플릿: %TEMPLATE_KEY%
    echo 사용 가능: web, library, game, cli
    exit /b 1
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🔧 ai-dev-team 세팅 중...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo   템플릿: %TEMPLATE_KEY% (%TEMPLATE_DIR%)
echo.

REM 기존 파일 정리
del /q "%WORKSPACE_DIR%\roles\*.md" 2>nul
del /q "%WORKSPACE_DIR%\artifacts\*.md" 2>nul
del /q "%WORKSPACE_DIR%\rules\*.md" 2>nul

REM Core 파일 복사
echo   [1/2] Core 파일 복사 중...
copy /y "%CORE_DIR%\roles\*.md" "%WORKSPACE_DIR%\roles\" >nul 2>nul
copy /y "%CORE_DIR%\artifacts\*.md" "%WORKSPACE_DIR%\artifacts\" >nul 2>nul
copy /y "%CORE_DIR%\rules\*.md" "%WORKSPACE_DIR%\rules\" >nul 2>nul

REM 템플릿 파일 복사
echo   [2/2] 템플릿 파일 복사 중... (%TEMPLATE_DIR%)
copy /y "%TEMPLATES_DIR%\%TEMPLATE_DIR%\roles\*.md" "%WORKSPACE_DIR%\roles\" >nul 2>nul
copy /y "%TEMPLATES_DIR%\%TEMPLATE_DIR%\artifacts\*.md" "%WORKSPACE_DIR%\artifacts\" >nul 2>nul
copy /y "%TEMPLATES_DIR%\%TEMPLATE_DIR%\rules\*.md" "%WORKSPACE_DIR%\rules\" >nul 2>nul

REM 현재 템플릿 저장
echo %TEMPLATE_KEY%:%TEMPLATE_DIR%> "%CONFIG_FILE%"

echo.
echo ✓ 세팅 완료!
echo.
echo   위치: ai-dev-team\
echo.
echo   이제 'ai-role.bat ^<role^> ^<tool^>' 명령어로 AI를 실행하세요.
echo.
exit /b 0

REM ===============================================================================
REM Status
REM ===============================================================================

:show_status
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 📊 현재 상태
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

if not exist "%CONFIG_FILE%" (
    echo   세팅: 미설정
    echo.
    echo   먼저 'ai-role.bat setup' 명령어로 템플릿을 선택하세요.
) else (
    for /f "tokens=1,2 delims=:" %%a in (%CONFIG_FILE%) do (
        echo   템플릿: %%a ^(%%b^)
    )
    echo.
    echo   [사용 가능한 역할]
    echo   Core: planner, architect, developer, reviewer, qa, manager
)
echo.
exit /b 0

REM ===============================================================================
REM Reset
REM ===============================================================================

:do_reset
del /q "%WORKSPACE_DIR%\roles\*.md" 2>nul
del /q "%WORKSPACE_DIR%\artifacts\*.md" 2>nul
del /q "%WORKSPACE_DIR%\rules\*.md" 2>nul
del /q "%CONFIG_FILE%" 2>nul
echo ✓ 초기화 완료
exit /b 0

REM ===============================================================================
REM 대화형 모드
REM ===============================================================================

:interactive_mode
call :show_status

REM 현재 템플릿 읽기
for /f "tokens=1,2 delims=:" %%a in (%CONFIG_FILE%) do (
    set "CURRENT_TEMPLATE=%%a"
    set "CURRENT_TEMPLATE_DIR=%%b"
)

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 👤 역할을 선택하세요:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo [Core 역할]
echo   1) planner
echo   2) architect
echo   3) developer
echo   4) reviewer
echo   5) qa
echo   6) manager
echo.

REM 템플릿별 역할
if "%CURRENT_TEMPLATE_DIR%"=="web-dev" (
    echo [%CURRENT_TEMPLATE% 전용 역할]
    echo   7) backend
    echo   8) frontend
    set "MAX_ROLE=8"
) else if "%CURRENT_TEMPLATE_DIR%"=="library" (
    echo [%CURRENT_TEMPLATE% 전용 역할]
    echo   7) library-developer
    set "MAX_ROLE=7"
) else if "%CURRENT_TEMPLATE_DIR%"=="game" (
    echo [%CURRENT_TEMPLATE% 전용 역할]
    echo   7) game-logic
    echo   8) rendering
    set "MAX_ROLE=8"
) else if "%CURRENT_TEMPLATE_DIR%"=="cli" (
    echo [%CURRENT_TEMPLATE% 전용 역할]
    echo   7) cli-developer
    set "MAX_ROLE=7"
) else (
    set "MAX_ROLE=6"
)

echo.
set /p ROLE_CHOICE="선택 (1-%MAX_ROLE%): "

if "%ROLE_CHOICE%"=="1" set "SELECTED_ROLE=planner"
if "%ROLE_CHOICE%"=="2" set "SELECTED_ROLE=architect"
if "%ROLE_CHOICE%"=="3" set "SELECTED_ROLE=developer"
if "%ROLE_CHOICE%"=="4" set "SELECTED_ROLE=reviewer"
if "%ROLE_CHOICE%"=="5" set "SELECTED_ROLE=qa"
if "%ROLE_CHOICE%"=="6" set "SELECTED_ROLE=manager"

if "%CURRENT_TEMPLATE_DIR%"=="web-dev" (
    if "%ROLE_CHOICE%"=="7" set "SELECTED_ROLE=backend"
    if "%ROLE_CHOICE%"=="8" set "SELECTED_ROLE=frontend"
)
if "%CURRENT_TEMPLATE_DIR%"=="library" (
    if "%ROLE_CHOICE%"=="7" set "SELECTED_ROLE=library-developer"
)
if "%CURRENT_TEMPLATE_DIR%"=="game" (
    if "%ROLE_CHOICE%"=="7" set "SELECTED_ROLE=game-logic"
    if "%ROLE_CHOICE%"=="8" set "SELECTED_ROLE=rendering"
)
if "%CURRENT_TEMPLATE_DIR%"=="cli" (
    if "%ROLE_CHOICE%"=="7" set "SELECTED_ROLE=cli-developer"
)

if "%SELECTED_ROLE%"=="" (
    echo 잘못된 선택입니다.
    exit /b 1
)

echo ✓ 선택됨: %SELECTED_ROLE%
echo.

REM AI 도구 선택
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🤖 AI 도구를 선택하세요:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo   1) claude - Claude Code
echo   2) codex  - OpenAI Codex CLI
echo   3) gemini - Google Gemini CLI
echo.

set /p TOOL_CHOICE="선택 (1-3): "

if "%TOOL_CHOICE%"=="1" set "SELECTED_TOOL=claude"
if "%TOOL_CHOICE%"=="2" set "SELECTED_TOOL=codex"
if "%TOOL_CHOICE%"=="3" set "SELECTED_TOOL=gemini"

if "%SELECTED_TOOL%"=="" (
    echo 잘못된 선택입니다.
    exit /b 1
)

echo ✓ 선택됨: %SELECTED_TOOL%

REM ===============================================================================
REM AI 실행
REM ===============================================================================

:run_ai
REM 현재 템플릿 읽기
for /f "tokens=1,2 delims=:" %%a in (%CONFIG_FILE%) do (
    set "CURRENT_TEMPLATE=%%a"
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🚀 AI 에이전트 시작
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo   템플릿: %CURRENT_TEMPLATE%
echo   역할:   %SELECTED_ROLE%
echo   도구:   %SELECTED_TOOL%
echo   작업공간: ai-dev-team\
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM 시스템 프롬프트 생성 (임시 파일)
set "TEMP_PROMPT=%TEMP%\ai_prompt_%RANDOM%.txt"
type nul > "%TEMP_PROMPT%"

REM 규칙 로드
for %%f in ("%WORKSPACE_DIR%\rules\*.md") do (
    type "%%f" >> "%TEMP_PROMPT%"
    echo. >> "%TEMP_PROMPT%"
)

REM 역할 로드
set "ROLE_FILE=%WORKSPACE_DIR%\roles\%SELECTED_ROLE%.md"
if exist "%ROLE_FILE%" (
    type "%ROLE_FILE%" >> "%TEMP_PROMPT%"
) else (
    echo 역할 파일을 찾을 수 없습니다: %ROLE_FILE%
    del "%TEMP_PROMPT%" 2>nul
    exit /b 1
)

REM AI 도구 실행
if "%SELECTED_TOOL%"=="claude" (
    where claude >nul 2>nul
    if errorlevel 1 (
        echo Claude Code가 설치되어 있지 않습니다.
        del "%TEMP_PROMPT%" 2>nul
        exit /b 1
    )
    claude --system-prompt-file "%TEMP_PROMPT%"
) else if "%SELECTED_TOOL%"=="codex" (
    where codex >nul 2>nul
    if errorlevel 1 (
        echo Codex CLI가 설치되어 있지 않습니다.
        del "%TEMP_PROMPT%" 2>nul
        exit /b 1
    )
    codex --instructions-file "%TEMP_PROMPT%"
) else if "%SELECTED_TOOL%"=="gemini" (
    where gemini >nul 2>nul
    if errorlevel 1 (
        echo Gemini CLI가 설치되어 있지 않습니다.
        del "%TEMP_PROMPT%" 2>nul
        exit /b 1
    )
    gemini --prompt-file "%TEMP_PROMPT%"
)

del "%TEMP_PROMPT%" 2>nul
exit /b 0
