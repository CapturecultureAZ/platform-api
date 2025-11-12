(function(){
  const banner = document.getElementById('banner');
  if (banner) {
    banner.textContent = '✅ JS LOADED — keypad building…';
    banner.style.background = 'rgba(0,180,0,.25)';
    banner.style.borderColor = 'rgba(0,255,0,.45)';
  }
  const MAX = 4; let value = '';
  const dots = document.getElementById('dots');
  const pad  = document.getElementById('pad');
  const msg  = document.getElementById('msg');

  function renderDots(){
    dots.innerHTML='';
    for(let i=0;i<MAX;i++){
      const d=document.createElement('div');
      d.className='dot';
      d.textContent=value[i]||'•';
      dots.appendChild(d);
    }
  }
  function showMsg(t){ msg.textContent=t||''; }
  function press(k){
    if(k==='C'){ value=''; renderDots(); return; }
    if(k==='⌫'){ value=value.slice(0,-1); renderDots(); return; }
    if(/^\d$/.test(k) && value.length<MAX){
      value+=k; renderDots();
      if(value.length===MAX) submit();
    }
  }
  ['1','2','3','4','5','6','7','8','9','0','C','⌫'].forEach(k=>{
    const b=document.createElement('button');
    b.textContent=k;
    b.addEventListener('click',()=>press(k));
    pad.appendChild(b);
  });
  const go=document.createElement('button');
  go.className='go';
  go.textContent='Go';
  go.addEventListener('click', submit);
  pad.appendChild(go);

  async function submit(){
    if(value.length!==MAX){ showMsg('Enter your 4-digit code'); return; }
    showMsg('Checking…');
    try{
      const r=await fetch('/api/codes/validate',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({code:value,consume:false})
      });
      const j=await r.json();
      if(!j.ok){ showMsg(j.error||'Invalid'); value=''; renderDots(); return; }
      const url=j.launchUrl || (`/capture.html?code=${encodeURIComponent(value)}`);
      location.href=url;
    }catch{ showMsg('Network error'); }
  }

  window.addEventListener('keydown',e=>{
    if(/^\d$/.test(e.key)){ e.preventDefault(); press(e.key); }
    if(e.key==='Enter'){ e.preventDefault(); submit(); }
    if(e.key==='Backspace'){ e.preventDefault(); press('⌫'); }
  });

  renderDots();
})();
