const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');

// ----- Model
const CodeSchema = new mongoose.Schema({
  code: { type: String, index: true, unique: true },
  tier: { type: String, required: true },
  event: { type: String, default: 'DemoEvent' },
  usesAllowed: { type: Number, default: 1 },
  consumed: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  launchUrl: { type: String, default: '' },
  route: { type: String, default: 'numeric-codes-v2' },
}, { timestamps: true });

const CodeModel = mongoose.models.Code || mongoose.model('Code', CodeSchema);

// ----- Helpers
function codeLengthFromEnv() {
  const n = Number(process.env.CODE_LENGTH || 6);
  return (Number.isFinite(n) && n >= 3 && n <= 8) ? n : 6;
}
function generateNumericCode(len) {
  let s=''; for (let i=0;i<len;i++) s += Math.floor(Math.random()*10); return s;
}

async function loadConfigViaHttp(req) {
  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const r = await fetch(`${origin}/api/config`, { cache: 'no-store' });
    if (r.ok) return await r.json();
  } catch {}
  return null;
}
async function loadTiersFile() {
  try {
    const p = path.join(process.cwd(), 'data', 'tiers.json');
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

// return { base, tpl } (tpl may be synthesized if missing)
async function resolveTierTemplate(req, tier, event) {
  const cfg = await loadConfigViaHttp(req);
  if (cfg) {
    const base = (cfg.baseLaunchUrl || '').replace(/\/$/, '');
    const tpl  = (cfg.tiers && cfg.tiers[tier]) || '';
    if (tpl) return { base, tpl };
    // synthesize if tiers map missing this tier
    return { base, tpl: `/capture.html?code={code}&tier=${encodeURIComponent(tier)}&event=${encodeURIComponent(event||'DemoEvent')}` };
  }
  const tiers = await loadTiersFile();
  if (tiers && tiers[tier]) {
    return { base: '', tpl: tiers[tier] };
  }
  // final fallback: synthesize
  return { base: '', tpl: `/capture.html?code={code}&tier=${encodeURIComponent(tier)}&event=${encodeURIComponent(event||'DemoEvent')}` };
}

function buildLaunchUrl(req, base, tpl, code, tier, event) {
  const pathPart = (tpl || '').replace('{code}', encodeURIComponent(code))
                              .replace('{tier}', encodeURIComponent(tier||''))
                              .replace('{event}', encodeURIComponent(event||'DemoEvent'));
  if (!pathPart) return '';
  if (/^https?:\/\//i.test(pathPart)) return pathPart;
  const finalBase = (base||'').replace(/\/$/, '');
  if (finalBase) return `${finalBase}${pathPart.startsWith('/')?'':'/'}${pathPart}`;
  const origin = `${req.protocol}://${req.get('host')}`;
  return `${origin}${pathPart.startsWith('/')?'':'/'}${pathPart}`;
}

// ----- Routes
// POST /api/codes  { tier, usesAllowed, minutesToLive, event }
router.post('/', async (req, res) => {
  try {
    const { tier, usesAllowed=1, minutesToLive=60, event='DemoEvent' } = req.body || {};
    if (!tier) return res.status(400).json({ ok:false, error:'missing tier' });

    const { base, tpl } = await resolveTierTemplate(req, tier, event);

    // Generate unique code
    const len = codeLengthFromEnv();
    let code=''; for (let i=0;i<20;i++){ const c=generateNumericCode(len); if(!(await CodeModel.findOne({code:c}).lean())){ code=c; break; } }
    if (!code) return res.status(500).json({ ok:false, error:'could not generate unique code' });

    const expiresAt = new Date(Date.now() + Math.max(1, minutesToLive)*60*1000);
    const launchUrl = buildLaunchUrl(req, base, tpl, code, tier, event);

    const doc = await CodeModel.create({ code, tier, event, usesAllowed, consumed:0, expiresAt, launchUrl });

    res.json({ ok:true, code:doc.code, tier:doc.tier, usesAllowed:doc.usesAllowed,
               expiresAt:doc.expiresAt.toISOString(), route:'numeric-codes-v2', launchUrl });
  } catch (e) {
    console.error('codes create error:', e);
    res.status(500).json({ ok:false, error:'internal error' });
  }
});

// POST /api/codes/validate  { code, consume }
router.post('/validate', async (req, res) => {
  try {
    const { code='', consume=false } = req.body || {};
    if (!/^\d+$/.test(code)) return res.status(400).json({ ok:false, error:'invalid code format' });

    const doc = await CodeModel.findOne({ code });
    if (!doc) return res.status(404).json({ ok:false, error:'code not found' });
    if (doc.expiresAt && doc.expiresAt.getTime() < Date.now()) return res.status(410).json({ ok:false, error:'expired' });

    const remaining = (doc.usesAllowed||1) - (doc.consumed||0);
    if (remaining <= 0) return res.status(409).json({ ok:false, error:'no remaining usage' });

    if (consume) { doc.consumed=(doc.consumed||0)+1; await doc.save(); }

    // Ensure launchUrl is present (rebuild if missing)
    let launchUrl = doc.launchUrl || '';
    if (!launchUrl) {
      const { base, tpl } = await resolveTierTemplate(req, doc.tier, doc.event);
      launchUrl = buildLaunchUrl(req, base, tpl, doc.code, doc.tier, doc.event);
    }

    res.json({ ok:true, code:doc.code, tier:doc.tier, remainingUses:(doc.usesAllowed||1)-(doc.consumed||0),
               expiresAt: doc.expiresAt?.toISOString(), route:'numeric-codes-v2', launchUrl });
  } catch (e) {
    console.error('codes validate error:', e);
    res.status(500).json({ ok:false, error:'internal error' });
  }
});

module.exports = router;
