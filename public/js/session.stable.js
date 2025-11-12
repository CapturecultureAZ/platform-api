(function(){
  const q = new URLSearchParams(location.search);
  const EVENT = (q.get('event') || 'DemoEvent').replace(/[^a-zA-Z0-9_-]/g,'');
  const CODE  = (q.get('code')  || '').replace(/\D/g,'');

  const canvas = document.getElementById('cc-canvas');
  const ctx    = canvas.getContext('2d');
  const probe  = document.getElementById('probe');
  const chooser= document.getElementById('chooser');
  const errEl  = document.getElementById('err');
  const start  = document.getElementById('start');
  const badge  = document.getElementById('badge');

  const COUNTDOWN=5, POST_MS=5000, TARGET_FPS=24, MAX_BACKDROPS=3, MAX_OVERLAYS=3;

  let stream=null, running=false, frozen=false, counting=false, last=0, rafId=0;
  let backdropImg=null, overlayImg=null;

  function setBadge(t,show=true){ if(!badge) return; badge.textContent=t; badge.style.display=show?'block':'none'; }
  function showErr(m){ errEl.textContent=String(m||''); errEl.style.display='block'; }
  function hideErr(){ errEl.style.display='none'; }
  function resize(){ const dpr=Math.min(devicePixelRatio||1,2); const w=Math.floor(innerWidth*dpr), h=Math.floor(innerHeight*dpr); canvas.width=w; canvas.height=h; canvas.style.width='100vw'; canvas.style.height='100vh'; }
  addEventListener('resize', resize); resize();

  function drawCover(img,W,H){ const r=Math.max(W/img.width,H/img.height), w=img.width*r, h=img.height*r, x=(W-w)/2, y=(H-h)/2; ctx.drawImage(img,x,y,w,h); }
  function drawContain(img,W,H){ const r=Math.min(W/img.width,H/img.height), w=img.width*r, h=img.height*r, x=(W-w)/2, y=(H-h)/2; ctx.drawImage(img,x,y,w,h); }

  function setBackdrop(u){ backdropImg=u?Object.assign(new Image(),{crossOrigin:'anonymous',src:u}):null; if(u) sessionStorage.setItem('CC_last_backdrop',u); }
  function setOverlay(u){ overlayImg=u?Object.assign(new Image(),{crossOrigin:'anonymous',src=u}):null; if(u) sessionStorage.setItem('CC_last_overlay',u); }

  function seed(){
    const b=q.get('backdrop')||sessionStorage.getItem('CC_last_backdrop');
    const o=q.get('overlay') ||sessionStorage.getItem('CC_last_overlay');
    if(b) setBackdrop(b); if(o) setOverlay(o);
  }

  async function loop(ts=0){
    if(!running || frozen) return;
    rafId=requestAnimationFrame(loop);
    if(ts-last<1000/TARGET_FPS) return; last=ts;
    const W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);

    if(backdropImg && backdropImg.complete) drawCover(backdropImg,W,H);
    else { ctx.fillStyle='#0b0b0c'; ctx.fillRect(0,0,W,H); }

    if(probe.readyState>=2 && probe.videoWidth>0 && probe.videoHeight>0 && stream){
      setBadge('CAMERA READY');
      drawContain(probe,W,H);
    } else {
      setBadge('NO CAMERA');
    }

    if(overlayImg && overlayImg.complete) drawContain(overlayImg,W,H);
  }

  async function startCam(){
    if(stream) return;
    probe.muted=true; probe.setAttribute('muted','');
    probe.setAttribute('playsinline',''); probe.setAttribute('autoplay','');
    const c={video:{facingMode:'user',width:{ideal:1920},height:{ideal:1080}},audio:false};
    stream=await navigator.mediaDevices.getUserMedia(c);
    probe.srcObject=stream; await probe.play();
    if(!running){ running=true; rafId=requestAnimationFrame(loop); }
  }

  async function waitForVideoReady(ms=8000){
    const t0=Date.now();
    while(Date.now()-t0<ms){
      if(probe.readyState>=2 && probe.videoWidth>0 && probe.videoHeight>0) return true;
      await new Promise(r=>setTimeout(r,120));
    }
    return false;
  }

  start.addEventListener('click', async ()=>{
    if(counting || frozen) return;
    start.disabled=true; hideErr();
    try{
      if(!stream) await startCam();
      const ok = await waitForVideoReady(8000);
      if(!ok){ setBadge('NO CAMERA'); throw new Error('Camera not ready. Allow camera for localhost and close other apps using it.'); }
      await countdown();
      await captureSendReturn();
    }catch(e){
      showErr(e && e.message ? e.message : 'Unexpected error');
      start.disabled=false;
    }
  });

  function drawCountdown(n){
    const W=canvas.width,H=canvas.height;
    ctx.save(); ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff'; ctx.font=`bold ${Math.floor(Math.min(W,H)*0.25)}px -apple-system,system-ui`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(n),W/2,H/2);
    ctx.restore();
  }

  async function countdown(){ for(let i=COUNTDOWN;i>0;i--){ drawCountdown(i); await new Promise(r=>setTimeout(r,1000)); } }

  async function captureSendReturn(){
    // HARD BLOCK: never capture if the camera isn't truly live
    if(!(probe.readyState>=2 && probe.videoWidth>0 && probe.videoHeight>0 && stream)){
      showErr('Capture blocked: camera not ready'); start.disabled=false; return;
    }
    const png=canvas.toDataURL('image/png');

    let cap;
    try{
      cap=await fetch('/api/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:CODE,event:EVENT,imageDataUrl:png})}).then(r=>r.json());
      if(!cap.ok) throw new Error('Capture failed (server).');
    }catch(e){ showErr(e.message||'Capture failed'); start.disabled=false; return; }

    try{
      const send=await fetch('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:CODE,event:EVENT,imageUrl:cap.url,delivery:null})}).then(r=>r.json());
      if(!send.ok) throw new Error('Send failed (server).');
    }catch(e){ showErr(e.message||'Send failed'); start.disabled=false; return; }

    const W=canvas.width,H=canvas.height;
    ctx.save(); ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff'; ctx.font=`bold ${Math.floor(Math.min(W,H)*0.10)}px -apple-system,system-ui`;
    ctx.textAlign='center'; ctx.fillText('Sent to your phone/email!',W/2,H/2);
    ctx.restore();

    setTimeout(()=>{ const u=new URL('/keypad.html',location.origin); u.searchParams.set('event',EVENT); location.href=u.toString(); }, POST_MS);
  }

  async function buildChooser(){
    chooser.innerHTML='';
    let backs={items:[]}, ovs={items:[]};
    try{ backs=await (await fetch(`/api/backdrops/${encodeURIComponent(EVENT)}`)).json(); }catch(_){}
    try{ ovs=await (await fetch(`/api/overlays/${encodeURIComponent(EVENT)}`)).json(); }catch(_){}
    const addChip=(item,kind)=>{ const b=document.createElement('button'); b.className='chip'; b.title=item.file; const img=document.createElement('img'); img.src=item.url; img.alt=item.file; b.appendChild(img); b.addEventListener('click',()=>{ [...chooser.children].forEach(el=>el.style.outline='none'); b.style.outline='3px solid rgba(255,255,255,.7)'; if(kind==='backdrop') setBackdrop(item.url); else setOverlay(item.url); }); chooser.appendChild(b); };
    const bItems=(backs.items||[]).slice(0,MAX_BACKDROPS);
    const oItems=(ovs.items||[]).slice(0,MAX_OVERLAYS);
    bItems.forEach(it=>addChip(it,'backdrop'));
    oItems.forEach(it=>addChip(it,'overlay'));
    const current = sessionStorage.getItem('CC_last_backdrop') || q.get('backdrop');
    if(!current && bItems[0]) setBackdrop(bItems[0].url);
  }

  (async ()=>{ try{
    if(navigator.permissions && navigator.permissions.query){
      const st=await navigator.permissions.query({name:'camera'});
      if(st.state==='granted'){ await startCam(); }
    }
  }catch(_){ }})();

  seed(); buildChooser();
})();