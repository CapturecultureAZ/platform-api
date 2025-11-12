(function(){
  const params = new URLSearchParams(location.search);
  const EVENT = (params.get('event') || 'DemoEvent').replace(/[^a-zA-Z0-9_-]/g,'');
  const API   = `/api/backdrops/${encodeURIComponent(EVENT)}`;
  const strip = document.getElementById('backdrop-gallery');
  const badge = document.getElementById('badge');

  window.CC = window.CC || {};
  window.CC.selectedBackdrop = null;

  fetch(API).then(r=>r.json()).then(data=>{
    if (!data.ok || !data.items?.length){ strip.innerHTML = '<div style="opacity:.85">No backdrops</div>'; return; }
    data.items.forEach(item=>{
      const b=document.createElement('button'); b.className='chip'; b.title=item.file;
      const img=document.createElement('img'); img.src=item.url; img.alt=item.file; b.appendChild(img);
      b.addEventListener('click',()=>{
        [...strip.children].forEach(el=>el.style.outline='none');
        b.style.outline='3px solid rgba(255,255,255,.7)';
        window.CC.selectedBackdrop=item.url;
        badge.textContent='Backdrop: '+item.file; badge.style.display='block';
      });
      strip.appendChild(b);
    });
  });

  window.CC.withBackdrop = function(url){
    try{
      if (!window.CC.selectedBackdrop) return url;
      const u = new URL(url, location.origin);
      u.searchParams.set('backdrop', window.CC.selectedBackdrop);
      return u.toString();
    }catch(_){ return url; }
  };
})();
