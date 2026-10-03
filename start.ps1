# AETHER Startup Script (PowerShell)
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  AETHER // ZERO-KNOWLEDGE E2EE SOCIAL & CHAT PLATFORM" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting Relay Server on http://localhost:4000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\server'; node server.js"

Write-Host "Starting Client on http://localhost:3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\client'; npm run dev"

Write-Host ""
Write-Host "AETHER is online! Open http://localhost:3001 in your browser." -ForegroundColor Cyan
