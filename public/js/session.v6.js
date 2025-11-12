(function(){
  /* ... same top as before ... */

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

    const bItems=(backs.items||[]).slice(0,MAX_BACKDROPS);
    const oItems=(ovs.items||[]).slice(0,MAX_OVERLAYS);
    bItems.forEach(it=>addChip(it,'backdrop'));
    oItems.forEach(it=>addChip(it,'overlay'));

    /* ✅ ensure we SEE something immediately */
    const currentBackdrop = sessionStorage.getItem('CC_last_backdrop') || q.get('backdrop');
    if(!currentBackdrop && bItems[0]) setBackdrop(bItems[0].url);
  }

  /* ... rest of file unchanged ... */

  seed();
  buildChooser();
})();
