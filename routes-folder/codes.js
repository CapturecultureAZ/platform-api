
const express = require('express');
const router = express.Router();

const codes = new Map();

function randomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

router.post('/codes', (req, res) => {
  try {
    const { tier = 'single', usesAllowed = 1, minutesToLive = 1440 } = req.body || {};
    if (!usesAllowed || usesAllowed < 1) return res.status(400).json({ error: 'usesAllowed must be >= 1' });
    if (!minutesToLive || minutesToLive < 1) return res.status(400).json({ error: 'minutesToLive must be >= 1' });

    const code = randomCode(6);
    const now = Date.now();
    const expiresAt = new Date(now + minutesToLive * 60 * 1000).toISOString();

    codes.set(code, { code, tier, usesAllowed, usesUsed: 0, expiresAt });
    res.status(201).json({ code, tier, usesAllowed, expiresAt });
  } catch (e) {
    console.error('POST /codes error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/codes/validate', (req, res) => {
  try {
    const { code, consume = false } = req.body || {};
    if (!code) return res.status(400).json({ valid: false, error: 'Missing code' });

    const rec = codes.get(code);
    if (!rec) return res.status(404).json({ valid: false, error: 'Not found' });

    const now = Date.now();
    if (new Date(rec.expiresAt).getTime() <= now) {
      codes.delete(code);
      return res.status(410).json({ valid: false, error: 'Expired' });
    }

    if (rec.usesUsed >= rec.usesAllowed) {
      return res.status(409).json({ valid: false, error: 'Exhausted' });
    }

    if (consume) rec.usesUsed += 1;

    res.json({
      valid: true,
      code: rec.code,
      tier: rec.tier,
      remainingUses: rec.usesAllowed - rec.usesUsed,
      expiresAt: rec.expiresAt,
      consumedNow: !!consume
    });
  } catch (e) {
    console.error('POST /codes/validate error:', e);
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

module.exports = router;
