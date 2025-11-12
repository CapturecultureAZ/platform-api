const express = require('express');
const router = express.Router();

/**
 * CONFIG SHAPE (server-controlled; Dashboard will edit these later)
 */
function num(val, fallback){
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
}

router.get('/', (req, res) => {
  const cfg = {
    countdownSeconds: Math.min(30, Math.max(3, num(process.env.COUNTDOWN_SECONDS, 5))),
    fullscreen: (process.env.FULLSCREEN_DEFAULT || 'true').toLowerCase() !== 'false',
    theme: {
      btnBg:      process.env.THEME_BTN_BG      || 'rgba(255,255,255,.08)',
      btnBorder:  process.env.THEME_BTN_BORDER  || 'rgba(255,255,255,.25)',
      btnText:    process.env.THEME_BTN_TEXT    || '#fff',
      btnPadV:    process.env.THEME_BTN_PAD_V   || '18px',
      btnPadH:    process.env.THEME_BTN_PAD_H   || '34px',
      btnRadius:  process.env.THEME_BTN_RADIUS  || '18px',
      btnFont:    process.env.THEME_BTN_FONT    || '1.4rem',
      fontFamily: process.env.THEME_FONT_FAMILY || '-apple-system, system-ui, "SF Pro", Arial, sans-serif'
    }
  };
  res.json(cfg);
});

module.exports = router;
