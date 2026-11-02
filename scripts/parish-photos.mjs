export const photoThemes = {
 'social-ministry': {uk:'Соціальне служіння',en:'Social Ministry'},
 'spiritual-life': {uk:'Духовне життя',en:'Spiritual Life'},
 'children-youth': {uk:'Діти та молодь',en:'Children and Youth'},
 'parish-development': {uk:'Праця та розвиток парафії',en:'Parish Work and Development'},
 'buildings': {uk:'Наші будівлі',en:'Our Buildings'}
};
export function photoTheme(p) {
 if(p.theme)return p.theme;
 if(['church-exterior','bell-tower','former-worship-building','parish-house-today'].includes(p.id))return 'buildings';
 if(p.id==='pastor-parish-work')return 'parish-development';
 if(['parish-community-children','parish-winter-outing'].includes(p.id))return 'children-youth';
 if(['church','history'].includes(p.category))return 'buildings';
 return 'spiritual-life';
}
// Owner excluded these two child-work scenes on 2 November 2026.
// Keep the original catalogue and permission statuses intact, including in editor preview.
export const excludedPhotoIds = new Set(['chronicle-summer-camp-friendship','chronicle-church-grounds-cleanup']);
export const photoExcluded = p => excludedPhotoIds.has(p.id);
export function photoApproved(p) {
 return !photoExcluded(p) && p.publication_status==='approved' && p.rights_confirmed===true &&
  (!p.contains_children||p.consents_confirmed===true) &&
  (!p.contains_aid_recipients||p.consents_confirmed===true);
}
export function photoMission(p) {
 if(p.mission_direction)return p.mission_direction;
 const theme=photoTheme(p);
 if(theme==='social-ministry'||p.id==='pastor-parish-work')return 'solidarity';
 if(theme==='children-youth')return 'children-development';
 return 'spiritual-values';
}
export function validatePhotoCatalog(catalog) {
 if(catalog.photos.length!==26)throw Error('Expected all 26 catalogued originals');
 const ids=new Set(),hashes=new Set();
 for(const [i,p] of catalog.photos.entries()){
  if(p.original_file!==`${i+1}.jpeg`||ids.has(p.id)||hashes.has(p.original_sha256))throw Error('Photo identity/duplicate mismatch');
  ids.add(p.id);hashes.add(p.original_sha256);
  if(!photoThemes[p.theme]||!p.width||!p.height||!p.widths?.length)throw Error('Incomplete photo metadata');
  for(const field of ['title','description','alt'])for(const lang of ['uk','en'])if(!p[field]?.[lang])throw Error('Missing bilingual '+field);
  if(p.captured_on&&!p.date_source)throw Error('Date requires an original event source');
  if(!p.date_source&&/\b20\d{2}\b/.test(p.title.uk+p.title.en))throw Error('Unverified year in public title');
  if(p.publication_status==='approved'&&(!photoApproved(p)||!p.consent_reference))throw Error('Publication needs explicit rights and consent reference');
  if(!['approved','pending_approval'].includes(p.publication_status))throw Error('Invalid publication status');
 }
}
