import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=path.resolve('audit/liturgy-word');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];
try{
 const p=await browser.newPage({reducedMotion:'reduce'});
 for(const width of [320,390,768,1024,1440]){
  await p.setViewportSize({width,height:1000});await p.goto('http://localhost:4186/uk/divine-liturgy/');await p.evaluate(()=>document.fonts.ready);
  const height=await p.locator('.book-speech').evaluateAll(es=>es[29].getBoundingClientRect().bottom-es[0].getBoundingClientRect().top);
  await p.locator('.book-speech').first().evaluate(e=>window.scrollTo(0,e.getBoundingClientRect().top+scrollY-110));
  await p.screenshot({path:path.join(out,`before-${width}.png`)});results.push({width,first30Height:height});
 }
 fs.writeFileSync(path.join(out,'before.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
