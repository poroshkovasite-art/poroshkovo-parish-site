"""Independent sitemap/XML/HTML/crawl audit; stdlib only, no indexing claims."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.robotparser import RobotFileParser
import argparse
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT.parent / 'audit'
BASE = 'https://poroshkovo.pages.dev'
POINT = (48.67082394012906, 22.752845895344038)
GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class HTML(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.lang = ''; self.title = ''; self.h1 = []; self.meta = {}; self.links = []
        self.anchors = []; self.schemas = []; self.ids = set(); self.capture = None
        self.script = None; self.buffer = ''
        self.feed(text)

    def handle_starttag(self, tag, pairs):
        a = dict(pairs)
        if a.get('id'): self.ids.add(a['id'])
        if tag == 'html': self.lang = a.get('lang', '')
        if tag == 'meta': self.meta.setdefault(a.get('name', '').lower(), []).append(a.get('content', ''))
        if tag == 'link': self.links.append(a)
        if tag == 'a' and a.get('href'): self.anchors.append(a['href'])
        if tag in ('title', 'h1'): self.capture = tag; self.buffer = ''
        if tag == 'script' and a.get('type') == 'application/ld+json': self.script = ''; self.capture = 'json'; self.buffer = ''

    def handle_data(self, data):
        if self.capture: self.buffer += data

    def handle_endtag(self, tag):
        if tag == self.capture:
            value = ' '.join(self.buffer.split())
            if tag == 'title': self.title = value
            if tag == 'h1': self.h1.append(value)
            self.capture = None
        if tag == 'script' and self.capture == 'json':
            self.schemas.append(json.loads(self.buffer)); self.capture = None


def fetch(item):
    route, agent = item
    try:
        response = build_opener(NoRedirect).open(Request(BASE + route, headers={'User-Agent': agent}), timeout=30)
    except HTTPError as error:
        response = error
    return route, agent, response.status, dict(response.headers), response.read().decode('utf-8', errors='replace')


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument('--live', action='store_true'); parser.add_argument('--baseline', action='store_true')
    args = parser.parse_args()
    mode = 'baseline' if args.baseline else 'production' if args.live else 'local'
    report = {'status': 'RUNNING', 'mode': mode, 'checked_at': datetime.now(timezone.utc).isoformat(),
              'base': BASE, 'pages': [], 'http': [], 'findings': [], 'indexation': 'Not confirmed in Search Console'}
    def check(condition, issue):
        if not condition: report['findings'].append(issue)

    # Discover actual generated HTML independently of routes.json and the sitemap.
    routes = sorted('/' + p.parent.relative_to(ROOT / 'dist').as_posix() + '/'
                    for lang in ('uk', 'en') for p in (ROOT / 'dist' / lang).rglob('index.html'))
    check(set(routes) == set(json.loads((ROOT / 'dist/routes.json').read_text('utf-8'))), 'Generated routes disagree with manifest')
    agents = ('PoroshkovoTechnicalAudit/1.0', GOOGLEBOT)
    normal = agents[0]
    missing = ['/uk/seo-audit-missing-20261101/', '/en/seo-audit-missing-20261101/', '/seo-audit-missing-20261101/']
    special = ['/sitemap.xml', '/robots.txt', '/uk/sitemap.xml', '/en/sitemap.xml']
    responses = {}
    if args.live:
        with ThreadPoolExecutor(max_workers=5) as pool:
            for route, agent, status, headers, body in pool.map(fetch, [(r, a) for r in routes + special + missing for a in agents]):
                headers = {k.lower(): v for k, v in headers.items()}
                responses[(route, agent)] = (status, headers, body)
                report['http'].append({'url': BASE + route, 'agent': 'Googlebot' if agent == GOOGLEBOT else 'normal',
                                       'status': status, 'content_type': headers.get('content-type'),
                                       'x_robots_tag': headers.get('x-robots-tag'), 'location': headers.get('location')})
                check(status == (404 if route in missing else 200), f'{route}: HTTP {status} ({agent})')
                if route not in missing:
                    check(not re.search(r'noindex|nofollow|none', headers.get('x-robots-tag', ''), re.I), f'{route}: blocking X-Robots-Tag')
                if route in routes: check('text/html' in headers.get('content-type', ''), f'{route}: non-HTML page')
                if route.endswith('sitemap.xml'): check('xml' in headers.get('content-type', ''), f'{route}: incorrect XML MIME')
    def body(route):
        if args.live: return responses[(route, normal)][2]
        file = ROOT / 'dist' / route.lstrip('/')
        if route.endswith('/'): file /= 'index.html'
        return file.read_text('utf-8')

    sitemap = ET.fromstring(body('/sitemap.xml'))
    namespace = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    check(sitemap.tag == '{http://www.sitemaps.org/schemas/sitemap/0.9}urlset', 'Invalid sitemap namespace/root')
    urls = [node.text for node in sitemap.findall('s:url/s:loc', namespace)]
    check(len(urls) == len(set(urls)), 'Sitemap duplicates')
    check(set(urls) == {BASE + r for r in routes}, 'Sitemap missing or extra canonical pages')
    check(all(u.startswith(BASE + '/') and urlsplit(u).scheme == 'https' for u in urls), 'Sitemap contains non-absolute/non-HTTPS URLs')
    check(not sitemap.findall('s:url/s:lastmod', namespace), 'lastmod requires independently documented actual content dates')
    for lang in ('uk', 'en'):
        localized = ET.fromstring(body('/' + lang + '/sitemap.xml'))
        locs = [n.text for n in localized.findall('s:url/s:loc', namespace)]
        check(set(locs) == {BASE + r for r in routes if r.startswith('/' + lang + '/')}, f'{lang}: localized sitemap mismatch')
    robots_text = body('/robots.txt')
    robots = RobotFileParser(); robots.parse(robots_text.splitlines())
    check('Sitemap: ' + BASE + '/sitemap.xml' in robots_text, 'robots.txt lacks canonical sitemap declaration')
    for route in routes: check(robots.can_fetch('Googlebot', BASE + route) and robots.can_fetch('*', BASE + route), route + ': blocked by robots.txt')

    parsed = {}; titles = set(); descriptions = set()
    for route in routes:
        html = HTML(body(route)); parsed[route] = html; lang = route.split('/')[1]
        canonical = [l.get('href') for l in html.links if l.get('rel') == 'canonical']
        alternates = {l.get('hreflang'): l.get('href') for l in html.links if l.get('rel') == 'alternate' and l.get('hreflang')}
        check(canonical == [BASE + route], route + ': canonical is not exact self-reference')
        expected = {l: BASE + '/' + l + '/' + route[4:] for l in ('uk', 'en')}
        for code, value in expected.items(): check(alternates.get(code) == value, route + ': wrong hreflang ' + code)
        check(alternates.get('x-default') == expected['uk'], route + ': wrong x-default')
        check(html.lang == lang, route + ': wrong HTML lang')
        check(bool(html.title) and html.title not in titles, route + ': empty or duplicate title'); titles.add(html.title)
        description = html.meta.get('description', [])
        check(len(description) == 1 and bool(description[0]) and description[0] not in descriptions, route + ': empty or duplicate description')
        descriptions.update(description)
        check(len(html.h1) == 1 and bool(html.h1[0]), route + ': invalid H1')
        if lang == 'en': check(not re.search('[А-Яа-яІіЇїЄєҐґ]', html.title + ''.join(description) + ''.join(html.h1)), route + ': non-English metadata')
        check(not any(re.search(r'noindex|nofollow|none', m, re.I) for m in html.meta.get('robots', []) + html.meta.get('googlebot', [])), route + ': blocking meta robots')
        if route in ('/uk/', '/en/', '/uk/contacts/', '/en/contacts/'):
            check(len(html.schemas) == 1, route + ': missing parish Church schema')
            if html.schemas:
                schema = html.schemas[0]
                check(schema.get('@type') == 'Church', route + ': wrong schema type')
                check(tuple(schema.get('geo', {}).get(k) for k in ('latitude', 'longitude')) == POINT, route + ': wrong Schema coordinates')
                check(schema.get('telephone') == '+380504321969', route + ': wrong/missing public telephone')
                check(schema.get('hasMap') == 'https://www.google.com/maps?q=' + ','.join(map(str, POINT)), route + ': wrong Schema map')
                check('Greek Catholic' in schema.get('description', '') if lang == 'en' else 'Греко-католицька' in schema.get('description', ''), route + ': missing denomination')
                check(schema.get('address', {}).get('addressCountry') == 'UA', route + ': missing country')
                check('streetAddress' not in schema.get('address', {}), route + ': unconfirmed street address')
        if args.live:
            bot = HTML(responses[(route, GOOGLEBOT)][2])
            check(bot.lang == lang and bot.title == html.title and bot.h1 == html.h1, route + ': Googlebot content differs')
        report['pages'].append({'url': BASE + route, 'lang': lang, 'title': html.title, 'description': description[0] if description else None,
                                'h1': html.h1, 'canonical': canonical, 'hreflang': alternates, 'schema': html.schemas})
    # Reachability and counterpart checks independently follow real HTML links.
    seen = set(); todo = ['/uk/', '/en/']; internal = set()
    while todo:
        route = todo.pop()
        if route in seen: continue
        seen.add(route)
        for href in parsed[route].anchors:
            url = urlsplit(urljoin(BASE + route, href))
            if url.netloc != urlsplit(BASE).netloc or not url.path.startswith(('/uk/', '/en/')): continue
            if url.path.endswith('sitemap.xml') or url.path.endswith('site.webmanifest'): continue
            internal.add(url.path)
            check(url.path in parsed, route + ': link to nonpublic route ' + url.path)
            if url.path in parsed and url.path not in seen: todo.append(url.path)
    check(seen == set(routes), 'Some public pages cannot be discovered through HTML links')
    for missing_route in missing if args.live else ['/404.html']:
        missing_html = HTML(body(missing_route))
        check(any('noindex' in m for m in missing_html.meta.get('robots', [])), missing_route + ': error page is indexable')
        check(not any(l.get('rel') in ('canonical', 'alternate') for l in missing_html.links), missing_route + ': error page advertises canonical/hreflang')
        check(not missing_html.schemas, missing_route + ': error page advertises Church schema')
    report.update(status='PASS' if not report['findings'] else 'FINDINGS', ukrainian_urls=sum(r.startswith('/uk/') for r in routes),
                  english_urls=sum(r.startswith('/en/') for r in routes), sitemap_urls=urls, discovered_through_links=len(seen),
                  internal_page_targets=len(internal), sitemap_http=responses.get(('/sitemap.xml', normal), (None,))[0],
                  robots_http=responses.get(('/robots.txt', normal), (None,))[0], lastmod='omitted; no invented update dates')
    AUDIT.mkdir(exist_ok=True)
    (AUDIT / f'seo-{mode}-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), 'utf-8')
    print(json.dumps({k: v for k, v in report.items() if k not in ('pages', 'http', 'sitemap_urls')}, ensure_ascii=False, indent=2))
    if report['findings'] and not args.baseline: raise SystemExit(1)


if __name__ == '__main__':
    run()
