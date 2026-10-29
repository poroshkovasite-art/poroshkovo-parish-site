import fs from 'node:fs';
import path from 'node:path';
export const statuses=['draft','needs_confirmation','approved','published'];
const bilingual=v=>Boolean(v&&typeof v.uk==='string'&&v.uk.trim()&&typeof v.en==='string'&&v.en.trim());
export function publishable(record){
 return Boolean(record&&['approved','published'].includes(record.publication_status)&&record.verification_status==='confirmed'&&record.source&&record.verified_on&&bilingual(record.title)&&bilingual(record.description));
}
export function validateRecord(record){
 if(!/^[a-z0-9-]+$/.test(record.id||''))throw Error('Invalid content ID');
 if(!statuses.includes(record.publication_status))throw Error('Invalid publication status: '+record.id);
 if(['approved','published'].includes(record.publication_status)&&!publishable(record))throw Error('Approved content must be complete, bilingual and confirmed: '+record.id);
 if(!Array.isArray(record.photos??[]))throw Error('Photos must be an array');
 if(record.date&&!/^\d{4}-\d{2}-\d{2}$/.test(record.date))throw Error('Invalid date');
 return true;
}
export function approvedDocument(record,root){
 validateRecord(record);if(!publishable(record))return false;
 if(!record.publication_permission||!record.privacy_reviewed||!record.privacy_reviewed_on||!record.issued_on||!bilingual(record.issuer))throw Error('Document needs issuer, date, permission and privacy review: '+record.id);
 const file=record.public_file;
 if(!/^documents\/[a-z0-9-]+\.pdf$/.test(file||''))throw Error('Use a neutral PDF filename within documents/');
 const full=path.resolve(root,'approved-documents',path.basename(file));
 if(!fs.existsSync(full)||fs.readFileSync(full).subarray(0,5).toString()!=='%PDF-')throw Error('Missing approved PDF: '+record.id);
 return true;
}
export function approvedAccount(record){
 validateRecord(record);if(!publishable(record))return false;
 if(!record.recipient||!record.bank||!record.currency||!record.payment_reference||!record.financial_confirmation)throw Error('Incomplete approved bank account');
 const iban=(record.iban||'').replaceAll(' ','').toUpperCase();
 if(!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban))throw Error('Invalid IBAN syntax');
 const rearranged=iban.slice(4)+iban.slice(0,4);let mod=0;for(const c of rearranged){for(const digit of /[A-Z]/.test(c)?String(c.charCodeAt(0)-55):c)mod=(mod*10+Number(digit))%97;}
 if(mod!==1)throw Error('Invalid IBAN checksum');return true;
}
