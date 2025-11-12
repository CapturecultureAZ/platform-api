const codeBox = document.getElementById("code");
const statusBox = document.getElementById("status");
const keys = document.querySelectorAll("[data-k]");
const clearBtn = document.getElementById("clear");
const goBtn = document.getElementById("go");

function digits(x){ return String(x||"").replace(/\D/g,""); }
function msg(x){ if(statusBox) statusBox.textContent = x; }

keys.forEach(b=>{
  b.onclick=()=>{
    const k = b.getAttribute("data-k");
    codeBox.value = digits(codeBox.value + k).slice(-4);
  };
});

if(clearBtn){
  clearBtn.onclick=()=>{
    codeBox.value="";
    msg("");
  };
}

async function validate(){
  const last4 = digits(codeBox.value);
  if(last4.length!==4){ msg("Enter last 4 digits"); return; }
  msg("Validating...");
  const r = await fetch("/api/codes/validate",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({code:last4,consume:true})
  });
  const j = await r.json();
  if(!j.ok){ msg(j.error||"Invalid"); return; }
  msg("Launching...");
  if(j.launchUrl){ window.location.href=j.launchUrl; }
}

if(goBtn){ goBtn.onclick=validate; }
codeBox.onkeydown=(e)=>{ if(e.key==="Enter") validate(); };
codeBox.oninput=()=>{ codeBox.value = digits(codeBox.value).slice(-4); };
