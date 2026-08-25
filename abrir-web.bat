@echo off
REM ===========================================================================
REM  BLONK - abrir la web localmente
REM  Doble clic aca para levantar el sitio y abrirlo en el navegador.
REM
REM  Abrir index.html con doble clic NO sirve: en file:// el navegador bloquea
REM  las mascaras CSS y la prenda del configurador queda blanca. Este script
REM  lo sirve por HTTP, que es como va a funcionar en el hosting.
REM ===========================================================================
title BLONK - servidor local
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0herramientas\servidor-local.ps1"
pause
