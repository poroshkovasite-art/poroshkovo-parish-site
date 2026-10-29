import assert from 'node:assert/strict';
export function validateContent({site,pages,photos,news,schedule}) {
 const bilingual=value=>value&&typeof value.uk==='string'&&value.uk.trim()&&typeof value.en==='string'&&value.en.trim();
 const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value));
 for(const [slug,p] of Object.entries(pages)){
  assert.match(slug,/^[a-z0-9-]+$/);assert.ok(bilingual(p.title),`Bilingual title: ${slug}`);
  if(p.published){assert.ok(bilingual(p.description)&&bilingual(p.intro),`Bilingual metadata/intro: ${slug}`);for(const b of p.blocks||[])assert.ok(bilingual(b.title)&&bilingual(b.text),`Bilingual block: ${slug}`);}
 }
 const ids=new Set();
 for(const p of photos.filter(p=>p.publication_status==='approved'&&p.rights_confirmed)){
  assert.match(p.id,/^[a-z0-9-]+$/);assert.ok(!ids.has(p.id),'Unique photo ID');ids.add(p.id);
  assert.ok(p.credit&&bilingual(p.alt)&&bilingual(p.caption)&&p.width>0&&p.height>0,'Photo rights, alt and dimensions');
  assert.ok(p.widths.includes(960)&&p.widths.every(w=>Number.isInteger(w)&&w>0&&w<=p.width),'Responsive widths must be real and include the default 960px variant');
 }
 const slugs=new Set();
 for(const n of news.filter(n=>n.verification_status==='confirmed')){
  assert.match(n.slug,/^[a-z0-9-]+$/);assert.ok(!slugs.has(n.slug),'Unique news slug');slugs.add(n.slug);
  assert.ok(date(n.date)&&date(n.extracted_on)&&n.source_url,'News date and provenance');assert.ok(bilingual(n.title)&&bilingual(n.summary),'Bilingual news');
  assert.ok(n.body?.uk?.length&&n.body?.en?.length,'Both news bodies');
 }
 if(schedule.verification_status==='confirmed'){
  assert.ok(date(schedule.confirmed_on)&&schedule.services.length,'Current schedule must have confirmation date and services');
  for(const s of schedule.services)assert.ok(bilingual(s.day)&&bilingual(s.name)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time),'Valid bilingual service/time');
 }
 if(site.contact.verification_status==='confirmed'){
  const c=site.contact;assert.ok(bilingual(c.address),'Confirmed visiting address');
  if(c.email)assert.match(c.email,/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  if(c.embed_url)assert.ok(c.embed_url.startsWith('https://www.google.com/maps/embed'),'Approved map embed host');
  if(c.map_url)assert.ok(c.map_url.startsWith('https://'),'Secure route URL');
 }
}
