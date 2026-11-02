"""Conventional, reproducible processing. Originals and pending images stay private."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
args = parser.parse_args()
catalog_path = ROOT / 'content/parish-photo-catalog.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
archive = ROOT / 'private-materials/parish-chronicle/originals'
web = ROOT / 'private-materials/parish-chronicle/web'
archive.mkdir(parents=True, exist_ok=True)
web.mkdir(parents=True, exist_ok=True)
hashes = set()
for photo in catalog['photos']:
    original = args.source / photo['original_file']
    data = original.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    assert sha not in hashes, f'Duplicate original: {original.name}'
    hashes.add(sha)
    target = archive / original.name
    if target.exists():
        assert target.read_bytes() == data, 'Never overwrite a different archived original'
    else:
        target.write_bytes(data)
    with Image.open(original) as source:
        exif = source.getexif()
        photo['source_exif_date'] = exif.get(36867) or exif.get(306)
        image = ImageOps.exif_transpose(source).convert('RGB')
    photo.update(original_sha256=sha, width=image.width, height=image.height)
    # Very small tonal changes; no crop, denoising, retouching or reconstruction.
    image = ImageEnhance.Brightness(image).enhance(1.025)
    image = ImageEnhance.Color(image).enhance(1.015)
    image = ImageEnhance.Contrast(image).enhance(1.01)
    widths = sorted(set(w for w in [480, 768, 960, 1280, image.width] if w <= image.width))
    photo['widths'] = widths
    photo['processing'] = dict(brightness=1.025, color=1.015, contrast=1.01,
        unsharp_mask=dict(radius=0.45, percent=25, threshold=4), crop=False,
        generative_processing=False, metadata_removed=True, original_unchanged=True)
    photo['web_files'] = []
    for width in widths:
        size = (width, round(image.height * width / image.width))
        output = image.resize(size, Image.Resampling.LANCZOS).filter(
            ImageFilter.UnsharpMask(radius=0.45, percent=25, threshold=4))
        dest = web / f"{photo['id']}-{width}.webp"
        output.save(dest, 'WEBP', quality=85, method=6, exif=b'', icc_profile=b'')
        with Image.open(dest) as check:
            assert check.size == size and not check.getexif()
        photo['web_files'].append(dict(file=dest.name, bytes=dest.stat().st_size,
            sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
    assert original.read_bytes() == target.read_bytes() == data
catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(dict(originals=len(hashes), web_files=sum(len(p['widths']) for p in catalog['photos']),
    status='PASS', metadata_removed=True, originals_unchanged=True)))
