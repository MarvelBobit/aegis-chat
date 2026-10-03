@echo off
echo ========================================================
echo   AETHER // END-TO-END ENCRYPTED QUANTUM SOCIAL NETWORK
echo ========================================================
echo.

set "PATH=C:\Program Files\nodejs;%PATH%"

echo Starting Blind Relay Server on port 4000...
start "AETHER Relay Server" cmd /k "cd /d %~dp0server && node server.js"

echo Starting Vite Frontend Client on port 3001...
start "AETHER Web & Mobile Client" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ========================================================
echo   Services Launched!
echo   Open in Browser: http://localhost:3001
echo   To test real-time E2EE messaging:
echo   Open two browser windows side-by-side!
echo ========================================================
