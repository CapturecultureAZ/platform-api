const express = require('express');
const router = express.Router();

/**
 * In-memory CONFIG for now (dashboard will write to this later).
 * You can change these with a PUT /api/config body.
 */
let CONFIG = {
  countdownSeconds: 5,
  fullscreen: true,
  returnUrl: '/keypad.html',
  theme: {
    btnBg: 'rgba(255,255,255,.08)',
    btnBorder: 'rgba(255,255,255,.25)',
    btnText: '#fff',
    btnPadV: '18px',
    btnPadH: '34px',
    btnRadius: '18px',
    btnFont: '1.4rem',
    fontFamily: '-apple-system, system-ui, "SF Pro", Arial, sans-serif'
  },
  kiosk: {
    keypadPosition: 'bottom-right',      // 'bottom-right' | 'bottom-left'
    shotsDefault: 3,                     // default # of photos per session
    bg: {
      type: 'video',                     // 'video' | 'image' | 'none'
      url: '/media/loop.mp4',            // put your mp4 or jpg/png/webp under /public/media/
      mute: true,
      loop: true,
      volume: 0                          // 0..1 (ignored if mute=true)
    }
  }
};

router.get('/', (_req, res) => res.json(CONFIG));

router.put('/', express.json({ limit: '256kb' }), (req, res) => {
  // Shallow merge for simplicity
  CONFIG = { ...CONFIG, ...req.body,
    theme: { ...(CONFIG.theme||{}), ...(req.body.theme||{}) },
    kiosk: { ...(CONFIG.kiosk||{}), ...(req.body.kiosk||{}),
      bg: { ...((CONFIG.kiosk||{}).bg||{}), ...(((req.body.kiosk||{}).bg)||{}) }
    }
  };
  res.json(CONFIG);
});

module.exports = router;
