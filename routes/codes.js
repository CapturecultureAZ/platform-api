const express = require('express');
const router = express.Router();

/**
 * Simple in-memory store
 * key: CODE (uppercase)
 * val: { tier, usesAllowed, uses, expiresAt }
 */
const store = new Map();
module.exports.__memStore = store; // expose for webhook

// Health check
router.get('/codes/health', (_req, res) => res.json({ ok: true }));

// Create a code
router.post('/codes', (req, res) => {
  try {
    const body = req.body || {};
    const tier = typeof body.tier === 'string' && body.tier.trim() ? body.tier.trim() : 'single';
    const usesAllowed = Number.isFinite(body.usesAllowed) && body.usesAllowed > 0 ? Math.floor(body.usesAllowed) : 1;
    const minutesToLive = Number.isFinite(body.minutesToLive) && body.minutesToLive > 0 ? Math.floor(body.minutesToLive) : 1440;

    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + minutesToLive * 60_000);

    store.set(code, { tier, usesAllowed, uses: 0, expiresAt });
    res.status(201).json({ ok: true, code, tier, usesAllowed, expiresAt });
  } catch (e) {
    console.error('POST /codes error:', e);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

// Validate a code
router.post('/codes/validate', (req, res) => {
  try {
    const raw = (req.body?.code || '').toString().trim().toUpperCase();
    const consume = !!req.body?.consume;

    const rec = store.get(raw);
    if (!rec) return res.status(404).json({ ok: false, error: 'CODE_NOT_FOUND' });
    if (new Date(rec.expiresAt) <= new Date()) return res.status(410).json({ ok: false, error: 'CODE_EXPIRED' });
    if (rec.uses >= rec.usesAllowed) return res.status(409).json({ ok: false, error: 'CODE_EXHAUSTED' });

    if (consume) rec.uses += 1;

    res.json({
      ok: true,
      code: raw,
      tier: rec.tier,
      usesAllowed: rec.usesAllowed,
      uses: rec.uses,
      remaining: rec.usesAllowed - rec.uses,
      expiresAt: rec.expiresAt
    });
  } catch (e) {
    console.error('POST /codes/validate error:', e);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

module.exports = router;
