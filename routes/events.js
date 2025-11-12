const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

/**
 * In-memory events. (Dashboard will persist to Mongo later.)
 * event = { id, name, backdrops:[{id,url}], featured:['id1','id2','id3'] }
 */
const EVENTS = new Map();

// Helpers
function ensureEvent(id){
  if (!EVENTS.has(id)) EVENTS.set(id, { id, name: id, backdrops: [], featured: [] });
  return EVENTS.get(id);
}
function scanBackdropDir(dirFs, mountUrl){
  if (!fs.existsSync(dirFs)) return [];
  return fs.readdirSync(dirFs)
    .filter(f => /\.(png|jpe?g|webp)$/i.test(f))
    .slice(0, 20)
    .map(f => ({ id: path.parse(f).name, url: path.posix.join(mountUrl, f) }));
}

// GET /api/events -> list ids + names
router.get('/', (_req,res)=>{
  res.json({ ok:true, events: Array.from(EVENTS.values()).map(e=>({id:e.id,name:e.name, featured:e.featured})) });
});

// POST /api/events  {id, name}
router.post('/', express.json(), (req,res)=>{
  const { id, name } = req.body || {};
  if (!id) return res.status(400).json({ ok:false, error:'id required' });
  if (EVENTS.has(id)) return res.status(409).json({ ok:false, error:'exists' });
  EVENTS.set(id, { id, name: name || id, backdrops: [], featured: [] });
  res.json({ ok:true, event: EVENTS.get(id) });
});

// PUT /api/events/:id   { name? }
router.put('/:id', express.json(), (req,res)=>{
  const e = ensureEvent(req.params.id);
  if (req.body?.name) e.name = req.body.name;
  res.json({ ok:true, event: e });
});

// POST /api/events/:id/scan  -> scans /public/backdrops/events/:id for up to 20 images
router.post('/:id/scan', (_req,res)=>{
  const id = req.params.id;
  const e = ensureEvent(id);
  const dirFs = path.join(process.cwd(), 'public', 'backdrops', 'events', id);
  const mountUrl = `/backdrops/events/${id}`;
  e.backdrops = scanBackdropDir(dirFs, mountUrl);
  res.json({ ok:true, count:e.backdrops.length, backdrops:e.backdrops });
});

// PUT /api/events/:id/featured   { featured: ['bg1','bg2','bg3'] }
router.put('/:id/featured', express.json(), (req,res)=>{
  const e = ensureEvent(req.params.id);
  let f = Array.isArray(req.body?.featured) ? req.body.featured.slice(0,3) : [];
  const ids = new Set(e.backdrops.map(b=>b.id));      // filter to valid IDs
  e.featured = f.filter(x=>ids.has(x)).slice(0,3);
  res.json({ ok:true, featured:e.featured });
});

// GET /api/events/:id -> full event
router.get('/:id', (req,res)=>{
  const e = ensureEvent(req.params.id);
  res.json({ ok:true, event: e });
});

module.exports = router;
