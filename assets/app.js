(() => {
 'use strict';
 const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('#navigation');
 function closeMenu(){toggle?.setAttribute('aria-expanded','false');nav?.classList.remove('is-open');}
 toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
 document.querySelectorAll('.nav-group').forEach(group=>group.addEventListener('toggle',()=>{if(group.open)document.querySelectorAll('.nav-group').forEach(other=>{if(other!==group)other.open=false;});}));
 document.addEventListener('click',event=>{if(!event.target.closest('.nav-group'))document.querySelectorAll('.nav-group').forEach(d=>d.open=false);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){const open=[...document.querySelectorAll('.nav-group[open]')];open.forEach(d=>d.open=false);if(open.length)open[0].querySelector('summary').focus();else if(toggle?.getAttribute('aria-expanded')==='true'){closeMenu();toggle.focus();}}});
 matchMedia('(min-width:851px)').addEventListener('change',closeMenu);
 const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
 const carousel=document.querySelector('.carousel');
 function slide(direction){if(!carousel)return;const card=carousel.querySelector('.content-card'),gap=parseFloat(getComputedStyle(carousel).columnGap)||24;carousel.scrollBy({left:(card.getBoundingClientRect().width+gap)*direction,behavior:reduced()?'instant':'smooth'});}
 document.querySelectorAll('[data-slide]').forEach(b=>b.addEventListener('click',()=>slide(Number(b.dataset.slide))));
 carousel?.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();slide(e.key==='ArrowLeft'?-1:1);}});
 document.querySelectorAll('[data-era]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-era]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));let count=0;document.querySelectorAll('[data-timeline-item]').forEach(item=>{item.hidden=button.dataset.era!=='all'&&item.dataset.eraItem!==button.dataset.era;if(!item.hidden)count++;});document.querySelector('[data-timeline-count]').textContent=String(count);}));
 document.querySelectorAll('[data-photo-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-photo-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelectorAll('[data-photo-card]').forEach(card=>card.hidden=button.dataset.photoFilter!=='all'&&card.dataset.category!==button.dataset.photoFilter);}));
 const dialog=document.querySelector('.lightbox');let current=0,opener=null;
 const available=()=>[...document.querySelectorAll('[data-photo]')].filter(b=>!b.closest('[hidden]'));
 function show(index){const items=available();if(!items.length)return;current=Math.max(0,Math.min(index,items.length-1));const item=items[current],img=dialog.querySelector('img');img.src=item.dataset.full;img.alt=item.querySelector('img').alt;dialog.querySelector('figcaption').textContent=`${current+1} / ${items.length} · ${item.dataset.caption||img.alt}`;dialog.querySelector('[data-photo-prev]').disabled=current===0;dialog.querySelector('[data-photo-next]').disabled=current===items.length-1;}
 document.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>{opener=button;show(available().indexOf(button));dialog.showModal();}));
 dialog?.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
 dialog?.querySelector('[data-photo-prev]').addEventListener('click',()=>show(current-1));
 dialog?.querySelector('[data-photo-next]').addEventListener('click',()=>show(current+1));
 dialog?.addEventListener('close',()=>opener?.focus());
 dialog?.addEventListener('click',e=>{if(e.target===dialog){const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)dialog.close();}});
 dialog?.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();show(current+(e.key==='ArrowLeft'?-1:1));}});
 let startX=null;dialog?.addEventListener('touchstart',e=>{startX=e.changedTouches[0].clientX;},{passive:true});dialog?.addEventListener('touchend',e=>{if(startX===null)return;const delta=e.changedTouches[0].clientX-startX;if(Math.abs(delta)>50)show(current+(delta>0?-1:1));startX=null;},{passive:true});
})();
