import { db } from 'hatchable';

export const access = 'public';
export const methods = ['GET', 'POST', 'OPTIONS'];

export default async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).send('');

  try {
    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const visitorKey = String(body.visitorKey || '').trim().slice(0, 128);
      let path = String(body.path || '/').split('?')[0].slice(0, 300);
      if (!visitorKey) return res.status(400).json({ ok: false, error: 'visitorKey is required' });
      if (!path.startsWith('/')) path = '/';
      // Store only a random browser-generated key and a pathname; never collect IPs or query strings.
      await db.query(
        `INSERT INTO haxbro_public_traffic (visitor_key, visit_date, path, last_seen)
         VALUES ($1, CURRENT_DATE, $2, now())
         ON CONFLICT (visitor_key, visit_date, path)
         DO UPDATE SET last_seen = now()`,
        [visitorKey, path]
      );
    }

    const [today, active, total] = await Promise.all([
      db.query('SELECT count(*)::int AS n FROM haxbro_public_traffic WHERE visit_date = CURRENT_DATE'),
      db.query(`SELECT count(DISTINCT visitor_key)::int AS n
                FROM haxbro_public_traffic
                WHERE last_seen >= now() - interval '5 minutes'`),
      db.query('SELECT count(*)::int AS n FROM haxbro_public_traffic')
    ]);

    return res.json({
      ok: true,
      visitsToday: Number(today.rows?.[0]?.n || 0),
      activeNow: Number(active.rows?.[0]?.n || 0),
      totalVisits: Number(total.rows?.[0]?.n || 0)
    });
  } catch (error) {
    console.error('public-traffic error', error);
    return res.status(500).json({ ok: false, error: 'Traffic counter temporarily unavailable' });
  }
}