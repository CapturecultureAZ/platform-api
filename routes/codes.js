const express = require('express');
const router = express.Router();
router.get('/codes/health', (_req, res) => res.json({ ok: true }));
module.exports = router;
