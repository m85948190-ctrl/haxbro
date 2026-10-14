import { storage } from 'hatchable';

export const access = 'public';
export const methods = ['GET'];

function safeName(value) {
  const name = String(value || 'HAxBRO-file.bin').replace(/[^a-zA-Z0-9._-]+/g, '-');
  return name.slice(0, 160) || 'HAxBRO-file.bin';
}

export default async function (req, res) {
  const requestedKey = String(req.query?.key || '').trim();
  const name = safeName(req.query?.name || requestedKey.split('/').pop());
  let key = requestedKey;

  // Prefer an exact storage key when the creator returns one. The fallback
  // keeps compatibility with older links that only carried the filename.
  if (!key) {
    const items = await storage.list('artifacts', { limit: 1000 });
    const matches = items.items.filter(item => String(item.key || '').endsWith('-' + name));
    if (!matches.length) return res.status(404).send('File not found.');
    matches.sort((a, b) => new Date(b.last_modified || 0) - new Date(a.last_modified || 0));
    key = matches[0].key;
  }

  if (!key.startsWith('artifacts/')) return res.status(400).send('Invalid file key.');
  const file = await storage.get(key);
  if (!file?.buffer) return res.status(404).send('File not found.');
  res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(file.buffer);
}