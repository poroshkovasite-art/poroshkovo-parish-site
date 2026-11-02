import argparse
import csv
import json
import subprocess
from pathlib import Path

root=Path(__file__).resolve().parents[1]
audit=root.parent/'audit'
parser=argparse.ArgumentParser()
parser.add_argument('--commit',required=True)
parser.add_argument('--deployment-status',default='Not deployed: Git push denied (403) for nikonplevschi-ai; browser owner session still requires a supported write path.')
args=parser.parse_args()
catalog=json.loads((root/'content/parish-photo-catalog.json').read_text(encoding='utf-8'))
themes={'social-ministry':'Соціальне служіння / Social Ministry','spiritual-life':'Духовне життя / Spiritual Life','children-youth':'Діти та молодь / Children and Youth','parish-development':'Праця та розвиток парафії / Parish Work and Development'}
lines=['# PARISH PHOTO GALLERY REPORT','',f'Implementation commit: `{args.commit}`.','',
    'Date: 2 November 2026. Project: poroshkovasite-art/poroshkovo-parish-site; branch main.','',
    '## Photo inventory','',
    '- 26/26 numbered originals found and visually matched to the owner’s exact catalogue.',
    '- 116 optimized WebP variants; 0 duplicate originals; all original SHA-256 hashes preserved.',
    '- 26 new photographs pending_approval; 0 new photographs approved or published.',
    '- 14 previously approved photographs retained, plus 1 newly owner-approved administrative building photograph (15 UA / 14 EN); the existing winter photograph remains UA only.',
    '- Missing: men carrying a heavy building element beside the church. Status missing; no substitute used.',
    '- No event dates inferred from Telegram message time, download time or a camera watermark. Catalog years are retained privately in the source catalogue but withheld from public titles.',
    '- Conventional light, colour and mild sharpening only; no cropping, upscaling, generative reconstruction or changes to faces/content. EXIF/GPS stripped from WebP copies.','',
    '## File mapping','',
    'Web files in this table are staged locally under `private-materials/parish-chronicle/web/`, not published URLs. Each row has responsive variants listed in content/parish-photo-catalog.json.','',
    '| Original | WebP master | Title UA | Title EN | Website section | Publication |',
    '|---|---|---|---|---|---|']
csvrows=[]
for p in catalog['photos']:
    master=f"{p['id']}-{max(p['widths'])}.webp"
    section=themes[p['theme']]+'; /uk/gallery/ + /en/gallery/'
    if p['theme']=='social-ministry':section+='; /uk/social-ministry/ + /en/social-ministry/'
    row=[p['original_file'],master,p['title']['uk'],p['title']['en'],section,p['publication_status']]
    lines.append('| '+' | '.join(row)+' |')
    csvrows.append(row)
lines+=['','## Pages and behaviour','',
    '- UA/EN home: approved mission immediately after the hero, four service cards, one stage photo carousel.',
    '- UA/EN community-impact: documented activities, four mission priorities, goals, outcomes awaiting assessment, mission/needs, documents, donor contact and transparency.',
    '- UA/EN social-ministry: documented practical examples alongside the existing prayer ministry; existing draft records remain drafts.',
    '- UA/EN gallery: four themes, localized captions and alt text, mission links and accessible full-frame viewing.',
    '- Central carousel: one foreground card, partially exposed neighbours, circular index positions, 800ms transform/scale/opacity transitions, 5500ms autoplay, arrows, side selection, keyboard, swipe, pause, offscreen/focus/hover suspension and reduced motion.',
    '- Pending images appear only in a noindex, loopback-only editorial build. Public HTML and direct asset URLs exclude them.','',
    '## Checks','']
for name in ['photo-inventory-verification.json','chronicle-local-verification.json','mission-local-verification.json','browser-report.json','media-local-verification.json','home-update-local-verification.json','seo-local-verification.json','hero-buildings-local-verification.json']:
    file=audit/name
    if file.exists():
        d=json.loads(file.read_text(encoding='utf-8'))
        counts={k:len(d[k]) if isinstance(d[k],list) else d[k] for k in ['layouts','privacy','accessibility','route_checks','photoAssets','web_files'] if k in d}
        lines.append(f'- {name}: {d.get("status","unknown")}; {json.dumps(counts)}')
for name in ['lighthouse-chronicle-uk-mobile.json','lighthouse-chronicle-en-desktop.json']:
    f=audit/name
    if f.exists():
        d=json.loads(f.read_text(encoding='utf-8'))
        scores={k:round(v['score']*100) for k,v in d['categories'].items()}
        lines.append(f'- {name}: {scores}; CLS {d["audits"]["cumulative-layout-shift"]["numericValue"]}. Local lab measurement; not a production verification.')
lines+=['','## Administrative building','', 'Owner-supplied improved PNG: Исправленный вид религиозного дома с оградой.png. Original unchanged; 6 WebP sizes, no additional visual edits. Explicit permission to publish this building-only image. Home shows the church left and the administrative building right with equal image heights, localized captions, full-frame viewing; both stack on phones. Also placed on About and Gallery / Our Buildings. All 74 previous WebP assets and original photo records are unchanged.', '', '## GitHub and Cloudflare','',args.deployment_status,'',
    'The configured CLI user was nikonplevschi-ai. Repository API permissions showed push=false; Git receive-pack returned HTTP 403. The owner’s Chrome screenshot shows poroshkovasite-art, but that does not change CLI authorization.',
    'The previous main commit 0bc9dd399c2124cc4ecb85591c35b8343be878e1 has a successful Cloudflare Pages check, deployment 0c548cf3-fd0b-4295-926d-406b69405c08. This is the previous release, not verification of the new local implementation.',
    'No private pending photograph was included in the versioned assets or production output.','',
    '## Backup','',
    'The refreshed local archive and folder preserve the previous archive’s original photo/document collections, add all 26 originals and 116 private derivatives, source history, the public build, editorial source files and verification reports. The old Desktop ZIP is retained under a versioned BEFORE name before the current ZIP is replaced. See the adjacent backup verification JSON for actual paths, SHA-256 and restore-build results.','',
    '## New-photo captions and alt text','']
for p in catalog['photos']:
    lines += [f"### {p['original_file']} — {p['title']['uk']}", '', f"UA: {p['description']['uk']}",f"EN: {p['description']['en']}",f"Alt UA: {p['alt']['uk']}",f"Alt EN: {p['alt']['en']}",f"Status: {p['publication_status']}.",'']
(root/'PARISH_PHOTO_GALLERY_REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
with (root/'PARISH_PHOTO_MAPPING.csv').open('w',encoding='utf-8-sig',newline='') as file:
    writer=csv.writer(file);writer.writerow(['original_file','web_master','title_uk','title_en','website_section','publication_status']);writer.writerows(csvrows)
print(json.dumps({'report':'PARISH_PHOTO_GALLERY_REPORT.md','mapping_rows':len(csvrows),'implementation_commit':args.commit}))
