# Home page and maps — 2 November 2026

This instruction supersedes the previous home feature carousel, first-visit promotion and click-to-load Google iframe. Both languages use the same order: paired buildings, mission with a three-photo composition, one circular parish-life carousel, four ministry groups, history and historical map, contacts with an interactive map, then restrained support and official bank details. About, documents, worship, calendar and the auxiliary first-visit page retain their routes. The first-visit page is linked only from Contacts, not the header or home page.

The eleven approved home photographs have distinct roles, without duplicates. Children, community and shared work illustrate the mission; six other approved photographs form the prayer/life carousel. Camp, bicycle outing, food assistance and older-person visits are reserved in the data model for future editorial use. All 26 new photographs and 116 WebP variants remain pending_approval and outside production. No photo permission statuses have changed. The missing scene remains missing.

The owner explicitly excluded the children-in-a-car-boot scene and the two girls with a wheelbarrow near the church. Catalogue candidates `chronicle-young-parish-helpers` (18.jpeg) and `chronicle-church-grounds-cleanup` (20.jpeg) are conservatively excluded from production and editorial rendering. Original numbered photos are unavailable on laptop 2; verify these visual matches before any future use. The descriptive prohibition applies to the scenes regardless of filenames. Approval of other materials does not override this exclusion.

Seven ministry directions are grouped into four compact cards: defenders/bereaved families; displaced people; hospital/home visits; families/children/community. The supplied direction is distinguished from evidence of a completed programme. No visits, families, institutions, regularity or measured outcomes are invented. Existing documented prayer practice and individual supplied examples remain distinct.

## Interactive location map

The owner chose an immediately visible OpenStreetMap map, with Google Maps available only as an external link. Leaflet 1.9.4 is vendored locally with its BSD licence. The marker is fixed at 48.67082394012906,22.752845895344038 and named “Парафія святих Кирила і Методія”. Default zoom 17; keyboard, touch, drag and zoom controls are available. No geolocation request is made. Coordinates, a static text fallback, Google Maps and directions links work without JavaScript or when tiles are unavailable.

Tiles load directly from `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, with crossOrigin anonymous, a site-origin Referer, normal browser caching and visible attribution. The tile URL is configurable in content/site.json. No Google request occurs on page load. OSM Foundation receives IP and connection data; UA/EN privacy notices explain this. No claim of universal legal compliance is made. A future return to embedded Google Maps requires reassessing consent and data-transfer requirements, rather than removing the notice.

Sources: [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/), [OSMF privacy policy](https://osmfoundation.org/wiki/Privacy_Policy), [Leaflet stable release](https://leafletjs.com/download.html), [EU privacy guidance](https://europa.eu/youreurope/citizens/consumers/internet-telecoms/data-protection-online-privacy/index_en.htm), [Ukrainian personal-data law](https://zakon.rada.gov.ua/go/2297-17).

## Historical map

The complete hand-coloured map by Guillaume Le Vasseur de Beauplan, 1648, is supplied by the National Archives of Sweden through Wikimedia Commons. [Source and public-domain statement](https://commons.wikimedia.org/wiki/File:Old_map_of_Ukraine.jpg). Original 6515×6287 JPEG SHA256: `981e7b6479ec328730f49905fd93a5c3b0b2651c6d62ae382ca5e6bc13a69e4f`. Responsive exports retain the complete image; the original is linked. The caption explains that this is wider historical context, not a detailed plan of Poroshkovo. The previous 1921 map assets are retained in source/history but are no longer shown in the home/history blocks.

## Verification

Build/check and the SEO audit preserve all 18 UA + 18 EN routes, canonical, hreflang and sitemap. Run `npm run build:production`, `npm run check`, `npm run preview`, `npm run test:browser`, `npm run test:restructure`, `npm run test:mission`, `npm run test:media`, `npm run test:hero-buildings`, and `npm run test:chronicle`. Browser executable may be selected through PLAYWRIGHT_CHROMIUM_EXECUTABLE. When the original private collection is absent, CHRONICLE_SKIP_EDITOR=1 skips only the unavailable editorial-file portion; public privacy and interaction checks still run. Full editor builds require the original private materials from laptop 1.

The restructure suite verifies order, unique photo IDs, seven directions, exact pin, automatic tile display, pan/zoom, no Google calls, visible attribution, network-failure/no-JS fallbacks and accessibility. Production uses RESTRUCTURE_BASE_URL; verify the resulting deployment separately with `npm run verify:deployment` and `python scripts/seo-audit.py --live`.
