const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/db');
const tiers = require('../lib/tiers'); // optional if you've added tiers.js

router.post('/codes/validate', async (req, res) => {
  try {
    const { code, consume = false } = req.body || {};
    if (!code) return res.status(400).json({ valid: false, error: 'Missing code' });

    const db = getDb();
    const col = db.collection('codes');

    const record = await col.findOne({ code });
    if (!record) return res.status(404).json({ valid: false, error: 'Not found' });

    const now = Date.now();
    if (now > new Date(record.expiresAt).getTime()) {
      await col.deleteOne({ code });
      return res.json({ valid: false, error: 'Expired' });
    }

    if (consume && !record.consumed) {
      const newUsesUsed = (record.usesUsed || 0) + 1;
      const fullyUsed = newUsesUsed >= (record.usesAllowed || 1);
      await col.updateOne({ code }, { $set: { usesUsed: newUsesUsed, consumed: fullyUsed } });
    }

    const latest = await col.findOne({ code });          // ← refetch after update
    const t = (tiers && tiers[latest.tier]) || {};       // optional enrichment

    return res.json({
      ok: true,
      valid: true,
      consumed: !!latest.consumed,
      usesUsed: latest.usesUsed || 0,
      usesAllowed: latest.usesAllowed || 1,
      tier: latest.tier,
      presetId: t.presetId,
      shots: t.shots,
      expiresAt: latest.expiresAt
    });
  } catch (err) {
    console.error('POST /codes/validate error:', err);
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

module.exports = router;
