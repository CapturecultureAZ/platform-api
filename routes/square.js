const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// HMAC over: SQUARE_WEBHOOK_URL + raw body bytes
function verify(req) {
  const notifUrl = process.env.SQUARE_WEBHOOK_URL || '';
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '';
  if (!notifUrl || !key) return false;

  const raw = Buffer.concat([Buffer.from(notifUrl, 'utf8'), req.rawBody || Buffer.from('')]);
  const expected = crypto.createHmac('sha256', key).update(raw).digest('base64');
  const got = req.header('x-square-hmacsha256') || '';
  try { return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected)); }
  catch { return false; }
}

router.post('/square-webhook', (req, res) => {
  if (!verify(req)) return res.status(401).json({ ok:false, error:'BAD_SIGNATURE' });

  const type = req.body?.type;
  const payment = req.body?.data?.object?.payment;

  if (type === 'payment.updated' && payment?.status === 'COMPLETED') {
    // issue a 24h code (simple demo writes to the in-memory store)
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 24*60*60*1000);
    try {
      const codes = require('./codes');
      if (codes.__memStore) {
        codes.__memStore.set(code, { tier:'single', usesAllowed:1, uses:0, expiresAt });
      }
    } catch {}
    return res.json({ ok:true, type, code, expiresAt });
  }

  return res.json({ ok:true, type });
});

module.exports = router;
