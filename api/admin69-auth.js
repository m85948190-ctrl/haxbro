export const access = 'public';
export const methods = ['POST'];

const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const COOKIE_NAME = 'haxbro_admin69';
const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return b64url(new Uint8Array(sig));
}

export default async function (req, res) {
  const ip = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > record.resetAt) { record.count = 0; record.resetAt = now + WINDOW_MS; }
  if (record.count >= MAX_ATTEMPTS) return res.status(429).json({ ok: false, error: 'Too many Admin69 attempts. Try again later.' });

  const supplied = String(req.body?.password || '');
  const expected = String(process.env.ADMIN69_PASSWORD || '');
  if (!expected) return res.status(503).json({ ok: false, error: 'ADMIN69_PASSWORD is not configured in the project secrets.' });

  if (!supplied || supplied !== expected) {
    record.count += 1;
    attempts.set(ip, record);
    return res.status(401).json({ ok: false, error: 'Admin69 password rejected.' });
  }

  attempts.delete(ip);
  const secret = expected;
  // Do not bind the session token to the request IP: Hatchable's edge/proxy
  // can legitimately present different forwarding IPs on subsequent calls.
  // The token is still HMAC-signed with the private ADMIN69_PASSWORD secret.
  const issuedAt = String(Math.floor(now / 1000));
  const payload = issuedAt;
  const signature = await sign(payload, secret);
  const token = `${payload}.${signature}`;
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 1000
  });
  // Return the same short-lived signed session token as a fallback for browsers
  // that do not persist the custom cookie reliably. The token is not the password.
  res.json({ ok: true, mode: 'ADMIN ULTIMAX', scope: 'authorized security testing and defensive auditing', token });
}