import {ministryDirections} from './ministry-directions.mjs';
import {esc,url} from './components.mjs';
import {photoApproved,photoExcluded} from './parish-photos.mjs';
import {approvedAccount,publishable} from './publication.mjs';

export function createHomeLayout({C,P,Chronicle,mission,photos,support,editor=false}) {
 const t=(v,l)=>esc(v[l]);
 // Distinct visual roles: buildings in hero, community in mission, prayer in carousel.
 const socialPhotos=['chronicle-parish-summer-camp','chronicle-outdoor-creative-workshop','chronicle-families-support'];
 const fallbackPhotos=['parish-community-children','parish-prayer-on-church-steps','pastor-parish-work'];
 const eligible=(p,l)=>p&&!photoExcluded(p)&&(photoApproved(p)||(editor&&p.publication_status==='pending_approval'))&&(!p.publication_languages||p.publication_languages.includes(l));
 function MissionPhotos(l){
  const pick=ids=>ids.map(id=>photos.find(p=>p.id===id)).filter(p=>eligible(p,l));
  const social=pick(socialPhotos),chosen=(social.length?social:pick(fallbackPhotos)).slice(0,3),uk=l==='uk';
  return `<div class="mission-photo-composition" data-mission-composition><h3 id="mission-photo-heading" class="eyebrow">${uk?'Спільнота в дії':'Our Community in Action'}</h3><div class="mission-photo-grid" aria-labelledby="mission-photo-heading">${chosen.map(p=>C.PhotoFigure(p,l,false).replace('<figure ',`<figure data-mission-photo="${p.id}" `).replace(/<figcaption>[\s\S]*?<\/figcaption>/,`<figcaption><strong>${t(p.title,l)}</strong></figcaption>`)).join('')}</div></div>`;
 }
 function Mission(l) {
  return `<section class="section wrap mission-home mission-composition" data-community-mission aria-labelledby="mission-title"><div class="mission-heading"><p class="eyebrow">${l==='uk'?'Віра, що діє через любов':'Faith working through love'}</p><h2 id="mission-title">${t(mission.title,l)}</h2><p class="lead">${t(mission.lead,l)}</p><p>${t(mission.home_summary,l)}</p><div class="actions"><a class="text-link" href="${url(l,'community-impact')}">${l==='uk'?'Наш вплив на громаду':'Our Community Impact'} ↗</a></div></div>${MissionPhotos(l)}</section>`;
 }
 function Support(l) {
  const a=support.accounts.find(a=>publishable(a)&&approvedAccount(a));if(!a)return '';
  const uk=l==='uk';
  return `<section class="section home-support" data-home-support aria-labelledby="home-support-title"><div class="wrap home-support-grid"><div><p class="eyebrow">${uk?'Офіційна інформація':'Official information'}</p><h2 id="home-support-title">${uk?'Підтримка парафії':'Supporting Our Parish'}</h2><p>${uk?'Добровільна підтримка допомагає нашій спільноті продовжувати служіння. Офіційні реквізити та банківська довідка доступні для ознайомлення.':'Voluntary support helps our community continue its ministry. Official account details and the bank certificate are available for review.'}</p><a class="text-link" href="${url(l,'support')}#bank-details">${uk?'Усі реквізити та документи':'Full details and documents'} ↗</a></div><div class="home-bank-card" data-official-account><dl><div><dt>${uk?'Отримувач':'Recipient'}</dt><dd>${esc(a.recipient)}</dd></div><div><dt>IBAN · ${esc(a.currency)}</dt><dd class="home-iban">${esc(a.iban)}</dd></div></dl><dl class="home-bank-meta"><div><dt>${uk?'ЄДРПОУ':'Organisation code'}</dt><dd>${esc(a.edrpou)}</dd></div><div><dt>${uk?'Банк':'Bank'}</dt><dd>${esc(uk?a.bank:a.bank_en)}</dd></div></dl><button class="text-link" data-copy-text="${esc(a.iban)}" data-copied-label="${uk?'Скопійовано':'Copied'}">${uk?'Копіювати IBAN':'Copy IBAN'}</button><span class="copy-status" role="status" aria-live="polite"></span></div></div></section>`;
 }
 function Home(l){return C.Hero(l)+Mission(l)+Chronicle.Carousel(l)+ministryDirections(mission,l,{home:true})+P.HistoryTeaser(l)+C.Map(l,{home:true})+Support(l);}
 return {Home};
}
