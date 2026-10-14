export const access = 'public';
export const methods = ['GET', 'HEAD'];
export default async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, service: 'HAxBRO', status: 'healthy' });
}