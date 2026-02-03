# VoiceMonkey + Alexa Announcements (PT-BR) with a Local Token-Safe Proxy

A practical **tutorial + case study** showing how to make an **Echo (Alexa)** speak custom messages using **VoiceMonkey Announcements**, while keeping the **VoiceMonkey token off chat logs** by storing it locally and exposing only a **loopback** proxy endpoint.

This write-up also documents a surprisingly common pitfall: **UTF‑8 handling**. If you send the message payload with the wrong encoding, words like **“você”** can be spoken incorrectly.

> **Goal**: You can send a command (e.g. from WhatsApp via OpenClaw) and have Alexa speak it in a distinct voice (e.g. `Camila`) **only when explicitly requested**.

---

## What we built

- A tiny local HTTP server bound to **127.0.0.1** (loopback), called the **VoiceMonkey proxy**.
- It stores credentials on disk (never in chat):
  - `token.txt` → VoiceMonkey token (secret)
  - `proxy-key.txt` → local auth key (secret)
- It exposes endpoints:
  - `POST /trigger` → trigger an existing VoiceMonkey device (routine)
  - `POST /announce` → call VoiceMonkey **Announcement** API to make Alexa speak

### Why the proxy?
VoiceMonkey tokens are effectively “keys to your house automations”. Pasting them in chat leaks them into logs/backups. The proxy keeps the token local and uses a second local key (`proxy-key.txt`) to prevent casual abuse even on localhost.

---

## Prereqs

- Node.js 18+ (Node 20+ recommended)
- A VoiceMonkey account with:
  - One or more devices for triggers (optional)
  - At least one Alexa device for announcements (e.g. `device=echo`)
- Optional: OpenClaw (for WhatsApp control), but the proxy works with any HTTP client.

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

> Windows tip: run from PowerShell in the repo directory.

By default it listens on:

- `http://127.0.0.1:18793`

Health check:

```bash
curl http://127.0.0.1:18793/health
```

---

## Endpoints

### Trigger a VoiceMonkey device

```bash
curl -X POST http://127.0.0.1:18793/trigger \
  -H "X-Proxy-Key: <your proxy key>" \
  -H "Content-Type: application/json" \
  -d '{"device":"ligar-luzes"}'
```

### Make Alexa speak (Announcement)

```bash
curl -X POST http://127.0.0.1:18793/announce \
  -H "X-Proxy-Key: <your proxy key>" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "device":"echo",
    "text":"Olá, eu sou o Furabot e estou falando com você pela Alexa!",
    "language":"pt-BR",
    "voice":"Camila"
  }'
```

---

## Case study: the UTF‑8 pitfall (why “você” became “voc…“)

VoiceMonkey’s UI generates a URL like:

```
https://api-v2.voicemonkey.io/announcement?token=TOKEN_AQUI&device=echo&text=Ol%C3%A1%2C%20...%20voc%C3%AA%20...&language=pt-BR
```

Key observations:

1) The UI **percent-encodes UTF‑8**, so characters like `á` and `ê` are correctly represented.
2) If your client sends the request payload in a non‑UTF‑8 encoding (common on Windows), the server may receive mangled text (`vocÃª`), which can cause Alexa to pronounce it incorrectly.

**Fix**: ensure the body is sent as **UTF‑8 bytes** and include:

- `Content-Type: application/json; charset=utf-8`

In PowerShell, for example, convert JSON to UTF‑8 bytes before sending.

---

## Safety checklist

- Rotate VoiceMonkey token if it was ever pasted in chat.
- Keep the proxy bound to **127.0.0.1** only.
- Keep `proxy-key.txt` secret.
- Never commit `secrets/`.

---

## OpenClaw integration (optional)

We used OpenClaw + WhatsApp to control:
- lights (VoiceMonkey trigger)
- Alexa speech (VoiceMonkey announcement)

Additionally, we adopted a safety UX rule:
- Alexa speech is used **only when explicitly requested** (e.g. `Echo: ...`), never as the default response channel.

---

## Files to include in this repo

- `voicemonkey-proxy.mjs`
- `vm-trigger.ps1`
- `vm-announce.ps1`
- `.gitignore` (must ignore `secrets/`)

---

## License
MIT (or your preferred license).
