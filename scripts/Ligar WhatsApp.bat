@echo off
title ROBO WHATSAPP (SEPARADO)
color 0B
cd /d "%~dp0"

echo ===================================================
echo    INICIANDO APENAS O WHATSAPP BOT
echo    (Use isso no computador que vai ler o QR Code)
echo ===================================================
echo.

node bot.cjs

pause
