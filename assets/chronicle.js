(() => {
 'use strict';
 document.querySelectorAll('[data-theme-filter]').forEach(button=>button.addEventListener('click',()=>{
  const gallery=button.closest('[data-chronicle-gallery]');
  gallery.querySelectorAll('[data-theme-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  gallery.querySelectorAll('[data-photo-section]').forEach(s=>s.hidden=button.dataset.themeFilter!=='all'&&s.dataset.photoSection!==button.dataset.themeFilter);
 }));
 document.querySelectorAll('[data-chronicle-carousel]').forEach(root=>{
  const viewport=root.querySelector('.chronicle-viewport'),slides=[...root.querySelectorAll('.chronicle-slide')],controls=root.querySelector('[data-chronicle-controls]'),pause=root.querySelector('[data-chronicle-pause]'),status=root.querySelector('.chronicle-status'),motion=matchMedia('(prefers-reduced-motion:reduce)'),uk=document.documentElement.lang==='uk',total=slides.length;
  let active=0,timer=null,settleTimer=null,busy=false,hover=false,focused=false,visible=false,paused=false,touch=null,suppressClick=false;
  root.classList.add('is-enhanced');controls.hidden=total<2;
  function render(announce=false){
   slides.forEach((slide,i)=>{
    const distance=(i-active+total)%total;
    const position=distance===0?'active':distance===1?'next':distance===total-1?'previous':distance>total/2?'off-left':'off-right';
    slide.dataset.stagePosition=position;
    slide.setAttribute('aria-hidden',String(distance!==0));
    slide.inert=!['active','previous','next'].includes(position);
    slide.querySelector('.parish-photo').inert=distance!==0;
   });
   root.dataset.active=String(active);
   status.setAttribute('aria-live',announce?'polite':'off');status.textContent=`${active+1} / ${total}`;
  }
  function buttonLabel(){
   pause.setAttribute('aria-pressed',String(paused||motion.matches));
   pause.textContent=motion.matches?(uk?'Автоматичний рух вимкнено':'Automatic motion disabled'):paused?(uk?'Відновити рух':'Resume rotation'):(uk?'Призупинити':'Pause rotation');pause.disabled=motion.matches;
  }
  function schedule(){
   clearInterval(timer);timer=null;buttonLabel();
   if(!paused&&!motion.matches&&!hover&&!focused&&visible&&!document.hidden&&total>1)timer=setInterval(()=>{if(!document.querySelector('dialog[open]'))move(1);},5500);
  }
  function move(direction,manual=false){
   if(manual){paused=true;schedule();}
   if(busy||total<2)return;
   if(slides[active].contains(document.activeElement))viewport.focus({preventScroll:true});
   active=(active+direction+total)%total;busy=!motion.matches;render(manual);
   clearTimeout(settleTimer);if(busy)settleTimer=setTimeout(()=>{busy=false;},850);
  }
  root.querySelectorAll('[data-chronicle-step]').forEach(b=>b.addEventListener('click',()=>move(Number(b.dataset.chronicleStep),true)));
  root.querySelectorAll('[data-chronicle-select]').forEach(b=>b.addEventListener('click',()=>{
   const position=b.closest('.chronicle-slide').dataset.stagePosition;
   if(position==='previous'||position==='next'){move(position==='next'?1:-1,true);viewport.focus({preventScroll:true});}
  }));
  root.querySelectorAll('[data-chronicle-open]').forEach(b=>b.addEventListener('click',()=>{
   document.querySelector('.lightbox')?.addEventListener('close',()=>b.focus({preventScroll:true}),{once:true});
   b.closest('.chronicle-slide').querySelector('[data-photo]').click();
  }));
  pause.addEventListener('click',()=>{paused=!paused;schedule();});
  root.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(e.key==='ArrowRight'?1:-1,true);}});
  root.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){hover=true;schedule();}});
  root.addEventListener('pointerleave',()=>{hover=false;schedule();});
  root.addEventListener('focusin',()=>{focused=true;schedule();});
  root.addEventListener('focusout',()=>{queueMicrotask(()=>{focused=root.contains(document.activeElement);schedule();});});
  viewport.addEventListener('touchstart',e=>{touch={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};paused=true;schedule();},{passive:true});
  viewport.addEventListener('touchend',e=>{
   if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;touch=null;
   if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){suppressClick=true;move(dx<0?1:-1,true);setTimeout(()=>{suppressClick=false;},400);}
  },{passive:true});
  viewport.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
  viewport.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;root.dataset.visible=String(visible);schedule();},{threshold:.15}).observe(viewport);
  motion.addEventListener('change',()=>{busy=false;clearTimeout(settleTimer);schedule();});
  document.addEventListener('visibilitychange',schedule);
  render();schedule();
 });
})();
