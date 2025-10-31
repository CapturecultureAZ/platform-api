const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/db');

// Make a 6-char code
function genCode(n = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// POST /api/codes  -> create a code
router.post('/codes', async (req, res) => {
  try {
    const db = getDb();
    const codes = db.collection('codes');

    const { tier = 'single', usesAllowed = 1, minutesToLive = 1440 } = req.body || {};
    const code = genCode();
    const expiresAt = new Date(Date.now() + Number(minutesToLive) * 60 * 1000);

    const doc = {
      code,
      tier: String(tier),
      usesRemaining: Number(usesAllowed),
      expiresAt,
      createdAt: new Date(),
    };

    await codes.insertOne(doc);

    res.json({
      ok: true,
      code,
      tier: String(tier),
      usesAllowed: Number(usesAllowed),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('create code error:', err);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

// POST /api/codes/validate -> check/consume atomically
router.post('/codes/validate', async (req, res) => {
  try {
    const { code = '', consume = false } = req.body || {};
    const key = String(code).toUpperCase();

    const db = getDb();
    const codes = db.collection('codes');
    const now = new Date();

    if (!consume) {
      const found = await codes.findOne(
        { code: key, expiresAt: { $gt: now } },
        { projection: { _id: 0 } }
      );
      if (!found) return res.status(404).json({ ok: false, error: 'CODE_NOT_FOUND_OR_EXPIRED' });
      return res.json({ ok: true, tier: found.tier, usesRemaining: found.usesRemaining });
    }

    const updated = await codes.findOneAndUpdate(
      { code: key, expiresAt: { $gt: now }, usesRemaining: { $gt: 0 } },
      { $inc: { usesRemaining: -1 } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    if (!updated.value) {
      const exists = await codes.findOne({ code: key });
      if (!exists) return res.status(404).json({ ok: false, error: 'CODE_NOT_FOUND' });
      if (exists.expiresAt <= now) return res.status(400).json({ ok: false, error: 'EXPIRED' });
      if (exists.usesRemaining <= 0) return res.status(400).json({ ok: false, error: 'NO_USES_LEFT' });
      return res.status(400).json({ ok: false, error: 'NOT_CONSUMED' });
    }

    res.json({ ok: true, tier: updated.value.tier, usesRemaining: updated.value.usesRemaining });
  } catch (err) {
    console.error('validate code error:', err);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

// GET /api/admin/codes -> list codes (newest first)
// Query params: limit=50 (default), includeExpired=true (default false)
router.get('/admin/codes', async (req, res) => {
  try {
    const db = getDb();
    const codes = db.collection('codes');

    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
    const includeExpired = String(req.query.includeExpired || 'false').toLowerCase() === 'true';

    const now = new Date();
    const filter = includeExpired ? {} : { expiresAt: { $gt: now } };

    const items = await codes
      .find(filter, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    res.json({ ok: true, count: items.length, items });
  } catch (err) {
    console.error('admin list error:', err);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});
// GET /api/admin/codes -> list codes (newest first)
router.get('/admin/codes', async (req, res) => {
  try {
    const db = getDb();
    const codes = db.collection('codes');
    const now = new Date();

    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
    const includeExpired = String(req.query.includeExpired || 'false').toLowerCase() === 'true';
    const filter = includeExpired ? {} : { expiresAt: { $gt: now } };

    const items = await codes
      .find(filter, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    res.json({ ok: true, count: items.length, items });
  } catch (err) {
    console.error('admin list error:', err);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});
module.exports = router;
