const express = require('express');
const router = express.Router();

router.post('/background', async (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ ok:false, error:'Missing or invalid image' });
    }
    return res.json({ ok:true, image });
  } catch (e) {
    console.error('AI background error:', e);
    res.status(500).json({ ok:false, error:'internal_error' });
  }
});

module.exports = router;
