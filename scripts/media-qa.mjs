import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=process.env.MEDIA_BASE_URL||'http://localhost:4173',tag=base.startsWith('http://localhost')?'local':'production',audit=path.resolve(root,'../audit');
const photos=JSON.parse(fs.readFileSync(path.join(root,'content/photos.json'))),brand=JSON.parse(fs.readFileSync(path.join(root,'content/brand.json'))),expectedHero='church-exterior';
const report={date:'2026-10-30',base,status:'RUNNING',hero:expectedHero,photoAssets:[],headerChecks:[],placements:[],icons:[],errors:[]},iconData={};
fs.mkdirSync(audit,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const historicalMap=JSON.parse(fs.readFileSync(path.join(root,'content/historical-map.json')));report.historicalMapAssets=[];
for(const file of [...historicalMap.widths.map(w=>`assets/history/${historicalMap.id}-${w}.webp`),historicalMap.full_file.slice(1)]){const response=await fetch(`${base}/${file}`),bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200);assert.equal(hash(bytes),hash(fs.readFileSync(path.join(root,'dist',file))));report.historicalMapAssets.push({file,status:response.status,exactMatch:true});}
for(const p of photos)for(const width of p.widths){const file=`assets/photos/${p.id}-${width}.webp`,response=await fetch(`${base}/${file}`),bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200);assert.equal(hash(bytes),hash(fs.readFileSync(path.join(root,'dist',file))));report.photoAssets.push({file,status:response.status,bytes:bytes.length,exactMatch:true});}
for(const file of ['favicon.ico','assets/favicon-16x16.png','assets/favicon-32x32.png','assets/favicon-48x48.png','assets/apple-touch-icon.png','assets/icon-192.png','assets/icon-512.png','assets/brand/poroshkovo-parish-logo-256.png']){const response=await fetch(`${base}/${file}`),bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200);assert.equal(hash(bytes),hash(fs.readFileSync(path.join(root,'dist',file))));report.icons.push({file,status:response.status,exactMatch:true});if(file.endsWith('.png'))iconData[file]='data:image/png;base64,'+bytes.toString('base64');}
if(brand.symbol){const file=brand.symbol.file.slice(1),response=await fetch(base+'/'+file),bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200);assert.equal(hash(bytes),hash(fs.readFileSync(path.join(root,'dist',file))));report.headerWordmark={file,source_sha256:brand.source_sha256,status:'PASS'};}
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const ready=page=>page.evaluate(async()=>{await Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>{i.loading='eager';return i.decode().catch(()=>{});}));});
try{
 for(const lang of ['uk','en'])for(const width of [320,390,768,1440])for(const colorScheme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:2,colorScheme,reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${base}/${lang}/`);await ready(page);
  assert.equal(await page.locator('.hero-image img').getAttribute('data-image-id'),expectedHero);
  assert.equal(await page.locator('.hero-image img').getAttribute('data-photo-variant'),'enhanced');
  assert.deepEqual(await page.locator('main').evaluate(e=>[e.querySelector('.hero'),e.querySelector('.history-teaser'),e.querySelector('[data-home-liturgy]')].map(n=>n.getBoundingClientRect().top)),await page.locator('main').evaluate(e=>[e.querySelector('.hero'),e.querySelector('.history-teaser'),e.querySelector('[data-home-liturgy]')].map(n=>n.getBoundingClientRect().top).sort((a,b)=>a-b)));
  assert.equal(await page.locator('.history-teaser [data-historical-map]').count(),1);
  assert.equal(await page.locator('[data-home-liturgy] img').getAttribute('data-image-id'),'divine-liturgy');
  assert.equal(await page.locator('.hero-image img').getAttribute('alt'),photos.find(p=>p.id===expectedHero).alt[lang]);
  assert.equal(await page.locator('.hero-image img').getAttribute('title'),photos.find(p=>p.id===expectedHero).title[lang]);
  assert.equal(await page.locator('.brand').getAttribute('href'),`/${lang}/`);
  const logo=await page.locator('.header .brand-logo').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,naturalWidth:e.naturalWidth,naturalHeight:e.naturalHeight,sourceWidth:e.currentSrc.includes('parish-symbol.svg')?280:Number(/logo-(\d+)/.exec(e.currentSrc)[1]),currentSrc:e.currentSrc}));
  if(brand.symbol){assert.ok(logo.width>=48&&logo.width<=72);assert.ok(Math.abs(logo.width/logo.height-brand.symbol.width/brand.symbol.height)<.01,'Uncropped horizontal wordmark proportions');assert.ok(logo.currentSrc.includes(brand.symbol.file));}else{assert.ok(logo.width>=40&&logo.width<=64&&logo.width===logo.height);assert.equal(logo.naturalWidth,logo.naturalHeight);}assert.ok(logo.sourceWidth>=logo.width*2,'Retina source');
  assert.equal(await page.locator('.header .brand-logo').getAttribute('alt'),brand.header_alt[lang]);
  assert.equal(await page.locator('.brand-mark').count(),0);assert.equal(await page.locator('.footer-logo-link').getAttribute('href'),`/${lang}/`);assert.ok(await page.locator('.footer-logo').evaluate(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.locator('.footer .phone-link').getAttribute('href'),'tel:+380504321969');assert.equal(await page.locator('.footer a[href^="https://wa.me/"]').getAttribute('href'),'https://wa.me/380504321969');assert.equal(await page.locator('.footer a[href^="viber:"]').getAttribute('href'),'viber://chat?number=%2B380504321969');
  const head=await page.locator('link[rel="icon"]').evaluateAll(elements=>elements.map(e=>e.href));assert.ok(head.length>=3&&head.every(h=>h.includes('?v=')&&!h.includes('.svg')));
  const manifestResponse=await fetch(new URL(await page.locator('link[rel="manifest"]').getAttribute('href'),base));assert.equal(manifestResponse.status,200);assert.equal((await manifestResponse.json()).start_url,`/${lang}/`);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  report.headerChecks.push({lang,width,colorScheme,logo,hero:'PASS',faviconVersioning:'PASS'});
  if([390,1440].includes(width)){await page.locator('.header').screenshot({path:path.join(audit,`media-${tag}-${lang}-header-${width}-${colorScheme}.png`)});if(colorScheme==='light'){await page.locator('.hero').screenshot({path:path.join(audit,`media-${tag}-${lang}-hero-${width}.png`)});await page.locator('.history-teaser').screenshot({path:path.join(audit,`media-${tag}-${lang}-history-map-${width}.png`)});await page.locator('[data-home-liturgy]').screenshot({path:path.join(audit,`media-${tag}-${lang}-liturgy-${width}.png`)});await page.locator('.footer').screenshot({path:path.join(audit,`media-${tag}-${lang}-footer-${width}.png`)});}}
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
 for(const lang of ['uk','en']){
  const localizedPhotos=photos.filter(p=>!p.publication_languages||p.publication_languages.includes(lang));
  for(const slug of ['about','community','spiritual-life','gallery']){const ids=slug==='gallery'?localizedPhotos.map(p=>p.id):localizedPhotos.filter(p=>p.placements.includes(slug)).map(p=>p.id);
   await page.goto(`${base}/${lang}/${slug}/`);await ready(page);assert.deepEqual(await page.locator('[data-photo-id]').evaluateAll(es=>es.map(e=>e.dataset.photoId)),ids);
   if(slug==='gallery')assert.ok(await page.locator('.photo-button img').evaluateAll(es=>es.every(i=>i.dataset.photoVariant==='enhanced')),'Gallery uses detail-friendly enhanced variants');
   const images=await page.locator('.photo-button img').evaluateAll(es=>es.map(e=>({id:e.dataset.imageId,ratio:e.getBoundingClientRect().width/e.getBoundingClientRect().height,natural:Number(e.getAttribute('width'))/Number(e.getAttribute('height')),complete:e.complete&&e.naturalWidth>0})));
   for(const i of images)assert.ok(i.complete&&Math.abs(i.ratio-i.natural)<0.01,`Declared image ratio without CSS cropping: ${i.id}`);
   report.placements.push({lang,slug,ids,declaredRatiosPreserved:true,captionFooterCrops:photos.filter(p=>p.processing?.crop).map(p=>p.id)});
   if(lang==='uk')await page.screenshot({path:path.join(audit,`media-${tag}-${lang}-${slug}-desktop.png`),fullPage:true});
  }
  await page.locator('[data-photo-filter="worship"]').click();assert.equal(await page.locator('[data-photo-card]:visible').count(),localizedPhotos.filter(p=>p.category==='worship').length);await page.locator('[data-photo-filter="community"]').click();assert.equal(await page.locator('[data-photo-card]:visible').count(),localizedPhotos.filter(p=>p.category==='community').length);await page.locator('[data-photo-filter="all"]').click();
  await page.locator('[data-photo-id="divine-liturgy"]').click();assert.ok(await page.locator('dialog').isVisible());await page.keyboard.press('ArrowRight');assert.ok((await page.locator('dialog figcaption').innerText()).includes(photos[1].caption_overlay[lang]));await page.keyboard.press('Escape');assert.ok(await page.locator('[data-photo-id="divine-liturgy"]').evaluate(e=>document.activeElement===e));
 }
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),touch=await mobile.newPage();await touch.goto(`${base}/uk/gallery/`);await ready(touch);await touch.locator('[data-photo-id="divine-liturgy"]').tap();await touch.locator('dialog img').evaluate(i=>i.decode());
 const cdp=await mobile.newCDPSession(touch),y=350;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:320,y}]});for(const x of [260,200,140,80])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.waitForFunction(total=>document.querySelector('dialog figcaption').textContent.startsWith('2 / '+total),photos.length);await touch.locator('[data-close]').tap();await mobile.close();
 await page.setViewportSize({width:940,height:360});await page.goto('about:blank');
 await page.setContent(`<html lang="uk"><head><meta charset="utf-8"></head><body style="margin:0;font:16px system-ui;background:#eee"><h1 style="font-size:20px;margin:14px 22px">Favicon — реальні файли сайту</h1><div style="display:flex">${[['Світлий фон','#fff','#111'],['Темний фон','#171717','#fff']].map(([label,bg,color])=>`<section style="width:50%;padding:24px;background:${bg};color:${color}"><h2 style="font-size:16px">${label}</h2><div style="display:flex;align-items:center;gap:25px">${[16,32,48].map(s=>`<figure style="margin:0;text-align:center"><img src="${iconData[`assets/favicon-${s}x${s}.png`]}" width="${s}" height="${s}" alt="${s}px"><figcaption>${s}px</figcaption></figure>`).join('')}<figure style="margin:0;text-align:center"><img src="${iconData['assets/apple-touch-icon.png']}" width="100" height="100" alt="Apple touch icon"><figcaption>180px</figcaption></figure></div></section>`).join('')}</div></body></html>`);await ready(page);assert.ok(await page.locator('img').evaluateAll(es=>es.every(i=>i.complete&&i.naturalWidth>0)));await page.screenshot({path:path.join(audit,`media-${tag}-favicon-light-dark.png`)});
 if(tag==='production'){await page.goto(base+'/');await page.waitForURL(base+'/uk/');assert.equal(await page.locator('.hero-image img').getAttribute('data-image-id'),expectedHero);report.rootRedirect='PASS';}
 await context.close();assert.equal(report.errors.length,0);report.galleryKeyboard='PASS';report.galleryTouchSwipe='PASS';report.status='PASS';
}finally{await browser.close();fs.writeFileSync(path.join(audit,`media-${tag}-verification.json`),JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,base,hero:report.hero,photoAssets:report.photoAssets.length,icons:report.icons.length,headerChecks:report.headerChecks.length,placements:report.placements.length,galleryKeyboard:report.galleryKeyboard,galleryTouchSwipe:report.galleryTouchSwipe,rootRedirect:report.rootRedirect},null,2));
