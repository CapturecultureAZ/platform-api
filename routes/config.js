const express = require('express');
const router = express.Router();

/* In-memory config (dashboard will write to this later) */
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
    keypadPosition: 'bottom-right',  // 'bottom-right' | 'bottom-left'
    shotsDefault: 3,
    bg: {                            // background behind keypad
      type: 'none',                  // 'video' | 'image' | 'none'
      url: '',                       // e.g. '/media/loop.mp4' or '/media/hero.jpg'
      mute: true,
      loop: true,
      volume: 0
    }
  }
};

router.get('/', (_req, res) => res.json(CONFIG));

router.put('/', express.json({ limit: '256kb' }), (req, res) => {
  // shallow merge with nested theme/kiosk/bg merges
  CONFIG = {
    ...CONFIG,
    ...req.body,
    theme: { ...(CONFIG.theme||{}), ...(req.body.theme||{}) },
    kiosk: {
      ...(CONFIG.kiosk||{}),
      ...(req.body.kiosk||{}),
      bg: {
        ...((CONFIG.kiosk||{}).bg||{}),
        ...(((req.body.kiosk||{}).bg)||{})
      }
    }
  };
  res.json(CONFIG);
});

module.exports = router;
