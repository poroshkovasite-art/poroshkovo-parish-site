import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),audit=path.resolve(root,'../audit'),base=process.env.MISSION_BASE_URL||'http://localhost:4173',tag=base.includes('localhost')?'local':'production';
const report={status:'RUNNING',base,layouts:[],accessibility:[],errors:[]};fs.mkdirSync(audit,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 for(const lang of ['uk','en'])for(const width of [320,390,768,1024,1440,1920])for(const slug of ['','community-impact/','social-ministry/']){
  await page.setViewportSize({width,height:1000});await page.goto(`${base}/${lang}/${slug}`);assert.equal(await page.locator('h1').count(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.equal(await page.locator('[data-photo-id^="chronicle-"]').count(),0);
  if(!slug){assert.equal(await page.locator('main > section').nth(1).getAttribute('data-community-mission'),'');assert.equal(await page.locator('[data-mission-priority]').count(),4);assert.equal(await page.locator('[data-service]').count(),4);assert.ok((await page.locator('[data-community-mission]').innerText()).includes(lang==='uk'?'Наша місія — не лише допомагати людям':'Our mission is to help people'));}
  if(slug==='community-impact/'){
   assert.equal(await page.locator('[data-community-impact]').count(),1);for(const id of ['spiritual-values','children-development','active-youth','solidarity','activity-examples','goals','mission-and-needs'])assert.equal(await page.locator('#'+id).count(),1);
   const body=await page.locator('[data-community-impact]').innerText();assert.ok(body.includes(lang==='uk'?'Результати, які ще належить виміряти':'Outcomes to Be Measured'));assert.ok(body.includes(lang==='uk'?'Фінансові звіти':'Financial reports'));if(lang==='en')for(const term of ['Community Development','Social Inclusion','Youth Empowerment','Active Citizenship','Solidarity','community well-being'])assert.ok(body.toLowerCase().includes(term.toLowerCase()),term);
   assert.equal(await page.locator('a[href="/'+lang+'/support/#bank-details"]').count(),1);
  }
  if([390,1440].includes(width)&&slug==='community-impact/'){await page.screenshot({path:path.join(audit,`mission-${tag}-${lang}-${width}.png`),fullPage:true});const axe=await new AxeBuilder({page}).analyze();assert.deepEqual(axe.violations,[]);report.accessibility.push({lang,width,violations:0});}
  report.layouts.push({lang,width,slug:slug||'home',status:'PASS'});
 }
 // Gallery photographs link to the actual mission section in the same language.
 for(const lang of ['uk','en']){await page.goto(`${base}/${lang}/gallery/`);for(const href of await page.locator('.photo-mission-link').evaluateAll(a=>a.map(x=>x.getAttribute('href')))){assert.ok(href.startsWith(`/${lang}/community-impact/#`));assert.ok(['spiritual-values','children-development','active-youth','solidarity'].includes(href.split('#')[1]));}}
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}finally{await browser.close();fs.writeFileSync(path.join(audit,`mission-${tag}-verification.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,layouts:report.layouts.length,accessibility:report.accessibility.length,errors:report.errors,failure:report.failure},null,2));}
