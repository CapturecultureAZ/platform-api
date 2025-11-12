const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.post('/capture', express.json({limit:'15mb'}), async (req,res)=>{
  try{
    const { code='', event='', imageDataUrl='' } = req.body || {};
    if(!imageDataUrl.startsWith('data:image/png;base64,')) {
      return res.status(400).json({ok:false, error:'Bad image data'});
    }
    const b64 = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    const fname = `${(event||'event')}-${(code||'code')}-${stamp}.png`;
    const outPath = path.join(__dirname,'..','public','captures',fname);
    fs.writeFileSync(outPath, Buffer.from(b64,'base64'));
    return res.json({ ok:true, url:`/captures/${encodeURIComponent(fname)}` });
  }catch(e){
    console.error('capture error', e);
    return res.status(500).json({ ok:false, error:'Server error' });
  }
});

router.post('/send', express.json({limit:'1mb'}), async (req,res)=>{
  try{
    const { code='', event='', imageUrl='', delivery=null } = req.body || {};
    console.log('SEND stub:', { code, event, imageUrl, delivery });
    return res.json({ ok:true });
  }catch(e){
    console.error('send error', e);
    return res.status(500).json({ ok:false, error:'Server error' });
  }
});

module.exports = router;
