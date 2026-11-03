# moiliki.app

Static site for the «Мої ліки» app: landing, privacy policy, terms, support and account deletion, in Ukrainian (`/`) and English (`/en/`). Plain HTML and one stylesheet, no build step. Served by GitHub Pages from `main`.

## Local preview

```
npm run serve     # http://localhost:3000, clean URLs like GitHub Pages
npm run check     # pages, language pairs, links, sitemap, no external resources
```

Run `npm run check` before every push.

## Editing

- Header and footer are repeated in every page. Change them in all ten files; `check` fails if footers drift apart.
- A new page needs both languages, an entry in `sitemap.xml`, and a footer link if it is a service page.
- No external scripts, fonts or images: the privacy policy promises the site has no trackers.

## Assets

`scripts/make-assets.mjs` renders the PNG icons, the Open Graph image and the cabinet screenshot (`npm i --no-save @resvg/resvg-js@2.6.2` first). To replace the screenshot with a clean one, drop a PNG at `assets/screens/cabinet.png` (same aspect, about 600px wide).
