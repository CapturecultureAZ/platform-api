/* Provides window.CC.getSegmentationMask(video, W, H) using MediaPipe SelfieSegmentation */
(function(){
  window.CC = window.CC || {};
  let selfie=null, ready=false, latest=null, off=null, offCtx=null;

  async function init(){
    if (ready) return;
    if (!window.SelfieSegmentation) { console.warn('SelfieSegmentation not loaded'); return; }
    selfie = new SelfieSegmentation({ locateFile: (f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}` });
    selfie.setOptions({ modelSelection: 0 });
    selfie.onResults(res=>{
      try{
        const c = res.segmentationMask;
        const ctx = c.getContext('2d');
        latest = ctx.getImageData(0,0,c.width,c.height); // rgba where person is white
      }catch(e){ latest=null; }
    });
    ready=true;
  }

  function ensureOff(W,H){
    if (!off || off.width!==W || off.height!==H){
      off=document.createElement('canvas'); off.width=W; off.height=H; offCtx=off.getContext('2d');
    }
  }

  // called from render loop; throttled internally by mediapipe
  window.CC.getSegmentationMask = async function(video, W, H){
    await init();
    if (!selfie) return null;
    ensureOff(W,H);
    offCtx.drawImage(video,0,0,W,H);
    await selfie.send({ image: off });
    return latest ? latest : null;
  };
})();
