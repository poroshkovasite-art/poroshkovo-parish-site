const reader=document.querySelector('[data-liturgy-reader]');
if(reader){
 let size=22;const status=reader.querySelector('[data-reader-status]');
 for(const b of reader.querySelectorAll('[data-reader-size]'))b.addEventListener('click',()=>{size=Math.max(18,Math.min(32,size+(b.dataset.readerSize==='up'?2:-2)));reader.style.setProperty('--reader-size',size+'px');status.textContent=size+' px';});
 const mode=reader.querySelector('[data-reader-mode]');mode.addEventListener('click',()=>{const on=mode.getAttribute('aria-pressed')!=='true';mode.setAttribute('aria-pressed',String(on));document.body.classList.toggle('reading-mode',on);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('reading-mode');mode.setAttribute('aria-pressed','false');mode.focus();}});
}

if(reader){
 reader.querySelector('[data-reader-print]').addEventListener('click',()=>window.print());
 const contents=reader.querySelector('[data-reader-contents]');if(matchMedia('(min-width:1001px)').matches)contents.open=true;
 for(const a of reader.querySelectorAll('a[href="#liturgy-contents"]'))a.addEventListener('click',()=>{contents.open=true;});
 const load=d=>{const i=d.querySelector('img[data-scan-src]');if(i&&!i.hasAttribute('src'))i.src=i.dataset.scanSrc;};
 for(const d of reader.querySelectorAll('[data-scan-page]'))d.addEventListener('toggle',()=>{if(d.open)load(d);});
 const openHash=()=>{const d=document.getElementById(location.hash.slice(1));if(d?.hasAttribute('data-scan-page')){d.open=true;load(d);requestAnimationFrame(()=>d.scrollIntoView({block:'start'}));}};
 window.addEventListener('hashchange',openHash);openHash();
 for(const a of reader.querySelectorAll('[data-scan-link]'))a.addEventListener('click',()=>{const d=document.getElementById('scan-'+a.dataset.scanLink);d.open=true;load(d);});
}
