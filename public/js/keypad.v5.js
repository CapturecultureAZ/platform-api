(function(){
  const codeEl = document.getElementById('code');
  const padEl  = document.getElementById('pad');
  const msgEl  = document.getElementById('msg');

  const API_VALIDATE = '/api/codes/validate';
  const USER_DIGITS = 4;          // guest enters last 4 only
  const params = new URLSearchParams(location.search);
  const EVENT  = (params.get('event')  || 'DemoEvent').replace(/[^a-zA-Z0-9_-]/g,'');
  const PREFIX = (params.get('prefix') || '').replace(/\D/g,'').slice(0,2); // locked per pad

  if (PREFIX.length !== 2) setStatus('Error: missing 2-digit prefix (use ?prefix=12)');

  let value = ''; // user-entered last4

  // build keypad
  ['1','2','3','4','5','6','7','8','9','0','C','⌫','Go'].forEach(k=>{
    const b=document.createElement('button');
    b.textContent=k; b.addEventListener('click',()=>onKey(k)); padEl.appendChild(b);
  });
  sync();

  function onKey(k){
    if (k==='C'){ value=''; sync(); return; }
    if (k==='⌫'){ value=value.slice(0,-1); sync(); return; }
    if (k==='Go'){ submit(); return; }
    if (/\d/.test(k) && value.length<USER_DIGITS){ value+=k; sync(); }
  }

  function sync(){
    const blanks = '____';
    codeEl.textContent = (value+blanks).slice(0,USER_DIGITS).replace(/./g,(c,i)=> i<value.length? value[i] : '_');
  }

  async function submit(){
    if (PREFIX.length!==2){ setStatus('Missing prefix'); return; }
    if (value.length<USER_DIGITS){ flash(`Enter ${USER_DIGITS} digits`); return; }

    const fullCode = PREFIX + value; // 2+4 = 6-digit code expected by server
    setStatus('Validating…');
    try{
      const r = await fetch(API_VALIDATE,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({code: fullCode, consume:false})
      });
      const j = await r.json();
      if (!j.ok){ setStatus('Invalid code'); return; }

      // pull saved meta (backdrop/overlay/delivery)
      let backdrop='', overlay='';
      try{
        const m = await (await fetch('/api/code-meta/'+encodeURIComponent(fullCode))).json();
        if (m.ok && m.meta){ backdrop = m.meta.backdrop || ''; overlay = m.meta.overlay || ''; }
      }catch(_){}

      const u = new URL('/capture.html', location.origin);
      u.searchParams.set('event', EVENT);
      u.searchParams.set('code', fullCode);
      if (backdrop) u.searchParams.set('backdrop', backdrop);
      if (overlay)  u.searchParams.set('overlay',  overlay);
      if (params.get('countdown')) u.searchParams.set('countdown', params.get('countdown'));
      location.href = u.toString();
    }catch(e){
      setStatus('Network error');
    }
  }

  function setStatus(t){ msgEl.textContent=t||''; }
  function flash(t){ setStatus(t); setTimeout(()=>setStatus(''),1500); }
})();
