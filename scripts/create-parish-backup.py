"""Build a fresh, verified local backup while retaining previous original collections."""
import argparse
import hashlib
import json
import shutil
import subprocess
import zipfile
from pathlib import Path, PurePosixPath

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--previous',type=Path,required=True)
parser.add_argument('--stage',type=Path,required=True)
parser.add_argument('--release-json',type=Path)
parser.add_argument('--report',type=Path)
args=parser.parse_args()
stage=args.stage.resolve()
assert not stage.exists(), 'Use a fresh staging directory; never overwrite a previous backup'
stage.mkdir(parents=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
def digest(file):
    h=hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

# Preserve the old archive's original photo/document collections and historical audits.
with zipfile.ZipFile(args.previous) as previous:
    for info in previous.infolist():
        parts=PurePosixPath(info.filename).parts
        assert parts and parts[0]=='POROSHKOVO_PARISH_WEBSITE_FINAL'
        rel=PurePosixPath(*parts[1:])
        assert not rel.is_absolute() and '..' not in rel.parts
        assert ((info.external_attr>>16)&0o170000)!=0o120000, 'No symlinks in archive'
        if not rel.parts or rel.parts[0] in ['SOURCE_CODE','READY_TO_PUBLISH','EDITORIAL_PREVIEW_PRIVATE','SOURCE_HISTORY.bundle','CURRENT_RELEASE.json','CURRENT_FILE_HASHES.json']:continue
        if info.is_dir():continue
        dest=stage/Path(*rel.parts)
        if rel.as_posix()=='FINAL_REPORT.md':dest=stage/'DOCUMENTATION/PREVIOUS_FINAL_REPORT_20261101.md'
        assert dest.resolve().is_relative_to(stage)
        dest.parent.mkdir(parents=True,exist_ok=True)
        with previous.open(info) as source,dest.open('wb') as output:shutil.copyfileobj(source,output)
print('Previous original collections preserved.',flush=True)
source=stage/'SOURCE_CODE'
files=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode('utf-8').split('\0')
for rel in filter(None,files):
    dest=source/rel;assert dest.resolve().is_relative_to(source.resolve())
    dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/rel,dest)
shutil.copytree(root/'private-materials/parish-chronicle',source/'private-materials/parish-chronicle',dirs_exist_ok=True)
shutil.copytree(root/'private-materials/administrative-building',source/'private-materials/administrative-building',dirs_exist_ok=True)
shutil.copytree(root/'private-materials/administrative-building',stage/'PHOTOS/ADMINISTRATIVE_BUILDING_ORIGINAL',dirs_exist_ok=True)
shutil.copytree(root/'private-materials/parish-chronicle',stage/'PHOTOS/CHRONICLE_PRIVATE',dirs_exist_ok=True)
shutil.copytree(root/'dist',stage/'READY_TO_PUBLISH')
shutil.copytree(root/'dist-editor',stage/'EDITORIAL_PREVIEW_PRIVATE')
for evidence in (root.parent/'audit').iterdir():
    if evidence.is_file() and evidence.suffix in ['.json','.png','.jpg','.html','.md']:
        (stage/'AUDIT').mkdir(exist_ok=True);shutil.copy2(evidence,stage/'AUDIT'/evidence.name)
    elif evidence.is_dir() and evidence.name=='visual-polish':
        shutil.copytree(evidence,stage/'AUDIT/visual-polish',dirs_exist_ok=True,ignore=shutil.ignore_patterns('after-candidate-*','baseline-site','baseline-source.zip'))
shutil.copy2(args.report or root/'PARISH_PHOTO_GALLERY_REPORT.md',stage/'FINAL_REPORT.md')
shutil.copy2(root/'PARISH_PHOTO_MAPPING.csv',stage/'PARISH_PHOTO_MAPPING.csv')
shutil.copy2(root/'START_SITE.cmd',stage/'SOURCE_CODE/START_SITE.cmd')
(stage/'START_SITE.cmd').write_text('@echo off\r\ncall "%~dp0SOURCE_CODE\\START_SITE.cmd"\r\n',encoding='ascii')
subprocess.run(['git','bundle','create',str(stage/'SOURCE_HISTORY.bundle'),'--all'],cwd=root,check=True)
subprocess.run(['git','bundle','verify',str(stage/'SOURCE_HISTORY.bundle')],cwd=root,check=True,capture_output=True)

# Rebuild from the exact source copy using no dependency installation or private images.
node=shutil.which('node');assert node
subprocess.run([node,'scripts/build.mjs','--production'],cwd=source,check=True)
subprocess.run([node,'scripts/check.mjs'],cwd=source,check=True)
expected={p.relative_to(root/'dist').as_posix():digest(p) for p in (root/'dist').rglob('*') if p.is_file()}
restored={p.relative_to(source/'dist').as_posix():digest(p) for p in (source/'dist').rglob('*') if p.is_file()}
assert expected==restored, 'Restored production output must match every original production file'
print(f'Restore build verified: {len(expected)} files.',flush=True)
catalog=json.loads((root/'content/parish-photo-catalog.json').read_text(encoding='utf-8'))
release={'status':'local_prepared','commit':commit,'deployment_status':'Publication not verified in this backup run',
    'pending_new_photos':sum(p['publication_status']=='pending_approval' for p in catalog['photos']),
    'approved_new_photos':sum(p['publication_status']=='approved' for p in catalog['photos']),
    'public_output':'READY_TO_PUBLISH','private_output':'EDITORIAL_PREVIEW_PRIVATE - do not deploy',
    'restore_files':len(expected),'restore_hashes_match':True}
if args.release_json:
    verified=json.loads(args.release_json.read_text(encoding='utf-8-sig'))
    assert verified['status']=='success' and verified['commit']==commit and verified['verification_status']=='PASS'
    release.update(verified)
(stage/'CURRENT_RELEASE.json').write_text(json.dumps(release,indent=2)+'\n',encoding='utf-8')
old_release=stage/'AUDIT/current-release.json'
if old_release.exists():shutil.copy2(old_release,stage/'AUDIT/previous-public-release-20261101.json')
old_release.write_text(json.dumps(release,indent=2)+'\n',encoding='utf-8')
manifest={p.relative_to(stage).as_posix():digest(p) for p in stage.rglob('*') if p.is_file()}
(stage/'CURRENT_FILE_HASHES.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
archive=stage.parent/'POROSHKOVO_PARISH_WEBSITE_FINAL_BACKUP.zip'
assert not archive.exists(), 'Never overwrite an existing staged archive'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1,allowZip64=True) as output:
    for p in stage.rglob('*'):
        if p.is_file():output.write(p,stage.name+'/'+p.relative_to(stage).as_posix())
print('Archive created; verifying every archived file.',flush=True)
with zipfile.ZipFile(archive) as check:
    assert len(check.namelist())==len(set(check.namelist()))
    for rel,sha in manifest.items():
        h=hashlib.sha256()
        with check.open(stage.name+'/'+rel) as stream:
            for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
        assert h.hexdigest()==sha, rel
archive_sha=digest(archive)
result={'status':'PASS','commit':commit,'archive':str(archive),'archive_sha256':archive_sha,'stage':str(stage),
    'files_verified':len(manifest),'restore_build':'PASS','restore_files':len(expected),'git_bundle':'PASS',
    'previous_original_collections_preserved':True,'pending_photos_private':True}
(stage.parent/'backup-verification.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
(stage.parent/(archive.name+'.sha256')).write_text(archive_sha+'  '+archive.name+'\n',encoding='ascii')
print(json.dumps(result),flush=True)
