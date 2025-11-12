(function(){
  const input = document.querySelector('input[name="code"]');
  const pad = document.getElementById('pad');
  if (!input || !pad) return;
  const keys = ['1','2','3','4','5','6','7','8','9','C','0','⌫'];
  keys.forEach(k=>{
    const b=document.createElement('button');
    b.type='button';
    b.textContent=k;
    b.style.padding='18px';
    b.style.borderRadius='14px';
    b.style.border='1px solid rgba(255,255,255,.18)';
    b.style.background='rgba(255,255,255,.08)';
    b.style.color='#fff';
    b.style.fontSize='22px';
    b.style.cursor='pointer';
    b.addEventListener('click',()=>{
      if(k==='C'){ input.value=''; input.focus(); return; }
      if(k==='⌫'){ input.value=input.value.slice(0,-1); input.focus(); return; }
      if(/^\d$/.test(k) && input.value.length<4){ input.value+=k; input.focus(); }
    });
    pad.appendChild(b);
  });
})();
