// Civil dates are handled at UTC noon; the parish's Today uses Europe/Kyiv.
export const iso = date => date.toISOString().slice(0,10);
export function parseDate(value) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
 const date=new Date(value+'T12:00:00Z');
 return Number.isFinite(+date)&&iso(date)===value?date:null;
}
export const addDays=(value,days)=>{const d=parseDate(value);d.setUTCDate(d.getUTCDate()+days);return iso(d);};
export function shiftMonth(value,step){const d=parseDate(value),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+step);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return iso(d);}
export const monday=value=>{const d=parseDate(value);return addDays(value,-((d.getUTCDay()+6)%7));};
export const kyivToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function periodDays(value,mode='month'){
 const d=parseDate(value),first=mode==='week'?monday(value):monday(`${value.slice(0,8)}01`);
 const count=mode==='week'?7:Math.ceil((((new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)).getUTCDay()+6)%7)+new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate())/7)*7;
 return Array.from({length:count},(_,i)=>addDays(first,i));
}
export const occurs=(event,date)=>event.date<=date&&(event.end_date||event.date)>=date;
export const confirmed=event=>event.status==='confirmed'&&event.year===Number(event.date.slice(0,4))&&Boolean(event.source_url&&event.verified_on);
const escapeICS=value=>String(value||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
// RFC 5545: fold at 75 UTF-8 octets, with CRLF and an exclusive all-day end.
export function makeICS(event,lang='uk'){
 if(!confirmed(event)||!parseDate(event.date)||!parseDate(event.end_date||event.date))throw Error('Only verified, dated events can be exported.');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Poroshkovo Parish//Calendar//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${event.id}@poroshkovo.pages.dev`,`DTSTAMP:${event.verified_on.replaceAll('-','')}T120000Z`,`DTSTART;VALUE=DATE:${event.date.replaceAll('-','')}`,`DTEND;VALUE=DATE:${addDays(event.end_date||event.date,1).replaceAll('-','')}`,`SUMMARY:${escapeICS(event.title[lang])}`,`DESCRIPTION:${escapeICS([event.description?.[lang],event.source_url].filter(Boolean).join('\n'))}`,`URL:${event.source_url}`];
 if(event.location?.[lang])lines.push(`LOCATION:${escapeICS(event.location[lang])}`);
 lines.push('END:VEVENT','END:VCALENDAR');
 return lines.map(line=>{let part='',bytes=0,out=[];for(const ch of line){const size=new TextEncoder().encode(ch).length;if(bytes+size>75){out.push(part);part=' ';bytes=1;}part+=ch;bytes+=size;}out.push(part);return out.join('\r\n');}).join('\r\n')+'\r\n';
}
