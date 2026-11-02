"""Verify the preserved originals, every derived file, and public exclusion."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

root=Path(__file__).resolve().parents[1]
audit=root.parent/'audit'
audit.mkdir(exist_ok=True)
catalog=json.loads((root/'content/parish-photo-catalog.json').read_text(encoding='utf-8'))
photos=catalog['photos']
private=root/'private-materials/parish-chronicle'
hashes=set()
web_count=0
report={'status':'RUNNING','originals':[],'web_files':0}
for p in photos:
    data=(private/'originals'/p['original_file']).read_bytes()
    sha=hashlib.sha256(data).hexdigest()
    assert sha==p['original_sha256'] and sha not in hashes
    assert (Path.home()/'Desktop'/p['original_file']).read_bytes()==data
    hashes.add(sha)
    assert p['publication_status']=='pending_approval'
    assert not p['rights_confirmed'] and not p['consents_confirmed']
    assert p['captured_on'] is None
    for entry in p['web_files']:
        file=private/'web'/entry['file']
        assert hashlib.sha256(file.read_bytes()).hexdigest()==entry['sha256']
        with Image.open(file) as im:
            assert im.width<=p['width'] and abs(im.width/im.height-p['width']/p['height'])<.005
            assert not im.getexif() and not im.info.get('icc_profile')
        assert not (root/'dist/assets/photos'/file.name).exists()
        web_count+=1
    report['originals'].append({'file':p['original_file'],'sha256':sha,'unchanged':True,'publication_status':p['publication_status']})
assert len(hashes)==26 and web_count==116
for k,start in enumerate(range(0,26,9),1):
    canvas=Image.new('RGB',(1380,975),'#eee')
    for j,p in enumerate(photos[start:start+9]):
        im=Image.open(private/'web'/f"{p['id']}-{p['widths'][-1]}.webp")
        thumb=ImageOps.contain(im,(440,290))
        x,y=(j%3)*460,(j//3)*325
        canvas.paste(thumb,(x,y+30))
        ImageDraw.Draw(canvas).text((x+8,y+8),p['original_file']+' - WebP',fill='black')
    canvas.save(audit/f'chronicle-processed-{k}.jpg')
report.update(status='PASS',web_files=web_count,originals_unchanged=True,duplicates=0,metadata_removed=True,public_pending_files=0)
(audit/'photo-inventory-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='originals'}))
