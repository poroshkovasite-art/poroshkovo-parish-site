import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),audit=path.resolve(root,'../audit/visual-polish'),base=process.env.POLISH_BASE_URL||'http://localhost:4173',tag=base.includes('localhost')?'local':'production';
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'content',n+'.json'))),report={status:'RUNNING',base,layouts:[],links:[],clipboard:[],anchors:[],accessibility:[],errors:[]};
fs.mkdirSync(audit,{recursive:true});
const integrity={files:Object.fromEntries(read('parish-photo-catalog').photos.filter(p=>p.publication_status==='approved').flatMap(p=>p.web_files.map(v=>['assets/photos/'+v.file,v.sha256])))};
for(const [file,sha] of Object.entries(integrity.files))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),sha,'Preserve original photo/map/permission/bank bytes: '+file);
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const ctx=await browser.newContext({reducedMotion:'reduce'});await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:base});const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 for(const lang of ['uk','en'])for(const width of [320,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.goto(`${base}/${lang}/`);
  const cards=await page.locator('.hero-buildings>figure').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));if(width>620)assert.ok(Math.abs(cards[0].height-cards[1].height)<1);
  assert.equal(await page.locator('.hero-buildings figcaption p').count(),0);
  const ids=await page.locator('main [data-image-id]').evaluateAll(es=>es.map(e=>e.dataset.imageId));assert.equal(ids.length,new Set(ids).size);assert.equal(await page.locator('[data-mission-composition] [data-photo]').count(),0);assert.equal(await page.locator('[data-chronicle-carousel]').count(),1);assert.equal(await page.locator('[data-mission-carousel]').count(),0);
  assert.equal(await page.locator('header a[href$="/first-visit/"],footer a[href$="/first-visit/"]').count(),0);
  assert.ok((await page.locator('[data-historical-map]').boundingBox()).width<=650);
  const footer=await page.locator('.footer').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,body:getComputedStyle(document.body).backgroundColor,base:getComputedStyle(e.querySelector('.footer-base')).backgroundColor}));assert.notEqual(footer.bg,footer.body);assert.notEqual(footer.base,footer.bg);
  await page.locator('[data-home-support] [data-copy-text]').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),read('support').accounts[0].iban);report.clipboard.push({lang,width,status:'PASS'});
  assert.ok((await page.locator('.map-object-note').innerText()).includes(lang==='uk'?'Центральна, 94':'94 Tsentralna'));
  const schema=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());assert.equal(schema.geo.latitude,48.67082394012906);assert.equal(schema.address.streetAddress,undefined,'Church schema must not use office legal address');
  if(width===1440){const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations,[]);report.accessibility.push({lang,width,violations:0});}
  for(const href of await page.locator('[data-service]>.text-link').evaluateAll(es=>es.map(e=>e.getAttribute('href')))){const response=await ctx.request.get(base+href.split('#')[0]);assert.equal(response.status(),200);assert.ok((await response.text()).includes(`id="${href.split('#')[1]}"`));}
  await page.goto(`${base}/${lang}/gallery/`);const columns=await page.locator('.gallery-grid').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(columns,width<=620?1:width<=1100?2:3);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));report.layouts.push({lang,width,galleryColumns:columns,status:'PASS'});
 }
 // Actual navigation lands on the heading's card, and the auxiliary page keeps its own route.
 for(const lang of ['uk','en']){
  await page.setViewportSize({width:390,height:1000});await page.goto(`${base}/${lang}/`);const href=await page.locator('[data-service]>.text-link').first().getAttribute('href');await page.locator('[data-service]>.text-link').first().click();await page.waitForURL('**'+href);const target=page.locator('#'+href.split('#')[1]);assert.equal(await target.count(),1);report.anchors.push({lang,href,status:'PASS'});
  const visit=await ctx.request.get(`${base}/${lang}/first-visit/`);assert.equal(visit.status(),200);assert.ok(visit.url().endsWith('/first-visit/'));
 }
 // Every internal link in the generated pages resolves, including fragments.
 const routes=JSON.parse(fs.readFileSync(path.join(root,'dist/routes.json'))),seen=new Set();
 for(const route of routes){const html=fs.readFileSync(path.join(root,'dist',route.slice(1),'index.html'),'utf8');for(const m of html.matchAll(/href="([^"<>]+)"/g)){const u=new URL(m[1].replaceAll('&amp;','&'),base+route);if(u.origin!==new URL(base).origin||seen.has(u.pathname+u.hash))continue;seen.add(u.pathname+u.hash);const response=await ctx.request.get(u.origin+u.pathname);assert.equal(response.status(),200,u.pathname);if(u.hash)assert.ok((await response.text()).includes(`id="${decodeURIComponent(u.hash.slice(1))}"`),u.pathname+u.hash);report.links.push({route:u.pathname+u.hash,status:response.status()});}}
 await ctx.close();
 const normal=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'}),hp=await normal.newPage();await hp.goto(base+'/uk/');const card=hp.locator('.home-service-card').first();await card.scrollIntoViewIfNeeded();await hp.mouse.move(0,0);const y=(await card.boundingBox()).y;await card.hover();await hp.waitForTimeout(300);const lift=(await card.boundingBox()).y-y;assert.ok(lift<=-3&&lift>=-5);const stage=hp.locator('[data-stage-position="active"] .parish-photo');await stage.scrollIntoViewIfNeeded();const before=await stage.evaluate(e=>getComputedStyle(e).transform);await stage.hover();await hp.waitForTimeout(300);assert.equal(await stage.evaluate(e=>getComputedStyle(e).transform),before,'Hover depth must not interfere with central carousel');report.hover={lift,stageTransformUnchanged:true};await normal.close();
 const reduced=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),rp=await reduced.newPage();await rp.goto(base+'/en/');await rp.locator('.home-service-card').first().hover();assert.equal(await rp.locator('.home-service-card').first().evaluate(e=>getComputedStyle(e).transform),'none');await reduced.close();report.reducedMotion='PASS';
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}finally{await browser.close();fs.writeFileSync(path.join(audit,`polish-${tag}-verification.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,layouts:report.layouts.length,links:report.links.length,clipboard:report.clipboard.length},null,2));}
