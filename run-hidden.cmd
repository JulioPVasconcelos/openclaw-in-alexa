@echo off
setlocal

REM Optional defaults (edit these or set them in the environment)
REM set VM_DEFAULT_VOICE=Camila
REM set VM_DEFAULT_LANGUAGE=pt-BR

cd /d %~dp0
node voicemonkey-proxy.mjs
