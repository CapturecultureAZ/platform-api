const video=document.getElementById('video'),
      preview=document.getElementById('preview'),
      startBtn=document.getElementById('start'),
      retakeBtn=document.getElementById('retake'),
      confirmBtn=document.getElementById('confirm'),
      cdOverlay=document.getElementById('countdown'),
      cdNum=document.getElementById('cdNum'),
      receipt=document.getElementById('receipt'),
      finalImg=document.getElementById('final');

let stream=null, APP_CONFIG=null, CURR_META=null;
let TOTAL_SHOTS=3, currentShot=0;
const shots=[]; // { raw, processed }

/* fullscreen best-effort */
async function tryFullscreenSilent(){ if(document.fullscreenElement) return; try{ await document.documentElement.requestFullscreen(); }catch{} }
document.addEventListener('DOMContentLoaded', tryFullscreenSilent);

/* config */
async function fetchConfig(){
  try{ const r=await fetch('/api/config',{cache:'no-store'}); APP_CONFIG=await r.json(); }catch{ APP_CONFIG=null; }
}

/* camera */
async function startCamera(){
  try{
    if (stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
    stream=await navigator.mediaDevices.getUserMedia({ video:{facingMode:{ideal:'user'}}, audio:false });
    video.srcObject=stream; await video.play().catch(()=>{});
    showLive();
  }catch(e){ console.error('Camera error:', e); }
}

/* UI states */
function showLive(){
  preview.classList.add('hidden');
  video.classList.remove('hidden');
  startBtn.classList.remove('hidden');
  retakeBtn.classList.add('hidden');
  confirmBtn.classList.add('hidden');
  receipt.style.display='none';
}
function showPreview(){
  video.classList.add('hidden');
  preview.classList.remove('hidden');
  startBtn.classList.add('hidden');
  retakeBtn.classList.remove('hidden');
  confirmBtn.classList.remove('hidden');
  confirmBtn.textContent = (currentShot < TOTAL_SHOTS) ? `Next (${currentShot}/${TOTAL_SHOTS})` : 'Finish';
}

/* countdown */
function getCountdownSeconds(){
  const u=new URL(location.href);
  const q=parseInt(u.searchParams.get('cd')||'',10);
  if(!Number.isNaN(q)&&q>=3&&q<=30) return q;
  const s=parseInt(APP_CONFIG?.countdownSeconds||'',10);
  if(!Number.isNaN(s)&&s>=3&&s<=30) return s;
  const ls=parseInt(localStorage.getItem('COUNTDOWN_SECONDS')||'',10);
  if(!Number.isNaN(ls)&&ls>=3&&ls<=30) return ls;
  return 5;
}
async function runCountdown(){
  let n=getCountdownSeconds();
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  cdOverlay.style.display='grid';
  while(n>0){ cdNum.textContent=n; await wait(1000); n--; }
  cdNum.textContent='GO';
  await wait(200);
  cdOverlay.style.display='none';
  await captureFrame();
}

/* capture with single-session backdrop */
async function captureFrame(){
  const w=video.videoWidth||1920, h=video.videoHeight||1080;
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  c.getContext('2d').drawImage(video,0,0,w,h);
  const raw=c.toDataURL('image/jpeg',0.92);

  let processed=raw;
  try{
    const r=await fetch('/api/ai/background',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ image: raw, backdrop: CURR_META?.backdrop || null })
    });
    const j=await r.json();
    if (j?.ok && j.image) processed=j.image;
  }catch{}

  shots[currentShot-1]={raw,processed};
  preview.src=processed;
  showPreview();
}

/* flow buttons */
startBtn.addEventListener('click', async ()=>{
  currentShot += 1;
  await runCountdown();
});
retakeBtn.addEventListener('click', async ()=>{
  await runCountdown();
});
confirmBtn.addEventListener('click', async ()=>{
  if (currentShot < TOTAL_SHOTS){
    currentShot += 1;
    video.classList.remove('hidden'); preview.classList.add('hidden');
    await runCountdown();
    return;
  }
  await finishAndSend();
});

/* finish: upload all, send once, clean overlay, reset */
async function finishAndSend(){
  try{
    const urls=[];
    for (const s of shots){
      const up=await fetch('/api/uploads',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ image: s.processed || s.raw })
      }).then(r=>r.json()).catch(()=>null);
      if (up?.ok && up.url) urls.push(location.origin + up.url);
    }

    const tasks=[];
    if (CURR_META?.phone) tasks.push(fetch('/api/send/sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:CURR_META.phone,url:urls.join('\n')})}));
    if (CURR_META?.email) tasks.push(fetch('/api/send/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:CURR_META.email,url:urls.join('\n')})}));
    await Promise.allSettled(tasks);

    // Clean finish screen: only photo + generic message
    receipt.style.display='block';
    finalImg.src = shots[shots.length-1]?.processed || shots[shots.length-1]?.raw;

    const note=document.createElement('div');
    note.style.position='fixed'; note.style.left='50%'; note.style.bottom='8%'; note.style.transform='translateX(-50%)';
    note.style.background='rgba(0,0,0,.7)'; note.style.border='2px solid rgba(255,255,255,.2)';
    note.style.padding='14px 16px'; note.style.borderRadius='14px'; note.style.fontWeight='800'; note.style.fontSize='1.2rem';
    note.textContent='Photo(s) sent!';
    document.body.appendChild(note);

    setTimeout(()=>{ window.location.href=(APP_CONFIG&&APP_CONFIG.returnUrl)?APP_CONFIG.returnUrl:'/keypad.html'; }, 5000);
  }catch(e){
    console.error(e);
    window.location.href=(APP_CONFIG&&APP_CONFIG.returnUrl)?APP_CONFIG.returnUrl:'/keypad.html';
  }
}

/* metadata + shots */
async function hydrateMeta(){
  const u=new URL(location.href);
  const q=parseInt(u.searchParams.get('shots')||'',10);
  TOTAL_SHOTS=( !Number.isNaN(q) && q>=1 && q<=12 ) ? q : 3;

  const code=(u.searchParams.get('code')||'').trim();
  if (!code) return;
  try{
    const r=await fetch('/api/codes/validate',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body: JSON.stringify({code,consume:false})
    });
    const j=await r.json();
    if (j?.ok){
      CURR_META={ phone:j.phone||null, email:j.email||null, backdrop:j.backdrop||null, tier:j.tier||null };
    }
  }catch{}
}

/* boot */
(async()=>{ await fetchConfig(); await hydrateMeta(); await startCamera(); await tryFullscreenSilent(); })();
