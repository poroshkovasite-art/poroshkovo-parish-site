import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {chromium} from 'playwright';import AxeBuilder from '@axe-core/playwright';
import {photoApproved,photoExcluded} from './parish-photos.mjs';
const read=n=>JSON.parse(fs.readFileSync(`content/${n}.json`)),book=read('divine-liturgy'),source=read('liturgy-transcription-source'),selection=read('home-carousel'),catalog=read('parish-photo-catalog'),photos=[...read('photos'),...catalog.photos],base=process.env.BOOK_BASE_URL||'http://localhost:4186';
const hash=b=>createHash('sha256').update(b).digest('hex'),plain=s=>s.replace(/[\s{}-]/g,'');
assert.equal(plain(source.map(x=>x.text).join('')),plain(book.blocks.map(x=>x.text).join('')),'All annotated transcription text is retained, including continuations and source repetitions');
assert.deepEqual([...new Set(source.map(x=>x.page))],Array.from({length:65},(_,i)=>i+2));assert.equal(book.blocks.filter(b=>b.type==='footnote').length,3);assert.equal(book.blocks.filter(b=>b.type==='figure').length,1);
for(const b of book.blocks){assert.equal(b.runs.map(r=>r.text).join(''),b.text);assert.ok(b.roles.every(r=>['priest','deacon','people','reader','choir'].includes(r)));if(b.type==='speech')assert.ok(b.roles.length);}
for(const p of book.pages){assert.equal(hash(fs.readFileSync('.'+p.src)),p.sha256);assert.ok(p.width>1000&&p.height>1500);}
assert.ok(fs.statSync('approved-documents/parish-divine-liturgy-source.pdf').size<25*1024*1024);assert.equal(selection.entries.length,new Set(selection.entries.map(e=>e.photo_id)).size);assert.ok(selection.entries.length>8);
for(const entry of selection.entries){const p=photos.find(p=>p.id===entry.photo_id);assert.ok(p&&photoApproved(p)&&!photoExcluded(p));for(const l of ['uk','en'])assert.ok(entry.title[l]&&entry.description[l]);}
const report={base,status:'RUNNING',blocks:book.blocks.length,sourcePages:66,footnotes:3,slides:selection.entries.length,layouts:[],errors:[],a11y:[]},browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const ctx=await browser.newContext({reducedMotion:'reduce'}),p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(e.message));for(const l of ['uk','en'])for(const width of [320,390,768,1024,1440,1920]){
 await p.setViewportSize({width,height:1000});await p.goto(`${base}/${l}/divine-liturgy/`);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(l==='uk'){
 assert.equal(await p.locator('.book-block').count(),book.blocks.length);assert.deepEqual(await p.locator('.book-text').allTextContents(),book.blocks.map(b=>b.text));
 assert.equal(await p.locator('[data-scan-src][src]').count(),0,'No scan images requested before viewing');
 await p.locator('a[data-scan-link="48"]').first().click();await p.locator('#scan-48 img').evaluate(i=>i.decode());assert.ok(await p.locator('#scan-48').evaluate(d=>d.open));
 assert.equal(await p.locator('[data-scan-src][src]').count(),1);await p.locator('.book-back-top').click();
 await p.locator('[data-reader-size="up"]').click();assert.equal(await p.locator('.book-speech .book-text').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)),24);
 await p.locator('[data-reader-mode]').click();assert.ok(await p.locator('body').evaluate(e=>e.classList.contains('reading-mode')));await p.keyboard.press('Escape');
 await p.locator('.reader-toolbar a[href="#liturgy-contents"]').click();assert.ok(await p.locator('[data-reader-contents]').evaluate(e=>e.open));
 for(const a of await p.locator('.liturgy-toc a').all()){const href=await a.getAttribute('href');assert.equal(await p.locator(href).count(),1);}
 if(width===390||width===1440){const a=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(a.violations,[]);report.a11y.push({l,width,violations:0});}
 await p.emulateMedia({media:'print'});assert.equal(await p.locator('.reader-toolbar').isVisible(),false);assert.ok(await p.locator('.book-speech').first().isVisible());await p.emulateMedia({media:'screen'});
 }else{assert.equal(await p.locator('.book-block,[data-scan-page]').count(),0);assert.equal(await p.locator('[data-liturgy-language-link] a[href="/uk/divine-liturgy/"]').count(),1);}
 await p.goto(`${base}/${l}/`);assert.equal(await p.locator('[data-community-mission]').count(),1);assert.equal(await p.locator('[data-community-mission] h2').count(),1);assert.equal(await p.locator('h2').filter({hasText:'Життя нашої парафії'}).count(),0);assert.equal(await p.locator('[data-mission-composition]').count(),0);assert.deepEqual(await p.locator('.chronicle-slide [data-photo-id]').evaluateAll(es=>es.map(e=>e.dataset.photoId)),selection.entries.map(e=>e.photo_id));
 const anchors=await p.locator('.chronicle-slide .photo-mission-link').evaluateAll(es=>es.map(e=>e.getAttribute('href')));for(const href of anchors){const r=await p.request.get(base+href.split('#')[0]);assert.equal(r.status(),200);if(href.includes('#'))assert.ok((await r.text()).includes(`id="${href.split('#')[1]}"`));}
 report.layouts.push({l,width,status:'PASS'});
}assert.deepEqual(report.errors,[]);report.status='PASS';}finally{await browser.close();fs.writeFileSync('../audit/liturgy-new-20261102/book-qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
