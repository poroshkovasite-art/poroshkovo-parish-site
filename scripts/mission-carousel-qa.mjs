import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),audit=path.resolve(root,'../audit'),base=process.env.MISSION_CAROUSEL_BASE_URL||'http://localhost:4173',tag=base.includes('localhost')?'local':'production';
const catalog=JSON.parse(fs.readFileSync(path.join(root,'content/parish-photo-catalog.json'))),approved=catalog.photos.filter(p=>p.publication_status==='approved'),report={status:'RUNNING',base,layouts:[],errors:[],swipe:null,bible:[]};
assert.equal(approved.length,11);
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const ctx=await browser.newContext({reducedMotion:'reduce'}),page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 for(const lang of ['uk','en'])for(const width of [320,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.goto(`${base}/${lang}/`);const mission=page.locator('[data-mission-carousel]'),track=mission.locator('[data-mission-track]');
  const ids=await mission.locator('[data-photo-id]').evaluateAll(es=>es.map(e=>e.dataset.photoId));assert.deepEqual(ids.slice().sort(),approved.map(p=>p.id).sort());assert.equal(ids[0],'chronicle-youth-bike-ride');
  await track.scrollIntoViewIfNeeded();await mission.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode();})));
  const height=(await track.boundingBox()).height;
  for(let i=0;i<ids.length;i++){await mission.locator('[data-mission-step="1"]').click();await page.waitForFunction(v=>document.querySelector('[data-mission-carousel]').dataset.active===String(v),(i+1)%ids.length);assert.ok(Math.abs((await track.boundingBox()).height-height)<1);}
  await track.focus();await page.keyboard.press('End');await page.waitForFunction(()=>document.querySelector('[data-mission-carousel]').dataset.active==='10');await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('[data-mission-carousel]').dataset.active==='0');
  assert.ok(await mission.locator('img').evaluateAll(imgs=>imgs.every(i=>getComputedStyle(i).objectFit==='contain'&&i.naturalWidth>0)));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if([390,768,1440].includes(width)){await page.locator('[data-community-mission]').screenshot({path:path.join(audit,`mission-carousel-${tag}-${lang}-${width}.png`)});}
  await mission.locator('[data-photo]').first().click();assert.ok(await page.locator('dialog').isVisible());await page.keyboard.press('Escape');
  report.layouts.push({lang,width,slides:ids.length,loop:'PASS',keyboard:'PASS',heightStable:true,fullFrame:true});
 }
 for(const lang of ['uk','en']){await page.goto(`${base}/${lang}/resources/`);const link=page.locator('a[href="https://ugcc.ua/library/bible/"]');assert.equal(await link.count(),1);assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await page.locator('a[href*="bible.com"]').count(),0);report.bible.push({lang,url:await link.getAttribute('href'),status:'PASS'});}
 await ctx.close();
 const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),p=await touch.newPage();await p.goto(base+'/uk/');const track=p.locator('[data-mission-track]');await track.scrollIntoViewIfNeeded();const box=await track.boundingBox(),y=Math.max(200,box.y+130),cdp=await touch.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:335,y}]});for(const x of [280,220,160,100,40])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForFunction(()=>document.querySelector('[data-mission-carousel]').dataset.active!=='0');report.swipe='PASS';await touch.close();
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}finally{await browser.close();fs.writeFileSync(path.join(audit,`mission-carousel-${tag}-verification.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,layouts:report.layouts.length},null,2));}
