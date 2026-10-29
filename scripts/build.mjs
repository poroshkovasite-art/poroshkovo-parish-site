import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createComponents,esc,url} from './components.mjs';
import {validateContent} from './validate-content.mjs';
import {createPortal} from './portal.mjs';
import {parseDate,confirmed} from '../assets/calendar-core.js';
import {createSections,sectionSlugs} from './sections.mjs';
import {approvedDocument} from './publication.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,'content',f+'.json'),'utf8'));
const site=read('site'),pages=read('pages'),ui=read('ui'),sources=read('sources'),photos=read('photos'),people=read('people'),schedule=read('schedule'),news=read('news'),history=read('history');
const brand=read('brand');
const verificationMeta=site.google_site_verification?`<meta name="google-site-verification" content="${esc(site.google_site_verification)}">`:'';
const calendarIndex=read('calendar/index'),calendar={index:calendarIndex,years:Object.fromEntries(calendarIndex.available_years.map(year=>[year,Object.fromEntries(['church','eparchy','parish'].map(group=>[group,read(`calendar/${year}/${group}`)]))]))};
for(const [year,groups] of Object.entries(calendar.years))for(const [tab,group] of Object.entries(groups)){
 if(group.year!==Number(year))throw Error('Calendar file year mismatch');
 for(const event of group.events){if(!confirmed(event)||!parseDate(event.date)||!parseDate(event.end_date||event.date)||(event.end_date||event.date)<event.date||!event.title.uk||!event.title.en)throw Error('Invalid or unverified calendar record: '+event.id);if(Number(event.date.slice(0,4))!==Number(year))throw Error('Calendar date in wrong year');}
}
const iconVersion=createHash('sha256').update(fs.readFileSync(path.join(root,'assets/favicon.ico'))).digest('hex').slice(0,12);
function iconLinks(lang){return `<link rel="icon" href="/favicon.ico?v=${iconVersion}" sizes="16x16 32x32 48x48"><link rel="icon" href="/assets/favicon-32x32.png?v=${iconVersion}" type="image/png" sizes="32x32"><link rel="icon" href="/assets/favicon-16x16.png?v=${iconVersion}" type="image/png" sizes="16x16"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=${iconVersion}" sizes="180x180"><link rel="manifest" href="/${lang}/site.webmanifest?v=${iconVersion}">`;}
const production=process.argv.includes('--production');
const editor=process.argv.includes('--editor');
if(editor&&production)throw Error('Editor preview cannot be a production build.');
if(production&&(!site.production_url||!site.publication_approved))throw Error('Production requires a confirmed independent production_url and publication_approved=true.');
const base=site.production_url||'http://localhost:4173';
if(site.production_url&&!/^https:\/\//.test(base))throw Error('Production URL must use HTTPS.');
if(/isf-center-website|nau-website/i.test(base))throw Error('Reference infrastructure must not be used.');
const approvedNews=news.filter(n=>n.verification_status==='confirmed');
pages.news.published=approvedNews.length>0;
pages.gallery.published=photos.some(p=>p.publication_status==='approved'&&p.rights_confirmed);
pages.support.published=site.donations.verification_status==='confirmed'&&Boolean(site.donations.iban);
for(const slug of ['news','gallery','support'])if(pages[slug].published&&(!pages[slug].description||!pages[slug].intro))throw Error(`Complete bilingual metadata and intro for ${slug} before enabling it.`);
validateContent({site,pages,photos,news,schedule});
const C=createComponents({site,pages,ui,sources,photos,people,schedule,brand});
const P=createPortal({C,site,photos,calendar,resources:read('resources'),stories:read('history-stories')});
const S=createSections({models:Object.fromEntries(sectionSlugs.map(s=>[s,read(s)])),C,root,editor});
for(const slug of sectionSlugs)pages[slug].published=editor||S.visible(slug);
const out=path.join(root,editor?'dist-editor':'dist');
if(fs.existsSync(out)&&fs.lstatSync(out).isSymbolicLink())throw Error('dist must not be a symbolic link');
fs.mkdirSync(out,{recursive:true});
// Delete stale generated files only inside the verified project output directory.
for(const entry of fs.readdirSync(out))fs.rmSync(path.join(out,entry),{recursive:true,force:true});
fs.cpSync(path.join(root,'public'),out,{recursive:true,filter:src=>path.basename(src)!=='.gitkeep'});
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
for(const record of S.models.documents.records)if(approvedDocument(record,root)){fs.mkdirSync(path.join(out,'documents'),{recursive:true});fs.copyFileSync(path.join(root,'approved-documents',path.basename(record.public_file)),path.join(out,record.public_file));}
const write=(f,s)=>{const dest=path.join(out,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,s);};
function timeline(lang) {const t=ui[lang],cats=lang==='uk'?{all:'Усі теми',village:'Історія села',church:'Історія Церкви',parish:'Історія парафії'}:{all:'All themes',village:'Village history',church:'Church history',parish:'Parish history'};return `<section class="timeline-section"><div class="section-top"><h2>${t.history}</h2><p class="timeline-count" aria-live="polite"><span data-timeline-count>${history.length}</span> ${t.results}</p></div><div class="filters timeline-categories" role="group" aria-label="${lang==='uk'?'Теми історії':'History themes'}">${Object.entries(cats).map(([id,label])=>`<button data-history-category="${id}" aria-pressed="${id==='all'}">${label}</button>`).join('')}</div><div class="filters" role="group" aria-label="${t.timeline}">${[['all',t.all],['roots',t.roots],['renewal',t.renewal],['church',t.church],['home',t.house]].map(([v,label])=>`<button data-era="${v}" aria-pressed="${v==='all'}">${label}</button>`).join('')}</div><ol class="timeline">${history.map(h=>`<li data-timeline-item data-era-item="${h.era}" data-history-topic="${h.category}"><time${h.datetime?` datetime="${h.datetime}"`:''}>${esc(lang==='en'?(h.date_en||h.date):h.date)}</time><div><span class="timeline-category">${cats[h.category]}</span><p>${esc(h[lang])}</p><a class="source-link" href="${esc(h.source_url)}">${t.source} ↗</a></div></li>`).join('')}</ol><p class="source-note">${t.timelineNote}</p>${C.source('eparchy',lang)}</section>`;}
function home(lang) {return C.Hero(lang)+sectionSlugs.filter(s=>!['documents','first-visit'].includes(s)&&S.visible(s)).map(s=>`<section class="section wrap">${S.teaser(s,lang)}</section>`).join('')+P.HistoryTeaser(lang)+`<section class="section wrap">${C.Schedule(lang)}${S.teaser('first-visit',lang)}</section>`+P.HomePhotos(lang)+P.MiniCalendar(lang)+P.SpiritualPreview(lang)+P.CommunityPreview(lang)+C.Carousel(lang)+P.GalleryPreview(lang)+P.ResourcePreview(lang)+P.Visit(lang);}
function content(lang,slug) {
 if(slug==='home')return home(lang);
 if(sectionSlugs.includes(slug))return C.PageHeading(lang,slug)+S.render(slug,lang);
 if(slug==='calendar')return C.PageHeading(lang,slug)+P.Calendar(lang);
 if(slug==='resources')return C.PageHeading(lang,slug)+`<section class="section wrap">${P.Resources(lang)}<p class="source-note">${lang==='uk'?'Посилання перевірено 29.10.2026. Зовнішні сайти відкриваються в новій вкладці та мають власні правила приватності.':'Links checked on 29 October 2026. External websites open in a new tab and have their own privacy policies.'}</p></section>`;
 if(slug==='privacy')return `<section class="page-heading wrap narrow"><h1>${ui[lang].privacy}</h1><p>${ui[lang].privacyText}</p></section>`;
 return C.PageHeading(lang,slug)+`<section class="section wrap">${slug==='history'?P.Stories(lang):''}${slug==='services'?C.Schedule(lang):''}${slug==='history'?'':C.Blocks(lang,slug)}${slug==='history'?'':C.PagePhotos(lang,slug)}${slug==='about'?C.TeamCard(lang)+S.teaser('documents',lang):''}${slug==='history'?timeline(lang):''}${slug==='spiritual-life'?C.Patrons(lang):''}${slug==='contacts'?C.Map(lang):''}${slug==='gallery'?C.Gallery(lang):''}${slug==='news'?`<div class="card-grid">${approvedNews.map(n=>C.EventCard(n,lang)).join('')}</div>`:''}${slug==='support'?`<div class="contact-note"><h2>${esc(site.donations.recipient)}</h2><p><strong>IBAN</strong> ${esc(site.donations.iban)}</p></div>`:''}<aside class="source-note"><h2>${ui[lang].sources}</h2><p>${ui[lang].checked}</p>${slug==='gallery'?`<p>${lang==='uk'?'Фотографії надані для сайту парафії.':'Photographs provided for the parish website.'}</p>`:C.source('eparchy',lang)}</aside></section>`;
}
function shell(lang,slug,body,article=null) {
 const t=ui[lang],other=lang==='uk'?'en':'uk',p=pages[slug]||{},title=(slug==='404'?t.notFound:article?.title[lang]||p.title?.[lang]||t.privacy)+' | '+t.shortName+' · '+(lang==='uk'?'Порошково':'Poroshkovo'),description=slug==='404'?t.notFound:article?.summary[lang]||p.description?.[lang]||t.privacyText;
 const route=url(lang,article?'news/'+article.slug:slug), counterpart=url(other,article?'news/'+article.slug:slug);
 const noindex=!production||slug==='404';
 return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#713f46"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${noindex?'noindex, nofollow':'index, follow'}"><link rel="canonical" href="${base}${route}"><link rel="alternate" hreflang="uk" href="${base}${lang==='uk'?route:counterpart}"><link rel="alternate" hreflang="en" href="${base}${lang==='en'?route:counterpart}"><link rel="alternate" hreflang="x-default" href="${base}${lang==='uk'?route:counterpart}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${article?'article':'website'}"><meta property="og:url" content="${base}${route}"><meta property="og:locale" content="${lang==='uk'?'uk_UA':'en_GB'}"><meta property="og:site_name" content="${esc(site.name[lang])}"><meta property="og:image" content="${base}/assets/og-card.png"><meta property="og:image:alt" content="${esc(site.name[lang])}"><meta name="twitter:card" content="summary_large_image">${verificationMeta}${iconLinks(lang)}<link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/portal.css"><script defer src="/assets/app.js"></script>${["home","calendar"].includes(slug)?'<script type="module" src="/assets/calendar.js"></script>':''}</head><body id="top">${!production?`<div class="preview-label">${t.localPreview}</div>`:''}${C.Header(lang,slug)}<main id="main">${body}</main>${C.Footer(lang,slug)}${C.Lightbox(lang)}</body></html>`;
}
const routes=[];
for(const lang of ['uk','en']) {
 write(`${lang}/site.webmanifest`,JSON.stringify({name:site.name[lang],short_name:lang==='uk'?'Порошково':'Poroshkovo',id:`/${lang}/`,lang,start_url:`/${lang}/`,scope:'/',display:'standalone',background_color:'#f7f4ed',theme_color:'#713f46',icons:[192,512].map(size=>({src:`/assets/icon-${size}.png?v=${iconVersion}`,sizes:`${size}x${size}`,type:'image/png',purpose:'any'}))},null,2));
 for(const slug of [...Object.keys(pages).filter(s=>pages[s].published),'privacy']) {const route=url(lang,slug);write(route.slice(1)+'index.html',shell(lang,slug,content(lang,slug)));routes.push(route);}
 for(const n of approvedNews) {const route=url(lang,'news/'+n.slug);write(route.slice(1)+'index.html',shell(lang,'news',`<article class="wrap narrow section"><time datetime="${esc(n.date)}">${esc(n.date)}</time><h1>${esc(n.title[lang])}</h1>${n.body[lang].map(p=>`<p>${esc(p)}</p>`).join('')}<a href="${esc(n.source_url)}">${ui[lang].source} ↗</a></article>`,n));routes.push(route);}
}
write('index.html','<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=/uk/"><title>Порошково · Парафія святих Кирила і Мефодія</title>'+verificationMeta+iconLinks('uk')+'</head><body><a href="/uk/">Українська</a> · <a href="/en/">English</a></body></html>');
write('404.html',shell('uk','home',`<section class="page-heading wrap narrow"><h1>${ui.uk.notFound}</h1><a class="button" href="/uk/">${ui.uk.backHome}</a></section>`).replace(/<title>[^<]+<\/title>/,`<title>${ui.uk.notFound} | Порошково</title>`).replace('content="index, follow"','content="noindex, nofollow"'));
write('robots.txt',production?`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(r=>`<url><loc>${base}${r}</loc></url>`).join('')}</urlset>`);
write('_headers','/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src \'self\'; img-src \'self\' data:; style-src \'self\'; script-src \'self\'; font-src \'self\'; frame-src https://www.google.com; object-src \'none\'; base-uri \'self\'; form-action \'none\'; frame-ancestors \'none\'\n');
write('routes.json',JSON.stringify(routes,null,2));
console.log(`Built ${routes.length} bilingual content pages. Mode: ${production?'production':'local preview, noindex'}. Assets: independent; approved parish photos: ${photos.filter(p=>p.publication_status==='approved').length}.`);
