@echo off
title Portfolio Admin Cloudflare Tunnel
color 0b
echo =========================================================================
echo   PORTFOLIO ADMIN SECURE CLOUDFLARE TUNNEL (100%% FREE - NO CARD NEEDED)
echo =========================================================================
echo.
echo Starting backend server on port 3000 if not already active...
cd /d "%~dp0server"

:: Test if server is responding on 3000
powershell -Command "try { (Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/me' -UseBasicParsing -TimeoutSec 1).StatusCode } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Starting local Node.js server in the background...
    start /b node server.js > "%TEMP%\portfolio_server.log" 2>&1
    timeout /t 2 /nobreak >nul
) else (
    echo Local Node.js server is already active on http://localhost:3000!
)

echo.
echo Launching Cloudflare Secure Tunnel...
echo.
echo =========================================================================
echo  INSTRUCTIONS:
echo  1. Look for the "https://....trycloudflare.com" link below.
echo  2. Open https://hitesh070.github.io/admin/ on your phone or any browser.
echo  3. Go to Settings -^> "Secure Remote Backend Connection".
echo  4. Paste the URL and click "Save & Connect".
echo  5. Keep this window open while using the admin panel from your phone.
echo =========================================================================
echo.

if exist "bin\cloudflared.exe" (
    bin\cloudflared.exe tunnel --url http://localhost:3000
) else (
    cloudflared tunnel --url http://localhost:3000
)

pause
