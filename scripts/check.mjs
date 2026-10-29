import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'dist');
const files=fs.readdirSync(out,{recursive:true}).filter(f=>fs.statSync(path.join(out,f)).isFile()).map(f=>f.replaceAll('\\','/'));
let pages=0,links=0;
const titles=new Set(),descriptions=new Set();
const googleFiles=['google696019cf5de45d47.html','googled4db93a6e7198af5.html'];
for(const file of files.filter(f=>f.endsWith('.html'))){
 const html=fs.readFileSync(path.join(out,file),'utf8');
 if(googleFiles.includes(file)){assert.equal(html.trim(),`google-site-verification: ${file}`);continue;}
 pages++;
 const verification=JSON.parse(fs.readFileSync(path.join(root,'content/site.json'))).google_site_verification;
 if(verification){assert.deepEqual([...html.matchAll(/<meta name="google-site-verification" content="([^"]+)"/g)].map(m=>m[1]),[verification],`Exact owner verification meta: ${file}`);}
 assert.match(html,/<html lang="(uk|en)">/);assert.match(html,/<title>[^<]+<\/title>/);
 assert.ok(!/isf-center-website|NAU|УГКЦ|ПЦУ|Lorem ipsum|undefined|TODO/i.test(html),`Foreign or placeholder content: ${file}`);
 if(!['index.html','404.html'].includes(file)){
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`One H1 in ${file}`);
  const title=html.match(/<title>(.*?)<\/title>/)[1],description=html.match(/<meta name="description" content="([^"]+)"/)[1];
  assert.ok(!titles.has(title),`Duplicate title ${file}`);titles.add(title);assert.ok(!descriptions.has(description),`Duplicate description ${file}`);descriptions.add(description);
  assert.match(html,/<link rel="canonical" href="https?:\/\//);assert.match(html,/hreflang="uk"/);assert.match(html,/hreflang="en"/);assert.match(html,/og:image/);
  const ids=[...html.matchAll(/(?:^|\s)id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,`Duplicate id ${file}`);
  const schedule=JSON.parse(fs.readFileSync(path.join(root,'content/schedule.json')));
  if(schedule.verification_status!=='confirmed')assert.ok(!/11:00|16:00|17:00|09:00|13:00|14:00/.test(html),`Unconfirmed timetable leaked: ${file}`);
  assert.ok(!/26100236|Центральна,? 94/.test(html),`Unconfirmed legal details leaked: ${file}`);
 }
 for(const match of html.matchAll(/(?:href|src|data-full)="([^"<>]+)"/g)){
  const ref=match[1];if(/^(https?:|mailto:|tel:|viber:|data:)/.test(ref))continue;
  const address=new URL(ref,'http://localhost:4173/'+file.replaceAll('\\','/'));let target=decodeURIComponent(address.pathname).slice(1);if(target.endsWith('/'))target+='index.html';
  assert.ok(fs.existsSync(path.join(out,target)),`Broken internal reference ${file} -> ${ref}`);
  if(address.hash)assert.ok(fs.readFileSync(path.join(out,target),'utf8').includes(`id="${address.hash.slice(1)}"`),`Broken fragment ${ref}`);links++;
 }
}
for(const f of ['robots.txt','sitemap.xml','favicon.ico','assets/favicon.ico','assets/favicon-16x16.png','assets/favicon-32x32.png','assets/apple-touch-icon.png','assets/icon-192.png','assets/icon-512.png','assets/og-card.png','uk/site.webmanifest','en/site.webmanifest','_headers'])assert.ok(files.includes(f),`Required file: ${f}`);
const ico=fs.readFileSync(path.join(out,'favicon.ico'));assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);assert.deepEqual([0,1,2].map(i=>ico[6+i*16]),[16,32,48]);
for(const [name,size] of [['favicon-16x16.png',16],['favicon-32x32.png',32],['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512]]){const bytes=fs.readFileSync(path.join(out,'assets',name));assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
for(const lang of ['uk','en']){const manifest=JSON.parse(fs.readFileSync(path.join(out,lang,'site.webmanifest')));assert.equal(manifest.start_url,`/${lang}/`);for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(out,new URL(icon.src,'https://local.test').pathname.slice(1))));}
assert.deepEqual(files.filter(f=>/^google.*\.html$/.test(f)).sort(),googleFiles.slice().sort(),'Only the owner-authorized verification files');
for(const file of googleFiles){const textFile='verification/'+file.replace('.html','.txt');assert.equal(fs.readFileSync(path.join(out,textFile),'utf8').trim(),`google-site-verification: ${file}`);assert.ok(fs.readFileSync(path.join(out,'_redirects'),'utf8').includes(`/${file} /${textFile} 200`));}
const routes=JSON.parse(fs.readFileSync(path.join(out,'routes.json')));
const map=JSON.parse(fs.readFileSync(path.join(root,'content/historical-map.json')));
assert.ok(map.source_url&&map.license_url&&map.original_sha256&&map.verified_on,'Historical map provenance and rights');
for(const lang of ['uk','en']){const html=fs.readFileSync(path.join(out,lang,'index.html'),'utf8');assert.match(html,/class="hero-image"><img data-image-id="divine-liturgy"/);assert.ok(html.indexOf('data-historical-map=')<html.indexOf('data-home-liturgy'),'Historical map precedes the Liturgy block');}
for(const lang of ['uk','en']){const xml=fs.readFileSync(path.join(out,lang,'sitemap.xml'),'utf8'),locations=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);assert.deepEqual(locations,routes.filter(r=>r.startsWith(`/${lang}/`)),`Language sitemap is limited to its URL-prefix property: ${lang}`);}
for(const route of routes)assert.ok(routes.includes(route.startsWith('/uk/')?route.replace('/uk/','/en/'):route.replace('/en/','/uk/')),'Every page has a counterpart');
for(const h of JSON.parse(fs.readFileSync(path.join(root,'content/history.json'))))assert.ok(h.source_url&&h.extracted_on&&h.verification_status,'Fact provenance');
console.log(JSON.stringify({status:'PASS',html_pages:pages,bilingual_content_routes:routes.length,internal_references:links,unique_titles:titles.size,unconfirmed_details_excluded:true},null,2));
