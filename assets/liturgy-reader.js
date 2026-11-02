const reader=document.querySelector('[data-liturgy-reader]');
if(reader){
 let size=22;const status=reader.querySelector('[data-reader-status]');
 for(const b of reader.querySelectorAll('[data-reader-size]'))b.addEventListener('click',()=>{size=Math.max(18,Math.min(32,size+(b.dataset.readerSize==='up'?2:-2)));reader.style.setProperty('--reader-size',size+'px');status.textContent=size+' px';});
 const mode=reader.querySelector('[data-reader-mode]');mode.addEventListener('click',()=>{const on=mode.getAttribute('aria-pressed')!=='true';mode.setAttribute('aria-pressed',String(on));document.body.classList.toggle('reading-mode',on);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('reading-mode');mode.setAttribute('aria-pressed','false');mode.focus();}});
}
