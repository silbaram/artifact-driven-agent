@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

REM ============================================================
REM ai-role.bat - AI 역할 기반 개발 세션 스크립트 (Windows)
REM
REM 사용법:
REM   scripts\ai-role.bat <role> <ai-tool>
REM   scripts\ai-role.bat <role> --set-only
REM   scripts\ai-role.bat --list
REM   scripts\ai-role.bat --current
REM
REM 예시:
REM   scripts\ai-role.bat planner claude
REM   scripts\ai-role.bat backend codex
REM   scripts\ai-role.bat architect gemini
REM ============================================================

REM 설정
set "ROLES_DIR=ai\roles"
set "ARTIFACTS_DIR=ai\artifacts"
set "CURRENT_ROLE_FILE=.current-ai-role"

REM 사용 가능한 역할
set "AVAILABLE_ROLES=planner architect backend frontend reviewer qa manager"

REM 사용 가능한 AI 도구
set "AVAILABLE_TOOLS=claude codex gemini"

REM 인자 없음
if "%~1"=="" (
    call :print_usage
    exit /b 0
)

REM 옵션 처리
if /i "%~1"=="--help" (
    call :print_usage
    exit /b 0
)
if /i "%~1"=="-h" (
    call :print_usage
    exit /b 0
)
if /i "%~1"=="--list" (
    call :print_list
    exit /b 0
)
if /i "%~1"=="-l" (
    call :print_list
    exit /b 0
)
if /i "%~1"=="--current" (
    call :print_current
    exit /b 0
)
if /i "%~1"=="-c" (
    call :print_current
    exit /b 0
)

REM 역할 검증
set "ROLE=%~1"
call :validate_role "%ROLE%"
if errorlevel 1 (
    echo [오류] 알 수 없는 역할: %ROLE%
    echo 사용 가능한 역할: %AVAILABLE_ROLES%
    exit /b 1
)

REM 역할 파일 확인
call :check_role_file "%ROLE%"
if errorlevel 1 exit /b 1

REM 두 번째 인자 처리
if "%~2"=="" (
    echo [오류] AI 도구 또는 --set-only를 지정해주세요.
    echo 예: %~nx0 %ROLE% claude
    echo 예: %~nx0 %ROLE% --set-only
    exit /b 1
)

set "SECOND_ARG=%~2"

if /i "%SECOND_ARG%"=="--set-only" (
    call :set_role "%ROLE%"
    exit /b 0
)

REM AI 도구 검증
set "TOOL=%SECOND_ARG%"
call :validate_tool "%TOOL%"
if errorlevel 1 (
    echo [오류] 알 수 없는 AI 도구: %TOOL%
    echo 사용 가능한 도구: %AVAILABLE_TOOLS%
    exit /b 1
)

REM 필수 문서 확인
call :check_prerequisites "%ROLE%"

REM 역할 설정 및 AI 도구 실행
call :set_role "%ROLE%"
call :run_ai_tool "%ROLE%" "%TOOL%"

exit /b 0

REM ============================================================
REM 함수들
REM ============================================================

:print_usage
echo.
echo AI 역할 기반 개발 세션 스크립트
echo.
echo 사용법:
echo   %~nx0 ^<role^> ^<ai-tool^>    역할 설정 후 AI 도구 실행
echo   %~nx0 ^<role^> --set-only   역할만 설정 (AI 도구 실행 안 함)
echo   %~nx0 --list              사용 가능한 역할/도구 목록
echo   %~nx0 --current           현재 설정된 역할 확인
echo   %~nx0 --help              이 도움말 출력
echo.
echo 역할:
echo   planner    기획자 - 요구사항 수집
echo   architect  아키텍트 - 기술 스택/아키텍처 결정
echo   backend    백엔드 개발자 - 서버 API 구현
echo   frontend   프론트엔드 개발자 - UI 구현
echo   reviewer   리뷰어 - 코드 리뷰
echo   qa         QA - 기획 대비 검증
echo   manager    관리자 - 진행 판단/승인
echo.
echo AI 도구:
echo   claude     Claude Code
echo   codex      OpenAI Codex CLI
echo   gemini     Gemini CLI
echo.
echo 예시:
echo   %~nx0 planner claude      # Planner 역할로 Claude Code 시작
echo   %~nx0 backend codex       # Backend 역할로 Codex 시작
echo   %~nx0 architect --set-only # Architect 역할만 설정
exit /b 0

:print_list
echo.
echo 사용 가능한 역할:
for %%r in (%AVAILABLE_ROLES%) do (
    if exist "%ROLES_DIR%\%%r.md" (
        echo   [O] %%r
    ) else (
        echo   [X] %%r ^(파일 없음^)
    )
)
echo.
echo 사용 가능한 AI 도구:
for %%t in (%AVAILABLE_TOOLS%) do (
    where %%t >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [O] %%t ^(설치됨^)
    ) else (
        echo   [?] %%t ^(미확인^)
    )
)
exit /b 0

:print_current
if exist "%CURRENT_ROLE_FILE%" (
    set /p CURRENT_ROLE=<"%CURRENT_ROLE_FILE%"
    echo 현재 역할: !CURRENT_ROLE!
) else (
    echo 현재 역할: 설정되지 않음
)
exit /b 0

:validate_role
set "CHECK_ROLE=%~1"
for %%r in (%AVAILABLE_ROLES%) do (
    if /i "%%r"=="%CHECK_ROLE%" exit /b 0
)
exit /b 1

:validate_tool
set "CHECK_TOOL=%~1"
for %%t in (%AVAILABLE_TOOLS%) do (
    if /i "%%t"=="%CHECK_TOOL%" exit /b 0
)
exit /b 1

:check_role_file
set "CHECK_ROLE=%~1"
set "ROLE_FILE=%ROLES_DIR%\%CHECK_ROLE%.md"
if not exist "%ROLE_FILE%" (
    echo [오류] 역할 파일을 찾을 수 없습니다: %ROLE_FILE%
    exit /b 1
)
exit /b 0

:check_prerequisites
set "CHECK_ROLE=%~1"
set "MISSING="

if /i "%CHECK_ROLE%"=="architect" (
    if not exist "%ARTIFACTS_DIR%\plan.md" set "MISSING=!MISSING! plan.md"
)
if /i "%CHECK_ROLE%"=="backend" (
    if not exist "%ARTIFACTS_DIR%\plan.md" set "MISSING=!MISSING! plan.md"
    if not exist "%ARTIFACTS_DIR%\project.md" set "MISSING=!MISSING! project.md"
)
if /i "%CHECK_ROLE%"=="frontend" (
    if not exist "%ARTIFACTS_DIR%\plan.md" set "MISSING=!MISSING! plan.md"
    if not exist "%ARTIFACTS_DIR%\project.md" set "MISSING=!MISSING! project.md"
)
if /i "%CHECK_ROLE%"=="reviewer" (
    if not exist "%ARTIFACTS_DIR%\plan.md" set "MISSING=!MISSING! plan.md"
    if not exist "%ARTIFACTS_DIR%\project.md" set "MISSING=!MISSING! project.md"
)
if /i "%CHECK_ROLE%"=="qa" (
    if not exist "%ARTIFACTS_DIR%\plan.md" set "MISSING=!MISSING! plan.md"
    if not exist "%ARTIFACTS_DIR%\project.md" set "MISSING=!MISSING! project.md"
)
if /i "%CHECK_ROLE%"=="manager" (
    if not exist "%ARTIFACTS_DIR%\plan.md" set "MISSING=!MISSING! plan.md"
)

if not "!MISSING!"=="" (
    echo.
    echo [경고] 다음 필수 문서가 없습니다:
    for %%m in (!MISSING!) do (
        echo   - %ARTIFACTS_DIR%\%%m
    )
    echo.
    set /p "CONTINUE=계속 진행하시겠습니까? (y/N) "
    if /i not "!CONTINUE!"=="y" exit /b 1
)
exit /b 0

:set_role
set "SET_ROLE=%~1"
echo %SET_ROLE%> "%CURRENT_ROLE_FILE%"
echo [완료] 역할이 '%SET_ROLE%'로 설정되었습니다.
exit /b 0

:run_ai_tool
set "RUN_ROLE=%~1"
set "RUN_TOOL=%~2"
set "ROLE_FILE=%ROLES_DIR%\%RUN_ROLE%.md"

echo.
echo AI 도구 실행: %RUN_TOOL% (역할: %RUN_ROLE%)
echo.

REM PowerShell을 사용하여 파일 내용을 인자로 전달
if /i "%RUN_TOOL%"=="claude" (
    powershell -Command "claude --system-prompt (Get-Content '%ROLE_FILE%' -Raw)"
)
if /i "%RUN_TOOL%"=="codex" (
    powershell -Command "codex --instructions (Get-Content '%ROLE_FILE%' -Raw)"
)
if /i "%RUN_TOOL%"=="gemini" (
    powershell -Command "gemini -p (Get-Content '%ROLE_FILE%' -Raw)"
)
exit /b 0
