// External web discovery uses fetch so KAI 6-9-9 stays fast and independent of browser sessions.

export const access = 'public';
export const methods = ['GET','POST'];

// KAI 6-9-9 is external-hosting only. It never falls back to HAxBRO hosting.
const MAX_FILES = 100;
const MAX_FILE_BYTES = 180000;
const MAX_TOTAL_BYTES = 9000000;
const clean = s => String(s || '').replace(/[<>]/g, '').slice(0, 120);

const knownHosts = [{
  id: 'ship.page',
  name: 'ship.page',
  free: true,
  anonymous: true,
  loginRequired: false,
  deploy: async files => {
    const map = {};
    for (const f of files) map[f.path] = f.content;
    const r = await fetch('https://ship.page/deploy', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({files: map})
    });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    if (!r.ok || !data?.url) throw new Error(data?.error || `ship.page returned HTTP ${r.status}`);
    return {url: data.url, expiresAt: data.expires_at || null, claimToken: data.claim_token || null};
  }
}];

async function webDiscover(){
  const queries = [
    'free anonymous static hosting API no account deploy website',
    'free static site hosting API no signup upload HTML',
    'anonymous static site deploy API free'
  ];
  const found = [];
  for (const q of queries) {
    try {
      const r = await fetch('https://www.google.com/search?q=' + encodeURIComponent(q), {headers:{'user-agent':'Mozilla/5.0 HAxBRO-KAI-699'}});
      const html = String(await r.text() || '').slice(0, 120000);
      const urls = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
      for (const raw of urls) {
        const url = raw.replace(/[)&,.;]+$/g, '');
        if (/ship\.page|shipsite\.co|shipstatic\.com|display\.dev|paged\.net|pagey\.site|dropley\.app|yourwebs\.app/i.test(url) && !found.includes(url)) found.push(url);
      }
    } catch {}
  }
  return found.slice(0, 20);
}

async function verifyUrl(url){
  try {
    const r = await fetch(url, {method:'GET', redirect:'follow'});
    return {ok:r.status >= 200 && r.status < 400, status:r.status};
  } catch (e) {
    return {ok:false, status:0, error:String(e?.message || e)};
  }
}

function normalizeFiles(input){
  return input.filter(f => f && typeof f.path === 'string' && typeof f.content === 'string')
    .slice(0, MAX_FILES)
    .map(f => ({path:f.path.replace(/^\/+/, '').replace(/\/+/g, '/').slice(0,240), content:f.content.slice(0,MAX_FILE_BYTES)}))
    .filter(f => f.path && !f.path.includes('..'));
}

export default async function(req,res){
  if (req.method === 'GET') {
    const discovered = await webDiscover();
    return res.json({
      ok:true,
      agent:'KAI 6-9-9',
      mission:'external-free-no-login-hosting',
      hosting:'external-only',
      hatchableHostingFallback:false,
      discoveredWebHosts:discovered,
      verifiedDeployAdapters:knownHosts.map(h => ({name:h.name,free:h.free,anonymous:h.anonymous,loginRequired:h.loginRequired,deployable:true}))
    });
  }

  const files = normalizeFiles(Array.isArray(req.body?.files) ? req.body.files : []);
  if (!files.length) return res.status(400).json({ok:false,agent:'KAI 6-9-9',error:'Build an app first, then send its files to KAI 6-9-9.'});
  const totalBytes = files.reduce((n,f) => n + f.content.length, 0);
  if (totalBytes > MAX_TOTAL_BYTES) return res.status(413).json({ok:false,agent:'KAI 6-9-9',error:'The generated static site is too large for anonymous free deployment.'});
  if (!files.some(f => f.path.toLowerCase() === 'index.html')) return res.status(400).json({ok:false,agent:'KAI 6-9-9',error:'The generated site must contain index.html.'});

  // Never make publishing wait on search-engine crawling. A verified no-login
  // adapter is enough to publish; discovery is informational and can be slow.
  const discoveredPromise = webDiscover().catch(() => []);
  const attempts = [];
  for (const host of knownHosts) {
    if (!host.free || !host.anonymous || host.loginRequired) continue;
    try {
      const deployed = await host.deploy(files);
      const check = await verifyUrl(deployed.url);
      attempts.push({host:host.name,deployed:true,verified:check.ok,status:check.status});
      if (check.ok) return res.json({ok:true,agent:'KAI 6-9-9',hosting:'external',provider:host.name,free:true,public:true,accountRequired:false,url:deployed.url,expiresAt:deployed.expiresAt,claimToken:deployed.claimToken,discoveredWebHosts:await Promise.race([discoveredPromise,new Promise(resolve=>setTimeout(()=>resolve([]),100))]),attempts});
    } catch (error) {
      attempts.push({host:host.name,deployed:false,error:String(error?.message || error)});
    }
  }

  return res.status(502).json({ok:false,agent:'KAI 6-9-9',hosting:'external-only',free:true,accountRequired:false,hatchableHostingFallback:false,error:'KAI 6-9-9 could not complete an external free/no-login deployment. HAxBRO hosting was not used as a fallback.',discoveredWebHosts:[],attempts});
}