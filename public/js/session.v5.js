(function(){
  window.CC = window.CC || {};
  const q = new URLSearchParams(location.search);
  const EVENT = (q.get('event') || 'DemoEvent').replace(/[^a-zA-Z0-9_-]/g,'');
  const CODE  = (q.get('code')  || '').replace(/\D/g,'');
  const COUNTDOWN = Math.max(1, Math.min(15, +(q.get('countdown')||5)));
  const POST_VIEW_MS = 5000;
  const MAX_BACKDROPS = 3, MAX_OVERLAYS = 3;

  const canvas=document.getElementById('cc-canvas');
  const ctx=canvas.getContext('2d');
  const probe=document.getElementById('probe');
  const chooser=document.getElementById('chooser');
  const badge=document.getElementById('badge');
  const errEl=document.getElementById('err');
  const startBtn=document.getElementById('start');

  let stream=null,running=false,frozen=false,last=0;
  const TARGET_FPS=24;
  let backdropImg=null,overlayImg=null;

  function showErr(m){ errEl.textContent=String(m||''); errEl.style.display='block'; }
  function hideErr(){ errEl.style.display='none'; }
  function resize(){
    const dpr=Math.min(devicePixelRatio||1,2);
    const w=Math.floor(innerWidth*dpr), h=Math.floor(innerHeight*dpr);
    canvas.width=w; canvas.height=h; canvas.style.width='100vw'; canvas.style.height='100vh';
  }
  addEventListener('resize',resize); resize();

  function drawCover(img,W,H){ const r=Math.max(W/img.width,H/img.height), w=img.width*r, h=img.height*r, x=(W-w)/2, y=(H-h)/2; ctx.drawImage(img,x,y,w,h); }
  function drawContain(img,W,H){ const r=Math.min(W/img.width,H/img.height), w=img.width*r, h=img.height*r, x=(W-w)/2, y=(H-h)/2; ctx.drawImage(img,x,y,w,h); }

  function setBackdrop(u){
    if(!u){ backdropImg=null; badge.style.display='none'; return; }
    if(backdropImg && backdropImg.src===u) return;
    backdropImg=new Image(); backdropImg.crossOrigin='anonymous'; backdropImg.src=u;
    badge.textContent='Backdrop: '+(u.split('/').pop()||''); badge.style.display='block';
    sessionStorage.setItem('CC_last_backdrop',u);
  }
  function setOverlay(u){
    if(!u){ overlayImg=null; return; }
    if(overlayImg && overlayImg.src===u) return;
    overlayImg=new Image(); overlayImg.crossOrigin='anonymous'; overlayImg.src=u;
    sessionStorage.setItem('CC_last_overlay',u);
  }

  function seed(){
    const b=q.get('backdrop')||sessionStorage.getItem('CC_last_backdrop');
    const o=q.get('overlay')||sessionStorage.getItem('CC_last_overlay');
    if(b) setBackdrop(b);
    if(o) setOverlay(o);
  }

  async function loop(ts=0){
    if(!running||frozen) return;
    requestAnimationFrame(loop);
    if(ts-last<1000/TARGET_FPS) return; last=ts;

    const W=canvas.width,H=canvas.height;

    if(backdropImg&&backdropImg.complete) drawCover(backdropImg,W,H);
    else{ ctx.fillStyle='#0b0b0c'; ctx.fillRect(0,0,W,H); }

    if(probe.readyState>=2){
      const mask=(window.CC.getSegmentationMask)?await window.CC.getSegmentationMask(probe,W,H):null;
      if(!mask) drawContain(probe,W,H);
      else{
        const off=document.createElement('canvas'); off.width=W; off.height=H;
        const x=off.getContext('2d');
        x.drawImage(probe,0,0,W,H);
        const frame=x.getImageData(0,0,W,H), fp=frame.data, mp=mask.data||mask, L=Math.min(fp.length,mp.length);
        for(let i=0;i<L;i+=4){ fp[i+3]=mp[i]; }
        x.putImageData(frame,0,0);
        ctx.drawImage(off,0,0);
      }
    }
    if(overlayImg&&overlayImg.complete) drawContain(overlayImg,W,H);
  }

  async function startCam(){
    if(stream) return;
    const c={video:{facingMode:'user',width:{ideal:1920},height:{ideal:1080}},audio:false};
    stream=await navigator.mediaDevices.getUserMedia(c);
    probe.srcObject=stream; await probe.play();
    running=true; requestAnimationFrame(loop);
  }

  // Try auto-start for previous-granted permission
  (async ()=>{
    try{
      if(navigator.permissions&&navigator.permissions.query){
        const st=await navigator.permissions.query({name:'camera'});
        if(st.state==='granted') await startCam();
      } else {
        await startCam().catch(()=>{});
      }
    }catch(_){}
  })();

  startBtn.addEventListener('click', async ()=>{
    hideErr();
    try{
      if(!stream) await startCam();
      await countdown();
    }catch(e){ showErr('Camera error. Please allow access.'); }
  });

  function drawCountdown(n){
    const W=canvas.width,H=canvas.height;
    ctx.save(); ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff'; ctx.font=`bold ${Math.floor(Math.min(W,H)*0.25)}px -apple-system,system-ui`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(n),W/2,H/2);
    ctx.restore();
  }
  async function countdown(){
    for(let i=COUNTDOWN;i>0;i--){ drawCountdown(i); await new Promise(r=>setTimeout(r,1000)); }
    await captureSendReturn();
  }

  async function captureSendReturn(){
    frozen=true;
    const png=canvas.toDataURL('image/png');

    const cap=await fetch('/api/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:CODE,event:EVENT,imageDataUrl:png})}).then(r=>r.json());
    if(!cap.ok){ showErr('Capture failed'); return; }

    let delivery=null;
    try{
      const meta=await (await fetch('/api/code-meta/'+encodeURIComponent(CODE))).json();
      if(meta.ok && meta.meta) delivery=meta.meta.delivery||null;
    }catch(_){}

    const send=await fetch('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:CODE,event:EVENT,imageUrl:cap.url,delivery})}).then(r=>r.json());
    if(!send.ok){ showErr('Send failed'); return; }

    const W=canvas.width,H=canvas.height;
    ctx.save(); ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff'; ctx.font=`bold ${Math.floor(Math.min(W,H)*0.10)}px -apple-system,system-ui`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('Sent to your phone/email!',W/2,H/2);
    ctx.restore();

    setTimeout(()=>{ const u=new URL('/keypad.html',location.origin); u.searchParams.set('event',EVENT); location.href=u.toString(); },POST_VIEW_MS);
  }

  async function buildChooser(){
    chooser.innerHTML='';
    const backs=await fetch(`/api/backdrops/${encodeURIComponent(EVENT)}`).then(r=>r.json()).catch(()=>({items:[]}));
    const ovs=await fetch(`/api/overlays/${encodeURIComponent(EVENT)}`).then(r=>r.json()).catch(()=>({items:[]}));

    const addChip=(item,kind)=>{
      const b=document.createElement('button'); b.className='chip'; b.title=item.file;
      const img=document.createElement('img'); img.src=item.url; img.alt=item.file; b.appendChild(img);
      b.addEventListener('click',()=>{
        [...chooser.children].forEach(el=>el.style.outline='none');
        b.style.outline='3px solid rgba(255,255,255,.7)';
        if(kind==='backdrop') setBackdrop(item.url);
        else setOverlay(item.url);
      });
      chooser.appendChild(b);
    };
    (backs.items||[]).slice(0,MAX_BACKDROPS).forEach(it=>addChip(it,'backdrop'));
    (ovs.items||[]).slice(0,MAX_OVERLAYS).forEach(it=>addChip(it,'overlay'));
  }

  seed();
  buildChooser();
})();
