import {
  KAI_CONTROL,
  normalizeKaiCapabilities,
  capabilityForCommand,
  toolDefinitions,
  verifyKaiAuthorization,
  validateKaiTarget,
  targetHostIsPrivate,
  kaiIntent
} from 'lib/kai-control.js';

export const access = 'public';
export const methods = ['POST', 'GET'];

function send(res, data, status = 200) { return res.status(status).json(data); }
function clean(v, max = 12000) { return String(v ?? '').replace(/\u0000/g, '').slice(0, max); }

async function fetchPage(url) {
  const target = validateKaiTarget(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KAI_CONTROL.network.timeoutMs);
  try {
    const r = await fetch(target.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'KAI12-WebInspector/1.0',
        accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.5'
      }
    });
    const finalUrl = new URL(r.url || target.toString());
    if (KAI_CONTROL.targets.rejectPrivateRedirects && targetHostIsPrivate(finalUrl.hostname)) throw new Error('Redirected to a private/local target.');
    const declared = Number(r.headers.get('content-length') || 0);
    if (declared > KAI_CONTROL.network.maxBodyBytes) throw new Error('Response exceeds KAI 12 size limit.');
    const buf = await r.arrayBuffer();
    if (buf.byteLength > KAI_CONTROL.network.maxBodyBytes) throw new Error('Response exceeds KAI 12 size limit.');
    return { response: r, finalUrl, body: new TextDecoder().decode(buf), bytes: buf.byteLength, contentType: r.headers.get('content-type') || '' };
  } finally { clearTimeout(timer); }
}

function text(html) {
  return clean(String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'"), 50000);
}

function title(html) { const m = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i); return m ? text(m[1]).slice(0, 1000) : null; }
function attrs(html, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}\\s*=\\s*["']([^"']+)["'][^>]*>`, 'gi');
  const out = []; let m;
  while ((m = re.exec(String(html))) && out.length < 500) out.push(m[1]);
  return [...new Set(out)];
}
function links(base, html, tag = 'a', attr = 'href') {
  return attrs(html, tag, attr).map(x => { try { const u = new URL(x, base); return ['http:', 'https:'].includes(u.protocol) ? u.toString() : null; } catch { return null; } }).filter(Boolean);
}
function meta(html) {
  const re = /<meta\b[^>]*(?:name|property)\s*=\s*["']([^"']+)["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/gi;
  const out = []; let m;
  while ((m = re.exec(String(html))) && out.length < 200) out.push({ name: m[1], content: clean(m[2], 4000) });
  return out;
}
function technologies(html, headers) {
  const t = String(html).toLowerCase(); const out = [];
  const server = headers.get('server'); const powered = headers.get('x-powered-by');
  if (server) out.push({ category: 'server', value: server });
  if (powered) out.push({ category: 'runtime', value: powered });
  for (const [name, re] of [
    ['Next.js', /__next|_next\/static/i], ['React', /react(?:dom)?/i], ['Vue', /vue(?:\.runtime)?/i],
    ['Angular', /ng-version|angular/i], ['WordPress', /wp-content|wp-includes/i], ['Shopify', /cdn\.shopify|shopify/i],
    ['Wix', /wixstatic|wix\.com/i], ['Webflow', /webflow/i], ['Bootstrap', /bootstrap(?:\.min)?\.css/i],
    ['Tailwind CSS', /tailwind/i], ['jQuery', /jquery(?:\.min)?\.js/i], ['Google Analytics', /google-analytics|googletagmanager/i]
  ]) if (re.test(t)) out.push({ category: 'framework/library', value: name });
  return out;
}

async function executeTool(name, arg) {
  const started = Date.now();
  const u = validateKaiTarget(arg);
  const p = await fetchPage(u);
  const h = p.response.headers;
  const base = p.finalUrl.toString();

  if (name === 'status') return { url: u.toString(), finalUrl: base, status: p.response.status, statusText: p.response.statusText, responseTimeMs: Date.now() - started };
  if (name === 'headers') { const obj = {}; for (const [k, v] of h.entries()) obj[k] = v; return { url: u.toString(), finalUrl: base, headers: obj }; }
  if (name === 'cookies') return { url: u.toString(), finalUrl: base, cookies: { 'set-cookie': h.get('set-cookie') || null } };
  if (name === 'text' || name === 'scrape') return { url: u.toString(), finalUrl: base, title: title(p.body), text: text(p.body) };
  if (name === 'html') return { url: u.toString(), finalUrl: base, html: clean(p.body, KAI_CONTROL.network.maxBodyBytes) };
  if (name === 'links') return { url: u.toString(), links: links(base, p.body) };
  if (name === 'images') return { url: u.toString(), images: links(base, p.body, 'img', 'src') };
  if (name === 'metadata') return { url: u.toString(), title: title(p.body), meta: meta(p.body) };
  if (name === 'tech') return { url: u.toString(), technologies: technologies(p.body, h) };
  if (name === 'robots' || name === 'sitemap') {
    const target = new URL(name === 'robots' ? '/robots.txt' : '/sitemap.xml', u.origin);
    const q = await fetchPage(target);
    return { url: target.toString(), status: q.response.status, content: clean(q.body, 50000) };
  }
  if (name === 'size') return { url: u.toString(), bytes: p.bytes, kilobytes: Number((p.bytes / 1024).toFixed(2)) };
  if (name === 'performance') return { url: u.toString(), status: p.response.status, responseTimeMs: Date.now() - started, responseSizeBytes: p.bytes };
  if (name === 'audit') {
    const pageLinks = links(base, p.body);
    const scripts = attrs(p.body, 'script', 'src');
    const forms = (String(p.body).match(/<form\\b/gi) || []).length;
    const securityHeaders = {
      'strict-transport-security': h.get('strict-transport-security'),
      'content-security-policy': h.get('content-security-policy'),
      'x-content-type-options': h.get('x-content-type-options'),
      'x-frame-options': h.get('x-frame-options'),
      'referrer-policy': h.get('referrer-policy'),
      'permissions-policy': h.get('permissions-policy'),
      'cross-origin-opener-policy': h.get('cross-origin-opener-policy'),
      'cross-origin-resource-policy': h.get('cross-origin-resource-policy')
    };
    const findings = [];
    if (u.protocol === 'https:' && !securityHeaders['strict-transport-security']) findings.push({ severity: 'low', id: 'missing-hsts', title: 'HSTS header not observed', evidence: 'Strict-Transport-Security response header is absent.' });
    if (!securityHeaders['content-security-policy']) findings.push({ severity: 'medium', id: 'missing-csp', title: 'Content-Security-Policy not observed', evidence: 'CSP response header is absent.' });
    if (!securityHeaders['x-content-type-options']) findings.push({ severity: 'low', id: 'missing-nosniff', title: 'X-Content-Type-Options not observed', evidence: 'X-Content-Type-Options response header is absent.' });
    if (!securityHeaders['x-frame-options'] && !securityHeaders['content-security-policy']?.toLowerCase().includes('frame-ancestors')) findings.push({ severity: 'low', id: 'framing-policy-missing', title: 'Clickjacking protection not observed', evidence: 'Neither X-Frame-Options nor CSP frame-ancestors was observed.' });
    if (u.protocol === 'https:' && /<(?:img|script|link|iframe|source|video|audio)\\b[^>]+(?:src|href)\\s*=\\s*["']http:/i.test(p.body)) findings.push({ severity: 'medium', id: 'mixed-content', title: 'Potential mixed content', evidence: 'The HTML contains an HTTP resource reference on an HTTPS page.' });
    if (forms && u.protocol === 'https:' && /<form\\b[^>]*action\\s*=\\s*["']http:/i.test(p.body)) findings.push({ severity: 'medium', id: 'insecure-form-action', title: 'Form submits over HTTP', evidence: 'An HTML form action uses http://.' });
    if (scripts.some(s => /\.map(?:[?#]|$)/i.test(s))) findings.push({ severity: 'info', id: 'sourcemap-reference', title: 'Source-map reference observed', evidence: 'A script source appears to reference a .map file.' });
    const checks = {
      https: u.protocol === 'https:',
      statusOk: p.response.status >= 200 && p.response.status < 400,
      hsts: !!securityHeaders['strict-transport-security'],
      csp: !!securityHeaders['content-security-policy'],
      nosniff: !!securityHeaders['x-content-type-options'],
      framingProtection: !!securityHeaders['x-frame-options'] || !!securityHeaders['content-security-policy']?.toLowerCase().includes('frame-ancestors'),
      mixedContent: /<(?:img|script|link|iframe|source|video|audio)\\b[^>]+(?:src|href)\\s*=\\s*["']http:/i.test(p.body),
      insecureFormAction: /<form\\b[^>]*action\\s*=\\s*["']http:/i.test(p.body)
    };
    return { url: u.toString(), finalUrl: base, status: p.response.status, responseTimeMs: Date.now() - started, responseSizeBytes: p.bytes, title: title(p.body), technologies: technologies(p.body, h), securityHeaders, checks, findings, counts: { links: pageLinks.length, images: links(base, p.body, 'img', 'src').length, scripts: scripts.length, forms, findings: findings.length }, note: 'Passive web inspection only; no exploit payloads or destructive actions were executed.' };
  }
  if (name === 'seo') {
    const t = title(p.body); const m = meta(p.body); const d = m.find(x => x.name.toLowerCase() === 'description'); const vp = m.find(x => x.name.toLowerCase() === 'viewport');
    const h1 = (p.body.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || []).map(text);
    return { url: u.toString(), seo: { title: t, titleLength: t?.length || 0, description: d?.content || null, descriptionLength: d?.content?.length || 0, viewport: vp?.content || null, h1Count: h1.length, h1 } };
  }
  if (name === 'report' || name === 'visit') {
    const t = title(p.body); const m = meta(p.body); const d = m.find(x => x.name.toLowerCase() === 'description');
    const result = { url: u.toString(), finalUrl: base, status: p.response.status, statusText: p.response.statusText, contentType: p.contentType, responseTimeMs: Date.now() - started, responseSizeBytes: p.bytes, title: t, description: d?.content || null };
    if (name === 'visit') result.textPreview = text(p.body).slice(0, 5000);
    else Object.assign(result, { technologies: technologies(p.body, h), linkCount: links(base, p.body).length, imageCount: links(base, p.body, 'img', 'src').length, securityHeaders: { 'strict-transport-security': h.get('strict-transport-security'), 'content-security-policy': h.get('content-security-policy'), 'x-content-type-options': h.get('x-content-type-options'), 'x-frame-options': h.get('x-frame-options'), 'referrer-policy': h.get('referrer-policy') } });
    return result;
  }
  throw new Error('KAI execution tool is not implemented.');
}

const PUBLIC_KAI_CAPABILITIES = new Set([
  'visit_page', 'check_status', 'get_headers', 'get_cookies',
  'scrape_site', 'scrape_text', 'scrape_html', 'extract_links', 'extract_images',
  'get_metadata', 'check_robots', 'check_sitemap', 'check_seo',
  'check_performance', 'get_page_size', 'technology_detect', 'generate_report', 'web_security_audit', 'generate_summary'
]);

function extractUrls(value) {
  return [...new Set((String(value || '').match(/https?:\/\/[^\s<>'"`]+/gi) || []).map(raw => {
    try { return new URL(raw.replace(/[),.;!?]+$/g, '')).toString(); } catch { return null; }
  }).filter(Boolean))].slice(0, 100);
}

export default async function handler(req, res) {
  const capabilities = normalizeKaiCapabilities(req.body?.capabilities);
  // KAI ULTIMAX is governed by lib/kai-control.js. UI/local configuration cannot expand it.
  if (KAI_CONTROL.authorization.required !== true || KAI_CONTROL.ai.externalModelFallback !== false) {
    return send(res, { ok: false, error: 'Invalid KAI authorization policy.' }, 500);
  }
  if (!(await verifyKaiAuthorization(req))) return send(res, { ok: false, error: 'Admin69 authentication required.' }, 401);
  if (req.method === 'GET') {
    return send(res, { ok: true, engine: KAI_CONTROL.identity.name, mode: KAI_CONTROL.identity.mode, providerRequired: KAI_CONTROL.identity.providerRequired, capabilities, tools: toolDefinitions(capabilities), policy: KAI_CONTROL.policy, behavior: KAI_CONTROL.behavior, personality: KAI_CONTROL.personality, mission: KAI_CONTROL.personality.mission });
  }

  try {
    const input = req.body?.command || req.body?.message || req.body?.objective || '';
    const parsed = kaiIntent(input);
    const urls = extractUrls(input);
    const publicSafeRequest = KAI_CONTROL.policy.passiveScanning === true && KAI_CONTROL.targets.scope === 'public-web-passive-inspection';
    if (urls.length > 1 && ['status', 'visit', 'report', 'audit', 'headers', 'cookies', 'text', 'scrape', 'html', 'links', 'images', 'metadata', 'robots', 'sitemap', 'seo', 'performance', 'size', 'tech'].includes(parsed.name)) {
      const results = [];
      for (const url of urls) {
        try { results.push({ url, ok: true, result: await executeTool(parsed.name, url) }); }
        catch (e) { results.push({ url, ok: false, error: e?.message || 'Inspection failed.' }); }
      }
      return send(res, {
        ok: true, engine: KAI_CONTROL.identity.name, mode: KAI_CONTROL.identity.mode,
        command: '/' + parsed.name, capability: capabilityForCommand(parsed.name), capabilities,
        batch: true, count: results.length, results,
        trace: [{ type: 'understand', input: clean(input, 2000), intent: parsed.name }, { type: 'batch_complete', count: results.length }]
      });
    }
    if (parsed.name === 'chat') {
      return send(res, { ok: true, engine: KAI_CONTROL.identity.name, mode: KAI_CONTROL.identity.mode, command: 'conversation', capability: null, capabilities, result: { response: clean(parsed.reply) }, trace: [{ type: 'understand', input: clean(input, 2000), intent: 'conversation' }, { type: 'response', tool: KAI_CONTROL.identity.name }] });
    }
    if (parsed.name === 'help') {
      return send(res, { ok: true, engine: KAI_CONTROL.identity.name, mode: KAI_CONTROL.identity.mode, command: '/help', capabilities, result: { response: 'Tell me what you need in normal language. I will choose an enabled KAI tool automatically.', tools: toolDefinitions(capabilities) } });
    }
    const capability = capabilityForCommand(parsed.name);
    if (!capability || !capabilities.includes(capability)) throw new Error(`Capability '${capability}' is disabled in the KAI command center.`);
    const result = await executeTool(parsed.name, parsed.arg);
    return send(res, { ok: true, engine: KAI_CONTROL.identity.name, mode: KAI_CONTROL.identity.mode, command: '/' + parsed.name, capability, capabilities, result, trace: [{ type: 'understand', input: clean(input, 2000), intent: parsed.name }, { type: 'tool_start', tool: KAI_CONTROL.identity.name, args: { command: '/' + parsed.name, url: parsed.arg || null } }] });
  } catch (e) {
    console.error('KAI 12 execution error:', e?.stack || e);
    return send(res, { ok: false, engine: KAI_CONTROL.identity.name, provider: null, providerRequired: KAI_CONTROL.identity.providerRequired, error: e?.message || 'KAI 12 execution failed.' }, 400);
  }
}