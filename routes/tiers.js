// routes/tiers.js
const express = require('express');
const router = express.Router();

// Simple in-memory tier URLs (override with env if you want)
const tiers = {
  single: process.env.TIER_SINGLE_URL || 'http://localhost:3000/capture.html?code={code}&tier=single',
  double: process.env.TIER_DOUBLE_URL || 'http://localhost:3000/capture.html?code={code}&tier=double',
  triple: process.env.TIER_TRIPLE_URL || 'http://localhost:3000/capture.html?code={code}&tier=triple',
};

// Health
router.get('/health', (_req, res) => res.json({ ok: true }));

// Read all
router.get('/', (_req, res) => res.json({ ok: true, tiers }));

// Update one tier URL
router.put('/:tier', (req, res) => {
  const tier = req.params.tier;
  const { url } = req.body || {};
  if (!['single','double','triple'].includes(tier)) {
    return res.status(400).json({ ok: false, error: 'unknown_tier' });
  }
  if (!url) {
    return res.status(400).json({ ok: false, error: 'missing_url' });
  }
  tiers[tier] = url;
  return res.json({ ok: true, tier, url });
});

module.exports = router;
