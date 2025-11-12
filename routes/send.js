const express = require('express');
const router = express.Router();

/* ------------ SMS (Twilio) ------------ */
const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
const twilioTok = process.env.TWILIO_AUTH_TOKEN || '';
const twilioFrom= process.env.TWILIO_FROM || '';
const useTwilio = !!(twilioSid && twilioTok && twilioFrom);
const twilio = useTwilio ? require('twilio')(twilioSid, twilioTok) : null;

/* ------------ Email (SendGrid) -------- */
const sgKey = process.env.SENDGRID_API_KEY || '';
const sgFrom= process.env.SENDGRID_FROM || '';
const useSG  = !!(sgKey && sgFrom);
let sgMail = null;
if (useSG) {
  sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(sgKey);
}

/**
 * POST /api/send/sms  { to:"+14805551234", url:"https://..." }
 */
router.post('/sms', async (req, res) => {
  try {
    const { to, url } = req.body || {};
    if (!to || !url) return res.status(400).json({ ok:false, error:'missing_fields' });
    if (!useTwilio)  return res.status(503).json({ ok:false, error:'sms_disabled' });

    const body = `Your photo: ${url}`;
    await twilio.messages.create({ to, from: twilioFrom, body });
    return res.json({ ok:true });
  } catch (e) {
    console.error('SMS error:', e?.message || e);
    return res.status(500).json({ ok:false, error:'sms_failed' });
  }
});

/**
 * POST /api/send/email { to:"user@example.com", url:"https://..." }
 */
router.post('/email', async (req, res) => {
  try {
    const { to, url } = req.body || {};
    if (!to || !url) return res.status(400).json({ ok:false, error:'missing_fields' });
    if (!useSG)     return res.status(503).json({ ok:false, error:'email_disabled' });

    await sgMail.send({
      to,
      from: sgFrom,
      subject: 'Your Capture Culture Photo',
      text: `Your photo: ${url}`,
      html: `<p>Your photo:</p><p><a href="${url}">${url}</a></p><img src="${url}" alt="photo" style="max-width:100%;height:auto;border-radius:12px">`
    });
    return res.json({ ok:true });
  } catch (e) {
    console.error('Email error:', e?.response?.body || e?.message || e);
    return res.status(500).json({ ok:false, error:'email_failed' });
  }
});

module.exports = router;
