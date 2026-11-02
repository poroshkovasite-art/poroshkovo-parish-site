import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env.VISUAL_BASE_URL||'https://poroshkovo.pages.dev',phase=process.env.VISUAL_PHASE||'before';
const out=path.resolve(root,'../audit/visual-polish',phase);fs.mkdirSync(out,{recursive:true});
const slugs=['','about/','history/','services/','spiritual-life/','community/','catechesis/','social-ministry/','community-impact/','gallery/','calendar/','documents/','contacts/','support/','privacy/'];
const widths=[320,390,768,1024,1440,1920],report={phase,base,status:'RUNNING',started:new Date().toISOString(),pages:[],errors:[],links:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push({url:page.url(),message:e.message}));
 page.on('console',m=>{if(m.type()==='error')report.errors.push({url:page.url(),message:m.text()});});
 for(const width of widths){
  await page.setViewportSize({width,height:width<600?900:1000});
  for(const lang of ['uk','en'])for(const slug of slugs){
   const route=`/${lang}/${slug}`,response=await page.goto(base+route,{waitUntil:'networkidle'});
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>{if(!i.classList.contains('leaflet-tile'))i.loading='eager';return i.decode().catch(()=>{});}));window.scrollTo(0,0);});
   const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll('h1').length,broken:[...document.images].filter(i=>i.hasAttribute('src')&&!i.classList.contains('leaflet-tile')&&(!i.complete||!i.naturalWidth)).map(i=>i.src),galleryColumns:document.querySelector('.gallery-grid')?getComputedStyle(document.querySelector('.gallery-grid')).gridTemplateColumns.split(' ').length:null,heroCards:[...document.querySelectorAll('.hero-buildings>figure')].map(e=>e.getBoundingClientRect().toJSON()),cardGroups:[...document.querySelectorAll('.home-service-grid,.resource-grid,.gallery-grid,.reading-grid')].map(g=>({class:g.className,cards:[...g.children].map(c=>({height:c.getBoundingClientRect().height,width:c.getBoundingClientRect().width,textClipped:c.scrollHeight>c.clientHeight+1}))})),mapLoaded:document.querySelector('[data-parish-map]')?Boolean(document.querySelector('.leaflet-tile-loaded')):null}));
   const filename=`${lang}-${slug.replaceAll('/','')||'home'}-${width}.png`;
   await page.screenshot({path:path.join(out,filename),fullPage:true});
   report.pages.push({route,width,http:response.status(),...metrics,screenshot:filename});
   if(width===1440)report.links.push(...await page.locator('a[href]').evaluateAll(es=>es.map(a=>({from:location.pathname,href:a.getAttribute('href')}))));
  }
  fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({phase,width,pages:report.pages.length},null,2));
  console.log(JSON.stringify({phase,width,pages:report.pages.length}));
 }
 report.finished=new Date().toISOString();report.status=report.pages.some(p=>p.http!==200||p.overflow||p.broken.length||p.h1!==1)||report.errors.length?'FINDINGS':'PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase,status:report.status,pages:report.pages.length,errors:report.errors.length,findings:report.pages.filter(p=>p.http!==200||p.overflow||p.broken.length),failure:report.failure},null,2));}
