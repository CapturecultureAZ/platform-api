// MediaPipe Selfie Segmentation → window.CC.getSegmentationMask(video,W,H)
(function(){
  const MP='https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation';
  let selfie=null, ready=false, pending=false, lastMask=null, lastW=0, lastH=0;
  const work=document.createElement('canvas');
  const wx=work.getContext('2d',{willReadFrequently:true});

  function boot(){
    if(selfie) return;
    const s=document.createElement('script');
    s.src=MP+'/selfie_segmentation.js';
    s.onload=()=>{
      selfie=new SelfieSegmentation({ locateFile:(f)=>MP+'/'+f });
      selfie.setOptions({ modelSelection:1 }); // wider framing
      selfie.onResults((res)=>{
        try{
          const W=res.segmentationMask.width, H=res.segmentationMask.height;
          const ctx=res.segmentationMask.getContext('2d');
          const img=ctx.getImageData(0,0,W,H); // RGBA, grayscale in RGB
          for(let i=0;i<img.data.length;i+=4){
            const v=img.data[i]; // use R as mask
            img.data[i]=0; img.data[i+1]=0; img.data[i+2]=0; img.data[i+3]=v;
          }
          lastMask=img; lastW=W; lastH=H;
        }finally{ pending=false; }
      });
      ready=true;
    };
    document.head.appendChild(s);
  }
  boot();

  window.CC=window.CC||{};
  window.CC.getSegmentationMask=async function(video,W,H){
    try{
      if(!ready || !video || video.readyState<2) return null;
      if(pending) return lastMask;
      // downscale for speed
      const targetW=Math.min(256, W||256)||256;
      const aspect=video.videoWidth>0 ? (video.videoHeight/video.videoWidth) : 3/4;
      const targetH=Math.max(1, Math.round(targetW*aspect));
      if(work.width!==targetW||work.height!==targetH){ work.width=targetW; work.height=targetH; }
      wx.clearRect(0,0,work.width,work.height);
      wx.drawImage(video,0,0,work.width,work.height);
      pending=true;
      await selfie.send({ image: work });

      // upscale mask to canvas size
      if(lastMask && (lastMask.width!==W || lastMask.height!==H)){
        const up=document.createElement('canvas'); up.width=W; up.height=H;
        const ux=up.getContext('2d');
        const tmp=document.createElement('canvas'); tmp.width=lastW; tmp.height=lastH;
        tmp.getContext('2d').putImageData(lastMask,0,0);
        ux.imageSmoothingEnabled=true; ux.drawImage(tmp,0,0,W,H);
        const upImg=ux.getImageData(0,0,W,H);
        for(let i=0;i<upImg.data.length;i+=4){
          const a=upImg.data[i]; upImg.data[i]=0; upImg.data[i+1]=0; upImg.data[i+2]=0; upImg.data[i+3]=a;
        }
        return upImg;
      }
      return lastMask||null;
    }catch(_){ pending=false; return null; }
  };
})();