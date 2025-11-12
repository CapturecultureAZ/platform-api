const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

function safeEvent(s){ return String(s||'').replace(/[^a-zA-Z0-9_-]/g,''); }

router.get('/backdrops/:event', (req, res) => {
  try{
    const event = safeEvent(req.params.event);
    if (!event) return res.status(400).json({ ok:false, error:'Missing event' });
    const dir = path.join(__dirname, '..', 'public', 'backdrops', 'events', event);
    const exts = new Set(['.png','.jpg','.jpeg','.webp']);
    if (!fs.existsSync(dir)) return res.json({ ok:true, event, items: [] });
    const items = fs.readdirSync(dir)
      .filter(f => exts.has(path.extname(f).toLowerCase()))
      .sort()
      .map(f => ({ file: f, url: `/backdrops/events/${event}/${encodeURIComponent(f)}` }));
    res.json({ ok:true, event, items });
  }catch(e){
    res.status(500).json({ ok:false, error:'Server error' });
  }
});

router.get('/overlays/:event', (req, res) => {
  try{
    const event = safeEvent(req.params.event);
    if (!event) return res.status(400).json({ ok:false, error:'Missing event' });
    const dir = path.join(__dirname, '..', 'public', 'overlays', 'events', event);
    const exts = new Set(['.png','.webp']);
    if (!fs.existsSync(dir)) return res.json({ ok:true, event, items: [] });
    const items = fs.readdirSync(dir)
      .filter(f => exts.has(path.extname(f).toLowerCase()))
      .sort()
      .map(f => ({ file: f, url: `/overlays/events/${event}/${encodeURIComponent(f)}` }));
    res.json({ ok:true, event, items });
  }catch(e){
    res.status(500).json({ ok:false, error:'Server error' });
  }
});

module.exports = router;
