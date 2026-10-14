export const access = 'public';
export const methods = ['POST'];

function normalizeUrl(value) {
  try {
    const u = new URL(String(value || '').trim());
    if (!/^https?:$/i.test(u.protocol)) return '';
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0' || h === '::1') return '';
    if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || h.endsWith('.internal') || h.endsWith('.local')) return '';
    const m = h.match(/^172\.(\d{1,3})\./);
    if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return '';
    if (h.startsWith('169.254.')) return '';
    return u.toString();
  } catch { return ''; }
}

export default async function (req, res) {
  const url = normalizeUrl(req.body?.url);
  if (!url) return res.status(400).json({ error: 'A valid public http(s) URL is required.' });
  try {
    let r = await fetch(url, { method: 'GET', redirect: 'follow' });
    const h = Object.fromEntries([...r.headers.entries()].map(([k,v]) => [k.toLowerCase(), v]));
    const findings = [];
    if (!h['strict-transport-security'] && /^https:/i.test(r.url || url)) findings.push({severity:'medium',title:'HSTS header missing',detail:'The HTTPS response does not advertise Strict-Transport-Security.'});
    if (!h['content-security-policy']) findings.push({severity:'low',title:'Content-Security-Policy missing',detail:'No CSP response header was observed on the checked page.'});
    if (!h['x-content-type-options']) findings.push({severity:'low',title:'X-Content-Type-Options missing',detail:'The response does not advertise nosniff protection.'});
    if (!h['x-frame-options'] && !String(h['content-security-policy']||'').toLowerCase().includes('frame-ancestors')) findings.push({severity:'low',title:'Clickjacking protection not observed',detail:'Neither X-Frame-Options nor a CSP frame-ancestors directive was observed.'});
    if (h['server']) findings.push({severity:'info',title:'Server header disclosed',detail:`Server response header is exposed as ${h['server']}.`});
    const setCookie=h['set-cookie']; if(setCookie && !/secure/i.test(setCookie)) findings.push({severity:'medium',title:'Cookie Secure attribute not observed',detail:'At least one Set-Cookie response was returned without an obvious Secure attribute.'});
    const challenge=/challenge|captcha/i.test(String(h['cf-mitigated']||''));
    res.json({ ok: r.status>=200 && r.status<500, live:r.status>=200&&r.status<500, status:r.status, statusText:r.statusText, finalUrl:r.url||url, accessBlocked:challenge, note:challenge?'The target returned an anti-bot challenge. Header findings are limited to the challenge response and are not a full application security assessment.':null, findings, headers:{'content-security-policy':h['content-security-policy']||null,'strict-transport-security':h['strict-transport-security']||null,'x-content-type-options':h['x-content-type-options']||null,'x-frame-options':h['x-frame-options']||null}, checkedAt:new Date().toISOString() });
  } catch (e) {
    res.json({ ok: false, live: false, status: 0, error: String(e?.message || e), findings: [], checkedAt: new Date().toISOString() });
  }
}