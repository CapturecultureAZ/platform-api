(function(){
  window.CC = window.CC || {};
  const params = new URLSearchParams(location.search);
  const EVENT = (params.get('event') || 'DemoEvent').replace(/[^a-zA-Z0-9_-]/g,'');

  const overlayStrip = document.getElementById('overlay-gallery');
  const canvas = document.getElementById('cc-canvas');
  const ctx = canvas.getContext('2d');
  const probe = document.getElementById('probe'); // visible to Safari, minimal size
  const errEl = document.getElementById('err');

  let overlayImg=null, backdropImg=null, running=false, last=0, stream=null;
  const TARGET_FPS=24;

  function showErr(msg){
    try{ errEl.textContent=String(msg||''); errEl.style.display='block'; }catch(_){}
    console.error(msg);
  }

  function getBackdropURL(){
    if (window.CC.selectedBackdrop) return window.CC.selectedBackdrop;
    const b=params.get('backdrop'); return b?b:null;
  }
  function ensureBackdrop(){
    const url=getBackdropURL();
    if (!url){ backdropImg=null; return; }
    if (backdropImg && backdropImg.src===url) return;
    backdropImg=new Image(); backdropImg.crossOrigin='anonymous'; backdropImg.src=url;
  }

  fetch(`/api/overlays/${encodeURIComponent(EVENT)}`)
    .then(r=>r.json())
    .then(data=>{
      if (!data.ok || !data.items?.length){ overlayStrip.innerHTML='<div style="opacity:.85">No overlays</div>'; return; }
      data.items.forEach(item=>{
        const b=document.createElement('button'); b.className='chip'; b.title=item.file;
        const img=document.createElement('img'); img.src=item.url; img.alt=item.file; img.style.objectFit='contain'; b.appendChild(img);
        b.addEventListener('click',()=>{
          [...overlayStrip.children].forEach(el=>el.style.outline='none');
          b.style.outline='3px solid rgba(255,255,255,.7)';
          overlayImg=new Image(); overlayImg.crossOrigin='anonymous'; overlayImg.src=item.url;
        });
        overlayStrip.appendChild(b);
      });
    })
    .catch(e=>showErr('Overlay load error: '+e.message));

  function resize(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=Math.floor(innerWidth*dpr), h=Math.floor(innerHeight*dpr);
    canvas.width=w; canvas.height=h; canvas.style.width='100vw'; canvas.style.height='100vh';
  }
  addEventListener('resize', resize); resize();

  function drawCover(img,W,H){
    const r=Math.max(W/img.width,H/img.height), w=img.width*r, h=img.height*r, x=(W-w)/2, y=(H-h)/2;
    ctx.drawImage(img,x,y,w,h);
  }
  function drawContain(img,W,H){
    const r=Math.min(W/img.width,H/img.height), w=img.width*r, h=img.height*r, x=(W-w)/2, y=(H-h)/2;
    ctx.drawImage(img,x,y,w,h);
  }

  async function tick(ts=0){
    if (!running) return;
    requestAnimationFrame(tick);
    if (ts-last < 1000/TARGET_FPS) return; last=ts;

    ensureBackdrop();
    const W=canvas.width, H=canvas.height;

    if (backdropImg && backdropImg.complete){ drawCover(backdropImg,W,H); }
    else { ctx.fillStyle='#0b0b0c'; ctx.fillRect(0,0,W,H); }

    if (probe.readyState>=2){
      const mask = (window.CC.getSegmentationMask) ? await window.CC.getSegmentationMask(probe,W,H) : null;
      if (!mask){
        drawContain(probe,W,H);
      } else {
        const off=document.createElement('canvas'); off.width=W; off.height=H; const x=off.getContext('2d');
        x.drawImage(probe,0,0,W,H);
        const frame=x.getImageData(0,0,W,H), fp=frame.data, mp=mask.data||mask, L=Math.min(fp.length, mp.length);
        for (let i=0;i<L;i+=4){ fp[i+3] = mp[i]; }
        x.putImageData(frame,0,0);
        ctx.drawImage(off,0,0);
      }
    }
    if (overlayImg && overlayImg.complete){ drawContain(overlayImg,W,H); }
  }

  async function startCamera(){
    try{
      if (stream){
        // already started
        running=true; requestAnimationFrame(tick); return;
      }
      // ask for specific constraints; front camera on iPad/Mac
      const constraints = { video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      probe.srcObject = stream;
      await probe.play();
      running=true; requestAnimationFrame(tick);
      errEl.style.display='none';
    }catch(e){
      showErr(
        'Camera error: '+e.message+
        '\nFixes:\n1) Safari ▸ Preferences ▸ Websites ▸ Camera ▸ Allow for localhost\n2) macOS System Settings ▸ Privacy & Security ▸ Camera ▸ Safari: On\n3) Close apps using camera (FaceTime, Zoom, Teams, Photo Booth)'
      );
    }
  }

  window.CC.startCameraOnce = startCamera; // bound to Start Camera button
})();
