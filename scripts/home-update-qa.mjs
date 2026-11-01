import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),audit=path.resolve(root,'../audit');
const base=process.env.HOME_UPDATE_BASE_URL||'http://localhost:4173',tag=base.includes('localhost')?'local':'production';
const point='48.67082394012906,22.752845895344038',mapURL=`https://www.google.com/maps?q=${point}`,directions=`https://www.google.com/maps/dir/?api=1&destination=${point.replace(',','%2C')}`;
const report={status:'RUNNING',base,checked_at:new Date().toISOString(),coordinates:point,layouts:[],maps:[],portraits:[],carousel:[],accessibility:[],screenshots:[],errors:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const csp=fs.readFileSync(path.join(root,'dist/_headers'),'utf8').split('\n').find(l=>l.includes('Content-Security-Policy:')).trim().slice('Content-Security-Policy: '.length);
const screenshot=async(page,selector,name)=>{const file=`home-update-${tag}-${name}.png`;await page.locator(selector).screenshot({path:path.join(audit,file),style:'.header,.header *{visibility:hidden!important}'});report.screenshots.push(file);};
const active=page=>page.locator('[data-feature-carousel]').getAttribute('data-active');
async function settle(page,index){await page.waitForFunction(i=>document.querySelector('[data-feature-carousel]').dataset.active===String(i),index);await page.waitForTimeout(80);}
async function noOverlap(page){const rects=await page.locator('.feature-card').evaluateAll(cards=>cards.map(c=>c.getBoundingClientRect().toJSON()).sort((a,b)=>a.left-b.left));for(let i=1;i<rects.length;i++)assert.ok(rects[i].left>=rects[i-1].right-1,'Cards never overlap');}
try{
 const context=await browser.newContext({reducedMotion:'reduce'});
 if(tag==='local')await context.route('**/*',async route=>{if(route.request().isNavigationRequest()&&route.request().url().startsWith(base)&&route.request().frame()===route.request().frame().page().mainFrame()){const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp}});}else await route.continue();});
 for(const lang of ['uk','en'])for(const slug of ['','contacts/']){
  const page=await context.newPage();let googleRequests=0;
  page.on('request',r=>{if(/https:\/\/[^/]*(google|gstatic)/.test(r.url()))googleRequests++;});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&m.location().url.startsWith(base))report.errors.push(m.text());});
  await page.goto(`${base}/${lang}/${slug}`);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.map-frame').count(),1);assert.equal(await page.locator('iframe').count(),0);assert.equal(googleRequests,0,'No third-party connection before consent');
  assert.equal(await page.locator('.map-actions a').first().getAttribute('href'),directions);assert.equal(await page.locator('.map-actions a').last().getAttribute('href'),mapURL);
  const schema=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());assert.equal(`${schema.geo.latitude},${schema.geo.longitude}`,point);assert.equal(schema.hasMap,mapURL);
  const raw=await page.content();assert.ok(!/48\.670772|22\.752723|48\.670771|22\.752722/.test(raw));
  const json=await page.locator('script[type="application/ld+json"]').textContent();assert.ok(csp.includes(`'sha256-${createHash('sha256').update(json).digest('base64')}'`));
  if(!slug){assert.equal(await page.locator('main > :last-child').getAttribute('id'),'find-church');assert.equal(await page.locator('#find-church-title').innerText(),lang==='uk'?'Як знайти наш храм':'Find Our Church');}
  for(const width of [320,360,375,390,430,768,1024,1440,1920]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow');
   const frame=await page.locator('.map-frame').boundingBox();assert.ok(frame.width<=width&&frame.height===(width<=620?300:width<=850?400:440));
   assert.ok(await page.locator('.map-consent').evaluate(e=>e.scrollHeight<=e.clientHeight+1),'Consent fits without clipping');
   if(!slug){
    await page.locator('.feature-carousel').scrollIntoViewIfNeeded();await noOverlap(page);
    const viewport=await page.locator('.feature-viewport').boundingBox(),card=await page.locator('.feature-card.is-active').boundingBox();assert.ok(card.x>=viewport.x-1&&card.x+card.width<=viewport.x+viewport.width+1,'Active card fully visible');
    const portrait=await page.locator('[data-pastor-portrait] img').evaluate(e=>{const s=getComputedStyle(e);return {width:e.clientWidth,height:e.clientHeight,fit:s.objectFit,transform:s.transform,src:e.currentSrc,href:e.closest('a').getAttribute('href')};});
    assert.equal(portrait.fit,'cover');assert.ok(portrait.transform.includes('1.42'));assert.ok(portrait.height>=440);assert.ok(portrait.href.endsWith('pastor-anatolii-horzov-2560.webp'));if(width>=1440){assert.ok(portrait.width>=480&&portrait.width<=560);assert.equal(portrait.height,700);}report.portraits.push({lang,width,...portrait});
    // Every manual selection retains the original destination, including the wrap boundary.
    for(let i=0;i<3;i++){await page.locator(`[data-feature-dot="${i}"]`).click();await settle(page,i);assert.equal(await page.locator('.feature-card.is-active').getAttribute('href'),`/${lang}/${['social-ministry','support','first-visit'][i]}/`);await noOverlap(page);}
   }
   report.layouts.push({lang,slug:slug||'home',width,status:'PASS'});
   if([390,768,1440].includes(width)){
    await screenshot(page,'.find-church',`${lang}-${slug?'contacts':'home'}-map-consent-${width}`);
    if(!slug){await screenshot(page,'.pastor-profile',`${lang}-pastor-${width}`);await screenshot(page,'.feature-carousel',`${lang}-carousel-${width}`);}
   }
  }
  await page.setViewportSize({width:390,height:1000});const axe=await new AxeBuilder({page}).include('.find-church').include('.pastor-profile').include('.feature-carousel').analyze();assert.deepEqual(axe.violations,[]);report.accessibility.push({lang,slug:slug||'home',violations:0});
  for(const width of [390,1440]){
   if(width===1440)await page.reload();await page.setViewportSize({width,height:1000});
   await page.locator('[data-load-map]').click();const iframe=page.locator('.map-frame iframe');await iframe.waitFor();assert.equal(await iframe.getAttribute('loading'),'lazy');assert.ok(await iframe.getAttribute('title'));
   await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].every(f=>f.contentWindow));await page.waitForTimeout(2200);
   const googleFrame=page.frames().find(f=>f.url().includes('google.com/maps'));assert.ok(googleFrame&&googleFrame.url().includes(point)&&googleFrame.url().includes('6i18'),'Exact pin and zoom in resolved Google embed');
   const frameText=await googleFrame.locator('body').innerText();assert.ok(!/refused to connect|API key|Google Maps Platform rejected|запрос отклонен/i.test(frameText),'Embed loads without paid API');
   await screenshot(page,'.find-church',`${lang}-${slug?'contacts':'home'}-map-loaded-${width}`);report.maps.push({lang,slug:slug||'home',width,url:googleFrame.url(),beforeConsentRequests:0,status:'PASS'});
  }
  await page.close();
 }
 await context.close();
 // Normal motion: timed rotation, hover/keyboard pauses, both directions and in-flight geometry.
 for(const lang of ['uk','en']){
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});await page.goto(`${base}/${lang}/`);await page.locator('.feature-viewport').scrollIntoViewIfNeeded();await page.mouse.move(0,0);
  await settle(page,0);await page.waitForTimeout(5900);assert.equal(await active(page),'1','Automatic left-to-right advance after five seconds');
  await page.locator('.feature-card.is-active').hover();await page.waitForTimeout(5900);assert.equal(await active(page),'1','Hover pauses while reading');
  await page.locator('[data-feature-step="1"]').click();for(let sample=0;sample<9;sample++){await noOverlap(page);await page.waitForTimeout(80);}await settle(page,2);
  await page.locator('[data-feature-step="-1"]').click();await settle(page,1);
  const side=page.locator('.feature-track > :nth-child(2)');await side.click();await settle(page,2);assert.ok(page.url().endsWith(`/${lang}/`),'Side click selects without navigation');
  await page.locator('[data-feature-step="1"]').focus();await page.keyboard.press('ArrowRight');await settle(page,0);await page.mouse.move(0,0);await page.waitForTimeout(5900);assert.equal(await active(page),'0','Keyboard interaction pauses autoplay');
  await page.locator('.feature-card.is-active').focus();await page.keyboard.press('Enter');await page.waitForURL(`**/${lang}/social-ministry/`);assert.equal((await page.request.get(page.url())).status(),200);
  report.carousel.push({lang,autoplay:'PASS',hover:'PASS',keyboardPause:'PASS',sideClick:'PASS',wrap:'PASS',transitionOverlap:'none',centralLink:'PASS'});await page.close();
 }
 // Reduced motion and no-JS fallbacks are intentionally separate from animation tests.
 const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.goto(base+'/uk/');await reduced.locator('.feature-carousel').scrollIntoViewIfNeeded();await reduced.waitForTimeout(5900);assert.equal(await active(reduced),'0');await reduced.locator('[data-feature-dot="2"]').click();await settle(reduced,2);await reduced.close();report.carousel.push({reducedMotion:'PASS'});
 const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),touch=await touchContext.newPage();await touch.goto(base+'/uk/');await touch.locator('.feature-viewport').scrollIntoViewIfNeeded();
 const rect=await touch.locator('.feature-viewport').boundingBox(),cdp=await touchContext.newCDPSession(touch),y=rect.y+rect.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y}]});for(const x of [270,230,190,150,100])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle(touch,2);assert.ok(touch.url().endsWith('/uk/'));await touchContext.close();report.carousel.push({touchSwipe:'PASS'});
 const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});for(const lang of ['uk','en']){const page=await noJS.newPage();await page.goto(`${base}/${lang}/`);assert.equal(await page.locator('.feature-card').count(),3);for(const slug of ['social-ministry','support','first-visit'])assert.equal((await page.request.get(`${base}/${lang}/${slug}/`)).status(),200);assert.equal(await page.locator('[data-feature-controls]').isVisible(),false);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.close();}await noJS.close();report.carousel.push({noJavaScript:'PASS'});
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}finally{await browser.close();fs.writeFileSync(path.join(audit,`home-update-${tag}-verification.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,layouts:report.layouts.length,maps:report.maps.length,portraits:report.portraits.length,carousel:report.carousel,accessibility:report.accessibility.length,screenshots:report.screenshots.length,errors:report.errors,failure:report.failure},null,2));}
