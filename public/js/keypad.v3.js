(() => {
  const q = new URLSearchParams(location.search);
  const EVENT  = (q.get('event')  || 'DemoEvent').replace(/[^a-zA-Z0-9_-]/g,'');
  const PREFIX = (q.get('prefix') || '').replace(/\D/g,'').slice(0,2); // 2-digit kiosk prefix
  const MAX_LEN = 4; // user enters only last 4

  const msgEl  = document.getElementById('msg');
  const codeEl = document.getElementById('code');
  const padEl  = document.getElementById('pad');
  const hintEl = document.getElementById('hint');

  if (hintEl) hintEl.textContent = PREFIX ? `Enter last 4 — kiosk prefix ${PREFIX}` : 'Enter 4-digit code';

  let value = '';
  sync();

  const keys = ['1','2','3','4','5','6','7','8','9','0','C','⌫'];
  keys.forEach(k => {
    const b = document.createElement('button');
    b.textContent = k;
    b.addEventListener('click', () => onKey(k));
    padEl.appendChild(b);
  });
  const go = document.createElement('button');
  go.textContent = 'Go'; go.className = 'go';
  go.addEventListener('click', submit);
  padEl.appendChild(go);

  // allow keyboard Enter/backspace
  document.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') onKey(e.key);
    if (e.key === 'Backspace') onKey('⌫');
    if (e.key === 'Enter') submit();
  });

  function onKey(k){
    if (k === 'C') { value=''; return sync(); }
    if (k === '⌫') { value=value.slice(0,-1); return sync(); }
    if (/^\d$/.test(k) && value.length < MAX_LEN) { value += k; return sync(); }
  }

  function sync(){
    codeEl.value = value.replace(/./g, '•') + ' '.repeat(Math.max(0, MAX_LEN - value.length));
    msg('');
  }
  function msg(t, isErr=false){
    if (!msgEl) return;
    msgEl.textContent = t || '';
    msgEl.style.color = isErr ? '#ff6969' : '#b9bcc3';
  }

  async function submit(){
    if (!PREFIX || PREFIX.length!==2) return msg('Missing kiosk prefix in URL (?prefix=12)', true);
    if (value.length !== MAX_LEN) return msg(`Enter ${MAX_LEN} digits`, true);

    const full = PREFIX + value; // build 6-digit server code
    msg('Checking…'); 
    try{
      const res = await fetch('/api/codes/validate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ code: full, consume: true })
      }).then(r=>r.json());

      if (!res || res.ok !== true) return msg('Invalid or expired code', true);

      // success → go to launch → capture
      const u = new URL('/launch.html', location.origin);
      u.searchParams.set('event', EVENT);
      u.searchParams.set('code', full);
      // forward any extras (e.g., ai=1, backdrop=…)
      q.forEach((v,k)=>{ if(!['event','code'].includes(k)) u.searchParams.set(k,v); });

      location.href = u.toString();
    }catch(e){
      msg('Server error. Try again.', true);
    }
  }
})();