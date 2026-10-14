export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  const url = String(req.body?.url || '').trim();
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ ok:false, reason:'invalid_url' });
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (['localhost','127.0.0.1','0.0.0.0'].includes(host) || host.endsWith('.local')) {
      return res.status(400).json({ ok:false, reason:'blocked_host' });
    }
    const r = await fetch(url, { redirect:'follow', headers:{'user-agent':'HAxBRO-Marketing-Counter/1.0'} });
    if (!r.ok) return res.status(422).json({ ok:false, reason:'page_unavailable' });
    const html = (await r.text()).slice(0, 2000000);
    const clean = html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ');
    const title = (clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]+>/g,' ');
    const descriptions = [...clean.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:title|og:description|twitter:title|twitter:description)["'][^>]+content=["']([^"']*)["'][^>]*>/gi)].map(m=>m[1]);
    const text = [title, ...descriptions].join(' ').replace(/&(?:amp|quot|#39|lt|gt);/gi,' ').toLowerCase();
    const matches = /h\s*a\s*x\s*b\s*r\s*o|haxbro/i.test(text);
    const source = clean.replace(/\\s+/g,' ');
    const viewPatterns = [
      /[\"'](?:viewCount|views|view_count)[\"']\\s*[:=]\\s*[\"']?([0-9][0-9,._]*)/i,
      /([0-9][0-9,._]*)\\s*(?:views|views?)/i,
      /([0-9]+(?:\\.[0-9]+)?)[ ]*([KMB])\\+?[ ]*(?:views|views?)/i
    ];
    let views = null;
    for (const p of viewPatterns) {
      const m = source.match(p);
      if (!m) continue;
      if (m[2]) {
        const n = Number(m[1]);
        const mult = m[2].toUpperCase()==='K'?1000:m[2].toUpperCase()==='M'?1000000:1000000000;
        views = Math.round(n*mult);
      } else {
        const n = Number(String(m[1]).replace(/,/g,''));
        if (Number.isFinite(n)) views = Math.round(n);
      }
      if (views !== null) break;
    }
    return res.json({ ok:true, relevant:matches, title:title.trim().slice(0,300), views, reason:matches?'haxbro_match':'not_about_haxbro' });
  } catch (e) {
    return res.status(422).json({ ok:false, reason:'could_not_check' });
  }
}