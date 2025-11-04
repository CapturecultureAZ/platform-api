const express = require('express');
const router = express.Router();

// simple in-memory store: code -> { tier, usesAllowed, uses, expiresAt }
const store = new Map();

router.get('/codes/health', (_req, res) => res.json({ ok: true }));

router.post('/codes', (req, res) => {
  const { tier = 'single', usesAllowed = 1, minutesToLive = 1440 } = req.body || {};
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + minutesToLive * 60_000);
  store.set(code, { tier, usesAllowed, uses: 0, expiresAt });
  res.json({ ok: true, code, tier, usesAllowed, expiresAt });
});

router.post('/codes/validate', (req, res) => {
  const { code, consume = false } = req.body || {};
  const rec = store.get((code || '').toUpperCase());
  if (!rec) return res.status(404).json({ ok: false, error: 'CODE_NOT_FOUND' });
  if (rec.expiresAt <= new Date()) return res.status(410).json({ ok: false, error: 'CODE_EXPIRED' });
  if (rec.uses >= rec.usesAllowed) return res.status(409).json({ ok: false, error: 'CODE_EXHAUSTED' });
  if (consume) rec.uses += 1;
  res.json({
    ok: true,
    code: code.toUpperCase(),
    tier: rec.tier,
    usesAllowed: rec.usesAllowed,
    uses: rec.uses,
    remaining: rec.usesAllowed - rec.uses,
    expiresAt: rec.expiresAt
  });
});

module.exports = router;
