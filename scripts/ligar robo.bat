@echo off
title ROBO ADV 2026 - RUNNER
color 0A
cd /d "%~dp0"

echo ===================================================
echo    INICIANDO O ROBO DE AUTOMACAO (CLARA BOT)
echo ===================================================
echo.
echo Para parar, apenas feche esta janela.
echo O robo vai reiniciar automaticamente se der erro.
echo.

node runner.cjs

pause