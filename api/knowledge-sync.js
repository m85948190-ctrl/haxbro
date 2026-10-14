import { db } from "hatchable";

export const access = "member";
export const methods = ["GET", "POST"];

export default async function (req, res) {
  if (req.method === "GET") {
    const { rows } = await db.query("SELECT count(*)::int AS jobs, count(*) FILTER (WHERE status = 'queued')::int AS queued FROM haxbro_knowledge_jobs");
    return res.json({ ok: true, ...rows[0] });
  }
  const body = req.body || {};
  const target = String(body.target || "").trim();
  if (!target) return res.status(400).json({ error: "target required" });
  const { rows } = await db.query("INSERT INTO haxbro_knowledge_jobs (target, category, status, priority) VALUES ($1, $2, 'queued', $3) RETURNING id, target, category, status", [target, body.category || "general", Number(body.priority || 0)]);
  return res.json({ ok: true, job: rows[0] });
}