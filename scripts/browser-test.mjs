import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const audit=path.resolve(root,'../audit');fs.mkdirSync(audit,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const routes=JSON.parse(fs.readFileSync(path.join(root,'dist/routes.json')));
const widths=[320,360,375,390,430,768,1024,1440,1920];
const results=[],failures=[],errors=[],axe=[];
const context=await browser.newContext({reducedMotion:'reduce'});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',message=>{if(message.type()==='error'&&!page.url().includes('/no-such-page/'))errors.push(message.text());});
try {
 for(const width of widths){
  await page.setViewportSize({width,height:900});
  for(const route of routes){
   const response=await page.goto('http://localhost:4173'+route);assert.equal(response.status(),200,route);
   await page.evaluate(()=>document.fonts.ready);
   const measured=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,brokenImages:[...document.images].filter(i=>i.getAttribute('src')&&(!i.complete||i.naturalWidth===0)).length,h1:document.querySelectorAll('h1').length,invalidRects:[...document.querySelectorAll('main h1,main h2,main p')].filter(e=>{if(e.closest('.carousel'))return false;const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).map(e=>e.textContent.slice(0,50))}));
   results.push({width,route,...measured});if(measured.overflow||measured.brokenImages||measured.h1!==1||measured.invalidRects.length)failures.push({width,route,...measured});
   const expected=route.startsWith('/uk/')?route.replace('/uk/','/en/'):route.replace('/en/','/uk/');assert.equal(await page.locator('.language').getAttribute('href'),expected);
  }
 }
 for(const lang of ['uk','en']){
  await page.setViewportSize({width:390,height:844});await page.goto(`http://localhost:4173/${lang}/`);
  await page.locator('.menu-toggle').click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');assert.ok(await page.locator('#navigation').isVisible());
  await page.locator('.nav-group summary').first().click();assert.ok(await page.locator('.nav-dropdown').first().isVisible());await page.keyboard.press('Escape');
  assert.equal(await page.locator('.nav-group').first().getAttribute('open'),null);await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
  const carousel=page.locator('.carousel');await carousel.scrollIntoViewIfNeeded();await page.locator('[data-slide="1"]').click();assert.ok(await carousel.evaluate(e=>e.scrollLeft>0),'Arrow advances carousel');
  await carousel.focus();await page.keyboard.press('ArrowLeft');assert.ok(await carousel.evaluate(e=>e.scrollLeft<=3),'Keyboard returns carousel to first card, allowing snap padding');
  await page.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,0);});await page.screenshot({path:path.join(audit,`${lang}-home-mobile-390.png`),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.goto(`http://localhost:4173/${lang}/`);await page.screenshot({path:path.join(audit,`${lang}-home-desktop-1440.png`),fullPage:true});
  const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();axe.push({route:`/${lang}/`,violations:accessibility.violations});
  await page.goto(`http://localhost:4173/${lang}/history/`);await page.locator('[data-era="church"]').click();assert.equal(await page.locator('[data-timeline-item]:visible').count(),3);assert.equal(await page.locator('[data-timeline-count]').innerText(),'3');await page.locator('[data-era="all"]').click();assert.equal(await page.locator('[data-timeline-item]:visible').count(),11);
  await page.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,0);});await page.screenshot({path:path.join(audit,`${lang}-history-desktop-1440.png`),fullPage:true});
  const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();axe.push({route:`/${lang}/history/`,violations:a.violations});
  await page.locator('.language').click();assert.ok(page.url().includes(`/${lang==='uk'?'en':'uk'}/history/`));
 }
 for(const route of routes.filter(r=>!['/uk/','/en/','/uk/history/','/en/history/'].includes(r))){await page.goto('http://localhost:4173'+route);const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();axe.push({route,violations:a.violations});}
 for(const lang of ['uk','en']){await page.setViewportSize({width:320,height:800});await page.goto(`http://localhost:4173/${lang}/`);await page.screenshot({path:path.join(audit,`${lang}-home-mobile-320.png`),fullPage:true});await page.goto(`http://localhost:4173/${lang}/history/`);await page.screenshot({path:path.join(audit,`${lang}-history-mobile-320.png`),fullPage:true});}
 // Test dormant gallery components on an isolated DOM fixture; no fixture is written to dist.
 const {createComponents}=await import('./components.mjs');
 const read=f=>JSON.parse(fs.readFileSync(path.join(root,'content',f+'.json')));
 const photos=[1,2].map(i=>({id:`test-${i}`,category:i===1?'church':'community',publication_status:'approved',rights_confirmed:true,width:1200,height:630,widths:[960],alt:{uk:`Тест ${i}`,en:`Test ${i}`},caption:{uk:`Тест ${i}`,en:`Test ${i}`},credit:'QA fixture'}));
 const C=createComponents({site:read('site'),pages:read('pages'),ui:read('ui'),sources:read('sources'),photos,people:[],schedule:read('schedule')});
 const fixture=context;await fixture.route('**/assets/photos/test-*',r=>r.fulfill({status:200,contentType:'image/png',body:fs.readFileSync(path.join(root,'assets/og-card.png'))}));
 await page.goto('http://localhost:4173/uk/');await page.setContent(`<html lang="uk"><head><link rel="stylesheet" href="http://localhost:4173/assets/site.css"></head><body>${C.Gallery('uk')}${C.Lightbox('uk')}<script src="http://localhost:4173/assets/app.js"></script></body></html>`);
 await page.locator('[data-photo-filter="church"]').click();assert.equal(await page.locator('[data-photo-card]:visible').count(),1);await page.locator('[data-photo-filter="all"]').click();
 await page.locator('[data-photo]').first().click();assert.ok(await page.locator('dialog').isVisible());await page.keyboard.press('ArrowRight');assert.ok((await page.locator('dialog figcaption').innerText()).startsWith('2 / 2'));await page.keyboard.press('Escape');assert.ok(!await page.locator('dialog').isVisible());assert.ok(await page.locator('[data-photo]').first().evaluate(e=>e===document.activeElement));
 // An actual mobile browser context verifies touch scrolling and swipe in the gallery.
 const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),touch=await touchContext.newPage();
 await touch.goto('http://localhost:4173/en/');await touch.locator('.menu-toggle').tap();assert.equal(await touch.locator('.menu-toggle').getAttribute('aria-expanded'),'true');await touch.locator('.menu-toggle').tap();
 const cdp=await touchContext.newCDPSession(touch);await touch.locator('.carousel').scrollIntoViewIfNeeded();const box=await touch.locator('.carousel').boundingBox(),y=Math.round(box.y+Math.min(box.height/2,180));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:340,y}]});for(const x of [290,240,190,140,90,45])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await touch.waitForFunction(()=>document.querySelector('.carousel').scrollLeft>0);await touchContext.close();
 const response=await page.goto('http://localhost:4173/no-such-page/');assert.equal(response.status(),404);
 const report={date:'2026-10-29',status:failures.length||errors.length||axe.some(a=>a.violations.length)?'FAIL':'PASS',browser:'Chromium via Playwright',widths,route_checks:results.length,results,failures,errors,axe,interaction_checks:['mobile menu','group menu Escape and focus','page-preserving language switch','carousel buttons, keyboard and real touch swipe','timeline filters/count','isolated gallery filter/modal/keyboard/focus fixture','404 HTTP status'],limitations:['No real parish photographs supplied. Gallery tested with isolated QA fixture, not parish media.','Lighthouse score not measured.','No production deployment requested.']};
 fs.writeFileSync(path.join(audit,'browser-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,results:undefined,axe:axe.map(a=>({route:a.route,violations:a.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>n.target)}))}))},null,2));
 assert.equal(report.status,'PASS','Browser QA found issues; see audit/browser-report.json');
} finally {await browser.close();}
