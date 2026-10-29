import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {parseDate,addDays,shiftMonth,periodDays,makeICS,confirmed} from '../assets/calendar-core.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),audit=path.resolve(root,'../audit'),base=process.env.PORTAL_BASE_URL||'http://localhost:4173',tag=base.startsWith('http://localhost')?'local':'production';
fs.mkdirSync(audit,{recursive:true});
const read=f=>JSON.parse(fs.readFileSync(path.join(root,'content',f+'.json')));
const index=read('calendar/index'),all=index.available_years.flatMap(y=>['church','eparchy','parish'].flatMap(g=>read(`calendar/${y}/${g}`).events));
const report={base,status:'RUNNING',calendarData:{records:all.length,years:index.available_years,parishEvents:all.filter(e=>e.source_url===index.sources.parish).length},checks:[],errors:[],accessibility:[],screenshots:[]};
assert.equal(parseDate('2026-02-29'),null);assert.ok(parseDate('2028-02-29'));assert.equal(shiftMonth('2026-01-31',1),'2026-02-28');assert.equal(shiftMonth('2028-03-31',-1),'2028-02-29');assert.equal(addDays('2026-12-31',1),'2027-01-01');
for(let month=1;month<=12;month++){const date=`2026-${String(month).padStart(2,'0')}-15`,days=periodDays(date);assert.equal(days.length%7,0);assert.equal(parseDate(days[0]).getUTCDay(),1);assert.ok(days.includes(date));assert.equal(periodDays(date,'week').length,7);}
for(const e of all){assert.ok(confirmed(e)&&parseDate(e.date));assert.ok(e.title.uk&&e.title.en);assert.ok(Object.values(index.sources).includes(e.source_url));for(const lang of ['uk','en']){const ics=makeICS(e,lang);assert.ok(ics.endsWith('END:VCALENDAR\r\n'));assert.ok(ics.includes('DTEND;VALUE=DATE:'+addDays(e.end_date||e.date,1).replaceAll('-','')));assert.ok(ics.split('\r\n').every(line=>Buffer.byteLength(line)<=75));}}
assert.throws(()=>makeICS({id:'unconfirmed',date:'2026-10-29',status:'draft'}));
for(const [year,anchors] of Object.entries(index.paschal_anchors)){assert.equal(parseDate(anchors.pascha).getUTCDay(),0);assert.equal(addDays(anchors.pascha,39),anchors.ascension);assert.equal(addDays(anchors.pascha,49),anchors.pentecost);assert.ok(anchors.pascha.startsWith(year));}
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const screenshot=async(page,name,fullPage=false)=>{const file=`portal-${tag}-${name}.png`;await page.screenshot({path:path.join(audit,file),fullPage,animations:'disabled'});report.screenshots.push(file);};
const ready=async page=>{await page.evaluate(async()=>Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>{i.loading='eager';return i.decode().catch(()=>{});})));};
try{
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 for(const lang of ['uk','en']){
  await page.setViewportSize({width:390,height:844});await page.goto(`${base}/${lang}/calendar/?date=2026-10-29`);await page.locator('[data-calendar-day="2026-10-29"]').waitFor();
  assert.match(await page.locator('[data-calendar-details]').innerText(),lang==='uk'?/1 Сол 2:9–14/:/1 Thessalonians 2:9–14/);
  await page.locator('[data-calendar-day="2026-10-29"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-calendar-date]').inputValue(),'2026-10-30');
  await page.locator('[data-calendar-view="week"]').click();assert.equal(await page.locator('[data-calendar-day]').count(),7);
  await page.locator('[data-calendar-date]').fill('2026-12-31');await page.locator('[data-calendar-date]').dispatchEvent('change');await page.locator('[data-calendar-step="1"]').click();assert.match(await page.locator('[data-calendar-notice]').innerText(),lang==='uk'?/ще не підтверджені/:/not yet been confirmed/);assert.equal(await page.locator('[data-event-id]').count(),0);
  await page.locator('[data-calendar-date]').fill('2028-02-29');await page.locator('[data-calendar-date]').dispatchEvent('change');assert.equal(await page.locator('[data-calendar-day="2028-02-29"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-calendar-view="month"]').click();await page.locator('[data-calendar-date]').fill('2026-11-28');await page.locator('[data-calendar-date]').dispatchEvent('change');
  await page.locator('[data-calendar-tab="eparchy"]').click();await page.locator('[data-calendar-category]').selectOption('retreat');assert.ok((await page.locator('[data-calendar-details]').innerText()).includes(lang==='uk'?'Матері в молитві':'Mothers in Prayer'));
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-export-event="mothers-retreat"]').click();const download=await downloadPromise;const downloadPath=await download.path();const ics=fs.readFileSync(downloadPath,'utf8');assert.ok(ics.includes('DTSTART;VALUE=DATE:20261127'));assert.ok(ics.includes('DTEND;VALUE=DATE:20261130'));fs.writeFileSync(path.join(audit,`sample-${lang}-mothers-retreat.ics`),ics);
  await page.locator('.language').click();await page.waitForURL(url=>url.pathname.includes('/calendar/')&&url.pathname.startsWith(lang==='uk'?'/en/':'/uk/'));assert.equal(new URL(page.url()).searchParams.get('date'),'2026-11-28');assert.equal(new URL(page.url()).searchParams.get('tab'),'eparchy');assert.equal(await page.locator('[data-calendar-date]').inputValue(),'2026-11-28');
  await page.locator('[data-calendar-tab="parish"]').click();assert.equal(await page.locator('[data-export-event]').count(),0);assert.ok((await page.locator('[data-calendar-details]').innerText()).length>30);
  await page.locator('[data-calendar-tab="church"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-calendar-tab="eparchy"]').getAttribute('aria-selected'),'true');
  for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});await page.goto(`${base}/${lang}/`);await ready(page);await screenshot(page,`${lang}-home-${width}`,true);await page.evaluate(()=>window.scrollTo(0,0));await screenshot(page,`${lang}-home-first-screen-${width}`);await page.locator('.header').screenshot({path:path.join(audit,`portal-${tag}-${lang}-header-${width}.png`)});
   assert.ok(await page.locator('.language-switch a,.language-current,.menu-toggle').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44;})),'44px header touch areas');
   const rects=await page.locator('.brand,.language-switch,.menu-toggle').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
   for(let a=0;a<rects.length;a++)for(let b=a+1;b<rects.length;b++){
    const x=rects[a],y=rects[b];
    assert.ok(x.right<=y.left+.5||y.right<=x.left+.5||x.bottom<=y.top+.5||y.bottom<=x.top+.5,'Header controls must remain separate in either header arrangement');
   }
   await page.locator('.menu-toggle').click();await page.locator('.nav-group summary').nth(1).click();await screenshot(page,`${lang}-menu-${width}`);assert.ok(await page.locator('#navigation').evaluate(e=>e.getBoundingClientRect().right<=innerWidth&&e.getBoundingClientRect().bottom<=innerHeight));
   await page.locator('.nav-group summary').nth(2).click();assert.equal(await page.locator('.nav-group[open]').count(),1);await page.keyboard.press('Escape');await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
   await page.locator('.menu-toggle').click();await page.locator('#navigation > a').last().click();assert.ok(page.url().includes('/contacts/'));assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
   await page.goto(`${base}/${lang}/calendar/?date=2026-10-29`);await page.locator('[data-calendar-day]').first().waitFor();await screenshot(page,`${lang}-calendar-${width}`,true);await page.locator('.calendar-shell').screenshot({path:path.join(audit,`portal-${tag}-${lang}-calendar-detail-${width}.png`)});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   report.checks.push({lang,width,header:'PASS',menu:'PASS',calendar:'PASS'});
  }
  for(const slug of ['history','resources','calendar']){
   await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/${lang}/${slug}/`);if(slug==='calendar')await page.locator('[data-calendar-day]').first().waitFor();await ready(page);await screenshot(page,`${lang}-${slug}-1440`,true);
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({lang,slug,violations:axe.violations});
  }
  await page.goto(`${base}/${lang}/history/`);assert.equal(await page.locator('.history-story').count(),4);await page.locator('[data-history-category="village"]').click();assert.equal(await page.locator('[data-timeline-item]:visible').count(),1);assert.match(await page.locator('[data-timeline-item]:visible').innerText(),/1381/);await page.locator('[data-history-category="all"]').click();assert.equal(await page.locator('[data-timeline-item]:visible').count(),12);
  await page.setViewportSize({width:390,height:844});await screenshot(page,`${lang}-history-390`,true);await page.goto(`${base}/${lang}/resources/`);await screenshot(page,`${lang}-resources-390`,true);
  for(const width of [390,1440]){
   const mapPage=await context.newPage();
   await mapPage.setViewportSize({width,height:width<500?844:1000});let googleRequests=0;const listener=req=>{if(/google\.com\/maps/.test(req.url()))googleRequests++;};mapPage.on('request',listener);
   await mapPage.goto(`${base}/${lang}/contacts/`);assert.equal(await mapPage.locator('.map-frame iframe').count(),0);assert.equal(googleRequests,0,'No Google connection before consent');
   await mapPage.locator('[data-load-map]').click();const frame=mapPage.locator('.map-frame iframe');await frame.waitFor();assert.ok((await frame.getAttribute('src')).startsWith('https://www.google.com/maps/embed?pb='));await mapPage.waitForFunction(()=>document.querySelector('.map-frame iframe')?.contentWindow!==null);
   await mapPage.waitForTimeout(1800);await mapPage.locator('.find-church').scrollIntoViewIfNeeded();await screenshot(mapPage,`${lang}-map-${width}`);await mapPage.locator('.find-church').screenshot({path:path.join(audit,`portal-${tag}-${lang}-map-block-${width}.png`)});
   assert.match(await mapPage.locator('.map-actions a').first().getAttribute('href'),/destination=48\.670772%2C22\.752723/);assert.equal(await mapPage.locator('.map-actions a').last().getAttribute('href'),'https://maps.app.goo.gl/C3U3LFnu9HUtSBBB9');assert.ok(googleRequests>=1);mapPage.off('request',listener);await mapPage.close();
   report.checks.push({lang,width,mapConsent:'PASS',exactPin:'48.670772,22.752723',mapRequest:'PASS'});
  }
  await page.setViewportSize({width:390,height:844});await page.goto(`${base}/${lang}/`);await page.locator('.menu-toggle').click();await page.setViewportSize({width:1440,height:900});assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');assert.ok(await page.locator('#navigation').isVisible());await page.setViewportSize({width:390,height:844});assert.ok(!await page.locator('#navigation').isVisible());
 }
 // Actual touch context: calendar selection and submenu navigation, no mouse emulation.
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),touch=await mobile.newPage();await touch.goto(`${base}/uk/calendar/?date=2026-10-29`);await touch.locator('[data-calendar-day="2026-10-31"]').tap();assert.equal(await touch.locator('[data-calendar-date]').inputValue(),'2026-10-31');await touch.locator('[data-calendar-tab="eparchy"]').tap();assert.ok((await touch.locator('[data-calendar-details]').innerText()).includes('Березово'));await mobile.close();
 assert.equal(report.errors.length,0);assert.equal(report.accessibility.flatMap(a=>a.violations).length,0);report.status='PASS';
}finally{await browser.close();fs.writeFileSync(path.join(audit,`portal-${tag}-verification.json`),JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,base,calendarData:report.calendarData,checks:report.checks.length,screenshots:report.screenshots.length,accessibility:report.accessibility.map(a=>({lang:a.lang,slug:a.slug,violations:a.violations.length})),errors:report.errors},null,2));
