import { monitor } from 'lib/kai';

export const access = 'public';
export const methods = ['GET'];

export default async function(req, res) {
  const result = await monitor();
  res.json({ service: 'Kai System', ...result });
}