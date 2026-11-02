# Parish chronicle and community mission

`content/parish-photo-catalog.json` is the authoritative mapping of the 26 numbered originals. It contains both languages, literal visual observations, category, mission direction, hashes, processing settings and publication status. `content/community-mission.json` contains the owner-approved mission and descriptions of documented activities. Goals and outcomes awaiting assessment are distinguished on `/uk/community-impact/` and `/en/community-impact/`.

All 26 new photographs remain `pending_approval`. The men carrying a heavy building element are recorded separately as `missing`; the existing photograph of work beside a concrete mixer is not a replacement. Existing, previously approved photographs retain their permissions and language restrictions.

## Private originals and derivatives

The numbered JPEGs on Desktop are never modified. Exact copies and the 116 derivatives are stored under ignored `private-materials/parish-chronicle/{originals,web}`. This folder must not be uploaded to GitHub, Cloudflare or a public file share. The local backup includes it so editorial previews can be restored.

Processing is reproducible from original JPEGs:

```powershell
python scripts/prepare-parish-photos.py --source "$env:USERPROFILE\Desktop"
python scripts/photo-inventory-qa.py
```

Brightness 1.025, colour 1.015, contrast 1.01, mild sharpening, WebP quality 85. No crop, enlargement, generative processing or face retouching. Public derivatives contain no EXIF/GPS. A visible camera watermark in 22.jpeg is part of the supplied pixels and is retained; it is not used as event-date evidence. Original Telegram captions and event metadata have not been supplied, so public titles omit unverified years. The owner's literal titles are retained in `catalog_title_uk`.

## Preview and approval

```powershell
node scripts/build.mjs --production
node scripts/serve.mjs
# Separate terminal, local editorial use only:
node scripts/build.mjs --editor
node scripts/serve.mjs --editor
```

Public preview: `http://localhost:4173/uk/`; private editorial gallery: `http://localhost:4174/uk/gallery/`. Servers bind only to loopback. Editor output has noindex, explicit pending badges, and all 26 private photographs; never deploy `dist-editor`.

Before an individual photograph is approved, record the actual rights confirmation and consent reference. Child photographs and photographs of aid recipients additionally require `consents_confirmed: true`. Do not infer permission from possession, an email account, a screenshot or an unrelated previous release. Promote only that approved photograph's WebP derivatives into versioned `assets/photos`, then build and test. The production build excludes pending files even if accidentally placed in public assets. Missing approved assets fail the build. No approval was granted by this implementation.

## Stage carousel

`scripts/chronicle.mjs` renders one reusable component. `assets/chronicle.js` assigns circular relative positions without cloning or reordering slides. The active slide is centred at scale 1; adjacent slides use scale .88 (.9 on phones), opacity .56, a lower stacking order and a downward offset. Distant slides fade outside the visible stage. Every card shares a grid cell, reserving the tallest card's height throughout the loop.

Transitions take 800ms, autoplay waits 5500ms. Arrows, actual side-card clicks, keyboard arrows and horizontal touch gestures change the active index. Manual interaction pauses rotation until Resume. Hover, focus, hidden documents, open photo dialogs and an offscreen stage suspend autoplay. Reduced motion disables autoplay and transitions. Side-card contents are inert; only the active card participates in keyboard navigation. Without JavaScript the first story remains readable and the gallery link remains available. The former three-topic carousels retain their code and behaviour.

## Checks and release

```powershell
node scripts/check.mjs
python scripts/seo-audit.py
python scripts/photo-inventory-qa.py
node scripts/chronicle-qa.mjs
node scripts/mission-qa.mjs
node scripts/browser-test.mjs
node scripts/media-qa.mjs
```

Browser checks use Playwright and the project's existing Chrome executable option. Keep builds and browser tests sequential: rebuilding deletes the generated output temporarily. Production output is `dist` only. Existing routes, canonical URLs, hreflang, sitemaps, verified documents and account details are preserved; the impact page adds one localized route per language.

Push only to `https://github.com/poroshkovasite-art/poroshkovo-parish-site.git`, branch `main`. A browser session and GitHub CLI can have different authenticated users. Verify actual push and the resulting Cloudflare Pages check; an old successful check is not evidence that this new commit was deployed. After deployment, compare live assets/pages with the local build using `scripts/verify-deployment.mjs`, then run the chronicle and mission tests with their production base URL environment variables.

## Approved administrative building, 2 November 2026

The owner supplied `Исправленный вид религиозного дома с оградой.png` and explicitly requested publication of this building-only image. It is registered as `parish-administrative-building` in content/photos.json with six WebP sizes. Its original is preserved under ignored private-materials/administrative-building. No further enhancement or crop was applied. The paired hero uses equal 4:3 image frames with object-fit:contain, preserving both buildings completely; the church is left, the house right, and they stack on phones. Both open the existing full-frame lightbox. The same derivatives are reused on About and Gallery / Our Buildings. All 74 existing public WebP and their original records remain byte-for-byte unchanged. The 26 pending photographs remain private.
