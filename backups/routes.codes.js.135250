const express = require('express');
const router = express.Router();
const Code = require('../models/Code');

// Health: quick DB reachability check
router.get('/codes/health', async (_req, res) => {
  try {
    await Code.estimatedDocumentCount();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'DB_UNAVAILABLE', detail: String(e?.message || e) });
  }
});

// Create a code
router.post('/codes', async (req, res) => {
  try {
    const b = req.body || {};
    const tier = (b.tier && String(b.tier).trim()) || 'single';
    const usesAllowed = Number.isFinite(b.usesAllowed) && b.usesAllowed > 0 ? Math.floor(b.usesAllowed) : 1;
    const minutesToLive = Number.isFinite(b.minutesToLive) && b.minutesToLive > 0 ? Math.floor(b.minutesToLive) : 1440;

    const gen = () => Math.random().toString(36).slice(2, 8).toUpperCase();
    let code, doc, attempts = 0;
    const expiresAt = new Date(Date.now() + minutesToLive * 60_000);

    do {
      attempts += 1;
      code = gen();
      try {
        doc = await Code.create({ code, tier, usesAllowed, uses: 0, expiresAt });
      } catch (err) {
        if (err?.code === 11000 && attempts < 5) continue; // duplicate code, try again
        throw err;
      }
    } while (!doc && attempts < 5);

    res.status(201).json({ ok: true, code, tier, usesAllowed, expiresAt });
  } catch (e) {
    console.error('POST /codes error:', e);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR', detail: String(e?.message || e) });
  }
});

// Validate (optionally consume) — atomic
router.post('/codes/validate', async (req, res) => {
  try {
    const raw = (req.body?.code || '').toString().trim().toUpperCase();
    const consume = !!req.body?.consume;

    const found = await Code.findOne({ code: raw }).lean();
    if (!found) return res.status(404).json({ ok: false, error: 'CODE_NOT_FOUND' });
    if (new Date(found.expiresAt) <= new Date()) return res.status(410).json({ ok: false, error: 'CODE_EXPIRED' });
    if (found.uses >= found.usesAllowed) return res.status(409).json({ ok: false, error: 'CODE_EXHAUSTED' });

    if (!consume) {
      return res.json({
        ok: true,
        code: raw,
        tier: found.tier,
        usesAllowed: found.usesAllowed,
        uses: found.uses,
        remaining: found.usesAllowed - found.uses,
        expiresAt: found.expiresAt
      });
    }

    const updated = await Code.findOneAndUpdate(
      { code: raw, uses: { $lt: found.usesAllowed }, expiresAt: { $gt: new Date() } },
      { $inc: { uses: 1 } },
      { new: true }
    ).lean();

    if (!updated) {
      const fresh = await Code.findOne({ code: raw }).lean();
      if (!fresh) return res.status(404).json({ ok: false, error: 'CODE_NOT_FOUND' });
      if (new Date(fresh.expiresAt) <= new Date()) return res.status(410).json({ ok: false, error: 'CODE_EXPIRED' });
      return res.status(409).json({ ok: false, error: 'CODE_EXHAUSTED' });
    }

    res.json({
      ok: true,
      code: raw,
      tier: updated.tier,
      usesAllowed: updated.usesAllowed,
      uses: updated.uses,
      remaining: updated.usesAllowed - updated.uses,
      expiresAt: updated.expiresAt
    });
  } catch (e) {
    console.error('POST /codes/validate error:', e);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR', detail: String(e?.message || e) });
  }
});

module.exports = router;
