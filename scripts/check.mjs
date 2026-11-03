// Site checks: pages, language pairs, links, sitemap, external resources. No dependencies.
// Run: node scripts/check.mjs — prints every failure, exits 1 if any.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://moiliki.app';
const PAGES = ['', 'privacy', 'terms', 'support', 'delete-account'];
const EXTERNAL_LINKS = [
  'https://t.me/moiliki_app',
  'https://apps.apple.com/',
  'mailto:',
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  'https://www.drlz.com.ua/',
  'https://ombudsman.gov.ua/',
];

const failures = [];
let checks = 0;
const check = (ok, file, rule) => {
  checks++;
  if (!ok) failures.push(`FAIL ${file}: ${rule}`);
};

/** Canonical path of a page in a language: '/', '/privacy', '/en/', '/en/privacy'. */
const canonical = (lang, page) => (lang === 'uk' ? '/' : '/en/') + page;
const fileOf = (lang, page) => (lang === 'uk' ? '' : 'en/') + (page || 'index') + '.html';
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

/** Resolves a site path the way GitHub Pages does: file, path.html, path/index.html. */
function resolves(path) {
  const p = decodeURI(path.split(/[?#]/)[0]).replace(/^\//, '');
  const candidates = [p, `${p}.html`, join(p, 'index.html')];
  return candidates.some((c) => c !== '' && existsSync(join(ROOT, c)) && statSync(join(ROOT, c)).isFile());
}

const attrs = (html, tag, attr) =>
  [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]*)"`, 'gi'))].map((m) => m[1]);
const linkTag = (html, rel, extra = '') =>
  [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((t) => t.includes(`rel="${rel}"`) && t.includes(extra));
const hrefOf = (tag) => (tag && tag.match(/href="([^"]*)"/) || [])[1];

const footers = { uk: new Set(), en: new Set() };

for (const lang of ['uk', 'en']) {
  for (const page of PAGES) {
    const file = fileOf(lang, page);
    if (!existsSync(join(ROOT, file))) {
      check(false, file, 'page exists');
      continue;
    }
    const html = read(file);
    const other = lang === 'uk' ? 'en' : 'uk';

    check(new RegExp(`<html\\b[^>]*lang="${lang}"`).test(html), file, `<html lang="${lang}">`);
    check(/<title>[^<]+<\/title>/.test(html), file, 'non-empty <title>');
    check(/<meta name="description" content="[^"]+"/.test(html), file, 'meta description');
    check(hrefOf(linkTag(html, 'canonical')[0]) === ORIGIN + canonical(lang, page), file, 'canonical URL');
    for (const [hl, l] of [['uk', 'uk'], ['en', 'en'], ['x-default', 'uk']]) {
      check(hrefOf(linkTag(html, 'alternate', `hreflang="${hl}"`)[0]) === ORIGIN + canonical(l, page), file, `hreflang ${hl}`);
    }
    const langLinks = [...html.matchAll(/<a\b[^>]*class="lang"[^>]*>/gi)].map((m) => hrefOf(m[0]));
    check(langLinks.length > 0 && langLinks.every((h) => h === canonical(other, page)), file, 'language switch points to the same page');

    const footer = (html.match(/<footer[\s\S]*?<\/footer>/) || [''])[0];
    check(footer !== '', file, 'has <footer>');
    footers[lang].add(footer.replace(/<a\b[^>]*class="lang"[^>]*>[\s\S]*?<\/a>/g, ''));
    for (const p of PAGES.slice(1)) check(footer.includes(`href="${canonical(lang, p)}"`), file, `footer links ${p}`);

    if (page === '') check(html.includes('https://t.me/moiliki_app'), file, 'links the Telegram channel');
    if (page === 'privacy') {
      const text = html.replace(/Паролів немає|There are no passwords|no passwords/g, '');
      for (const word of ['bcrypt', 'парол', 'password', 'Google Analytics']) {
        check(!text.toLowerCase().includes(word.toLowerCase()), file, `no "${word}" in privacy`);
      }
    }
  }
}
// Claims the final review found false against the app's code; they must not come back.
const STALE_CLAIMS = {
  'privacy.html': ['Ці запити анонімні', 'не пізніше ніж за добу', 'IP-адреса, час і адреса запиту)', 'доки ви їх не видалите або не видалите застосунок', 'лише розробник і хостинг-провайдер', 'доступ через Apple відкликається', 'попередимо в застосунку'],
  'en/privacy.html': ['These requests are anonymous', 'within a day after that', 'IP address, time and path of the request)', 'until you delete it or delete the app', 'Only the developer and the hosting provider', 'Apple access is revoked', 'warn you in the app'],
  'support.html': ['Дані підтягнуться самі.'],
  'en/support.html': ['Your data comes across automatically.'],
  'delete-account.html': ['доступ через Apple відкликається'],
  'en/delete-account.html': ['Apple access is revoked'],
  'terms.html': ['попередимо в застосунку', 'телефонуйте 103.'],
  'en/terms.html': ['warn you in the app'],
};
for (const [file, claims] of Object.entries(STALE_CLAIMS)) {
  const html = existsSync(join(ROOT, file)) ? read(file) : '';
  for (const c of claims) check(!html.includes(c), file, `no stale claim "${c}"`);
}

check(footers.uk.size === 1, 'uk pages', 'footer identical on every page');
check(footers.en.size === 1, 'en pages', 'footer identical on every page');

// Links and resources across every HTML file, the 404 included.
const allHtml = [...PAGES.flatMap((p) => [fileOf('uk', p), fileOf('en', p)]), '404.html'].filter((f) => existsSync(join(ROOT, f)));
check(existsSync(join(ROOT, '404.html')), '404.html', 'exists');
for (const file of allHtml) {
  const html = read(file);
  const hrefs = attrs(html, 'a', 'href');
  const resources = [...attrs(html, 'img', 'src'), ...attrs(html, 'script', 'src'), ...attrs(html, 'link', 'href').filter((h) => !h.startsWith(ORIGIN))];
  for (const h of [...hrefs, ...resources]) {
    check(!h.startsWith('http://'), file, `no http:// (${h})`);
    if (h.startsWith('/')) {
      check(resolves(h), file, `link resolves (${h})`);
      check(!/\.html($|[?#])/.test(h), file, `no .html in link (${h})`);
    }
  }
  for (const r of resources) check(r.startsWith('/'), file, `no external resource (${r})`);
  for (const h of hrefs) {
    if (h.startsWith('/') || h.startsWith('#')) continue;
    check(EXTERNAL_LINKS.some((ok) => h.startsWith(ok)), file, `external link allowed (${h})`);
  }
}

// sitemap.xml and CNAME.
const sitemap = existsSync(join(ROOT, 'sitemap.xml')) ? read('sitemap.xml') : '';
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
const expected = PAGES.flatMap((p) => [ORIGIN + canonical('uk', p), ORIGIN + canonical('en', p)]).sort();
check(JSON.stringify(locs) === JSON.stringify(expected), 'sitemap.xml', 'lists exactly the 10 canonical URLs');
check(existsSync(join(ROOT, 'CNAME')) && read('CNAME').trim() === 'moiliki.app', 'CNAME', 'is moiliki.app');

for (const f of failures) console.log(f);
if (failures.length) {
  console.log(`${failures.length} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`OK ${checks} checks`);
