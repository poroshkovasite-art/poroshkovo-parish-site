import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {photoApproved,photoExcluded} from './parish-photos.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),audit=path.resolve(root,'../audit');
const base=process.env.RESTRUCTURE_BASE_URL||'http://localhost:4173',tag=base.includes('localhost')?'local':'production';
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'content',n+'.json'))),mission=read('community-mission'),catalog=read('parish-photo-catalog'),social=read('social-ministry');
assert.deepEqual(social.ministry_directions,mission.ministry_directions);assert.equal(mission.ministry_directions.length,7);
for(const p of catalog.photos){assert.ok(['approved','pending_approval'].includes(p.publication_status));assert.equal(photoApproved(p),p.publication_status==='approved'&&!photoExcluded(p));if(photoApproved(p))assert.ok(p.rights_confirmed&&p.consents_confirmed&&p.consent_reference);}
assert.equal(catalog.missing[0].status,'missing');
for(const id of ['chronicle-summer-camp-friendship','chronicle-church-grounds-cleanup']){
 assert.ok(photoExcluded({id}));
 assert.equal(photoApproved({...catalog.photos.find(p=>p.id===id),publication_status:'approved',rights_confirmed:true,consents_confirmed:true}),false,'Owner exclusion overrides later general approvals');
}
const report={status:'RUNNING',base,checkedAt:new Date().toISOString(),layouts:[],maps:[],accessibility:[],errors:[],googleRequests:[],fallback:null};
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const ctx=await browser.newContext({reducedMotion:'reduce'}),page=await ctx.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 page.on('request',r=>{if(/https:\/\/([\w-]+\.)?google\./.test(r.url()))report.googleRequests.push(r.url());});
 for(const lang of ['uk','en'])for(const width of [320,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.goto(`${base}/${lang}/`);
  await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('main img:not(.leaflet-tile):not(.leaflet-marker-icon):not(.leaflet-marker-shadow)')].map(i=>{i.loading='eager';return i.decode();}));});
  const order=await page.locator('main>section').evaluateAll(es=>es.map(e=>e.matches('.hero')?'hero':e.hasAttribute('data-community-mission')?'mission':e.querySelector('[data-chronicle-carousel]')?'carousel':e.hasAttribute('data-mission-services')?'services':e.querySelector('.history-teaser')?'history':e.id==='find-church'?'contacts':e.hasAttribute('data-home-support')?'support':'unexpected'));
  assert.deepEqual(order,['hero','mission','carousel','services','history','contacts','support']);
  const photoIds=await page.locator('main img[data-image-id]').evaluateAll(imgs=>imgs.map(i=>i.dataset.imageId));
  assert.equal(new Set(photoIds).size,photoIds.length,'No repeated home photograph');
  assert.equal(await page.locator('[data-community-mission] [data-photo-id]').count(),3);assert.equal(await page.locator('[data-mission-carousel],[data-mission-step]').count(),0);
  assert.equal(await page.locator('[data-service]').count(),4);assert.equal(await page.locator('[data-ministry-direction]').count(),7);
  assert.equal(await page.locator('#navigation a[href$="/first-visit/"],#navigation a[href$="/support/"],[data-feature-carousel],[data-load-map],.map-consent').count(),0);
  assert.equal(await page.locator('[data-home-support] .home-iban').innerText(),read('support').accounts[0].iban);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const slug of ['','contacts/']){
   if(slug)await page.goto(`${base}/${lang}/${slug}`);
   await page.locator('[data-parish-map][data-map-ready="true"]').waitFor();
   const map=page.locator('[data-parish-map]');await map.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>[...document.querySelectorAll('.leaflet-tile')].some(i=>i.complete&&i.naturalWidth>0),{timeout:30000});
   const details=await map.evaluate(e=>({point:e.parishMarker.getLatLng(),zoom:e.parishMap.getZoom(),title:e.parishMarker.options.title,tileUrl:e.dataset.tileUrl,attribution:e.querySelector('.leaflet-control-attribution').textContent}));
   assert.equal(details.point.lat,48.67082394012906);assert.equal(details.point.lng,22.752845895344038);assert.equal(details.zoom,17);assert.equal(details.title,lang==='uk'?'Храм святих Кирила і Методія':'Church of Saints Cyril and Methodius');assert.match(details.attribution,/OpenStreetMap/);
   await map.locator('.leaflet-control-zoom-in').click();await page.waitForFunction(()=>document.querySelector('[data-parish-map]').parishMap.getZoom()===18);
   await page.waitForTimeout(500);
   const before=await map.evaluate(e=>e.parishMap.getCenter().lng),box=await map.boundingBox();
   await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5,{steps:12});await page.mouse.up();
   await page.waitForTimeout(300);assert.notEqual(await map.evaluate(e=>e.parishMap.getCenter().lng),before);
   assert.equal(await page.locator('.map-actions a').last().getAttribute('href'),read('site').contact.map_url);assert.equal(await page.locator('.map-actions a').first().getAttribute('href'),read('site').contact.directions_url);
   report.maps.push({lang,width,slug:slug||'home',...details,zoomAndPan:'PASS',googleOnLoad:false});
   await map.evaluate(e=>e.parishMap.setView(e.parishMarker.getLatLng(),17,{animate:false}));
   if([390,768,1440].includes(width))await page.locator('#find-church').screenshot({path:path.join(audit,`restructure-${tag}-${lang}-map-${slug?'contacts':'home'}-${width}.png`)});
  }
  await page.goto(`${base}/${lang}/`);
  if([390,768,1440].includes(width)){
   await page.evaluate(async()=>{for(const i of document.querySelectorAll('main img[data-image-id],img[data-historical-map]')){i.loading='eager';await i.decode();}});
   await page.screenshot({path:path.join(audit,`restructure-${tag}-${lang}-home-${width}.png`),fullPage:true});
  }
  if(width===1440){for(const slug of ['','contacts/','social-ministry/','community-impact/','history/']){
   await page.goto(`${base}/${lang}/${slug}`);if(['social-ministry/','community-impact/'].includes(slug))assert.equal(await page.locator('[data-ministry-direction]').count(),7);
   const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(a.violations,[],`${lang}/${slug} Axe`);report.accessibility.push({lang,slug:slug||'home',violations:0});
  }}
  report.layouts.push({lang,width,uniqueHomePhotos:photoIds.length,status:'PASS'});
 }
 // The standalone history visual is a complete, attributed map, not a fabricated local plan.
 for(const lang of ['uk','en']){await page.goto(`${base}/${lang}/history/`);assert.equal(await page.locator('[data-historical-map]').count(),1);assert.ok((await page.locator('.historical-map figcaption').innerText()).includes(read('historical-map').title[lang]));assert.equal(await page.locator('.historical-map .source-link').getAttribute('href'),read('historical-map').source_url);}
 await ctx.close();
 const failed=await browser.newContext();await failed.route('https://tile.openstreetmap.org/**',r=>r.abort());const fp=await failed.newPage();await fp.goto(base+'/uk/contacts/');await fp.locator('[data-map-status]:not([hidden])').waitFor();assert.equal(await fp.locator('.map-actions a').count(),2);assert.ok(await fp.locator('.map-static-fallback').isVisible());report.fallback='PASS';await failed.close();
 const noJS=await browser.newContext({javaScriptEnabled:false});const np=await noJS.newPage();await np.goto(base+'/en/contacts/');assert.ok(await np.locator('.map-static-fallback').isVisible());assert.equal(await np.locator('.map-actions a').count(),2);await noJS.close();
 assert.deepEqual(report.googleRequests,[]);assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}finally{await browser.close();fs.writeFileSync(path.join(audit,`restructure-${tag}-verification.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,maps:report.maps.length,layouts:report.layouts.length,accessibility:report.accessibility.length},null,2));}
