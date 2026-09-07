# Site cost reference

Re-measure before treating these as law. Commands: `npm test`, `npm run build`, `npm run bench`, `npm run resume:check`, `npm run frameworks:check`.

## Bench scores (2026-09-07, Astro)

| Lab | Score | Badge |
| --- | ---: | --- |
| On-site search engine optimization | 100 | Portfolio SEO |
| First-load JS/CSS vs static-first budget | 100 | Portfolio speed |
| Site frameworks (current major) | up to date | Portfolio frameworks |
| Homepage script | 21 KB | (Next.js was 427 KB) |

Lighthouse in CI is warn-only. Do not copy a Lighthouse or old Next number onto the speed shield.

## Typical transfer (post AVIF + icon shrink)

- `/` first-load JS: ~21 KB (budget 25 KB). `work-route` is an idle chunk, not first-load.
- `/` HTML: ~57 KB (current-year contribution SVG ~32 KB)
- `/` CSS: ~20 KB globals
- Work/view CSS: globals + work.css ~35 KB
- Work idle: React ~185 KB + `/home-fragment` ~47 KB
- `hls.js`: ~523 KB, ModernOrange play on Chromium only
- `contributions.json`: ~107 KB, idle after first paint
- Favicon ICO: ~9 KB. `favicon-32.png`: ~3 KB. Apple touch: ~60 KB
- OG JPEG: ~120 KB. Avatar AVIF: ~3 KB

## Work navigation (localhost static preview, 2026-09-07)

MPA document fetch (fallback, cmd-click, first visit before idle):

| Path | Time | Bytes |
| --- | ---: | ---: |
| `/work/wawona` | 8-33 ms | 15 KB |
| `/work/apple-sharpener` | 5-6 ms | 13 KB |
| `/work/whisperer` | 23-46 ms | 24 KB |
| `/work/modernorange-band` | 6-10 ms | 29 KB |
| `/work/sentinel-pc-building-club` | 6-24 ms | 45 KB |

Then the old MPA path still fetched `/home-fragment` (~47-58 KB) and rebuilt home. That is what felt slow on a low-end phone.

After idle, panes are parked in one grid cell (`content-visibility: hidden`). From `/`, the home-born shell opens a fixed overlay (visibility), not a 0fr grid lerp. Click cost is `data-show` / `data-open`. Parse and `innerHTML` happen during idle or hover park. Island hydrate runs after the shown flip, one pane only. `npm run bench:work` times the document fetch, not the click.

## Hosting

Prerendered CDN: `/`, `/work/*`, `/home-fragment`, legal, sitemap, robots, manifest.
`/view` is a prerendered shell. Functions: contact, preview, TIDAL. First-party and `wawona.io` project links stay on `/work/*` (do not iframe them: local hosts entries refuse the TCP connection). Vercel invoice barely moves if you shrink HTML/JS. Favicon was the worst every-page blob.

## Leftover optional wins (do not start unless asked)

- Current-year graph as a cacheable `img` (drops ~32 KB HTML)
- Vanilla ContactForm (drops React on contact / work remount)
- Dedupe shared rules between `globals.css` and `work.css`
