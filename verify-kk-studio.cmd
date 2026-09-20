@echo off
setlocal
cd /d "%~dp0"

rem Match the Node 24 runtime used by the desktop launcher. Scope PATH to
rem this process so npm and all nested npm scripts resolve consistently.
set "NODE24=D:\tools\node-v24.20.0-win-x64"
if exist "%NODE24%\node.exe" set "PATH=%NODE24%;%PATH%"

where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo [KK Studio] npm was not found. Install Node 24 with npm on PATH.
    exit /b 1
)

call npm.cmd run verify
exit /b %errorlevel%
