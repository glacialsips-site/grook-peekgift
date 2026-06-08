import ChatOverlay from '/chat-overlay.js';

const THEME = {
  fg:'#f3ecee', muted:'#a99fa6', accent:'#8f6fc4', accentContrast:'#160d02',
  surface:'rgba(24,19,22,.92)', border:'rgba(255,255,255,.10)',
  userBubble:'rgba(116,92,150,.50)', userFg:'#ffffff',
  assistantBubble:'rgba(42,33,37,.82)', assistantFg:'#f3ecee',
  inputBg:'rgba(24,19,22,.86)', radius:'16px',
  font:"'Source Serif 4', Georgia, serif", blur:'16px'
};

function extractHtml(raw){
  const m = /"html"\s*:\s*"/.exec(raw);
  if(!m) return '';
  let s = raw.slice(m.index + m[0].length);
  s = s.replace(/\\u[0-9a-fA-F]{0,3}$/, '');
  s = s.replace(/(^|[^\\])((?:\\\\)*)\\$/, '$1$2');
  for(const cand of [s.replace(/"\s*\}?\s*$/, ''), s.replace(/"$/, ''), s]){
    try { return JSON.parse('"' + cand + '"'); } catch(e){}
  }
  return '';
}

const SHELL = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style id="pk-style"></style>
<style>html,body{margin:0}#pk-empty{position:fixed;inset:0;display:grid;place-items:center;padding:34px;text-align:center;font:500 16px/1.5 'Source Serif 4',Georgia,serif;color:#b9b0b7;background:radial-gradient(120% 100% at 50% 0%,#1b1620,#0c0b0e)}<\/style>
<script src="/idiomorph.min.js"><\/script>
<script src="/peek-runtime.js"><\/script>
<script>
(function(){
  var seen={};
  function sync(html){
    var doc=new DOMParser().parseFromString(html,'text/html');
    var css=''; doc.querySelectorAll('style').forEach(function(s){css+=s.textContent+'\\n';});
    var slot=document.getElementById('pk-style'); if(slot&&slot.textContent!==css)slot.textContent=css;
    doc.querySelectorAll('link[rel]').forEach(function(l){var h=l.getAttribute('href');if(!h||seen[h])return;seen[h]=1;var nl=document.createElement('link');for(var i=0;i<l.attributes.length;i++)nl.setAttribute(l.attributes[i].name,l.attributes[i].value);document.head.appendChild(nl);});
    var e=document.getElementById('pk-empty'); if(e)e.remove();
    try{ Idiomorph.morph(document.body,doc.body,{morphStyle:'outerHTML'}); }catch(err){ document.body.innerHTML=doc.body.innerHTML; }
    if(window.__PEEK__&&window.__PEEK__.rescan){ try{window.__PEEK__.rescan();}catch(e2){} }
  }
  window.addEventListener('message',function(ev){var d=ev.data||{}; if(d.type==='render'&&d.html)sync(d.html);});
  if(window.__PEEK__)window.__PEEK__.mode='preview';
})();
<\/script>
</head><body><div id="pk-empty">Tell me who it's for — it builds right here.</div></body></html>`;

let frame = null;
const preview = {
  raw:'', last:'', finalHtml:'', timer:null, userImage:null,
  begin(){ this.raw=''; this.last=''; },
  feed(fragment){ this.raw += fragment; if(!this.timer) this.timer = setTimeout(()=>{ this.timer=null; this.render(); }, 90); },
  render(){ const h = extractHtml(this.raw); if(h && h !== this.last){ this.last = h; this.post(h); } },
  finalize(){ if(this.timer){ clearTimeout(this.timer); this.timer=null; } const h = extractHtml(this.raw); if(h){ this.finalHtml = h; this.last = h; this.post(h); } },
  post(html){ try{ frame.contentWindow.postMessage({ type:'render', html }, '*'); }catch(e){} }
};

function parseFrame(block){
  let event='message', data='';
  for(const line of block.split('\n')){
    if(line.startsWith('event:')) event = line.slice(6).trim();
    else if(line.startsWith('data:')) data += line.slice(5).trim();
  }
  return data ? { event, data } : null;
}

async function fillImages(){
  let doc; try{ doc = frame.contentDocument; }catch(e){ return; }
  if(!doc) return;
  const slots = [...doc.querySelectorAll('img[data-peek-img]')].filter(im => !im.getAttribute('src'));
  if(!slots.length) return;
  await Promise.all(slots.map(async (im) => {
    const desc = im.getAttribute('data-peek-img-desc') || im.getAttribute('alt') || '';
    const src  = im.getAttribute('data-peek-img-src') || 'generate';
    im.style.transition = 'opacity .6s ease'; im.style.opacity = '0';
    try{
      const r = await fetch('/api/image', { method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ desc, src, userImage: src === 'upload' ? preview.userImage : null }) });
      const j = await r.json().catch(()=>({}));
      if(j && j.url){ im.onload = ()=>{ im.style.opacity='1'; }; im.src = j.url; }
      else { im.style.opacity='1'; }
    }catch(e){ im.style.opacity='1'; }
  }));
}

customElements.whenDefined('chat-overlay').then(()=>{
  const overlay = document.querySelector('chat-overlay');
  frame = document.getElementById('preview');
  frame.srcdoc = SHELL;
  overlay.setTheme(THEME);

  overlay.setTransport(async function*({ messages, signal }){
    preview.begin();
    preview.userImage = null;
    for(let k=messages.length-1;k>=0;k--){ const m=messages[k]; if(m.role==='user' && m.attachments){ const a=m.attachments.find(x=>x.kind==='image'&&x.dataUrl); if(a){ preview.userImage=a.dataUrl; break; } } }

    const payload = {
      messages: messages.map(m => ({ role: m.role, content: ChatOverlay.toAnthropicContent(m) })),
      currentHtml: preview.finalHtml || null
    };
    const GEN_URL = 'https://ewqpujqerdnrkjqlpobo.supabase.co/functions/v1/generate';
    const SB_KEY = 'sb_publishable_dxaQo6pxBg-onk4hyeqw_g_zixFDFJB';
    const res = await fetch(GEN_URL, { method:'POST', headers:{ 'content-type':'application/json', 'apikey': SB_KEY, 'authorization': 'Bearer ' + SB_KEY }, body: JSON.stringify(payload), signal });
    if(!res.ok){ const t = await res.text().catch(()=> ''); throw new Error('HTTP ' + res.status + (t ? ' — ' + t.slice(0,200) : '')); }
    if(!res.body){ throw new Error('no stream body'); }

    const reader = res.body.getReader(); const dec = new TextDecoder();
    let buf = '', gotText = false;
    while(true){
      const { value, done } = await reader.read(); if(done) break;
      buf += dec.decode(value, { stream:true });
      let i;
      while((i = buf.indexOf('\n\n')) >= 0){
        const block = buf.slice(0, i); buf = buf.slice(i + 2);
        const fr = parseFrame(block); if(!fr) continue;
        if(fr.event === 'text'){ let t; try{ t = JSON.parse(fr.data); }catch(e){ t = fr.data; } if(t){ gotText = true; yield t; } }
        else if(fr.event === 'html'){ let frag; try{ frag = JSON.parse(fr.data); }catch(e){ frag = fr.data; } preview.feed(frag); }
        else if(fr.event === 'done'){ preview.finalize(); }
        else if(fr.event === 'error'){ let msg; try{ msg = JSON.parse(fr.data).message; }catch(e){} throw new Error(msg || 'generation error'); }
      }
    }
    preview.finalize();
    setTimeout(fillImages, 500);
    if(!gotText) yield "Here's a first pass — tell me what to change.";
  });
});
