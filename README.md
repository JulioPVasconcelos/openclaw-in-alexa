# openclaw-in-alexa

A practical **tutorial + case study** showing how to make an **Echo (Alexa)** speak custom messages using **VoiceMonkey Announcements**, while keeping the **VoiceMonkey token off chat logs** by storing it locally and exposing only a **loopback** proxy endpoint.

This project was built by Brazilians and defaults to **PT‑BR + Camila** on purpose — but it’s designed to work with **any VoiceMonkey language/voice**.

This write-up documents a common pitfall: **UTF‑8 end‑to‑end**. If you send the message payload with the wrong encoding, non‑ASCII characters (e.g. accents) can be spoken incorrectly.

> Goal: send a command (e.g. from WhatsApp via OpenClaw) and have your **assistant speak through Alexa** in a distinct voice (default: `Camila`) **only when explicitly requested**.

---

## Quickstart

1) Create secrets (local only):
- `./secrets/token.txt` → your VoiceMonkey token
- `./secrets/proxy-key.txt` → random secret string (local auth)

Tip (Windows): generate a proxy key:
```powershell
[guid]::NewGuid().ToString('N')
```

2) Run:
```bash
node voicemonkey-proxy.mjs
```

3) Health check:
```bash
curl http://127.0.0.1:18793/health
```

4) Make Alexa speak:
```bash
curl -X POST http://127.0.0.1:18793/announce \
  -H "X-Proxy-Key: <your proxy key>" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "device":"echo",
    "text":"Hello! I am your assistant speaking through Alexa.",
    "language":"en-US"
  }'
```

Postman also works:
- Method: `POST`
- URL: `http://127.0.0.1:18793/announce`
- Headers: `X-Proxy-Key`, `Content-Type: application/json; charset=utf-8`
- Body (raw JSON): same payload as above

---

## Prereqs

- Node.js 18+ (Node 20+ recommended)
  - Node 18+ includes built-in `fetch()` (required by this proxy).
- A VoiceMonkey account + device(s)
  - Website: https://voicemonkey.io/
  - You must configure at least one target device name for announcements (example: `device=echo`).
- An Alexa / Echo device linked in your Alexa app and available to VoiceMonkey
- Optional: OpenClaw (WhatsApp control), but the proxy works with any HTTP client.

---

## What we built

- A tiny local HTTP server bound to **127.0.0.1** (loopback), called the **VoiceMonkey proxy**.
- It stores credentials on disk (never in chat):
  - `token.txt` → VoiceMonkey token (secret)
  - `proxy-key.txt` → local auth key (secret)
- It exposes endpoints:
  - `POST /trigger` → trigger an existing VoiceMonkey device (routine)
  - `POST /announce` → call VoiceMonkey **Announcement** API to make Alexa speak

### Security model (why this is safer)
VoiceMonkey tokens are effectively “keys to your house automations”. Pasting them in chat leaks them into logs/backups.

This design:
- keeps the VoiceMonkey token on disk locally (`./secrets/token.txt`)
- binds the proxy to `127.0.0.1` only
- requires `X-Proxy-Key` for requests

**Do not expose this proxy to LAN/WAN.** Keep it loopback-only.

---

## Setup

### 1) Create secrets locally

Create these files (single line each):

- `./secrets/token.txt`
  - Put your **real VoiceMonkey token** here.
- `./secrets/proxy-key.txt`
  - Put a random secret string here (or generate a UUID).

**Do not commit `secrets/`** (this repo already includes a `.gitignore` entry).

### 2) Run the proxy

```bash
node voicemonkey-proxy.mjs
```

Windows tip: run from PowerShell in the repo directory.

Default address:
- `http://127.0.0.1:18793`

---

## Endpoints

### Trigger a VoiceMonkey device

```bash
curl -X POST http://127.0.0.1:18793/trigger \
  -H "X-Proxy-Key: <your proxy key>" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"device":"turn-on-lights"}'
```

PowerShell helper:
```powershell
powershell -NoProfile -File .\vm-trigger.ps1 -Device "turn-on-lights"
```

### Make Alexa speak (Announcement)

```bash
curl -X POST http://127.0.0.1:18793/announce \
  -H "X-Proxy-Key: <your proxy key>" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "device":"echo",
    "text":"Hello! I am your assistant speaking through Alexa.",
    "language":"en-US",
    "voice":"Camila"
  }'
```

PowerShell helper (note: sends JSON as UTF‑8 bytes):
```powershell
powershell -NoProfile -File .\vm-announce.ps1 -Device "echo" -Text "Hello! I am your assistant speaking through Alexa." -Language "en-US"
```

> Defaults: this repo uses `VM_DEFAULT_VOICE` (fallback `Camila`) and `VM_DEFAULT_LANGUAGE` (fallback `pt-BR`). You can override both per request.

---

## Case study: the UTF‑8 pitfall (why accents became garbled)

VoiceMonkey’s UI generates a URL like:

```
https://api-v2.voicemonkey.io/announcement?token=TOKEN_HERE&device=echo&text=Ol%C3%A1%2C%20...%20voc%C3%AA%20...&language=pt-BR
```

Key observations:

1) VoiceMonkey’s UI percent-encodes UTF‑8 in the querystring.
2) If your client sends the request payload in a non‑UTF‑8 encoding (common on Windows), the server may receive mangled text (e.g. `vocÃª`). This can affect many languages (accented Latin characters like é/ü/ñ, and more), depending on where encoding is lost.

Fix:
- send JSON as **UTF‑8 bytes**
- set `Content-Type: application/json; charset=utf-8`

That’s why `vm-announce.ps1` (and `vm-trigger.ps1`) explicitly send UTF‑8 bytes.

---

## Run on Windows startup (Task Scheduler)

If you want this to behave like a “service”, use **Task Scheduler**.

### Option 1 (simplest): run on logon (no password required)

Create Task →
- **General**: “Run only when user is logged on”
- **Trigger**: “At log on”
- **Action**:
  - Program: `C:\Program Files\nodejs\node.exe` (or your `node.exe` path)
  - Args: `voicemonkey-proxy.mjs`
  - Start in: the repo folder

### Run without a console window (recommended)

Use the provided `run-hidden.vbs`:
- Program: `C:\Windows\System32\wscript.exe`
- Args: `run-hidden.vbs`
- Start in: the repo folder

> Note: if you want custom defaults (voice/language) for Task Scheduler, use `run-hidden.cmd` (see Configuration below).

Then validate:
- `GET http://127.0.0.1:18793/health`

---

## Configuration

Environment variables (optional):
- `VM_DEFAULT_VOICE` (default: `Camila`) — pick any voice supported by your VoiceMonkey account.
- `VM_DEFAULT_LANGUAGE` (default: `pt-BR`) — e.g. `en-US`, `es-ES`, `fr-FR`.

Request-level overrides:
- `POST /announce` body can include `voice` and `language` to override defaults.

Windows Task Scheduler tip:
- Use `run-hidden.vbs` (which calls `run-hidden.cmd`) so you can set defaults in `run-hidden.cmd` without opening a console window.

---

## Troubleshooting

- **ECONNREFUSED 127.0.0.1:18793**
  - The proxy isn’t running on this machine.
  - Start it (`node voicemonkey-proxy.mjs`) or check your Task Scheduler entry.

- **VoiceMonkey returns 200 but Echo doesn’t speak**
  - Verify the `device` name exactly as configured in VoiceMonkey.
  - Confirm your Alexa device is linked and available.

- **Accents / non-English characters sound wrong**
  - Double-check UTF‑8 end‑to‑end (JSON as UTF‑8 bytes + `charset=utf-8`).
  - Try a different `voice`.

---

## OpenClaw integration (optional)

We used OpenClaw + WhatsApp to control:
- lights (VoiceMonkey trigger)
- assistant speech (VoiceMonkey announcement)

Safety UX rule:
- the assistant speaks through Alexa **only when explicitly requested** (e.g. `Echo: ...`), never as the default response channel.

---

## Diagram

See `docs/DIAGRAM.md` (Mermaid).

## Files

- `voicemonkey-proxy.mjs`
- `vm-trigger.ps1`
- `vm-announce.ps1`
- `run-hidden.vbs` + `run-hidden.cmd` (Windows hidden runner)
- `.env.example` (non-secret config examples)
- `.gitignore` (ignores `secrets/`)

---

## Changelog

See `CHANGELOG.md`.

---

## License
MIT.
