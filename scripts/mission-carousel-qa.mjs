import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),audit=path.resolve(root,'../audit'),base=process.env.MISSION_CAROUSEL_BASE_URL||'http://localhost:4173',tag=base.includes('localhost')?'local':'production';
const report={status:'RUNNING',base,mode:'static-three-photo-composition',layouts:[],errors:[],bible:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const ctx=await browser.newContext({reducedMotion:'reduce'}),page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 for(const lang of ['uk','en'])for(const width of [320,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.goto(`${base}/${lang}/`);const mission=page.locator('[data-mission-composition]');
  assert.equal(await mission.count(),1);assert.equal(await page.locator('[data-mission-carousel],[data-mission-track],[data-mission-step]').count(),0);
  assert.deepEqual(await mission.locator('[data-photo-id]').evaluateAll(es=>es.map(e=>e.dataset.photoId)),['chronicle-parish-summer-camp','chronicle-outdoor-creative-workshop','chronicle-families-support']);
  assert.equal(await page.locator('[data-chronicle-carousel]').count(),1);
  const ids=await page.locator('main img[data-image-id]').evaluateAll(es=>es.map(e=>e.dataset.imageId));assert.equal(ids.length,new Set(ids).size);
  await mission.locator('img').evaluateAll(es=>Promise.all(es.map(i=>{i.loading='eager';return i.decode();})));assert.ok(await mission.locator('img').evaluateAll(es=>es.every(i=>getComputedStyle(i).objectFit==='contain'&&i.naturalWidth>0)));
  for(const button of await mission.locator('[data-photo]').all()){await button.click();assert.ok(await page.locator('dialog').isVisible());await page.keyboard.press('Escape');}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if([390,768,1440].includes(width))await page.locator('[data-community-mission]').screenshot({path:path.join(audit,`mission-composition-${tag}-${lang}-${width}.png`)});
  report.layouts.push({lang,width,photos:3,static:true,fullFrame:true});
 }
 for(const lang of ['uk','en']){await page.goto(`${base}/${lang}/resources/`);const link=page.locator('a[href="https://ugcc.ua/library/bible/"]');assert.equal(await link.count(),1);assert.equal(await link.getAttribute('target'),'_blank');report.bible.push({lang,status:'PASS'});}
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}finally{await browser.close();fs.writeFileSync(path.join(audit,`mission-carousel-${tag}-verification.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,layouts:report.layouts.length},null,2));}
