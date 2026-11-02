document.querySelectorAll('[data-mission-carousel]').forEach(root=>{
 const track=root.querySelector('[data-mission-track]'),slides=[...track.children],controls=root.querySelector('[data-mission-controls]'),status=root.querySelector('[data-mission-status]');
 if(slides.length<2)return;
 controls.hidden=false;let current=0;
 const update=()=>{const width=track.clientWidth;if(!width)return;current=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/width)));status.textContent=`${String(current+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;root.dataset.active=String(current);};
 const go=index=>{const target=(index+slides.length)%slides.length,wrap=index<0||index>=slides.length;track.scrollTo({left:target*track.clientWidth,behavior:wrap||matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});};
 root.querySelectorAll('[data-mission-step]').forEach(button=>button.addEventListener('click',()=>go(current+Number(button.dataset.missionStep))));
 track.addEventListener('scroll',update,{passive:true});
 track.addEventListener('keydown',event=>{if(event.target!==track)return;const actions={ArrowLeft:current-1,ArrowRight:current+1,Home:0,End:slides.length-1};if(event.key in actions){event.preventDefault();go(actions[event.key]);}});
 new ResizeObserver(()=>{track.scrollLeft=current*track.clientWidth;update();}).observe(track);
 update();
});
