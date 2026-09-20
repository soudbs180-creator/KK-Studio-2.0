@echo off
setlocal
cd /d "%~dp0"

set "NODE24=D:\tools\node-v24.20.0-win-x64"
if exist "%NODE24%\node.exe" set "PATH=%NODE24%;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
    echo [KK Studio] Node.js was not found. Install Node 24 or restore %NODE24%.
    pause
    exit /b 1
)

rem Check source freshness on every launch. The existing launcher rebuilds
rem only missing/stale releases and never starts the old executable on failure.
node "%~dp0scripts\windows\desktop-release.mjs"
if errorlevel 1 (
    echo [KK Studio] Desktop launch failed. The previous release was not started.
    pause
    exit /b 1
)

endlocal
exit /b 0
