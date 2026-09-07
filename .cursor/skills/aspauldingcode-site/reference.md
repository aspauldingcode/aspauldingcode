# Site cost reference

Re-measure before treating these as law. Commands: `npm test`, `npm run build`, `npm run bench`.

## Typical transfer (post AVIF + icon shrink)

- `/` first-load JS: ~18 KB (budget 25 KB)
- `/` HTML: ~57 KB (current-year contribution SVG ~32 KB)
- `/` CSS: ~20 KB globals
- Work/view CSS: globals + work.css ~35 KB
- Work idle: React ~185 KB + `/home-fragment` ~47 KB
- `hls.js`: ~523 KB, ModernOrange play on Chromium only
- `contributions.json`: ~107 KB, idle after first paint
- Favicon ICO: ~9 KB. `favicon-32.png`: ~3 KB. Apple touch: ~60 KB
- OG JPEG: ~120 KB. Avatar AVIF: ~3 KB

## Hosting

Prerendered CDN: `/`, `/work/*`, `/home-fragment`, legal, sitemap, robots, manifest.
Functions: `/view`, contact, preview, TIDAL. Vercel invoice barely moves if you shrink HTML/JS. Favicon was the worst every-page blob.

## Leftover optional wins (do not start unless asked)

- Current-year graph as a cacheable `img` (drops ~32 KB HTML)
- Vanilla ContactForm (drops React on contact / work remount)
- Dedupe shared rules between `globals.css` and `work.css`
