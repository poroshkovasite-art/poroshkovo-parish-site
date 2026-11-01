// The three original links remain usable when scripting is unavailable.
document.querySelectorAll('[data-feature-carousel]').forEach(root=>{
 const viewport=root.querySelector('.feature-viewport'),track=root.querySelector('.feature-track');
 const originals=[...track.children],dots=[...root.querySelectorAll('[data-feature-dot]')];
 if(originals.length!==3)return;
 const uk=document.documentElement.lang==='uk',motion=matchMedia('(prefers-reduced-motion: reduce)');
 const pause=root.querySelector('[data-feature-pause]'),status=root.querySelector('[data-feature-status]');
 let active=0,busy=false,timer,finishTimer,userPaused=false,hover=false,focused=false,inView=false,touchStart=null,suppressClickUntil=0;
 // Six slides (two cycles) allow either direction without overlapping cards or a visible wrap.
 const order=[2,1,0,2,1,0];
 track.replaceChildren(...order.map(i=>{const slide=originals[i].cloneNode(true);slide.dataset.featureIndex=i;return slide;}));
 const stop=()=>{clearTimeout(timer);timer=null;};
 function schedule(){stop();if(!motion.matches&&!userPaused&&!hover&&!focused&&inView&&!document.hidden&&!busy)timer=setTimeout(()=>move(1,false),5000);}
 function sync(){
  [...track.children].forEach((slide,i)=>{
   slide.classList.toggle('is-active',i===2);slide.inert=i<1||i>3;
   if(i===2){slide.removeAttribute('aria-hidden');slide.tabIndex=0;}else{slide.setAttribute('aria-hidden','true');slide.tabIndex=-1;}
  });
  root.dataset.active=String(active);
  dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===active)));
  pause.setAttribute('aria-pressed',String(userPaused));
  pause.textContent=motion.matches?(uk?'Ручне керування':'Manual controls'):userPaused?(uk?'Відновити рух':'Resume rotation'):(uk?'Призупинити':'Pause rotation');
  pause.disabled=motion.matches;
 }
 function interact(){userPaused=true;stop();sync();}
 function move(direction,manual=true){
  if(busy)return;if(manual)interact();stop();busy=true;
  const children=[...track.children],target=direction===1?1:3;
  children.forEach((slide,i)=>slide.classList.toggle('is-active',i===target));
  track.classList.add(direction===1?'shift-right':'shift-left');
  const finish=()=>{
   clearTimeout(finishTimer);track.removeEventListener('transitionend',onEnd);
   track.classList.add('is-resetting');
   if(direction===1)track.prepend(track.lastElementChild);else track.append(track.firstElementChild);
   track.classList.remove('shift-right','shift-left');active=Number(track.children[2].dataset.featureIndex);sync();
   // Commit the reset without animation, then restore transitions for the next step.
   void track.offsetWidth;track.classList.remove('is-resetting');busy=false;
   if(manual)status.textContent=`${active+1} / 3 — ${track.children[2].querySelector('h2').textContent}`;
   schedule();
  };
  const onEnd=e=>{if(e.target===track&&e.propertyName==='transform')finish();};
  if(motion.matches)finish();else{track.addEventListener('transitionend',onEnd);finishTimer=setTimeout(finish,850);}
 }
 root.querySelectorAll('[data-feature-step]').forEach(button=>button.addEventListener('click',()=>move(Number(button.dataset.featureStep))));
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>{interact();if(i!==active)move((i-active+3)%3===1?1:-1);}));
 track.addEventListener('click',e=>{if(performance.now()<suppressClickUntil){e.preventDefault();return;}const card=e.target.closest('.feature-card');if(!card)return;const position=[...track.children].indexOf(card);if(position!==2){e.preventDefault();move(position<2?1:-1);}else interact();});
 root.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const target=e.key==='Home'?0:e.key==='End'?2:null;if(target!==null){interact();if(target!==active)move((target-active+3)%3===1?1:-1);}else move(e.key==='ArrowRight'?1:-1);}else if(e.key==='Tab')interact();});
 root.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=true;stop();}});
 root.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){hover=false;schedule();}});
 root.addEventListener('focusin',()=>{focused=true;interact();});
 root.addEventListener('focusout',()=>{queueMicrotask(()=>{focused=root.contains(document.activeElement);schedule();});});
 pause.addEventListener('click',()=>{userPaused=!userPaused;sync();schedule();});
 viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){touchStart={x:e.clientX,y:e.clientY};interact();}},{passive:true});
 viewport.addEventListener('pointerup',e=>{if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){suppressClickUntil=performance.now()+400;move(dx>0?1:-1);}},{passive:true});
 viewport.addEventListener('pointercancel',()=>{touchStart=null;});
 motion.addEventListener('change',()=>{sync();schedule();});document.addEventListener('visibilitychange',schedule);
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();},{threshold:.4}).observe(viewport);
 else inView=true;
 root.querySelector('[data-feature-controls]').hidden=false;root.classList.add('is-enhanced');sync();schedule();
});
