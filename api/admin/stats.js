import { db } from 'hatchable';
export const access = 'admin';
export const methods = ['GET'];
export default async function (req, res) {
  const [tables, functions] = await Promise.all([
    db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"),
    db.query("SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' ORDER BY routine_name")
  ]);
  res.json({ ok:true, project:'HAxBRO', tables:tables.rows.map(x=>x.table_name), apiFunctions:functions.rows.map(x=>x.routine_name), generatedAt:new Date().toISOString() });
}