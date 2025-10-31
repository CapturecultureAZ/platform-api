const express = require('express');
const router = express.Router();

// Simple in-memory store for testing (resets on restart)
const mem = new Map();

function genCode(n = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// POST /api/codes  -> create a code
router.post('/codes', (req, res) => {
  const { tier = 'single', usesAllowed = 1, minutesToLive = 1440 } = req.body || {};
  const code = genCode();
  const expiresAtMs = Date.now() + Number(minutesToLive) * 60 * 1000;

  mem.set(code, {
    tier: String(tier),
    usesRemaining: Number(usesAllowed),
    expiresAt: expiresAtMs,
  });

  res.json({
    ok: true,
    code,
    tier: String(tier),
    usesAllowed: Number(usesAllowed),
    expiresAt: new Date(expiresAtMs).toISOString(),
  });
});

// POST /api/codes/validate  -> check a code, optionally consume
router.post('/codes/validate', (req, res) => {
  const { code = '', consume = false } = req.body || {};
  const key = String(code).toUpperCase();
  const rec = mem.get(key);

  if (!rec) return res.status(404).json({ ok: false, error: 'CODE_NOT_FOUND' });
  if (rec.expiresAt < Date.now()) return res.status(400).json({ ok: false, error: 'EXPIRED' });

  if (consume) {
    if (rec.usesRemaining <= 0) return res.status(400).json({ ok: false, error: 'NO_USES_LEFT' });
    rec.usesRemaining -= 1;
  }

  res.json({ ok: true, tier: rec.tier, usesRemaining: rec.usesRemaining });
});

module.exports = router;
