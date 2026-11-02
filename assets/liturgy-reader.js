const reader=document.querySelector('[data-liturgy-reader]');
if(reader){
 let size=parseFloat(getComputedStyle(reader).getPropertyValue('--reader-size'))||22;
 const status=reader.querySelector('[data-reader-status]');
 const buttons=[...reader.querySelectorAll('[data-reader-size]')];
 const update=()=>{for(const button of buttons)button.disabled=button.dataset.readerSize==='up'?size>=32:size<=18;};
 for(const button of buttons)button.addEventListener('click',()=>{
  size=Math.max(18,Math.min(32,size+(button.dataset.readerSize==='up'?2:-2)));
  reader.style.setProperty('--reader-size',`${size}px`);status.textContent=`Розмір шрифту: ${size} px`;update();
 });
 update();
 const mode=reader.querySelector('[data-reader-mode]');
 const setMode=on=>{mode.setAttribute('aria-pressed',String(on));document.body.classList.toggle('reading-mode',on);};
 mode.addEventListener('click',()=>setMode(mode.getAttribute('aria-pressed')!=='true'));
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&mode.getAttribute('aria-pressed')==='true'){setMode(false);mode.focus();}
 });
 reader.querySelector('[data-reader-print]').addEventListener('click',()=>window.print());
 const contents=reader.querySelector('[data-reader-contents]');
 for(const link of reader.querySelectorAll('a[href="#liturgy-contents"]'))link.addEventListener('click',()=>{contents.open=true;});
}
