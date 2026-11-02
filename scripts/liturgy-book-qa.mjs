import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const read=n=>JSON.parse(fs.readFileSync(`content/${n}.json`));
const book=read('divine-liturgy'),word=read('liturgy-word-source'),library=read('catechesis-library');
const base=process.env.BOOK_BASE_URL||'http://localhost:4186',out=path.resolve('audit/liturgy-word');
fs.mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const squash=s=>s.replace(/\s+/g,' ').trim();
const expected=[...word.paragraphs,...word.footnotes];
assert.equal(book.word_reference.sha256,word.document_sha256);
assert.equal(book.blocks.length,expected.length);
for(let i=0;i<expected.length;i++){
 const b=book.blocks[i],w=expected[i];
 for(const key of Object.keys(w))assert.deepEqual(b[key],w[key],`${b.id} ${key}`);
 assert.equal(b.runs.map(r=>r.text).join(''),b.text);
 if(b.type==='figure')assert.deepEqual(b.diagram,w.diagram);
}
for(const p of book.pages)assert.equal(hash(fs.readFileSync('.'+p.src)),p.sha256);
assert.equal(hash(fs.readFileSync('approved-documents/parish-divine-liturgy-source.pdf')),book.source_sha256);
assert.ok(!fs.existsSync('dist/assets/liturgy-source'));
assert.ok(!fs.existsSync('dist/documents/parish-divine-liturgy-source.pdf'));
assert.ok(!fs.readdirSync('dist/documents').some(n=>/compendium/i.test(n)));
const baseline=fs.existsSync(path.join(out,'before.json'))?JSON.parse(fs.readFileSync(path.join(out,'before.json'))):[];
const report={base,status:'RUNNING',wordBlocks:book.blocks.length,footnotes:word.footnotes.length,archivedScans:book.pages.length,layouts:[],accessibility:[],errors:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const context=await browser.newContext({reducedMotion:'reduce'}),p=await context.newPage();
 p.on('pageerror',e=>report.errors.push(e.message));
 for(const language of ['uk','en'])for(const width of [320,390,768,1024,1440]){
  await p.setViewportSize({width,height:1000});
  assert.equal((await p.goto(`${base}/${language}/divine-liturgy/`)).status(),200);
  await p.evaluate(()=>document.fonts.ready);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`liturgy overflow ${language} ${width}`);
  assert.equal(await p.locator('h1').count(),1);
  assert.equal(await p.locator('[data-scan-page],[data-scan-src],.book-facsimile,a[href*="liturgy-source"],a[href$=".pdf"]').count(),0);
  if(language==='uk'){
   const actual=await p.locator('[data-word-block]').evaluateAll(es=>es.map(e=>{
    const copy=e.cloneNode(true);copy.querySelectorAll('.book-note-ref,.note-return,.book-anchor').forEach(n=>n.remove());
    const text=copy.querySelector('.book-text')?.textContent??[...copy.querySelectorAll('.lamb-cell')].map(c=>c.textContent).join(' ');
    return {id:e.dataset.wordBlock,text:text.trim()};
   }));
   assert.deepEqual(actual,book.blocks.map(b=>({id:b.id,text:b.text.trim()})),'Every Word paragraph, repetition, diagram and footnote is present in order');
   assert.ok((await p.locator('.liturgy-part').textContent()).includes('\u0301'),'Word stresses retained');
   assert.ok(await p.locator('.book-speaker').evaluateAll(es=>es.every(e=>getComputedStyle(e).display==='inline')));
   const height=await p.locator('.book-speech').evaluateAll(es=>es[29].getBoundingClientRect().bottom-es[0].getBoundingClientRect().top);
   const before=baseline.find(b=>b.width===width)?.first30Height;
   if(before)assert.ok(height<before*.75,`compact first 30 speeches ${width}: ${height}/${before}`);
   report.layouts.push({language,width,first30Height:height,beforeHeight:before,reduction:before?Math.round((1-height/before)*100)+'%':undefined});
   await p.locator('.book-speech').first().evaluate(e=>window.scrollTo(0,e.getBoundingClientRect().top+scrollY-110));
   await p.screenshot({path:path.join(out,`after-${width}.png`)});
   await p.locator('[data-reader-size="up"]').click();
   assert.equal(await p.locator('.book-speech .book-text').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)),24);
   for(let i=0;i<8;i++)if(await p.locator('[data-reader-size="up"]').isEnabled())await p.locator('[data-reader-size="up"]').click();
   assert.ok(await p.locator('[data-reader-size="up"]').isDisabled());
   assert.equal(await p.locator('.book-speech .book-text').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)),32);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow at largest font');
   for(let i=0;i<10;i++)if(await p.locator('[data-reader-size="down"]').isEnabled())await p.locator('[data-reader-size="down"]').click();
   assert.equal(await p.locator('.book-speech .book-text').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)),18);
   await p.locator('[data-reader-size="up"]').click();await p.locator('[data-reader-size="up"]').click();
   await p.locator('[data-reader-mode]').click();assert.equal(await p.locator('[data-reader-mode]').getAttribute('aria-pressed'),'true');
   await p.keyboard.press('Escape');assert.equal(await p.locator('[data-reader-mode]').getAttribute('aria-pressed'),'false');
   await p.locator('.reader-toolbar a[href="#liturgy-contents"]').click();assert.ok(await p.locator('[data-reader-contents]').evaluate(e=>e.open));
   for(const a of await p.locator('.liturgy-toc a').all())assert.equal(await p.locator(await a.getAttribute('href')).count(),1);
   for(const n of [1,2,3]){assert.equal(await p.locator(`#note-ref-${n}`).getAttribute('href'),`#liturgy-note-${n}`);assert.equal(await p.locator(`#liturgy-note-${n} .note-return`).getAttribute('href'),`#note-ref-${n}`);}
   await p.emulateMedia({media:'print'});assert.equal(await p.locator('.reader-toolbar').isVisible(),false);
   assert.equal(await p.locator('[data-word-block]').evaluateAll(es=>es.filter(e=>getComputedStyle(e).display!=='none').length),book.blocks.length);
   if(width===1440)await p.pdf({path:path.join(out,'liturgy-print-qa.pdf'),preferCSSPageSize:true,printBackground:true});
   await p.emulateMedia({media:'screen'});
  }else{
   assert.equal(await p.locator('[data-word-block]').count(),0);
   assert.equal(await p.locator('[data-liturgy-language-link] a[href="/uk/divine-liturgy/"]').count(),1);
   report.layouts.push({language,width});
  }
  if(width===390||width===1440){const a=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(a.violations,[]);report.accessibility.push({language,page:'liturgy',width,violations:0});}
  assert.equal((await p.goto(`${base}/${language}/catechesis/`)).status(),200);await p.evaluate(()=>document.fonts.ready);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`catechesis overflow ${language} ${width}`);
  for(const id of ['compendium','youcat-youth','youcat-kids'])assert.equal(await p.locator(`#${id}`).count(),1);
  const compendium=library.resources.find(r=>r.id==='compendium');
  assert.equal(await p.locator('#compendium h3').textContent(),compendium.title[language]);
  assert.equal(squash(await p.locator('#compendium p').textContent()),squash(compendium.description[language]));
  const link=p.locator('#compendium a');assert.equal(await link.getAttribute('href'),'https://ugcc.od.ua/wp-content/uploads/2024/11/Compendium.pdf');
  assert.ok(await link.evaluate(e=>getComputedStyle(e).color!==getComputedStyle(e).backgroundColor),'Button label contrasts with its background');
  assert.equal(await link.getAttribute('target'),'_blank');assert.match(await link.getAttribute('rel'),/noopener/);assert.match(await link.getAttribute('rel'),/noreferrer/);
  assert.ok((await link.textContent()).includes(language==='uk'?'Читати Компендіум':'Read the Compendium'));
  if(language==='en')assert.match(await p.locator('#compendium').textContent(),/available in Ukrainian/);
  assert.equal(await p.locator('.youcat-topics article').count(),6);assert.equal(await p.locator('.youcat-topics a[href^="https://drive.google.com/"]').count(),6);
  if(width===390||width===1440){
   await p.screenshot({path:path.join(out,`${language}-catechesis-${width}.png`),fullPage:true});
   const a=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(a.violations,[]);report.accessibility.push({language,page:'catechesis',width,violations:0});
  }
 }
 await context.route('https://ugcc.od.ua/wp-content/uploads/2024/11/Compendium.pdf',route=>route.fulfill({contentType:'text/html',body:'<title>Original PDF link test</title>'}));
 await p.goto(`${base}/uk/catechesis/`);const popupWait=context.waitForEvent('page');await p.locator('#compendium a').click();const popup=await popupWait;await popup.waitForLoadState();assert.equal(popup.url(),'https://ugcc.od.ua/wp-content/uploads/2024/11/Compendium.pdf');await popup.close();
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}finally{await browser.close();fs.writeFileSync(path.join(out,'book-qa.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
