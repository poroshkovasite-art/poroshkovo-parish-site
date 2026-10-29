import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createComponents,esc,url} from './components.mjs';
import {validateContent} from './validate-content.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,'content',f+'.json'),'utf8'));
const site=read('site'),pages=read('pages'),ui=read('ui'),sources=read('sources'),photos=read('photos'),people=read('people'),schedule=read('schedule'),news=read('news'),history=read('history');
const production=process.argv.includes('--production');
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
const C=createComponents({site,pages,ui,sources,photos,people,schedule});
const out=path.join(root,'dist');
if(fs.existsSync(out)&&fs.lstatSync(out).isSymbolicLink())throw Error('dist must not be a symbolic link');
fs.mkdirSync(out,{recursive:true});
// Delete stale generated files only inside the verified project output directory.
for(const entry of fs.readdirSync(out))fs.rmSync(path.join(out,entry),{recursive:true,force:true});
fs.cpSync(path.join(root,'public'),out,{recursive:true,filter:src=>path.basename(src)!=='.gitkeep'});
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
const write=(f,s)=>{const dest=path.join(out,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,s);};
function timeline(lang) {const t=ui[lang];return `<section class="timeline-section"><div class="section-top"><h2>${t.history}</h2><p class="timeline-count" aria-live="polite"><span data-timeline-count>${history.length}</span> ${t.results}</p></div><div class="filters" role="group" aria-label="${t.timeline}">${[['all',t.all],['roots',t.roots],['renewal',t.renewal],['church',t.church],['home',t.house]].map(([v,label])=>`<button data-era="${v}" aria-pressed="${v==='all'}">${label}</button>`).join('')}</div><ol class="timeline">${history.map(h=>`<li data-timeline-item data-era-item="${h.era}"><time${h.datetime?` datetime="${h.datetime}"`:''}>${esc(lang==='en'?(h.date_en||h.date):h.date)}</time><p>${esc(h[lang])}</p></li>`).join('')}</ol><p class="source-note">${t.timelineNote}</p>${C.source('eparchy',lang)}</section>`;}
function home(lang) {const t=ui[lang];return C.Hero(lang)+`<section class="section"><div class="wrap">${C.Schedule(lang)}</div></section><section class="section section-tinted"><div class="wrap history-preview"><div><p class="eyebrow">1751 — 2015</p><h2>${t.history}</h2><p>${t.historyIntro}</p>${C.link(lang,'history',t.allHistory+' ↗','text-link')}</div><ol>${history.filter(h=>['15.04.2002','18.07.2009','18.07.2015'].includes(h.date)).map(h=>`<li><time datetime="${h.datetime}">${h.date}</time><p>${esc(h[lang])}</p></li>`).join('')}</ol></div></section>`+C.Carousel(lang)+`<section class="section section-tinted"><div class="wrap">${C.Patrons(lang)}</div></section>`+(approvedNews.length?`<section class="section wrap"><h2>${pages.news.title[lang]}</h2>${approvedNews.map(n=>C.EventCard(n,lang)).join('')}</section>`:'')+C.CTA(lang);}
function content(lang,slug) {
 if(slug==='home')return home(lang);
 if(slug==='privacy')return `<section class="page-heading wrap narrow"><h1>${ui[lang].privacy}</h1><p>${ui[lang].privacyText}</p></section>`;
 return C.PageHeading(lang,slug)+`<section class="section wrap">${slug==='services'?C.Schedule(lang):''}${C.Blocks(lang,slug)}${slug==='about'?C.TeamCard(lang):''}${slug==='history'?timeline(lang):''}${slug==='spiritual-life'?C.Patrons(lang):''}${slug==='contacts'?C.Map(lang):''}${slug==='gallery'?C.Gallery(lang):''}${slug==='news'?`<div class="card-grid">${approvedNews.map(n=>C.EventCard(n,lang)).join('')}</div>`:''}${slug==='support'?`<div class="contact-note"><h2>${esc(site.donations.recipient)}</h2><p><strong>IBAN</strong> ${esc(site.donations.iban)}</p></div>`:''}<aside class="source-note"><h2>${ui[lang].sources}</h2><p>${ui[lang].checked}</p>${C.source('eparchy',lang)}</aside></section>`;
}
function shell(lang,slug,body,article=null) {
 const t=ui[lang],other=lang==='uk'?'en':'uk',p=pages[slug]||{},title=(slug==='404'?t.notFound:article?.title[lang]||p.title?.[lang]||t.privacy)+' | '+t.shortName+' · '+(lang==='uk'?'Порошково':'Poroshkovo'),description=slug==='404'?t.notFound:article?.summary[lang]||p.description?.[lang]||t.privacyText;
 const route=url(lang,article?'news/'+article.slug:slug), counterpart=url(other,article?'news/'+article.slug:slug);
 const noindex=!production||slug==='404';
 return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#713f46"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${noindex?'noindex, nofollow':'index, follow'}"><link rel="canonical" href="${base}${route}"><link rel="alternate" hreflang="uk" href="${base}${lang==='uk'?route:counterpart}"><link rel="alternate" hreflang="en" href="${base}${lang==='en'?route:counterpart}"><link rel="alternate" hreflang="x-default" href="${base}${lang==='uk'?route:counterpart}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${article?'article':'website'}"><meta property="og:url" content="${base}${route}"><meta property="og:locale" content="${lang==='uk'?'uk_UA':'en_GB'}"><meta property="og:site_name" content="${esc(site.name[lang])}"><meta property="og:image" content="${base}/assets/og-card.png"><meta property="og:image:alt" content="${esc(site.name[lang])}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/site.css"><script defer src="/assets/app.js"></script></head><body id="top">${!production?`<div class="preview-label">${t.localPreview}</div>`:''}${C.Header(lang,slug)}<main id="main">${body}</main>${C.Footer(lang)}${C.Lightbox(lang)}</body></html>`;
}
const routes=[];
for(const lang of ['uk','en']) {
 for(const slug of [...Object.keys(pages).filter(s=>pages[s].published),'privacy']) {const route=url(lang,slug);write(route.slice(1)+'index.html',shell(lang,slug,content(lang,slug)));routes.push(route);}
 for(const n of approvedNews) {const route=url(lang,'news/'+n.slug);write(route.slice(1)+'index.html',shell(lang,'news',`<article class="wrap narrow section"><time datetime="${esc(n.date)}">${esc(n.date)}</time><h1>${esc(n.title[lang])}</h1>${n.body[lang].map(p=>`<p>${esc(p)}</p>`).join('')}<a href="${esc(n.source_url)}">${ui[lang].source} ↗</a></article>`,n));routes.push(route);}
}
write('index.html','<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=/uk/"><title>Порошково · Парафія святих Кирила і Мефодія</title></head><body><a href="/uk/">Українська</a> · <a href="/en/">English</a></body></html>');
write('404.html',shell('uk','home',`<section class="page-heading wrap narrow"><h1>${ui.uk.notFound}</h1><a class="button" href="/uk/">${ui.uk.backHome}</a></section>`).replace(/<title>[^<]+<\/title>/,`<title>${ui.uk.notFound} | Порошково</title>`).replace('content="index, follow"','content="noindex, nofollow"'));
write('robots.txt',production?`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(r=>`<url><loc>${base}${r}</loc></url>`).join('')}</urlset>`);
write('_headers','/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src \'self\'; img-src \'self\' data:; style-src \'self\'; script-src \'self\'; font-src \'self\'; frame-src https://www.google.com; object-src \'none\'; base-uri \'self\'; form-action \'none\'; frame-ancestors \'none\'\n');
write('routes.json',JSON.stringify(routes,null,2));
console.log(`Built ${routes.length} bilingual content pages. Mode: ${production?'production':'local preview, noindex'}. Assets: independent; approved parish photos: ${photos.filter(p=>p.publication_status==='approved').length}.`);
