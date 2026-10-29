import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'dist');
const site=JSON.parse(fs.readFileSync(path.join(root,'content/site.json'))),base=site.production_url;
assert.ok(base&&site.publication_approved,'Approved production URL required');
const audit=path.resolve(root,'../audit');fs.mkdirSync(audit,{recursive:true});
const routes=JSON.parse(fs.readFileSync(path.join(out,'routes.json'))),hash=b=>createHash('sha256').update(b).digest('hex');
const report={date:'2026-10-29',url:base,status:'RUNNING',http:[],layouts:[],accessibility:[],jsErrors:[],interactions:[]};
for(const route of [...routes,'/assets/site.css','/assets/app.js','/assets/favicon.svg','/assets/og-card.png','/robots.txt','/sitemap.xml']){
 const response=await fetch(base+route),bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,route);
 const local=fs.readFileSync(path.join(out,route.endsWith('/')?route.slice(1)+'index.html':route.slice(1)));
 assert.equal(hash(bytes),hash(local),`Live bytes must match local production build: ${route}`);
 report.http.push({route,status:response.status,bytes:bytes.length,sha256:hash(bytes),exactMatch:true});
 if(route.endsWith('/')){const html=bytes.toString();assert.ok(html.includes(`<html lang="${route.startsWith('/uk/')?'uk':'en'}">`));assert.ok(html.includes('content="index, follow"'));assert.ok(!html.includes('preview-label'));assert.ok(html.includes(`rel="canonical" href="${base}${route}"`));}
}
const notFound=await fetch(base+'/not-a-parish-page/');assert.equal(notFound.status,404);report.notFoundStatus=notFound.status;
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
try{
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>report.jsErrors.push(e.message));
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:width<600?844:1000});
  for(const route of routes){
   await page.goto(base+route);
   const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,brokenImages:[...document.images].filter(i=>i.getAttribute('src')&&(!i.complete||!i.naturalWidth)).length}));
   assert.ok(!metrics.overflow&&!metrics.brokenImages,`Layout/images: ${width} ${route}`);report.layouts.push({width,route,...metrics});
   if(width===1440){const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.equal(a.violations.length,0,`Accessibility: ${route}`);report.accessibility.push({route,violations:a.violations.length});}
   if(['/uk/','/en/'].includes(route)&&[390,1440].includes(width))await page.screenshot({path:path.join(audit,`production-${route.slice(1,3)}-${width}.png`),fullPage:true});
  }
 }
 for(const lang of ['uk','en']){
  await page.setViewportSize({width:390,height:844});await page.goto(base+`/${lang}/`);await page.locator('.menu-toggle').click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
  const carousel=page.locator('.carousel');await page.locator('[data-slide="1"]').click();assert.ok(await carousel.evaluate(e=>e.scrollLeft>0));
  await page.goto(base+`/${lang}/history/`);await page.locator('[data-era="church"]').click();assert.equal(await page.locator('[data-timeline-item]:visible').count(),3);await page.locator('.language').click();assert.ok(page.url().includes(`/${lang==='uk'?'en':'uk'}/history/`));
  report.interactions.push({language:lang,menu:'PASS',carousel:'PASS',timeline:'PASS',languageCounterpart:'PASS'});
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/uk/');await page.screenshot({path:path.join(audit,'production-home-preview.png')});
 assert.equal(report.jsErrors.length,0);report.status='PASS';
}finally{await browser.close();fs.writeFileSync(path.join(audit,'production-verification.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,url:base,http_checks:report.http.length,layout_checks:report.layouts.length,accessibility_pages:report.accessibility.length,jsErrors:report.jsErrors,interactions:report.interactions},null,2));
