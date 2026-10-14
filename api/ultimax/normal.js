import { verifyAdmin69Authorization, validateNormalTarget, normalTargetHostIsPrivate } from 'lib/normal-ultimax-control.js';

export const access = 'public';

// NORMAL ULTIMAX owns its own provider configuration.
// This is intentionally NOT part of the KAI-only source of truth.
const NORMAL_API = Object.freeze({
  openRouterModel: 'openrouter/auto',
  groqModel: 'openai/gpt-oss-20b',
  temperature: 0.2,
  maxTokensDefault: 3000,
  chain: Object.freeze([
    Object.freeze({ provider: 'OpenRouter', keyEnv: 'OPENROUTER_API_KEY_1' }),
    Object.freeze({ provider: 'Grook', keyEnv: 'GROQ_API_KEY' }),
    Object.freeze({ provider: 'OpenRouter', keyEnv: 'OPENROUTER_API_KEY_2' }),
    Object.freeze({ provider: 'Grook', keyEnv: 'GROQ_API_KEY' }),
    Object.freeze({ provider: 'OpenRouter', keyEnv: 'OPENROUTER_API_KEY_3' }),
    Object.freeze({ provider: 'OpenRouter', keyEnv: 'OPENROUTER_API_KEY' })
  ])
});
export const methods = ['POST'];

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_BODY = 5000000;

function clean(v, max = 12000) { return String(v ?? '').replace(/\u0000/g, '').slice(0, max); }
function ok(res, data, status = 200) { return res.status(status).json(data); }
function unique(xs) { return [...new Set(xs)]; }

function extractUrls(value) {
  return unique((String(value || '').match(/https?:\/\/[^\s<>'"`]+/gi) || []).map(raw => {
    try { return validateNormalTarget(raw.replace(/[),.;!?]+$/g, '')).toString(); } catch { return null; }
  }).filter(Boolean)).slice(0, 50);
}

async function readPage(url) {
  const target = validateNormalTarget(url);
  if (normalTargetHostIsPrivate(target.hostname)) throw new Error('Private/local targets are not allowed.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  const started = Date.now();
  try {
    let response = await fetch(target.toString(), {
      method: 'GET', redirect: 'follow', signal: controller.signal,
      headers: { 'user-agent': 'HAxBRO-Ultimax-PassiveScanner/1.0', accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.8,*/*;q=0.5' }
    });
    const finalUrl = new URL(response.url || target.toString());
    if (normalTargetHostIsPrivate(finalUrl.hostname)) throw new Error('Redirected to a private/local target.');
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_BODY) throw new Error('Response exceeds scanner size limit.');
    const buf = await response.arrayBuffer();
    if (buf.byteLength > MAX_BODY) throw new Error('Response exceeds scanner size limit.');
    return { target, response, finalUrl, body: new TextDecoder().decode(buf), bytes: buf.byteLength, responseTimeMs: Date.now() - started };
  } finally { clearTimeout(timer); }
}

function stripHtml(html) {
  return clean(String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' '), 5000);
}
function title(html) { const m = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i); return m ? stripHtml(m[1]) : null; }
function attrs(html, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}\\s*=\\s*["']([^"']+)["'][^>]*>`, 'gi');
  const out = []; let m; while ((m = re.exec(String(html))) && out.length < 1000) out.push(m[1]);
  return unique(out);
}
function absoluteLinks(base, html, tag = 'a', attr = 'href') {
  return attrs(html, tag, attr).map(x => { try { const u = new URL(x, base); return /^https?:$/i.test(u.protocol) ? u.toString() : null; } catch { return null; } }).filter(Boolean);
}
function metaTags(html) {
  const out = []; const re = /<meta\b[^>]*(?:name|property)\s*=\s*["']([^"']+)["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/gi; let m;
  while ((m = re.exec(String(html))) && out.length < 200) out.push({ name: m[1], content: clean(m[2], 2000) });
  return out;
}
function technologies(html, headers) {
  const t = String(html).toLowerCase(); const out = [];
  for (const [name, re] of [
    ['Next.js', /__next|_next\/static/i], ['React', /react(?:dom)?/i], ['Vue', /vue(?:\.runtime)?/i], ['Angular', /ng-version|angular/i],
    ['WordPress', /wp-content|wp-includes/i], ['Shopify', /cdn\.shopify|shopify/i], ['Wix', /wixstatic|wix\.com/i], ['Webflow', /webflow/i],
    ['Bootstrap', /bootstrap(?:\.min)?\.css/i], ['Tailwind CSS', /tailwind/i], ['jQuery', /jquery(?:\.min)?\.js/i], ['Google Analytics', /google-analytics|googletagmanager/i]
  ]) if (re.test(t)) out.push(name);
  if (headers.get('server')) out.push('Server: ' + headers.get('server'));
  if (headers.get('x-powered-by')) out.push('X-Powered-By: ' + headers.get('x-powered-by'));
  return unique(out);
}

function securityChecks(p) {
  const h = p.response.headers;
  const csp = h.get('content-security-policy') || '';
  const checks = {
    https: p.target.protocol === 'https:',
    statusOk: p.response.status >= 200 && p.response.status < 400,
    hsts: !!h.get('strict-transport-security'),
    csp: !!h.get('content-security-policy'),
    nosniff: !!h.get('x-content-type-options'),
    clickjackingProtection: !!h.get('x-frame-options') || /frame-ancestors/i.test(csp),
    referrerPolicy: !!h.get('referrer-policy'),
    permissionsPolicy: !!h.get('permissions-policy'),
    coop: !!h.get('cross-origin-opener-policy'),
    corp: !!h.get('cross-origin-resource-policy'),
    mixedContent: p.target.protocol === 'https:' && /<(?:img|script|link|iframe|source|video|audio)\b[^>]+(?:src|href)\s*=\s*["']http:/i.test(p.body),
    insecureFormAction: /<form\b[^>]*action\s*=\s*["']http:/i.test(p.body),
    sourceMapReference: /\.map(?:[?#]|$)/i.test(p.body)
  };
  const findings = [];
  const add = (severity, id, titleText, evidence, remediation) => findings.push({ severity, id, title: titleText, evidence, remediation });
  if (!checks.https) add('medium', 'no-https', 'HTTPS is not used', 'The scanned URL uses http://.', 'Serve the site over HTTPS and redirect HTTP to HTTPS.');
  if (checks.https && !checks.hsts) add('low', 'missing-hsts', 'HSTS not observed', 'Strict-Transport-Security is absent.', 'Consider enabling HSTS after verifying HTTPS is universal.');
  if (!checks.csp) add('medium', 'missing-csp', 'Content-Security-Policy not observed', 'CSP is absent from the response.', 'Deploy a restrictive CSP appropriate to the application.');
  if (!checks.nosniff) add('low', 'missing-nosniff', 'X-Content-Type-Options not observed', 'X-Content-Type-Options is absent.', 'Set X-Content-Type-Options: nosniff.');
  if (!checks.clickjackingProtection) add('low', 'framing-policy-missing', 'Clickjacking protection not observed', 'No X-Frame-Options or CSP frame-ancestors was observed.', 'Set an appropriate framing policy.');
  if (!checks.referrerPolicy) add('info', 'missing-referrer-policy', 'Referrer-Policy not observed', 'The response does not advertise a Referrer-Policy.', 'Set a deliberate Referrer-Policy.');
  if (!checks.permissionsPolicy) add('info', 'missing-permissions-policy', 'Permissions-Policy not observed', 'The response does not advertise a Permissions-Policy.', 'Set a deliberate Permissions-Policy where appropriate.');
  if (checks.mixedContent) add('medium', 'mixed-content', 'Potential mixed content', 'HTTPS HTML references an HTTP resource.', 'Serve referenced resources over HTTPS.');
  if (checks.insecureFormAction) add('medium', 'insecure-form-action', 'Form submits over HTTP', 'A form action uses http://.', 'Submit sensitive forms only over HTTPS.');
  if (checks.sourceMapReference) add('info', 'sourcemap-reference', 'Source-map reference observed', 'The HTML contains a .map reference.', 'Review whether production source maps should be publicly exposed.');
  return { checks, findings };
}

async function scanOne(url) {
  const p = await readPage(url);
  const h = p.response.headers;
  const base = p.finalUrl.toString();
  const links = absoluteLinks(base, p.body);
  const images = absoluteLinks(base, p.body, 'img', 'src');
  const scripts = attrs(p.body, 'script', 'src');
  const forms = (p.body.match(/<form\b/gi) || []).length;
  const meta = metaTags(p.body);
  const canonical = (p.body.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i) || [])[1] || null;
  const { checks, findings } = securityChecks(p);
  let robots = null, sitemap = null;
  try { const r = await readPage(new URL('/robots.txt', p.finalUrl).toString()); robots = { status: r.response.status, content: clean(r.body, 12000) }; } catch (e) { robots = { error: clean(e?.message, 500) }; }
  try { const s = await readPage(new URL('/sitemap.xml', p.finalUrl).toString()); sitemap = { status: s.response.status, content: clean(s.body, 12000) }; } catch (e) { sitemap = { error: clean(e?.message, 500) }; }
  const cookies = h.get('set-cookie');
  if (cookies && p.target.protocol === 'https:' && !/secure/i.test(cookies)) findings.push({ severity: 'low', id: 'cookie-secure-flag', title: 'A Set-Cookie header lacks an observed Secure attribute', evidence: 'At least one Set-Cookie response did not contain Secure.', remediation: 'Use Secure on cookies that should only travel over HTTPS.' });
  if (cookies && !/httponly/i.test(cookies)) findings.push({ severity: 'info', id: 'cookie-httponly-flag', title: 'A Set-Cookie header lacks an observed HttpOnly attribute', evidence: 'At least one Set-Cookie response did not contain HttpOnly.', remediation: 'Use HttpOnly for cookies that do not need client-side JavaScript access.' });
  return {
    target: p.target.toString(), finalUrl: base, status: p.response.status, statusText: p.response.statusText,
    title: title(p.body), responseTimeMs: p.responseTimeMs, responseSizeBytes: p.bytes,
    contentType: h.get('content-type') || '', technologies: technologies(p.body, h),
    security: { headers: Object.fromEntries(['strict-transport-security','content-security-policy','x-content-type-options','x-frame-options','referrer-policy','permissions-policy','cross-origin-opener-policy','cross-origin-resource-policy'].map(k => [k, h.get(k)])), checks, findings },
    structure: { links: links.length, images: images.length, scripts: scripts.length, forms, externalDomains: unique(links.map(x => { try { return new URL(x).hostname; } catch { return null; } }).filter(Boolean)).filter(host => host !== p.finalUrl.hostname), canonical, metaCount: meta.length },
    seo: { description: meta.find(x => x.name.toLowerCase() === 'description')?.content || null, viewport: meta.find(x => x.name.toLowerCase() === 'viewport')?.content || null, h1Count: (p.body.match(/<h1\b/gi) || []).length },
    discovery: { robots, sitemap },
    cookies: cookies || null
  };
}

function organizedReport(results) {
  const allFindings = results.flatMap(r => (r.ok ? r.result.security.findings.map(f => ({ ...f, url: r.url })) : [{ severity: 'error', id: 'scan-error', title: 'Scan failed', evidence: r.error, url: r.url }]));
  const rank = { critical: 4, high: 3, medium: 2, low: 1, info: 0, error: 5 };
  allFindings.sort((a, b) => (rank[b.severity] || 0) - (rank[a.severity] || 0));
  return {
    generatedAt: new Date().toISOString(), mode: 'ULTIMAX NORMAL API', scope: 'passive public-web inspection',
    targets: results.length, successful: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length,
    severityCounts: Object.fromEntries(['error','critical','high','medium','low','info'].map(s => [s, allFindings.filter(f => f.severity === s).length])),
    findings: allFindings,
    results,
    note: 'This report is based on non-destructive, passive HTTP inspection. It does not exploit vulnerabilities, brute-force directories, scan ports, bypass authentication, or access private/local networks.'
  };
}

async function callOpenRouter(key, messages) {
  const r = await fetch(OR_URL, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'HTTP-Referer': 'https://haxbro.hatchable.site', 'X-Title': 'HAxBRO Ultimax Normal' }, body: JSON.stringify({ model: NORMAL_API.openRouterModel, messages, temperature: NORMAL_API.temperature, max_tokens: NORMAL_API.maxTokensDefault }) });
  const text = await r.text();
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${clean(text, 700)}`);
  const data = JSON.parse(text); return data.choices?.[0]?.message?.content || '';
}
async function callGrook(key, messages) {
  const r = await fetch(GROQ_URL, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: NORMAL_API.groqModel, messages, temperature: NORMAL_API.temperature, max_tokens: NORMAL_API.maxTokensDefault }) });
  const text = await r.text();
  if (!r.ok) throw new Error(`Grook ${r.status}: ${clean(text, 700)}`);
  const data = JSON.parse(text); return data.choices?.[0]?.message?.content || '';
}

async function normalChat(messages) {
  const attempts = [];
  for (const step of NORMAL_API.chain) {
    const key = String(process.env[step.keyEnv] || '').trim();
    if (!key) { attempts.push({ provider: step.provider, status: 'missing_key' }); continue; }
    try {
      const content = step.provider === 'Grook' ? await callGrook(key, messages) : await callOpenRouter(key, messages);
      if (content) return { content, provider: step.provider, attempts };
      attempts.push({ provider: step.provider, status: 'empty_response' });
    } catch (e) { attempts.push({ provider: step.provider, status: 'failed', error: clean(e?.message, 500) }); }
  }
  throw new Error('Normal Ultimax API fallback chain exhausted. ' + JSON.stringify(attempts));
}

export default async function handler(req, res) {
  if (!(await verifyAdmin69Authorization(req))) return ok(res, { ok: false, error: 'Admin69 authentication required.' }, 401);
  try {
    const mode = String(req.body?.mode || 'chat').toLowerCase();
    if (mode === 'scan' || mode === 'report') {
      const urls = extractUrls(req.body?.url || req.body?.urls || req.body?.command || req.body?.message);
      if (!urls.length) return ok(res, { ok: false, error: 'Provide one or more public http(s) URLs.' }, 400);
      const results = [];
      for (const url of urls) {
        try { results.push({ url, ok: true, result: await scanOne(url) }); }
        catch (e) { results.push({ url, ok: false, error: clean(e?.message, 1000) }); }
      }
      return ok(res, { ok: true, mode: 'normal', scanner: 'HAxBRO Ultimax Passive Scanner', report: organizedReport(results) });
    }
    const input = clean(req.body?.message || req.body?.prompt || req.body?.command, 20000);
    if (!input) return ok(res, { ok: false, error: 'Message is required.' }, 400);
    const messages = [
      { role: 'system', content: 'You are the NORMAL mode of HAxBRO ADMIN ULTIMAX. Be useful and concise. When asked about website security, prefer the built-in passive scanner/report route and never claim a vulnerability is proven from passive evidence alone.' },
      ...(Array.isArray(req.body?.messages) ? req.body.messages.slice(-20).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: clean(m.content, 12000) })) : []),
      { role: 'user', content: input }
    ];
    const answer = await normalChat(messages);
    return ok(res, { ok: true, mode: 'normal', response: answer.content, provider: answer.provider, fallbackTrace: answer.attempts });
  } catch (e) {
    return ok(res, { ok: false, error: clean(e?.message, 2000) }, 502);
  }
}