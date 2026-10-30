import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'dist'),audit=path.resolve(root,'../audit');
const base=process.env.LOCALIZATION_BASE_URL||'http://localhost:4173',tag=base.includes('localhost')?'local':'production';
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'content',n+'.json'))),photos=read('photos'),brand=read('brand'),routes=JSON.parse(fs.readFileSync(path.join(out,'routes.json')));
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected={
 'divine-liturgy':['Божественна Літургія','Divine Liturgy'],
 'church-exterior':['Наш храм','Our Church'],
 'bell-tower':['Дзвіниця парафії','Parish Bell Tower'],
 'iconostasis':['Іконостас храму','Church Iconostasis'],
 'church-altar':['Молитва у храмі','Prayer in the Church'],
 'prayer-at-crucifix':['Молитовне життя','Prayer Life'],
 'parish-prayer-on-church-steps':['Парафіяльна спільнота','Parish Community'],
 'parish-community-children':['Діти у парафії','Children in Our Parish'],
 'easter-blessing':['Великоднє благословення','Easter Blessing'],
 'parish-winter-outing':['Спільний відпочинок','Community Outing']
};
for(const p of photos){assert.deepEqual([p.caption_overlay.uk,p.caption_overlay.en],expected[p.id]);assert.equal(p.variants.captioned.available_on_site,false);for(const lang of ['uk','en'])for(const field of ['title','caption','description','alt'])assert.ok(p[field]?.[lang],`${p.id} ${field}.${lang}`);}
assert.equal(read('site').hero_photo_id,'divine-liturgy');
const symbol=fs.readFileSync(path.join(out,brand.symbol.file),'utf8');
assert.ok(!/<text\b|<image\b|data:|[А-Яа-яІіЇїЄєҐґ]/u.test(symbol),'Symbol must contain no lettering or raster');
assert.equal(hash(Buffer.from(symbol)),brand.source_sha256);
assert.ok(!fs.readdirSync(path.join(out,'assets/photos')).some(f=>f.includes('-captioned-')),'Archived captioned exports excluded from publish directory');
for(const route of routes){const html=fs.readFileSync(path.join(out,route,'index.html'),'utf8');assert.ok(!/-captioned-\d+\.webp|Мефоді[йя]/.test(html),route);assert.ok(!html.includes('parish-header-logo.svg'));if(route.startsWith('/en/'))assert.ok(!html.includes('data-image-id="parish-winter-outing"'));}
const report={status:'RUNNING',base,checkedAt:new Date().toISOString(),routes:routes.length,widths:[320,360,375,390,430,768,1024,1440,1920],layouts:[],overlays:0,assetHashes:[],screenshots:[],errors:[],winter:'No uncaptioned original found; full frame retained only in Ukrainian, without a second overlay.'};
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const ready=page=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>{i.loading='eager';return i.decode().catch(()=>{});}));});
try{
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 for(const width of report.widths){await page.setViewportSize({width,height:1400});for(const lang of ['uk','en'])for(const slug of ['', 'gallery/']){
  await page.goto(`${base}/${lang}/${slug}`);await ready(page);
  assert.deepEqual(await page.locator('.brand-name>span').allTextContents(),brand.name_lines[lang]);
  for(const logo of await page.locator('.brand-symbol').all())assert.ok((await logo.getAttribute('src')).startsWith(brand.symbol.file));
  const metrics=await page.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};return {overflow:document.documentElement.scrollWidth>innerWidth+1,broken:[...document.images].filter(i=>i.getAttribute('src')&&(!i.complete||!i.naturalWidth)).length,controls:[...document.querySelectorAll('.header .brand,.language-switch,.menu-toggle')].filter(e=>e.getBoundingClientRect().width).map(box),overlays:[...document.querySelectorAll('[data-photo-overlay]')].map(e=>({id:e.dataset.photoOverlay,text:e.textContent,box:box(e),image:box(e.parentElement.querySelector('img')),parent:box(e.parentElement),duplicate:!!e.closest('figure')?.querySelector('figcaption strong')}))};});
  assert.ok(!metrics.overflow&&!metrics.broken,`${lang} ${width} ${slug}`);
  for(let i=0;i<metrics.controls.length;i++)for(let j=i+1;j<metrics.controls.length;j++){const a=metrics.controls[i],b=metrics.controls[j];assert.ok(!(a.x<b.right-1&&b.x<a.right-1&&a.y<b.bottom-1&&b.y<a.bottom-1),'Header controls overlap');}
  for(const o of metrics.overlays){assert.equal(o.text,expected[o.id][lang==='uk'?0:1]);assert.ok(!o.duplicate,'Duplicate caption beneath overlay');assert.ok(o.box.x>=o.image.x-1&&o.box.right<=o.image.right+1&&o.box.bottom<=o.image.bottom+1&&o.box.y>=o.image.y,`Overlay outside image: ${o.id}`);assert.ok(o.box.height>=30&&o.parent.height>=o.image.height-1);report.overlays++;}
  if(lang==='en')assert.equal(await page.locator('[data-image-id="parish-winter-outing"]').count(),0);
  if(slug==='gallery/'){assert.equal(await page.locator('[data-photo-id]').count(),lang==='uk'?10:9);if(lang==='uk')assert.equal(await page.locator('[data-photo-id="parish-winter-outing"] [data-photo-overlay]').count(),0);}
  else{assert.equal(await page.locator('.hero-image img').getAttribute('data-image-id'),'divine-liturgy');assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),`${read('site').production_url}/assets/og-card-${lang}.png`);}
  report.layouts.push({width,lang,slug:slug||'home',status:'PASS'});
 }}
 // Verify all components, including history, services and community, rather than only the home/gallery fixtures.
 await page.setViewportSize({width:1440,height:1400});
 for(const route of routes){await page.goto(base+route);await ready(page);assert.equal(await page.locator('img[src*="-captioned-"]').count(),0);assert.ok(await page.locator('img[src]').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)));const lang=route.startsWith('/en/')?'en':'uk';assert.deepEqual(await page.locator('.brand-name>span').allTextContents(),brand.name_lines[lang]);if(lang==='en')assert.equal(await page.locator('[data-image-id="parish-winter-outing"]').count(),0);for(const e of await page.locator('[data-photo-overlay]').all()){const id=await e.getAttribute('data-photo-overlay');assert.equal(await e.innerText(),photos.find(p=>p.id===id).caption_overlay[lang]);}}
 for(const p of photos)for(const width of p.widths){const file=`assets/photos/${p.id}-${width}.webp`,response=await fetch(`${base}/${file}`),bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200);assert.equal(hash(bytes),hash(fs.readFileSync(path.join(out,file))));report.assetHashes.push({file,sha256:hash(bytes)});}
 const capture=async(locator,name)=>{const file=`localization-${tag}-${name}.png`;await locator.screenshot({path:path.join(audit,file)});report.screenshots.push(file);return file;};
 const pairs=[];
 for(const lang of ['uk','en']){
  await page.setViewportSize({width:1440,height:1600});await page.goto(`${base}/${lang}/`);await ready(page);
  await capture(page.locator('.header'),`${lang}-header`);await capture(page.locator('.header .brand'),`${lang}-brand`);await capture(page.locator('.hero-image'),`${lang}-hero`);
  await page.goto(`${base}/${lang}/gallery/`);await ready(page);
  for(const id of ['church-exterior','parish-community-children'])await capture(page.locator('figure').filter({has:page.locator(`[data-photo-id="${id}"]`)}),`${lang}-${id}`);
  await page.locator('[data-photo-id="parish-community-children"]').click();assert.ok((await page.locator('dialog figcaption').innerText()).includes(expected['parish-community-children'][lang==='uk'?0:1]));await capture(page.locator('dialog'),`${lang}-lightbox`);await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:1400});await page.goto(`${base}/${lang}/`);await ready(page);await page.screenshot({path:path.join(audit,`localization-${tag}-${lang}-mobile.png`)});report.screenshots.push(`localization-${tag}-${lang}-mobile.png`);
 }
 const data=file=>'data:image/png;base64,'+fs.readFileSync(path.join(audit,file)).toString('base64');
 for(const [suffix,label] of [['header','Header'],['brand','Localized name and shared symbol'],['hero','Main photograph'],['church-exterior','Gallery: church'],['parish-community-children','Gallery: children'],['mobile','Mobile 390 px']]){
  await page.setViewportSize({width:1200,height:200});await page.goto('about:blank');
  await page.setContent(`<html lang="en"><body style="margin:0;padding:24px;background:#eee9df;font:16px system-ui"><h1 style="font-size:24px">${label} — UA / EN</h1><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">${['uk','en'].map(lang=>`<section><h2>${lang==='uk'?'Українська':'English'}</h2><img style="width:100%;height:auto" src="${data(`localization-${tag}-${lang}-${suffix}.png`)}" alt="${lang} screenshot"></section>`).join('')}</div></body></html>`);await ready(page);
  const file=`localization-${tag}-comparison-${suffix}.png`;await page.locator('body').screenshot({path:path.join(audit,file)});pairs.push(file);
 }
 // Contact sheet uses the actual enhanced assets deployed by the website; inspect this manually for lettering in pixels.
 await page.goto('about:blank');await page.setViewportSize({width:1200,height:1200});
 await page.setContent(`<html lang="en"><body style="margin:20px;font:16px system-ui;background:#eee9df"><h1>Actual enhanced photo assets (winter excluded from English)</h1><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${photos.filter(p=>p.publication_languages.includes('en')).map(p=>`<figure style="margin:0"><img style="width:100%;height:320px;object-fit:contain;background:#fff" src="data:image/webp;base64,${fs.readFileSync(path.join(out,`assets/photos/${p.id}-640.webp`)).toString('base64')}"><figcaption>${p.id}</figcaption></figure>`).join('')}</div></body></html>`);await ready(page);assert.ok(await page.locator('img').evaluateAll(es=>es.every(i=>i.complete&&i.naturalWidth>0)));await page.locator('body').screenshot({path:path.join(audit,`localization-${tag}-actual-photo-assets.png`)});
 const index=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Poroshkovo — UA / EN visual localization proof</title><body style="max-width:1200px;margin:auto;font:18px system-ui;background:#f7f4ee"><h1>Poroshkovo: Ukrainian / English</h1><p>Verified ${new Date().toISOString()}. Winter photo is retained only in Ukrainian because no uncaptioned original was found.</p>${pairs.map(f=>`<p><a href="${f}"><img style="width:100%" src="${f}" alt="Side by side UA and EN"></a></p>`).join('')}<h2>Actual enhanced photo assets</h2><img style="width:100%" src="localization-${tag}-actual-photo-assets.png" alt="Assets inspected for lettering in pixels"></body></html>`;
 fs.writeFileSync(path.join(audit,`localization-${tag}-proof.html`),index);report.comparisonScreenshots=pairs;assert.equal(report.errors.length,0);report.status='PASS';
 await context.close();
}finally{await browser.close();fs.writeFileSync(path.join(audit,`localization-${tag}-verification.json`),JSON.stringify(report,null,2));}
console.log(JSON.stringify({...report,layouts:report.layouts.length,assetHashes:report.assetHashes.length,screenshots:report.screenshots.length},null,2));
