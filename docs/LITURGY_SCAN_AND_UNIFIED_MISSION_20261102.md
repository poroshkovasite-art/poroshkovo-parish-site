# Liturgy scan and unified home mission

Scope: replace the previous liturgy reader with the owner-supplied 66-page scan, and combine the two home photo sections into one mission section. Preserve existing routes, brand, photographs, permissions, map and bank details.

## Liturgy source

- File: `літургія.pdf`, 66 image-only pages, original SHA256 `f60bd0c6e3ed5020c03997123a6b5adbab1fce8151745371b12f3fc79f4aa05e`.
- Source heading: «Божественна Літургія святого отця нашого Івана Золотоустого». One icon page and printed pages 25–89. Publisher, publication year and publication title page are absent. Do not attribute the scan to an official 2024 edition.
- The owner specifically confirmed electronic reproduction rights and pastoral approval for this new file on 2026-11-02. The owner confirmed there is no continuation; use only this scan.
- Referenced appendices «Псалми зображальні» and «Трисвяте» are absent. There is no complete eight-tone cycle. No missing prayers, readings or abbreviated source passages have been expanded from memory or imported from another edition.
- 704 explicit content blocks, 14 navigation divisions, three source footnotes, one diagram reference. Roles, conditional variants and inline red/black runs are explicit data. The renderer does not guess speakers from initial words.
- All 66 scan pages are available for comparison. They load only when opened. The public optimized PDF is 21,793,343 bytes; original 44,037,776-byte PDF is preserved privately. Previous text/PDF are archived in `private-materials/liturgy/previous-0dba9e8` and Git history.
- Reflowable text omits stress marks, joins page/line hyphenation and normalizes apostrophes. Source words, sequence, conditional repetitions and notes are retained. The page states these typography changes. Full original typography and accents remain in the facsimile.
- Owner additionally supplied `Божественна Літургія А4 великий шрифт.docx`, SHA256 `0771420a4f06917f9fb773f51836a7f46d09a44fd1625ee3914a8ebccec8cc73`. It was used for cross-checking, not as a replacement edition. Three transcription corrections were rechecked against scan pages 25, 51 and 53: «наближатись», «рушничком», «переісточені». Other wording differences retain the scan.
- Per the owner's latest instruction, the complete text and scan viewer appear only at `/uk/divine-liturgy/`. The English counterpart contains only an English availability notice and a link to the Ukrainian page. It contains no liturgical text, embedded scan or purported English translation.
- Georgia/system serif stack; no proprietary PDF font extraction. Font controls, reading mode, expandable contents, source-page links, return links and print styling.

## One home photo section

`content/home-carousel.json` controls selection, order, bilingual headings/descriptions and thematic destinations. The existing circular carousel remains; the three-image static composition and standalone «Життя нашої парафії» heading are removed. The owner's exact new mission description introduces the carousel.

21 distinct approved scenes include prayer, children, camp, cycling, workshops, recreation, visits, support and community work. Building photographs stay in the hero/history; portrait, near-duplicate interior, certificate document and baked-caption winter photograph remain in their appropriate existing sections. No photograph bytes or catalogue approval statuses changed.

8.jpeg (children in car boot) and 20.jpeg (girls carrying waste with a wheelbarrow) remain excluded. All 15 pending originals and 70 pending WebP copies remain private; the 11 previously approved originals/46 derivatives stay approved. The missing scene remains `missing`.

Offstage images retain their layout frames but defer fetching; only visible/nearby images are loaded. Loaded images remain available through the transition so the fade does not blink. The existing arrows, swipe, keyboard, pause, hover/offscreen pauses and 800ms transition remain.

## Validation and evidence

Production build and internal reference checks; `test:liturgy-book`, owner additions integrity/UI, chronicle, mission, hero, localization, publication gates, browser and SEO checks. Source-to-model and model-to-rendered-text comparisons preserve the complete annotated transcription. This is not a claim of automatic character-perfect OCR comparison with image-only PDF pages.

External evidence: `D:/POROSHKOVO_PARISH_WORK/audit/liturgy-new-20261102/`, including before/after screenshots, full reader captures, source-copy verification, DOCX comparison, source page renders, accessibility, image-loading and Lighthouse reports. Production deployment, final commit and verified backup are recorded in the final handoff outside the repository.
