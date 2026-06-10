@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap-local-stack.ps1" %*
exit /b %ERRORLEVEL%
