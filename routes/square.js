const crypto = require('crypto');
const { getDb } = require('../lib/db');

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function verifySquareSignature(req, signatureKey) {
  try {
    const sig = req.get('x-square-hmacsha256-signature') || '';
    const body = JSON.stringify(req.body || {});
    const hmac = crypto.createHmac('sha256', signatureKey);
    hmac.update(body);
    const expected = hmac.digest('base64');
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

module.exports = require('express').Router().post('/square-webhook', async (req, res) => {
  const DEV_BYPASS = String(process.env.DEV_WEBHOOK_BYPASS || '').toLowerCase() === 'true';
  const KEY = process.env.SQUARE_SIGNATURE_KEY || '';

  if (!DEV_BYPASS) {
    if (!KEY) return res.status(401).json({ ok: false, error: 'Missing signature key' });
    const ok = verifySquareSignature(req, KEY);
    if (!ok) return res.status(401).json({ ok: false, error: 'Invalid signature' });
  }

  const { tier, usesAllowed = 1, minutesToLive = Number(process.env.CODE_EXPIRY_MINUTES || 1440) } = req.body || {};
  if (!tier) return res.status(400).json({ ok: false, error: 'Missing tier' });

  const db = getDb();
  const col = db.collection('codes');
  const expiresAt = new Date(Date.now() + minutesToLive * 60 * 1000);

  const code = genCode();
  await col.insertOne({ code, tier, usesAllowed, usesConsumed: 0, expiresAt, createdAt: new Date() });

  return res.json({ ok: true, source: DEV_BYPASS ? 'dev-bypass' : 'square', code, tier, usesAllowed, expiresAt });
});
