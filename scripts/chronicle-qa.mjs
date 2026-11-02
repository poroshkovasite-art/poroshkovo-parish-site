import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {photoApproved,photoThemes,validatePhotoCatalog} from './parish-photos.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),audit=path.resolve(root,'../audit');fs.mkdirSync(audit,{recursive:true});
const base=process.env.CHRONICLE_BASE_URL||'http://localhost:4173',editorBase=process.env.CHRONICLE_EDITOR_URL||'http://localhost:4174',tag=base.includes('localhost')?'local':'production';
const catalog=JSON.parse(fs.readFileSync(path.join(root,'content/parish-photo-catalog.json'))),report={status:'RUNNING',base,layouts:[],privacy:[],carousel:[],errors:[],accessibility:[]};
validatePhotoCatalog(catalog);
for(const p of catalog.photos){assert.equal(photoApproved(p),false);assert.equal(p.captured_on,null);assert.equal(p.processing.generative_processing,false);assert.equal(p.processing.crop,false);for(const key of ['rights_confirmed','consents_confirmed']){const bad=structuredClone(catalog);bad.photos[0].publication_status='approved';bad.photos[0].rights_confirmed=true;bad.photos[0].consents_confirmed=true;bad.photos[0].consent_reference='fixture';bad.photos[0][key]=false;assert.throws(()=>validatePhotoCatalog(bad));}}
assert.equal(catalog.missing[0].status,'missing');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const ready=p=>p.evaluate(async()=>Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>{i.loading='eager';return i.decode();})));
try{
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 for(const lang of ['uk','en'])for(const width of [320,390,768,1024,1440,1920])for(const slug of ['','gallery/','social-ministry/']){
  await page.setViewportSize({width,height:1000});await page.goto(`${base}/${lang}/${slug}`);await ready(page);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.equal(await page.locator('[data-photo-id^="chronicle-"]').count(),0,'No pending photo card in public HTML');
  assert.ok(!(await page.content()).includes('pending_approval'));
  if(slug==='gallery/'){
   assert.equal(await page.locator('[data-photo-section]').count(),Object.keys(photoThemes).length);
   for(const id of Object.keys(photoThemes)){await page.locator(`[data-theme-filter="${id}"]`).click();assert.equal(await page.locator('[data-photo-section]:visible').count(),1);assert.equal(await page.locator('[data-photo-section]:visible').getAttribute('data-photo-section'),id);}
   await page.locator('[data-theme-filter="all"]').click();
   const card=page.locator('[data-photo]').first();await card.click();await page.locator('dialog img').evaluate(i=>i.decode());assert.equal(await page.locator('dialog').isVisible(),true);assert.equal(await page.locator('dialog img').evaluate(i=>getComputedStyle(i).objectFit==='contain'&&i.naturalWidth>0),true);await page.keyboard.press('Escape');assert.ok(await card.evaluate(e=>document.activeElement===e));
  }
  if(!slug){
   const c=page.locator('[data-chronicle-carousel]');assert.equal(await c.locator('[data-stage-position=active]').count(),1);assert.equal(await c.locator('[data-stage-position=previous]').count(),1);assert.equal(await c.locator('[data-stage-position=next]').count(),1);
   const geometry=await c.evaluate(root=>{const v=root.querySelector('.chronicle-viewport').getBoundingClientRect(),a=root.querySelector('[data-stage-position=active]').getBoundingClientRect(),left=root.querySelector('[data-stage-position=previous]').getBoundingClientRect(),right=root.querySelector('[data-stage-position=next]').getBoundingClientRect();return {contained:a.left>=v.left&&a.right<=v.right,center:Math.abs((a.left+a.width/2)-(v.left+v.width/2)),leftEdge:Math.max(v.left,left.left)<a.left,rightEdge:Math.min(v.right,right.right)>a.right,scale:new DOMMatrix(getComputedStyle(root.querySelector('[data-stage-position=previous]')).transform).a};});assert.ok(geometry.contained&&geometry.center<1&&geometry.leftEdge&&geometry.rightEdge&&geometry.scale<1,'Central card fully visible, neighbours partly exposed behind it');
   const first=await c.getAttribute('data-active'),total=await c.locator('.chronicle-slide').count(),height=(await c.locator('.chronicle-viewport').boundingBox()).height;
   for(let i=0;i<total;i++)await c.locator('[data-chronicle-step="1"]').click();assert.equal(await c.getAttribute('data-active'),first,'Loop returns without duplicate slides');assert.equal((await c.locator('.chronicle-viewport').boundingBox()).height,height,'Stage height stays stable across the entire loop');
   await c.locator('.chronicle-viewport').focus();await page.keyboard.press('ArrowLeft');assert.equal(Number(await c.getAttribute('data-active')),total-1);await page.keyboard.press('ArrowRight');
   for(const side of ['next','previous']){const button=await c.locator(`[data-stage-position=${side}] [data-chronicle-select]`).boundingBox(),centre=await c.locator('[data-stage-position=active]').boundingBox(),viewport=await c.locator('.chronicle-viewport').boundingBox(),header=await page.locator('.header').boundingBox();const start=side==='next'?Math.max(centre.x+centre.width,button.x):Math.max(viewport.x,button.x),end=side==='next'?Math.min(viewport.x+viewport.width,button.x+button.width):Math.min(centre.x,button.x+button.width),top=Math.max(viewport.y,button.y,header.y+header.height),bottom=Math.min(viewport.y+viewport.height,button.y+button.height,1000);assert.ok(end>start&&bottom>top);await page.mouse.click((start+end)/2,(top+bottom)/2);assert.equal(await c.getAttribute('data-active'),side==='next'?'1':'0','Real click on exposed side selects the central story');}
   const open=c.locator('[data-stage-position=active] [data-chronicle-open]').first();await open.click();assert.ok(await page.locator('dialog').isVisible());await page.keyboard.press('Escape');
   if([390,768,1440].includes(width)){await c.screenshot({path:path.join(audit,`chronicle-${tag}-${lang}-${width}.png`)});const a=await new AxeBuilder({page}).include('[data-chronicle-carousel]').analyze();assert.deepEqual(a.violations,[]);report.accessibility.push({lang,width,violations:0});}
  }
  report.layouts.push({lang,width,slug:slug||'home',status:'PASS'});
 }
 // Direct URLs must also be blocked, rather than merely hidden in the UI.
 for(const p of catalog.photos){const response=await page.request.get(`${base}/assets/photos/${p.id}-${p.widths[0]}.webp`);assert.equal(response.status(),404);report.privacy.push({file:p.original_file,status:404});}
 if(tag==='local'&&process.env.CHRONICLE_SKIP_EDITOR!=='1')for(const lang of ['uk','en']){
  await page.goto(`${editorBase}/${lang}/gallery/`);await ready(page);assert.ok((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));assert.equal(await page.locator('[data-photo-id^="chronicle-"]').count(),26);
  for(const p of catalog.photos){assert.equal(await page.locator(`[data-photo-id="${p.id}"] img`).getAttribute('alt'),p.alt[lang]);assert.ok((await page.locator(`[data-photo-id="${p.id}"]`).locator('..').textContent()).includes('pending_approval'));}
  await page.locator('[data-theme-filter="social-ministry"]').click();assert.equal(await page.locator('[data-photo-section]:visible [data-photo]').count(),3);
  await page.goto(`${editorBase}/${lang}/social-ministry/`);assert.ok(await page.locator('[data-photo-id^="chronicle-"]').count()>=3);
 }
 await context.close();
 const normal=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'}),p=await normal.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(base+'/uk/');const c=p.locator('[data-chronicle-carousel]');await c.scrollIntoViewIfNeeded();await p.mouse.move(0,0);const initial=await c.getAttribute('data-active');await p.waitForTimeout(6500);assert.notEqual(await c.getAttribute('data-active'),initial,'Autoplay advances right to left');
 await c.hover();const atHover=await c.getAttribute('data-active');await p.waitForTimeout(6500);assert.equal(await c.getAttribute('data-active'),atHover,'Hover pauses reading');
 await c.locator('[data-chronicle-step="1"]').click();await p.waitForTimeout(120);const transform=await c.locator('[data-stage-position=previous]').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41);assert.ok(transform<0,'Outgoing centre moves left');await p.waitForTimeout(900);
 await c.locator('[data-chronicle-pause]').click();await p.evaluate(()=>document.activeElement.blur());await p.mouse.move(0,0);await p.locator('h1').scrollIntoViewIfNeeded();const offscreen=await c.getAttribute('data-active');await p.waitForTimeout(6500);assert.equal(await c.getAttribute('data-active'),offscreen);
 report.carousel.push({autoplay:'PASS',hover:'PASS',direction:'right-to-left',offscreen:'PASS',transitionMs:800});await normal.close();
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),tp=await touch.newPage();await tp.goto(base+'/uk/');await tp.locator('.chronicle-viewport').scrollIntoViewIfNeeded();const box=await tp.locator('.chronicle-viewport').boundingBox(),cdp=await touch.newCDPSession(tp),y=box.y+150;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y}]});for(const x of [250,200,150,90])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await tp.locator('[data-chronicle-carousel]').getAttribute('data-active'),'1');await touch.close();report.carousel.push({swipe:'PASS'});
 const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),np=await noJS.newPage();await np.goto(base+'/en/');assert.equal(await np.locator('.chronicle-slide').count(),6);assert.ok(await np.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await noJS.close();
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}finally{await browser.close();fs.writeFileSync(path.join(audit,`chronicle-${tag}-verification.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,layouts:report.layouts.length,privacy:report.privacy.length,carousel:report.carousel,accessibility:report.accessibility.length,errors:report.errors,failure:report.failure},null,2));}
