# openclaw-in-alexa

A practical **tutorial + case study** showing how to make an **Echo (Alexa)** speak custom messages using **VoiceMonkey Announcements**, while keeping the **VoiceMonkey token off chat logs** by storing it locally and exposing only a **loopback** proxy endpoint.

This write-up documents a common pitfall: **UTF‑8 end‑to‑end**. If you send the message payload with the wrong encoding, words like **“você”** can be spoken incorrectly.

> Goal: send a command (e.g. from WhatsApp via OpenClaw) and have your **assistant speak through Alexa** in a distinct voice (default: `Camila`) **only when explicitly requested**.

---

## Quickstart

1) Create secrets (local only):
- `./secrets/token.txt` → your VoiceMonkey token
- `./secrets/proxy-key.txt` → random secret string (local auth)

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
    "text":"Olá, eu sou seu assistente e estou falando com você pela Alexa!",
    "language":"pt-BR"
  }'
```

---

## Prereqs

- Node.js 18+ (Node 20+ recommended)
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
  -d '{"device":"ligar-luzes"}'
```

PowerShell helper:
```powershell
powershell -NoProfile -File .\vm-trigger.ps1 -Device "ligar-luzes"
```

### Make Alexa speak (Announcement)

```bash
curl -X POST http://127.0.0.1:18793/announce \
  -H "X-Proxy-Key: <your proxy key>" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "device":"echo",
    "text":"Olá, eu sou seu assistente e estou falando com você pela Alexa!",
    "language":"pt-BR",
    "voice":"Camila"
  }'
```

PowerShell helper (note: sends JSON as UTF‑8 bytes):
```powershell
powershell -NoProfile -File .\vm-announce.ps1 -Device "echo" -Text "Olá, estou falando com você." -Language "pt-BR"
```

> Voice: this repo defaults to `Camila` when you don’t specify a voice.

---

## Case study: the UTF‑8 pitfall (why “você” became “voc…“)

VoiceMonkey’s UI generates a URL like:

```
https://api-v2.voicemonkey.io/announcement?token=TOKEN_AQUI&device=echo&text=Ol%C3%A1%2C%20...%20voc%C3%AA%20...&language=pt-BR
```

Key observations:

1) The UI **percent-encodes UTF‑8**, so characters like `á` and `ê` are correctly represented.
2) If your client sends the request payload in a non‑UTF‑8 encoding (common on Windows), the server may receive mangled text (e.g. `vocÃª`), which can cause Alexa to pronounce it incorrectly.

Fix:
- send JSON as **UTF‑8 bytes**
- set `Content-Type: application/json; charset=utf-8`

That’s why `vm-announce.ps1` explicitly sends UTF‑8 bytes.

---

## Troubleshooting

- **Can’t connect to proxy**
  - Make sure it’s running and bound to `127.0.0.1:18793`.
  - Check Windows firewall if you changed ports.

- **VoiceMonkey returns 200 but Echo doesn’t speak**
  - Verify the `device` name exactly as configured in VoiceMonkey.
  - Confirm your Alexa device is linked and available.

- **Words in other languages sound wrong**
  - Double-check UTF‑8 end‑to‑end (see section above).
  - Try a different `voice` (VoiceMonkey supports `voice=<name>`).

---

## OpenClaw integration (optional)

We used OpenClaw + WhatsApp to control:
- lights (VoiceMonkey trigger)
- assistant speech (VoiceMonkey announcement)

Safety UX rule:
- the assistant speaks through Alexa **only when explicitly requested** (e.g. `Echo: ...`), never as the default response channel.

---

## Files

- `voicemonkey-proxy.mjs`
- `vm-trigger.ps1`
- `vm-announce.ps1`
- `.gitignore` (ignores `secrets/`)

---

## License
MIT.
