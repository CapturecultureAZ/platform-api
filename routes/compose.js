const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const { removeBackground } = require('@imgly/background-removal-node');

const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok:false, error:'no image uploaded' });

    const { bgUrl = '', event = 'default', code = '' } = req.body;

    // 1) Remove BG -> PNG with transparency
    const cutout = await removeBackground({
      image: req.file.buffer,
      output: { format: 'image/png' }
    });

    const subject = sharp(cutout).png();
    const meta = await subject.metadata();
    const W = meta.width || 1600;
    const H = meta.height || 1200;

    // Load backdrop (URL or local)
    async function loadBackdrop() {
      if (/^https?:\/\//i.test(bgUrl)) {
        const r = await fetch(bgUrl);
        return Buffer.from(await r.arrayBuffer());
      } else {
        const local = path.join(process.cwd(), 'public', bgUrl.replace(/^\//,''));
        return fs.readFile(local);
      }
    }

    let bgBuf;
    try { bgBuf = await loadBackdrop(); }
    catch { bgBuf = null; }

    let backdrop = bgBuf
      ? sharp(bgBuf).resize(W, H, { fit: 'cover' }).jpeg({ quality: 92 })
      : sharp({ create:{ width:W, height:H, channels:3, background:{ r:16, g:16, b:20 } } }).jpeg({ quality:92 });

    const bgJpeg = await backdrop.toBuffer();

    // Composite subject onto background
    const final = await sharp(bgJpeg)
      .composite([{ input: await subject.toBuffer(), blend:'over' }])
      .jpeg({ quality: 92 })
      .toBuffer();

    // Save output
    const outDir = path.join(process.cwd(), 'public', 'outputs', event);
    await fs.mkdir(outDir, { recursive: true });
    const filename = (code ? `${code}.jpg` : `session-${Date.now()}.jpg`);
    const outPath = path.join(outDir, filename);
    await fs.writeFile(outPath, final);

    const publicUrl = `/outputs/${encodeURIComponent(event)}/${encodeURIComponent(filename)}`;

    res.json({ ok: true, url: publicUrl });
  } catch (err) {
    console.error('compose error:', err);
    res.status(500).json({ ok:false, error:'compose failed' });
  }
});

module.exports = router;
