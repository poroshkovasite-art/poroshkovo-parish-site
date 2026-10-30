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
  assert.ok(p.widths.includes(Math.min(960,p.width))&&p.widths.every(w=>Number.isInteger(w)&&w>0&&w<=p.width),'Responsive widths must include the native/default size without upscaling');
  if(p.contains_children)assert.equal(p.consents_confirmed,true,'Publication requires owner confirmation of necessary child-photo consents');
  if(p.variants){
   assert.ok(p.caption_overlay?.uk&&p.caption_overlay?.en,'Approved bilingual overlay titles');
   assert.equal(p.variants?.captioned?.available_on_site,false,'Baked captions are archived, not published');
   if(p.embedded_caption_in_enhanced)assert.ok(!p.publication_languages?.includes('en'),'English requires a clean photo original');
   if(p.processing.generative_processing)assert.ok(['church-exterior','bell-tower'].includes(p.id)&&p.processing.user_authorized_sky_edit===true,'Only the two expressly approved sky edits may use generative processing');
  }
 }
 const slugs=new Set();
 if(site.hero_photo_id)assert.ok(photos.some(p=>p.id===site.hero_photo_id&&p.publication_status==='approved'&&p.rights_confirmed),'Hero must reference an approved photo');
 for(const n of news.filter(n=>n.verification_status==='confirmed')){
  assert.match(n.slug,/^[a-z0-9-]+$/);assert.ok(!slugs.has(n.slug),'Unique news slug');slugs.add(n.slug);
  assert.ok(date(n.date)&&date(n.extracted_on)&&n.source_url,'News date and provenance');assert.ok(bilingual(n.title)&&bilingual(n.summary),'Bilingual news');
  assert.ok(n.body?.uk?.length&&n.body?.en?.length,'Both news bodies');
 }
 if(schedule.verification_status==='confirmed'){
  assert.ok(date(schedule.confirmed_on)&&schedule.services.length,'Current schedule must have confirmation date and services');
  assert.equal(schedule.timezone,'Europe/Kyiv','Service hours stay in the parish time zone');
  assert.ok(date(schedule.valid_from)&&schedule.source?.interview_date===schedule.confirmed_on&&schedule.source_url,'Current pastor interview provenance');
  for(const s of schedule.services){assert.ok(bilingual(s.day)&&bilingual(s.name)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time),'Valid bilingual service/time');assert.ok(s.weekdays.length&&s.weekdays.every(d=>Number.isInteger(d)&&d>=0&&d<=6),'Explicit weekly recurrence');}
  assert.equal(schedule.sunday_confession.time,null,'Do not invent a Sunday Confession starting time');
  assert.ok(bilingual(schedule.sunday_confession.note));
  for(const p of schedule.prayer_life)assert.ok(bilingual(p.title)&&p.paragraphs.uk.length&&p.paragraphs.en.length&&p.source_url&&date(p.verified_on),'Prayer practice provenance and translations');
 }
 if(site.contact.verification_status==='confirmed'){
  const c=site.contact;assert.ok(bilingual(c.address),'Confirmed visiting address');
  if(c.email)assert.match(c.email,/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  if(c.embed_url)assert.ok(c.embed_url.startsWith('https://www.google.com/maps/embed'),'Approved map embed host');
  if(c.map_url)assert.ok(c.map_url.startsWith('https://'),'Secure route URL');
 }
 if(site.contact.phone_verification_status==='confirmed')assert.match(site.contact.phone,/^\+[1-9]\d{7,14}$/,'Confirmed international contact number');
}
