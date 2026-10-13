
@echo off
cd /d "%~dp0"

start "TV Timeline Server" cmd /k "node --env-file=.env.local server.mjs"

timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:4173"
