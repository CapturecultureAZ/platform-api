const MAX=4; let v='';
const dots=document.getElementById('dots');
const pad =document.getElementById('pad');
const msg =document.getElementById('msg');

function render(){
  dots.innerHTML='';
  for(let i=0;i<MAX;i++){
    const d=document.createElement('div');
    d.className='dot';
    d.textContent=v[i]||'•';
    dots.appendChild(d);
  }
}

function press(k){
  if(k==='C'){ v=''; render(); return; }
  if(k==='⌫'){ v=v.slice(0,-1); render(); return; }
  if(/^\d$/.test(k) && v.length<MAX){
    v+=k; render();
    if(v.length===MAX) submit();
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
  if(v.length!==MAX){ msg.textContent='Enter your 4-digit code'; return; }
  msg.textContent='Checking…';
  try{
    const r=await fetch('/api/codes/validate',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({code:v,consume:false})
    });
    const j=await r.json();
    if(!j.ok){ msg.textContent=j.error||'Invalid'; v=''; render(); return; }
    const url = j.launchUrl || ('/capture.html?code='+encodeURIComponent(v));
    location.href = url;
  }catch{
    msg.textContent='Network error';
  }
}

window.addEventListener('keydown',(e)=>{
  if(/^\d$/.test(e.key)){ e.preventDefault(); }
  if(e.key==='Enter'){ submit(); e.preventDefault(); }
  if(e.key==='Backspace'){ v=v.slice(0,-1); render(); e.preventDefault(); }
});

render();
