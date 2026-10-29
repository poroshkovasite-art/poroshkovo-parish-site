import {parseDate,iso,addDays,shiftMonth,monday,periodDays,kyivToday,occurs,confirmed,makeICS,regularServices,annualParishEvents} from './calendar-core.js';
import {calendarLabels} from './calendar-labels.js';
const el=document.querySelector('#calendar-data');
if(el){
 const data=JSON.parse(el.textContent),lang=document.documentElement.lang==='en'?'en':'uk',t=calendarLabels[lang],locale=lang==='uk'?'uk-UA':'en-GB';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text=value=>escape(value?.[lang]??value??'');
 const dateLabel=(date,options={day:'numeric',month:'long',year:'numeric'})=>new Intl.DateTimeFormat(locale,{...options,timeZone:'UTC'}).format(parseDate(date));
 const records=Object.entries(data.years).flatMap(([year,groups])=>Object.entries(groups).flatMap(([tab,group])=>group.events.filter(confirmed).map(e=>({...e,tab}))));
 const regularSchedule=data.regular_schedule;
 const forYear=year=>[...new Map([...records,...annualParishEvents(regularSchedule,year)].map(e=>[e.id,e])).values()];
 function card(e,detail=false){const date=e.date===e.end_date||!e.end_date?dateLabel(e.date):`${dateLabel(e.date)} – ${dateLabel(e.end_date)}`;return `<article class="calendar-event" data-event-id="${escape(e.id)}"><time datetime="${e.date}">${escape(date)}</time><div class="event-category">${t[e.category]||t[e.tab]}</div>${e.recurrence==='annual'?`<p class="calendar-status">${lang==='uk'?'Щороку · місцева парафіяльна традиція':'Annual local parish tradition'}</p>`:''}<${detail?'h4':'h3'}>${text(e.title)}</${detail?'h4':'h3'}>${e.description?`<p>${text(e.description)}</p>`:''}${e.tab!=='church'?`<p>${e.location?`${t.location}: ${text(e.location)}`:t.locationUnknown}</p>`:''}${detail&&e.tab==='church'?`<dl>${e.saints?`<dt>${t.saints}</dt><dd>${text(e.saints)}</dd>`:''}${e.liturgical?`<dt>${t.liturgical}</dt><dd>${text(e.liturgical)}</dd>`:''}<dt>${t.fasting}</dt><dd>${e.fasting?text(e.fasting):t.fastUnknown}</dd>${e.readings?`<dt>${t.apostle}</dt><dd>${text(e.readings.apostle)}</dd><dt>${t.gospel}</dt><dd>${text(e.readings.gospel)}</dd><dd class="reading-source">${text(e.readings.context)}</dd>`:''}</dl>${e.readings?`<a class="reading-source" href="https://www.bible.com/uk" target="_blank" rel="noopener noreferrer">${t.read}</a>`:''}`:''}<a class="source-link" href="${escape(e.source_url)}" target="_blank" rel="noopener noreferrer">${t.source} ↗</a><p class="calendar-status">${t.checked}: ${e.verified_on} · ${e.year}</p>${detail?`<button data-export-event="${escape(e.id)}">${t.download}</button>`:`<a class="text-link" href="/${lang}/calendar/?date=${e.date}&tab=${e.tab}">${t.open} ↗</a>`}</article>`;}
 const mini=document.querySelector('[data-mini-calendar]');
 if(mini){const today=kyivToday();mini.querySelector('[data-mini-today]').textContent=dateLabel(today,{weekday:'long',day:'numeric',month:'long',year:'numeric'});mini.querySelector('[data-mini-today]').dateTime=today;const next=[...new Map([...forYear(Number(today.slice(0,4))),...annualParishEvents(regularSchedule,Number(today.slice(0,4))+1)].map(e=>[e.id,e])).values()].filter(e=>(e.end_date||e.date)>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);mini.querySelector('[data-mini-events]').innerHTML=next.length?next.map(e=>card(e)).join(''):`<p>${data.index.available_years.includes(Number(today.slice(0,4)))?t.noEvents:t.noYear}</p>`;}
 const planner=document.querySelector('[data-calendar]');
 if(planner){
  const q=new URLSearchParams(location.search),today=kyivToday();
  let selected=parseDate(q.get('date'))?q.get('date'):today,view=q.get('view')==='week'?'week':'month',tab=['church','eparchy','parish'].includes(q.get('tab'))?q.get('tab'):'church',category=q.get('category')||'all';
  const dateInput=planner.querySelector('[data-calendar-date]'),select=planner.querySelector('[data-calendar-category]'),grid=planner.querySelector('[data-calendar-grid]'),details=planner.querySelector('[data-calendar-details]');
  const langLinks=[...document.querySelectorAll('.language,.footer a[lang]')];
  const candidates=()=>forYear(Number(selected.slice(0,4))).filter(e=>e.tab===tab&&(category==='all'||e.category===category));
  const source=()=>data.index.sources[tab]||null;
  const notice=(message)=>`<p>${escape(message)}${source()?` <a href="${source()}" target="_blank" rel="noopener noreferrer">${t.source} ↗</a>`:''}</p>`;
  function refreshCategories(){const categories=[...new Set([...forYear(Number(selected.slice(0,4))).filter(e=>e.tab===tab).map(e=>e.category),...(tab==='parish'?(regularSchedule?.services||[]).map(s=>s.category):[])])];if(category!=='all'&&!categories.includes(category))category='all';select.innerHTML=`<option value="all">${t.all}</option>`+categories.map(c=>`<option value="${escape(c)}">${escape(t[c]||c)}</option>`).join('');select.value=category;}
  function syncURL(){const query=new URLSearchParams({date:selected,tab,view});if(category!=='all')query.set('category',category);history.replaceState(null,'','?'+query.toString());langLinks.forEach(a=>{const target=new URL(a.href,location.origin);if(target.pathname.endsWith('/calendar/'))a.search=query.toString();});}
  function animate(node){node.classList.remove('fade-in');requestAnimationFrame(()=>node.classList.add('fade-in'));}
  function render({focusDate=null}={}){
   const year=Number(selected.slice(0,4)),available=tab==='parish'?regularSchedule?.verification_status==='confirmed'&&selected>=regularSchedule.valid_from:data.index.available_years.includes(year),events=candidates(),days=periodDays(selected,view);
   planner.querySelector('[data-calendar-title]').textContent=view==='month'?dateLabel(selected,{month:'long',year:'numeric'}):`${dateLabel(days[0],{day:'numeric',month:'short'})} – ${dateLabel(days.at(-1),{day:'numeric',month:'short',year:'numeric'})}`;
   dateInput.value=selected;
   planner.querySelectorAll('[data-calendar-tab]').forEach(b=>{const active=b.dataset.calendarTab===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
   planner.querySelector('#calendar-panel').setAttribute('aria-labelledby','tab-'+tab);
   planner.querySelectorAll('[data-calendar-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.calendarView===view)));
   planner.querySelector('[data-calendar-notice]').innerHTML=notice(!available?(tab==='parish'?t.regularBeforeStart:t.noYear):tab==='parish'?t.regularNotice:data.index.coverage[lang]);
   grid.innerHTML=t.days.map(d=>`<div class="weekday" aria-hidden="true">${d}</div>`).join('')+days.map(date=>{
    const regular=tab==='parish'?regularServices(regularSchedule,date).filter(s=>category==='all'||s.category===category):[];const dayEvents=events.filter(e=>occurs(e,date)),fast=dayEvents.some(e=>e.fasting),feast=dayEvents.some(e=>e.tab==='church'),activity=dayEvents.some(e=>e.tab!=='church');
    const label=dateLabel(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+(dayEvents.length?': '+dayEvents.map(e=>e.title[lang]).join('; '):'')+(regular.length?': '+regular.map(s=>(s.time?s.time+' ':'')+s.name[lang]).join('; '):'');
    return `<button class="calendar-day${date.slice(0,7)!==selected.slice(0,7)?' outside':''}${date===today?' is-today':''}" data-calendar-day="${date}" aria-label="${escape(label)}" aria-pressed="${date===selected}" ${date===today?'aria-current="date"':''} tabindex="${date===selected?0:-1}"><span class="day-number">${Number(date.slice(-2))}</span><span class="day-marks" aria-hidden="true">${feast?'<i></i>':''}${fast?'<i class="fast-mark"></i>':''}${activity?'<i class="event-mark"></i>':''}${regular.length?'<i class="regular-mark"></i>':''}</span>${dayEvents.length?`<span class="day-title" aria-hidden="true">${text(dayEvents[0].title)}</span>`:regular.length?`<span class="day-title" aria-hidden="true">${escape((regular.find(s=>s.category==='liturgy')||regular[0]).time||'')} ${text((regular.find(s=>s.category==='liturgy')||regular[0]).name)}</span>`:''}</button>`;
   }).join('');
   const dayEvents=events.filter(e=>occurs(e,selected)),regular=tab==='parish'?regularServices(regularSchedule,selected).filter(s=>category==='all'||s.category===category):[];
   planner.querySelector('[data-calendar-regular]').hidden=tab!=='parish';
   details.innerHTML=`<p class="eyebrow">${t.day}</p><h3>${escape(dateLabel(selected,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</h3>${dayEvents.length?dayEvents.map(e=>card(e,true)).join(''):regular.length?'':`<div class="empty-state">${notice(!available?(tab==='parish'?t.regularBeforeStart:t.noYear):tab==='parish'?t.noParish:t.noDay)}</div>`}`;
   if(regular.length)details.insertAdjacentHTML('beforeend',`<section class="daily-services" data-regular-services><h4>${t.regularHeading}</h4><p class="schedule-zone">${t.kyivTime}</p>${regular.map(s=>`<p>${s.time?`<time datetime="${s.time}">${s.time}</time>`:''} ${text(s.name)}</p>`).join('')}</section>`);
   const upcoming=events.filter(e=>(e.end_date||e.date)>=selected&&e.year===year).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);
   planner.querySelector('[data-calendar-upcoming]').innerHTML=upcoming.length?`<div class="upcoming-grid">${upcoming.map(e=>card(e)).join('')}</div>`:notice(!available?(tab==='parish'?t.regularBeforeStart:t.noYear):tab==='parish'?t.noParish:t.noEvents);
   const undated=tab==='parish'?(regularSchedule?.undated_practices||[]):data.years[year]?.[tab]?.undated||[];
   planner.querySelector('[data-calendar-undated]').innerHTML=undated.length?`<section class="calendar-undated"><h3>${t.undated}</h3><p>${t.undatedNote}</p>${undated.map(e=>`<p><strong>${text(e.period)}</strong> · ${text(e.title)} <a href="${escape(e.source_url)}" target="_blank" rel="noopener noreferrer">${t.source} ↗</a></p>`).join('')}</section>`:'';
   syncURL();animate(details);if(focusDate)grid.querySelector(`[data-calendar-day="${focusDate}"]`)?.focus({preventScroll:true});
  }
  function choose(date,focus=false){if(!parseDate(date)||date<'1900-01-01'||date>'2199-12-31')return;selected=date;render({focusDate:focus?date:null});}
  planner.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
   if(button.dataset.calendarDay)choose(button.dataset.calendarDay);
   else if(button.dataset.calendarStep)choose(view==='week'?addDays(selected,Number(button.dataset.calendarStep)*7):shiftMonth(selected,Number(button.dataset.calendarStep)));
   else if(button.hasAttribute('data-calendar-today'))choose(today);
   else if(button.dataset.calendarView){view=button.dataset.calendarView;render();}
   else if(button.dataset.calendarTab){tab=button.dataset.calendarTab;category='all';refreshCategories();render();}
   else if(button.dataset.exportEvent){const e=forYear(Number(selected.slice(0,4))).find(e=>e.id===button.dataset.exportEvent);if(!e)return;const blob=new Blob([makeICS(e,lang)],{type:'text/calendar;charset=utf-8'}),address=URL.createObjectURL(blob),a=document.createElement('a');a.href=address;a.download=e.id+'.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(address),1000);}
  });
  dateInput.addEventListener('change',()=>{if(parseDate(dateInput.value)){dateInput.setCustomValidity('');choose(dateInput.value);}else dateInput.setCustomValidity(t.invalid);});
  select.addEventListener('change',()=>{category=select.value;render();});
  planner.querySelector('[role=tablist]').addEventListener('keydown',e=>{const tabs=[...planner.querySelectorAll('[role=tab]')],i=tabs.indexOf(document.activeElement);if(i<0)return;let next;if(e.key==='ArrowRight')next=(i+1)%3;if(e.key==='ArrowLeft')next=(i+2)%3;if(e.key==='Home')next=0;if(e.key==='End')next=2;if(next!==undefined){e.preventDefault();tabs[next].click();tabs[next].focus();}});
  grid.addEventListener('keydown',e=>{const date=e.target.dataset.calendarDay;if(!date)return;let next;const moves={ArrowRight:1,ArrowLeft:-1,ArrowDown:7,ArrowUp:-7};if(e.key in moves)next=addDays(date,moves[e.key]);if(e.key==='Home')next=monday(date);if(e.key==='End')next=addDays(monday(date),6);if(e.key==='PageUp')next=shiftMonth(date,-1);if(e.key==='PageDown')next=shiftMonth(date,1);if(next){e.preventDefault();choose(next,true);}});
  window.addEventListener('popstate',()=>{const query=new URLSearchParams(location.search);selected=parseDate(query.get('date'))?query.get('date'):today;tab=['church','eparchy','parish'].includes(query.get('tab'))?query.get('tab'):'church';view=query.get('view')==='week'?'week':'month';category=query.get('category')||'all';refreshCategories();render();});
  refreshCategories();render();
 }
}
