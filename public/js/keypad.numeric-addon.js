// public/js/keypad.numeric-addon.js
(() => {
  const API_BASE = ''; // e.g., 'http://192.168.1.50:3000' if not same-origin
  const CODE_LEN = 6;

  let buf = '';
  let busy = false;

  const $ = (s) => document.querySelector(s);
  const display = $('#display') || $('#code-display') || $('#screen') || document.createElement('div');
  const status  = $('#status')  || $('#message')      || $('#notice') || document.createElement('div');
  const pad     = $('#pad')     || $('#keypad')       || document;

  function paint() {
    const dots = '•'.repeat(Math.max(0, CODE_LEN - buf.length));
    display.textContent = buf ? buf + dots : '••••••';
  }
  function setStatus(m) { if (status) status.textContent = m || ''; }

  function push(d) {
    if (busy || buf.length >= CODE_LEN) return;
    buf += d; paint();
    if (buf.length === CODE_LEN) submit();
  }
  function delOne() { if (busy || !buf) return; buf = buf.slice(0, -1); paint(); }
  function clearAll(){ if (busy) return; buf = ''; paint(); setStatus(''); }

  async function submit() {
    if (busy) return;
    if (buf.length < CODE_LEN) { setStatus('Enter all 6 digits.'); return; }
    busy = true; setStatus('Checking code…');

    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 10000);
      const res = await fetch((API_BASE || '') + '/api/codes/validate', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ code: buf, consume: true }),
        signal: ctl.signal
      });
      clearTimeout(t);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setStatus(data.message || 'Invalid or expired code.');
        busy = false;
        return;
      }
      setStatus('Code accepted — launching…');

      if (data.launchUrl) {
        window.location.href = data.launchUrl; // Project A
        return;
      }
      if (data.sessionId && data.config) {
        window.sessionStorage.setItem('session', JSON.stringify({
          sessionId: data.sessionId, tier: data.tier, config: data.config, code: data.code
        }));
        window.location.href = '/capture.html'; // Project B handoff
        return;
      }

      setStatus('Server response missing launch/session info.');
      busy = false;
    } catch (e) {
      setStatus('Network error. Check Wi-Fi/API URL.');
      busy = false;
    }
  }

  function handleKey(k) {
    if (k === 'go')    return submit();
    if (k === 'clear') return clearAll();
    if (k === 'del')   return delOne();
    if (/^\d$/.test(k)) return push(k);
  }

  pad.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    const k = b.getAttribute('data-k') || (b.textContent || '').trim();
    handleKey(k);
  });

  pad.addEventListener('touchstart', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    const k = b.getAttribute('data-k') || (b.textContent || '').trim();
    ev.preventDefault();
    handleKey(k);
  }, { passive:false });

  window.addEventListener('keydown', (e) => {
    if (/^\d$/.test(e.key)) return push(e.key);
    if (e.key === 'Backspace') return delOne();
    if (e.key === 'Enter') return submit();
  });

  paint();
})();
