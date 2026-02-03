# Changelog

All notable changes to this project will be documented in this file.

## v1.0.0

- Local loopback proxy (`127.0.0.1`) for VoiceMonkey:
  - `POST /trigger` for routines
  - `POST /announce` for Echo announcements
- Token-safe design:
  - VoiceMonkey token stored only in `./secrets/token.txt`
  - local auth via `./secrets/proxy-key.txt` + `X-Proxy-Key` header
- UTF-8 end-to-end notes + PowerShell helpers that send JSON as UTF-8 bytes
- Configurable defaults:
  - `VM_DEFAULT_VOICE` (default: Camila)
  - `VM_DEFAULT_LANGUAGE` (default: pt-BR)
- Windows autostart guidance + hidden runner (`run-hidden.vbs` → `run-hidden.cmd`)
