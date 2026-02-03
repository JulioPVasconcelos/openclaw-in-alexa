import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = process.env.VM_PROXY_HOST || '127.0.0.1';
const PORT = Number(process.env.VM_PROXY_PORT || '18793');

const secretsDir = path.join(__dirname, 'secrets');
const tokenPath = process.env.VOICEMONKEY_TOKEN_PATH || path.join(secretsDir, 'token.txt');
const keyPath = process.env.VM_PROXY_KEY_PATH || path.join(secretsDir, 'proxy-key.txt');

function readSecret(p, name) {
  if (!existsSync(p)) throw new Error(`${name} not found at ${p}`);
  const v = String(readFileSync(p, 'utf8')).trim();
  if (!v) throw new Error(`${name} is empty at ${p}`);
  return v;
}

function send(res, code, obj, headers = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(body);
}

function notFound(res) {
  send(res, 404, { ok: false, error: 'not_found' });
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return null;
  return JSON.parse(raw);
}

function requireKey(req, res) {
  const expected = readSecret(keyPath, 'proxy key');
  const got = req.headers['x-proxy-key'];
  if (!got || got !== expected) {
    send(res, 401, { ok: false, error: 'unauthorized' });
    return false;
  }
  return true;
}

// VoiceMonkey expects URL-encoded UTF-8 in the querystring.
// We rely on URLSearchParams to encode safely (e.g., "Olá" -> Ol%C3%A1).
// Keep transformations minimal to avoid breaking Alexa's word recognition.
function sanitizeSpeakText(input) {
  // Just normalize whitespace.
  return String(input ?? '').replace(/\s+/g, ' ').trim();
}

async function trigger(device) {
  const token = readSecret(tokenPath, 'voicemonkey token');
  const url = new URL('https://api-v2.voicemonkey.io/trigger');
  url.searchParams.set('token', token);
  url.searchParams.set('device', device);

  const r = await fetch(url, { method: 'GET' });
  const text = await r.text().catch(() => '');
  return { status: r.status, body: text.slice(0, 1000) };
}

async function announce({ device, text, language, voice }) {
  const token = readSecret(tokenPath, 'voicemonkey token');

  // VoiceMonkey's UI generates a percent-encoded querystring (spaces as %20).
  // URLSearchParams encodes spaces as "+"; some providers don't decode "+" correctly.
  // So we build the query manually with encodeURIComponent.
  const t = sanitizeSpeakText(text);
  const v = (voice && String(voice).trim()) ? voice : 'Camila';
  const lang = language || 'pt-BR';

  const qs = [
    `token=${encodeURIComponent(token)}`,
    `device=${encodeURIComponent(device)}`,
    `text=${encodeURIComponent(t)}`,
    `language=${encodeURIComponent(lang)}`,
    `voice=${encodeURIComponent(v)}`,
  ].join('&');

  const url = `https://api-v2.voicemonkey.io/announcement?${qs}`;

  const r = await fetch(url, { method: 'GET' });
  const body = await r.text().catch(() => '');
  return { status: r.status, body: body.slice(0, 1000) };
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && u.pathname === '/health') {
      return send(res, 200, { ok: true, host: HOST, port: PORT });
    }

    if (u.pathname === '/trigger') {
      if (!requireKey(req, res)) return;

      let device = u.searchParams.get('device');
      if (!device && req.method === 'POST') {
        const j = await readJson(req);
        device = j?.device;
      }

      if (!device) return send(res, 400, { ok: false, error: 'missing_device' });

      const out = await trigger(device);
      return send(res, 200, { ok: true, device, upstreamStatus: out.status });
    }

    if (u.pathname === '/announce') {
      if (!requireKey(req, res)) return;

      let device = u.searchParams.get('device');
      let text = u.searchParams.get('text');
      let language = u.searchParams.get('language') || undefined;
      let voice = u.searchParams.get('voice') || undefined;

      if (req.method === 'POST' && (!device || !text)) {
        const j = await readJson(req);
        device = device || j?.device;
        text = text || j?.text;
        language = language || j?.language;
        voice = voice || j?.voice;
      }

      if (!device) return send(res, 400, { ok: false, error: 'missing_device' });
      if (!text) return send(res, 400, { ok: false, error: 'missing_text' });

      const out = await announce({ device, text, language, voice });
      return send(res, 200, { ok: true, device, upstreamStatus: out.status });
    }

    return notFound(res);
  } catch (e) {
    return send(res, 500, { ok: false, error: 'server_error', message: e?.message || String(e) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`VoiceMonkey proxy listening on http://${HOST}:${PORT}`);
  console.log(`tokenPath=${tokenPath}`);
  console.log(`keyPath=${keyPath}`);
});
