const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ ok:false, error:'Missing or invalid image' });
    }
    const m = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) return res.status(400).json({ ok:false, error:'Bad data URL' });

    const mime = m[1]; const b64 = m[2];
    const ext = (mime.split('/')[1] || 'jpg').toLowerCase();
    const outDir = path.join(__dirname, '..', 'uploads');
    fs.mkdirSync(outDir, { recursive: true });

    const fname = `${new Date().toISOString().replace(/[:.]/g,'-')}_${Math.random().toString(36).slice(2,8)}.${ext}`;
    const outPath = path.join(outDir, fname);
    fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
    const url = `/uploads/${fname}`;
    res.json({ ok:true, url });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ ok:false, error:'internal_error' });
  }
});

module.exports = router;
