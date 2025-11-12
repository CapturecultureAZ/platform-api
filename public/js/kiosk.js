/* Kiosk with countdown + preview/retake before AI processing.
   Query params:
     shots   = number of photos (default 1)
     count   = countdown seconds (default 3)
     bgs     = backdrops separated by %7C (URL-encoded pipe)
*/
const AI_URL   = 'http://127.0.0.1:7001/remove';
const AI_TOKEN = 'dev123';

const RESET_TO = '/keypad.html';
const CAP_W    = 1280;   // reduce if Mac gets hot: 960
const CAP_H    = 720;

const els = {
  video:     document.getElementById('video'),
  preview:   document.getElementById('preview'),
  spinner:   document.getElementById('spinner'),
  countdown: document.getElementById('countdown'),
  controls:  document.getElementById('controls'),
  retake:    document.getElementById('retakeBtn'),
  use:       document.getElementById('useBtn'),
};

let stream = null;

function qs(){ return new URLSearchParams(location.search); }
function getShots(){
  const n = parseInt(qs().get('shots')||'1',10);
  return Number.isFinite(n) && n>0 ? Math.min(n,6) : 1;
}
function getCount(){
  const n = parseInt(qs().get('count')||'3',10);
  return Number.isFinite(n) && n>=0 ? Math.min(n,10) : 3;
}
function getBackdrops(shots){
  const raw = qs().get('bgs') || '';
  const arr = raw.split('|').filter(Boolean);
  if (!arr.length){
    return Array.from({length:shots},(_,i)=>`https://picsum.photos/seed/${Date.now()+i}/1600/1000`);
  }
  while (arr.length < shots) arr.push(arr[arr.length-1]);
  return arr.slice(0,shots);
}

async function goFullscreen(){
  const el = document.documentElement;
  try{
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  }catch(_){}
}

async function startCamera(){
  stream = await navigator.mediaDevices.getUserMedia({
    video:{facingMode:'user', width:{ideal:CAP_W}, height:{ideal:CAP_H}},
    audio:false
  });
  els.video.srcObject = stream;
  await els.video.play();
}

function stopCamera(){
  if (stream){ stream.getTracks().forEach(t=>t.stop()); stream = null; }
}

function captureFrame(){
  const vw = els.video.videoWidth  || CAP_W;
  const vh = els.video.videoHeight || CAP_H;
  const scale = Math.min(CAP_W/vw, CAP_H/vh);
  const w = Math.round(vw*scale), h = Math.round(vh*scale);
  const cv = document.createElement('canvas'); cv.width=w; cv.height=h;
  cv.getContext('2d', {willReadFrequently:true}).drawImage(els.video,0,0,w,h);
  return cv.toDataURL('image/png');
}

function spinner(on){ els.spinner.style.display = on ? 'flex' : 'none'; }
function showCountdown(n){
  if (n <= 0){ els.countdown.style.display='none'; return; }
  els.countdown.textContent = String(n);
  els.countdown.style.display = 'flex';
}

async function runCountdown(seconds){
  for (let i=seconds; i>0; i--){
    showCountdown(i);
    await new Promise(r=>setTimeout(r, 1000));
  }
  showCountdown(0);
}

async function aiProcess(dataURL, backdropUrl){
  spinner(true);
  const resp = await fetch(AI_URL, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+AI_TOKEN
    },
    body: JSON.stringify({ imageDataURL:dataURL, backdropUrl })
  });
  if (!resp.ok){
    const t = await resp.text();
    spinner(false);
    throw new Error('AI '+resp.status+' '+t);
  }
  const blob = await resp.blob();
  spinner(false);
  return URL.createObjectURL(blob);
}

async function deliverStub(_url){
  // TODO: POST /v1/sessions/:id/upload
  return true;
}

async function captureWithPreview(){
  // wait a beat so exposure settles after showing live
  await new Promise(r=>setTimeout(r, 350));

  const countdown = getCount();
  if (countdown > 0){
    await runCountdown(countdown);
  }

  // freeze a frame
  const dataURL = captureFrame();

  // show still preview + controls
  els.preview.src = dataURL;
  els.preview.style.display = '';
  els.video.style.display   = 'none';
  els.controls.style.display = 'flex';

  return new Promise((resolve) => {
    const onRetake = () => {
      els.controls.style.display = 'none';
      els.preview.style.display  = 'none';
      els.video.style.display    = '';
      els.retake.removeEventListener('click', onRetake);
      els.use.removeEventListener('click', onUse);
      resolve({accepted:false, dataURL:null});
    };
    const onUse = () => {
      els.controls.style.display = 'none';
      // keep preview visible while processing starts (better UX)
      els.retake.removeEventListener('click', onRetake);
      els.use.removeEventListener('click', onUse);
      resolve({accepted:true, dataURL});
    };
    els.retake.addEventListener('click', onRetake);
    els.use.addEventListener('click', onUse);
  });
}

async function runSequence(){
  await goFullscreen();

  const shots = getShots();
  const backdrops = getBackdrops(shots);

  for (let i=0; i<shots; i++){
    // show live
    await startCamera();

    // loop until user accepts a frame
    let accepted = false, frame = null;
    while (!accepted){
      const res = await captureWithPreview();
      if (!res.accepted){
        // User chose Retake → keep the loop, live is already back
        continue;
      }
      accepted = true;
      frame = res.dataURL;
    }

    stopCamera();

    // Process the accepted frame
    const outUrl = await aiProcess(frame, backdrops[i]);
    els.preview.src = outUrl;          // show AI result briefly
    els.preview.style.display = '';
    await deliverStub(outUrl);
    await new Promise(r=>setTimeout(r, 1200));
    els.preview.style.display = 'none';
    els.video.style.display   = '';
  }

  location.href = RESET_TO + '?ts=' + Date.now();
}

window.addEventListener('pagehide', stopCamera);
runSequence().catch(err=>{
  spinner(false);
  alert(err.message || err);
});
