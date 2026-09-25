@echo off
rem ============================================================
rem  Arranca el servidor de la Fundacion Red Con Ciencia (V6)
rem  Requisito: Node.js 22 o superior (https://nodejs.org)
rem ============================================================
cd /d "%~dp0"
echo.
echo  Iniciando la Fundacion Red Con Ciencia...
echo.
node server.js
pause
