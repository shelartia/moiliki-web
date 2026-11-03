// Renders the PNG assets: favicon-32, apple-touch-icon, og-image and the cabinet screenshot.
// Run: npm i --no-save @resvg/resvg-js@2.6.2 && node scripts/make-assets.mjs <app-screenshot.png> <onest-ttf-dir>
//   <app-screenshot.png>  an iPhone screenshot of the «Ліки» tab, 1170×2532
//   <onest-ttf-dir>       Onest 400 and 800 as full TrueType files (resvg reads no WOFF); the CSS API at
//                         https://fonts.googleapis.com/css2?family=Onest:wght@400;800 lists them for a plain curl
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');
const [screenshot, fontDir] = process.argv.slice(2);
if (!screenshot || !fontDir) {
  console.error('usage: node scripts/make-assets.mjs <app-screenshot.png> <onest-ttf-dir>');
  process.exit(1);
}

const PAPER = '#F5F2EC';
const INK = '#16171A';
const MUTED = '#5F5E5A';
const seal = readFileSync(join(OUT, 'seal.svg'), 'utf8');
const sealInner = seal.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const fontFiles = readdirSync(fontDir).filter((f) => /\.ttf$/i.test(f)).map((f) => join(fontDir, f));

const png = (name, svg, opts = {}) => {
  const data = new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Onest' }, ...opts }).render().asPng();
  writeFileSync(join(OUT, name), data);
  console.log(name, data.length, 'bytes');
};

// Icons: the mark on paper, a little inset like the app icon.
const icon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${PAPER}"/><svg x="8" y="8" width="84" height="84" viewBox="150 150 724 724">${sealInner}</svg></svg>`;
png('favicon-32.png', icon(32));
png('apple-touch-icon.png', icon(180));

// Open Graph card, 1200×630.
png('og-image.png', `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <svg x="90" y="155" width="320" height="320" viewBox="150 150 724 724">${sealInner}</svg>
  <text x="470" y="290" font-family="Onest" font-weight="800" font-size="104" fill="${INK}">Мої ліки</text>
  <text x="474" y="370" font-family="Onest" font-weight="400" font-size="40" fill="${MUTED}">Терміни придатності, прийом</text>
  <text x="474" y="422" font-family="Onest" font-weight="400" font-size="40" fill="${MUTED}">і відкликані серії ліків</text>
  <text x="474" y="510" font-family="Onest" font-weight="800" font-size="32" fill="${INK}">moiliki.app</text>
</svg>`);

// Cabinet screenshot: header, the list and the tab bar, without the notifications banner between them.
// Source rows (px of the 1170×2532 screenshot): header 0–470, list 873–1160, tab bar 2279–2532.
const shot = `data:image/png;base64,${readFileSync(screenshot).toString('base64')}`;
const piece = (y0, y1, at, id) => `<clipPath id="${id}"><rect x="0" y="${at}" width="1170" height="${y1 - y0}"/></clipPath>
  <image href="${shot}" x="0" y="${at - y0}" width="1170" height="2532" clip-path="url(#${id})"/>`;
mkdirSync(join(OUT, 'screens'), { recursive: true });
png('screens/cabinet.png', `<svg xmlns="http://www.w3.org/2000/svg" width="1170" height="2532" viewBox="0 0 1170 2532">
  <rect width="1170" height="2532" fill="${PAPER}"/>
  ${piece(0, 470, 0, 'a')}
  ${piece(873, 1160, 500, 'b')}
  ${piece(2279, 2532, 2279, 'c')}
</svg>`, { fitTo: { mode: 'width', value: 600 } });
