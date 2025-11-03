const express = require('express');
const router = express.Router();

// minimal stub so the require succeeds
router.get('/codes/health', (_req, res) => res.json({ ok: true }));

module.exports = router;
