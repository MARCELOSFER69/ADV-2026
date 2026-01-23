@echo off
title Robo Advogado - Noleto & Macedo
color 0A
echo ==========================================
echo      INICIANDO O ROBO DE WHATSAPP...
echo ==========================================
echo.
cd /d "%~dp0"
node bot.cjs
echo.
echo ==========================================
echo    O ROBO DESLIGOU OU DEU ERRO.
echo ==========================================
pause