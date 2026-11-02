import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),audit=path.resolve(root,'../audit'),base=process.env.HERO_BUILDINGS_BASE_URL||'http://localhost:4173',tag=base.includes('localhost')?'local':'production';
const photos=JSON.parse(fs.readFileSync(path.join(root,'content/photos.json'))),newPhoto=photos.find(p=>p.id==='parish-administrative-building'),hash=b=>createHash('sha256').update(b).digest('hex'),report={status:'RUNNING',base,layouts:[],errors:[],oldPhotoAssetsUnchanged:0};fs.mkdirSync(audit,{recursive:true});
// Every pre-existing photograph and original record is unchanged.
const oldPhotos=JSON.parse(execFileSync('git',['show','0bc9dd399c2124cc4ecb85591c35b8343be878e1:content/photos.json'],{cwd:root,encoding:'utf8'}));
for(const p of oldPhotos){assert.deepEqual(photos.find(n=>n.id===p.id),p);for(const w of p.widths){const rel=`assets/photos/${p.id}-${w}.webp`;assert.equal(hash(fs.readFileSync(path.join(root,rel))),hash(execFileSync('git',['show',`0bc9dd399c2124cc4ecb85591c35b8343be878e1:${rel}`],{cwd:root,maxBuffer:10*1024*1024})));report.oldPhotoAssetsUnchanged++;}}
assert.equal(newPhoto.rights_confirmed,true);assert.equal(newPhoto.contains_children,false);const original=path.join(root,'private-materials/administrative-building',newPhoto.original_file);report.originalSourceAvailable=fs.existsSync(original);if(report.originalSourceAvailable)assert.equal(hash(fs.readFileSync(original)),newPhoto.original_sha256);
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 for(const lang of ['uk','en'])for(const width of [320,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.goto(`${base}/${lang}/`);await page.locator('[data-hero-buildings] img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  const pair=page.locator('[data-hero-buildings]');assert.deepEqual(await pair.locator('[data-photo-id]').evaluateAll(es=>es.map(e=>e.dataset.photoId)),['church-exterior','parish-administrative-building']);
  const cards=await pair.locator(':scope>figure').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));if(width>620)assert.ok(Math.abs(cards[0].height-cards[1].height)<1,'Whole building cards have equal heights');assert.equal(await pair.locator('figcaption p').count(),0,'Detailed building description belongs on About');
  const geometry=await pair.locator('.photo-visual').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));assert.ok(Math.abs(geometry[0].height-geometry[1].height)<1,'Equal image heights');
  if(width>620){assert.ok(Math.abs(geometry[0].y-geometry[1].y)<1);assert.ok(geometry[1].x>=geometry[0].right);}else assert.ok(geometry[1].y>geometry[0].bottom);
  const completeHeights=await pair.locator('figure').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));assert.ok(Math.abs(completeHeights[0]-completeHeights[1])<1,'Equal complete hero card heights');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.ok(await pair.locator('img').evaluateAll(es=>es.every(i=>getComputedStyle(i).objectFit==='contain'&&i.naturalWidth>0&&i.srcset)));
  assert.equal(await pair.locator('figcaption strong').first().innerText(),lang==='uk'?'Наш храм':'Our Church');assert.equal(await pair.locator('figcaption strong').last().innerText(),lang==='uk'?'Парафіяльний дім':'Parish House');
  for(const id of ['church-exterior','parish-administrative-building']){await pair.locator(`[data-photo-id="${id}"]`).click();assert.ok(await page.locator('dialog').isVisible());await page.locator('dialog img').evaluate(i=>i.decode());assert.ok((await page.locator('dialog img').getAttribute('src')).includes(id));await page.keyboard.press('Escape');}
  if([390,768,1440].includes(width)){await page.locator('.hero').screenshot({path:path.join(audit,`hero-buildings-${tag}-${lang}-${width}.png`)});const a=await new AxeBuilder({page}).include('.hero').analyze();assert.deepEqual(a.violations,[]);}
  report.layouts.push({lang,width,status:'PASS'});
 }
 for(const lang of ['uk','en'])for(const slug of ['about','gallery']){await page.goto(`${base}/${lang}/${slug}/`);assert.equal(await page.locator('[data-photo-id="parish-administrative-building"]').count(),1);if(slug==='gallery'){await page.locator('[data-theme-filter="buildings"]').click();assert.ok(await page.locator('[data-photo-id="parish-administrative-building"]').isVisible());}}
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}finally{await browser.close();fs.writeFileSync(path.join(audit,`hero-buildings-${tag}-verification.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,layouts:report.layouts.length,oldPhotoAssetsUnchanged:report.oldPhotoAssetsUnchanged,errors:report.errors,failure:report.failure},null,2));}
