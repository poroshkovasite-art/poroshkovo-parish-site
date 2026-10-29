import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {regularServices,annualParishEvents,makeICS} from '../assets/calendar-core.js';
const root=new URL('../',import.meta.url),schedule=JSON.parse(fs.readFileSync(new URL('content/schedule.json',root))),base=process.env.SCHEDULE_BASE_URL||'http://localhost:4173',tag=base.includes('localhost')?'local':'production',audit=new URL('../audit/',root);
assert.equal(schedule.verification_status,'confirmed');assert.equal(schedule.timezone,'Europe/Kyiv');
assert.deepEqual(regularServices(schedule,'2026-11-02').map(s=>s.time),['08:30','09:00']);
assert.deepEqual(regularServices(schedule,'2026-10-31').map(s=>s.time),['08:30','09:00','18:00']);
assert.deepEqual(regularServices(schedule,'2026-11-01').map(s=>s.time),['10:00','11:00',null]);
assert.equal(regularServices(schedule,'2026-10-28').length,0);
assert.equal(annualParishEvents(schedule,2025).length,0);
for(const year of [2026,2027,2028]){const [e]=annualParishEvents(schedule,year);assert.equal(e.date,`${year}-11-01`);assert.equal(e.time,null);const ics=makeICS(e);assert.ok(ics.includes(`DTSTART;VALUE=DATE:${year}1101`));assert.ok(ics.includes('RRULE:FREQ=YEARLY;BYMONTH=11;BYMONTHDAY=1'));assert.ok(!ics.includes('DTSTART;TZID')&&!ics.includes('T110000'));
}
assert.equal(schedule.seasonal[0].announced_dates.length,0);assert.equal(schedule.sunday_confession.time,null);
const report={status:'RUNNING',base,checks:[],errors:[],screenshots:[],timezone:'Europe/Kyiv'};
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 for(const timezoneId of ['Europe/Kyiv','America/Los_Angeles']){
  const context=await browser.newContext({timezoneId,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  for(const lang of ['uk','en'])for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:900});await page.goto(`${base}/${lang}/services/`);
   assert.deepEqual(await page.locator('[data-schedule-day="1"] time').allTextContents(),['08:30','09:00']);assert.deepEqual(await page.locator('[data-schedule-day="6"] time').allTextContents(),['08:30','09:00','18:00']);assert.deepEqual(await page.locator('[data-schedule-day="0"] time').allTextContents(),['10:00','11:00']);
   assert.ok(await page.locator('#schedule-source').isVisible());assert.equal(await page.locator('#great-lent').count(),1);assert.equal(await page.locator('[data-prayer-life] .prayer-life-card').count(),5);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(timezoneId==='Europe/Kyiv'&&width!==320){const file=`schedule-${tag}-${lang}-${width}.png`;await page.screenshot({path:new URL(file,audit).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});report.screenshots.push(file);}
   await page.goto(`${base}/${lang}/`);assert.equal(await page.locator('[data-schedule-summary]').count(),1);assert.equal(await page.locator('[data-schedule-summary] a').getAttribute('href'),`/${lang}/services/`);
   await page.goto(`${base}/${lang}/mothers-in-prayer/`);assert.match(await page.locator('.meeting-time').innerText(),/10:00/);
   await page.goto(`${base}/${lang}/social-ministry/`);assert.equal(await page.locator('.section-record').count(),1);assert.match(await page.locator('.section-record').innerText(),lang==='uk'?/Щотижня/:/Every week/);
   report.checks.push({lang,width,visitorTimezone:timezoneId,scheduleHours:'PASS',homeLink:'PASS',mothers:'PASS',socialPrayerOnly:'PASS'});
  }
  await context.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await page.goto(base+'/uk/calendar/?date=2026-11-01&tab=parish');await page.locator('[data-regular-services]').waitFor();assert.match(await page.locator('[data-regular-services]').innerText(),/10:00/);assert.match(await page.locator('[data-regular-services]').innerText(),/11:00/);assert.ok(!(await page.locator('[data-regular-services]').innerText()).includes('08:30'));assert.equal(await page.locator('[data-calendar-details] [data-event-id="departed-remembrance-2026"]').count(),1);
 await page.locator('[data-calendar-date]').fill('2027-11-01');await page.locator('[data-calendar-date]').dispatchEvent('change');assert.equal(await page.locator('[data-calendar-details] [data-event-id="departed-remembrance-2027"]').count(),1);assert.match(await page.locator('[data-regular-services]').innerText(),/09:00/);
 await page.locator('[data-calendar-tab="church"]').click();assert.equal(await page.locator('[data-calendar-details] [data-event-id]').count(),0);assert.match(await page.locator('[data-calendar-notice]').innerText(),/ще не підтверджені/);
 assert.equal(report.errors.length,0);report.status='PASS';
}finally{await browser.close();fs.writeFileSync(new URL(`schedule-${tag}-verification.json`,audit),JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,base,checks:report.checks.length,screenshots:report.screenshots.length,errors:report.errors,calendarRecurrence:'PASS',annualUnknownTime:'PASS',visitorTimezoneDoesNotConvertHours:'PASS'}));
