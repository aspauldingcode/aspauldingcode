---
name: aspauldingcode-site
description: >-
  Portfolio site architecture, first-load budget, homepage fragment, AVIF and
  icon pipeline, Astro toolbar audit, README badges, resume.json checks, and
  Blink/Gecko/WebKit splits for aspauldingcode.com. Use when editing Astro
  pages, HomePage, SplitShell, contact, hire me, images, fonts, favicons,
  benches, Vercel, resume.json, or when measuring homepage JS/CSS/HTML.
---

# aspauldingcode site

Read this before changing site architecture, first-load cost, homepage, work/view chrome, images, or icons. Identity and copy stay in `.cursor/rules/identity.mdc` and `writing.mdc`.

## Stack

- Astro 5, React islands, `@astrojs/vercel`, `output: 'server'`
- Prerender `/`, `/work/*`, `/home-fragment`, legal, sitemap, robots, manifest
- Serverless only: `/api/contact`, `/api/preview*`, `/api/tidal-*`
- `/view` is a prerendered shell. The client reads `?u=`. First-party and mapped project URLs never stay on `/view`.
- Canonical host: `https://www.aspauldingcode.com`
- Env: `PUBLIC_SITE_URL`, `PUBLIC_RECAPTCHA_SITEKEY` (no `NEXT_PUBLIC_*`)
- Vercel project framework must be `astro`, build command `npm run vercel-build`. A leftover Next.js preset fails in ~9s: `No Next.js version detected`. Do not set `outputDirectory` (the adapter writes `.vercel/output`). After a framework switch, confirm production HTML has `/_astro/` and `/home-fragment` is 200. `/_next/` or a fragment 404 means the old Next deploy is still aliased.

## One homepage

[`src/components/HomePage.astro`](../../../src/components/HomePage.astro) is the only home markup.

- `/` renders it through [`src/pages/index.astro`](../../../src/pages/index.astro)
- `/work/*` and `/view` wrap detail in [`src/components/SplitShell.tsx`](../../../src/components/SplitShell.tsx)
- SplitShell fetches [`/home-fragment`](../../../src/pages/home-fragment.astro), strips `<script>`, remounts `ContactForm` into `#contact-form-root`, runs `bootHome`
- Do not bring back `HomeContent.tsx`, `HireMe.tsx`, `ContributionGraphHost.tsx`, `PrefetchViewLink.tsx`, or `home.json`
- Do not add a `hydrate` prop on `HomePage`
- `site-chrome-foot` stays off. Project and view panes use [`ProjectFoot`](../../../src/components/ProjectFoot.tsx) inside `.wrap` (Hire me, back, SiteFooter). Do not hide `.project-home` on desktop. Overlay Hire me goes to `/?hire=1#contact` (`overlayHomeAction`), not a plain close.

Hire fly: `HIRE_HREF = '/?hire=1#contact'`. Vanilla [`src/scripts/hire-me.ts`](../../../src/scripts/hire-me.ts) plus [`src/lib/hireMeRuntime.ts`](../../../src/lib/hireMeRuntime.ts). A Hire me click closes the overlay, marks `/?hire=1#contact`, window-scrolls to `#contact`, and checks "I want to hire Alex". Keep 1:1 with `/`. The name / Hire me bar is global chrome: leave `[data-hire-host]` and `[data-hire-fly]` as body siblings when wrapping a home-born shell. Do not move them into `.split-main` (inert + overlay would hide the header and leave `--hire-chrome` padding). Hire-me re-queries `.split-shell` after wrap. `--hire-chrome` is set only while the bar is `.is-on`. Pin the bar to the centered `.wrap` (`hireBarPin`). Do not set `left: 0; width: 100%` when the project overlay is open (that turns the sticky header into a full-bleed view navbar). Pad the shown pane wrap with `--hire-chrome`, not the full overlay. Do not add a second "Back to {name}" under the hire bar. The bar name is home (`aria-label`). Overlay crumbs are Section / Current only (`detailTrail`). View "Open" sits on that same row. Footer `ProjectFoot` still has the explicit back link.

Work routing is a compositor flip, not a fetch. Idle (or first hover / pointerdown) downloads the five `/work/*` documents, waits for `work.css`, parses once, and parks each pane. Do not await `document.fonts.ready`, double `rAF`, or React hydrate before the pane is marked ready. Do not hydrate all five panes during idle (ImageCarousel + BandPlayer lock the main thread). A later click only sets `data-show` / `data-open` / `data-active` and `pushState`. No `innerHTML`, extract, fetch, or hydrate on that click. Hydrate the shown pane on the next animation frame (`queuePaneHydrate`). Do not open the overlay before the pane is parked (empty shell plus a late flip feels stuck). Do not toggle `position` absolute/relative on panes (layout). Stack them in one grid cell; parked panes use `content-visibility: hidden`. Lock homepage scroll with `html.work-open` / `body.work-open` only while the overlay is open. `work.css` `body:has(.split-shell)` and `100dvh` / inner-pane scroll must be `:not([data-home-shell])`. Closed overlay is `overflow: hidden` (`auto` only when open). A parked `position: fixed; inset: 0; overflow: auto` layer steals the wheel. Idle `ensureShell` plus injected `work.css` otherwise freezes `/` scroll. Do not use the `hidden` attribute on prepared panes (`display: none` forces layout on show). Homepage-born shells (`data-home-shell`) open a full-viewport overlay. Closed overlay is `display: none` (Astro Audit). Open overlay is `display: block` plus `visibility: visible` plus `overflow: auto`. Do not give the open home overlay the MPA `height: 100%` / `overflow: hidden` box (GitHub cards and project pages cannot scroll). Shown panes `align-self: start` so the overlay, not a stretched grid cell, is the scrollport. Do not use `opacity` or `will-change` to show or hide it (Chromium keeps a stale layer and flashes). A `visibility: visible` child paints through a hidden ancestor: while the shell is closed, force `[data-work-pane]` hidden. Solid `background: var(--bg)` and `isolation: isolate`. Overlay `z-index` stays below the hire bar (`50`). Do not shrink `.split-main` to 50% or use a 50vw pane. Do not leave prepared panes in homepage flow. MPA `/work/*` SplitShell stays a grid; only the inner pane flips. Do not add Astro `ClientRouter`. Do not put `work.css` on `/` first load. Load it as `work.css?url` plus `Base` `sheets` so the file stays its own hashed sheet. A side-effect `import '@/styles/work.css'` on `/work/*` merges into `index.*.css`. `sheetsToInject` then treats that file as globals and the homepage overlay never gets carousel or player rules. `boot-home` idle-imports `work-route` (do not statically import it from SplitShell). SplitShell must not parse work HTML through React. `npm run bench:work` times the documents, not the click.

Project viewing stays on this origin. `viewHref` / `localPathForHref` rewrite `aspauldingcode.com`, `www.aspauldingcode.com`, localhost, and mapped live hosts (`wawona.io` → `/work/wawona`) to same-origin paths. Do not iframe those hosts (a local `/etc/hosts` entry or a down preview port is `ERR_CONNECTION_REFUSED`). Do not wrap `/work/*` or other site paths in `/view?u=`. `/view` is only for third-party cards (GitHub, EWU) and vendor embeds (Spotify, Apple Music). From `/`, `/view?u=` clicks stay in the home overlay (`openPreparedView`, `viewQueryFromHref`). Do not full-navigate to the MPA `/view` split (that leaves the overlay and looks broken). `boot-home` must intercept `/view` before the idle `work-route` load, same as `/work/*`. Project hosts in `/view?u=` still become `/work/{slug}`. EmbedViewer reads `?u=` on `popstate` and `VIEW_EVENT`. It imports [`profileCardView.ts`](../../../src/lib/profileCardView.ts) only. Do not import `profileCard.ts` from a client island (that file pulls `linkpeek` and `/public/github/stats.json`; Vite warns and the EWU card never mounts). MPA `/view` (refresh, cmd-click) uses `data-active='view'` as one full column, not 50/50. Legal pages link to `/`, not `https://aspauldingcode.com`. Live OG cards still need `astro dev` or Vercel for `/api/preview`; static `npm run preview` can open `/view` and `/work/*`.

Education is the first body section. See `education-first.mdc`.

## First-load budget

Homepage first-load JS (inline except JSON-LD/`application/json`, plus `<script src>` and `client="load"` islands) must stay **under 25 KB**. Bench hard-fails `/` otherwise: `npm run bench` after `npm run build`.

- No `client:load` React on `/`
- `ContactForm` is `client:idle` so Hire me can check the box before `#contact` intersects. Do not use `client:load`.
- Hire me closes any home overlay (`CLOSE_WORK_EVENT`), `pushState`s `/?hire=1#contact`, sets `#contact-hiring` in the DOM, and assigns `document.scrollingElement.scrollTop` (home-shell `.split-main` is not a scrollport). Do not `scrollTo` `.split-main` on `data-home-shell`. Do not read `process.env` from `email.ts` or any module `ContactForm` imports (Vite leaves `process` undefined and the island never hydrates). Use `import.meta.env.PUBLIC_*`.
- Do not render `/` with React `HomeContent` to "simplify"

Current ballpark: see [reference.md](reference.md). After a first-load change, update `bench/latest.json` and the README **Portfolio speed** / **Portfolio SEO** shields so they match. Those shields are the on-site bench (unique `/work` HTML, www canonicals, first-load JS/CSS), not Lighthouse. Lighthouse in CI is warn-only (`continue-on-error`). A yellow 69 was a leftover Next.js first-load number. Do not put it back.

## Images and icons

On-page photos are AVIF. Open Graph stays JPEG.

```
npm run images:optimize   # JPEG/PNG sliders -> AVIF, skip profile_square.jpg
npm run images:icons      # OG 1200 JPEG + favicon.ico + favicon-32.png + apple-touch
```

- Long edge cap 1920 on gallery AVIF
- Keep `public/profile_square.jpg` as JPEG (~1200px, ~120 KB) for Slack / iMessage / LinkedIn
- Tab icons: PNG 32 first in `<head>`, ICO last. ICO frames ordered **32, 16, 48** (Safari uses the first ICO frame)
- Apple touch: `public/apple-touch-icon.png` 180, opaque on `#f4f2ec`. Not the OG JPEG
- No SVG favicon (WebKit)
- `imageSize()` must keep reading AVIF `ispe` plus JPEG/PNG
- Homepage photos use `astro:assets` `<Image>` with public AVIF paths and explicit width/height. That is a pass-through (`data-image-component="true"`). Do not move gallery files into `src/assets`. Do not put raw `<img>` back in `HomePage.astro` (Astro toolbar Audit flags them).
- `<Image>` defaults `loading="lazy"`. Keep the hero avatar `loading="eager"`.
- Closed overlay is `display: none`. Parked panes also use `content-visibility: hidden`. DOM `img.decode()` there does not fetch. Idle `image-warm` plus `work-route` `warmPane` use off-DOM `Image()` (`enqueueImages`). Decode first slide of each project. Cache the rest. Hover or open jumps that slug to the front of the queue. Save-data / 2g skip background warm; pointer intent still decodes that hero. 3g or `hardwareConcurrency <= 2` / `deviceMemory <= 2` run concurrency 1. Do not hydrate carousels during idle. Home `#image-warm-data` lists every gallery src, not only the first slide.

## Audit (Astro toolbar)

Run Audit on `/` after HomePage, hire bar, or graph edits. Idle wrap injects five work panes. The toolbar uses `innerText` and skips only `display: none` / `offsetParent === null`. `visibility: hidden` plus `content-visibility: hidden` still audits those panes as empty headings/links and leftover carousel `<img>`s (36+ a11y, a few perf).

- Closed home overlay (`.split-shell[data-home-shell]:not([data-open]) > .split-detail`) is `display: none`. Open overlay is `display: block` plus `visibility: visible`. Do not leave the closed overlay as `visibility: hidden` only.
- Parked panes stay `inert` + `aria-hidden="true"` (`setPaneShown`). Do not `display: none` the panes themselves while the overlay is open (layout on flip).
- `aria-hidden` must be `"true"` or absent. Bare `aria-hidden` in `.astro` HTML serializes empty and fails. React `aria-hidden` (boolean) already renders `"true"`.
- Never set `aria-hidden="false"` on the hire host. Idle: `"true"`. Bar on: `removeAttribute('aria-hidden')`. Fly layer stays `"true"`.
- The contribution graph `<a>` wraps only an SVG. Keep `aria-label` on the link (toolbar: required attributes missing).
- Do not put the words image, picture, or photo in `img` `alt` (toolbar: redundant alt). Carousel imgs set `data-image-component="true"` so retargeted islands are not flagged as raw `<img>`.

## Resume JSON

[`scripts/validate-resume.mjs`](../../../scripts/validate-resume.mjs) (`npm run resume:check`) plus [`.github/workflows/resume.yml`](../../../.github/workflows/resume.yml) (Resume badge). After `resume.json` edits: `resume:check` then `npm run resume:pdf`. The PDF is CalVer `vYYYY.MM.DD.pdf` (`src/lib/resumePdf.json`). `/resume` and `/resume.pdf` redirect to it. Delete stale `v*.pdf` and `resume.pdf` on export.

- JSON Resume v1.0.0: omit empty `endDate` and `url` (empty string fails iso8601 / uri). Current roles omit `endDate` (`formatYearRange` prints `YYYY-present`).
- Publication extras (`author`, `image`, and similar) are allowed (`additionalProperties: true` on that object). Do not add unknown root keys.
- House rules (Education, dashes, school names, closing periods on prose) stay in the validator. Do not copy identity copy into this skill.
- PDF export (`scripts/export-resume.mjs`) must reset `doc.x` to the left margin after any `text(x, y)` call. PDFKit otherwise indents later section titles and job names. Selected work names stay flush left; project descriptions indent.

## Fonts

IBM Plex latin 400/600/700 as **woff2 only** in [`src/styles/globals.css`](../../../src/styles/globals.css). Plex uses `font-display: optional` (not `swap`): a second `@font-face` or a route swap must not paint fallback then Plex. Work-route injects `work.css` only (`sheetsToInject`). Do not append `globals.css` again during prepare. Await `document.fonts.ready` before the idle pre-paint. Do not re-import Fontsource CSS (it adds woff fallbacks).

Nerd icons stay. `public/fonts/nerd-icons.woff2` is a tiny subset (`unicode-range` in globals). That face uses `font-display: swap`. `optional` drops private-use glyphs for the rest of the page view if the subset is late (graph toggle, carousel, BandPlayer). Preload the woff2 in [`src/layouts/Base.astro`](../../../src/layouts/Base.astro). Do not restore the full Nerd Font TTFs. Add a glyph to the subset and `unicode-range` before using a new `.nf` codepoint.

## ModernOrange TIDAL player

Keep the simple listening GUI in [`src/components/BandPlayer.tsx`](../../../src/components/BandPlayer.tsx): Listen (TIDAL preview), nerd prev / play / pause / next, cover, seek, track list with nerd stars. WebKit native HLS; Chromium/Firefox load `hls.js`. Do not restore the Persona5 `TidalPlayer` (slants, halftone, click-cover-only, autoplay). Do not strip the player to a store-link list.

Work-route parks panes at `visibility: hidden`, so Astro `client:visible` never intersects. Prepare retargets `astro-island` to `[data-work-island]`. Hydrate only the shown pane after the visibility flip (`hydrate-islands.ts`) with `client: 'only'` (extracted HTML has scripts stripped; `hydrateRoot` misses and leaves dead carousel / player buttons). Do not only preload `renderer-url`. Do not await hydrate inside `prepareSlug`.

## Engines (Blink / Gecko / WebKit)

- TIDAL: WebKit native HLS via `canPlayType('application/vnd.apple.mpegurl')`. Chromium/Firefox load `hls.js` (do not delete that path)
- `requestIdleCallback` with `setTimeout` fallback (graph, image-warm). Image warm yields between jobs.
- Keep `-webkit-` prefixes already in CSS (`overflow-scrolling`, `user-select`, `line-clamp`)
- `100dvh` and `inert` are current-engine safe; do not replace with hacks unless a real bug shows up
- Home-born work overlay: `visibility` + opaque `background`, not `opacity` / `will-change`. `inset: 0` (not `100dvh` + `50vw`). `overscroll-behavior: contain` so Chromium does not scroll the homepage behind it. Scroll lock is `html.work-open`, not `:has([data-open])`.
- AVIF for on-page photos; JPEG for unfurl

## README badges

Five shields, named against the portfolio plus Resume:

1. **Portfolio tests**: `.github/workflows/ci.yml` (`name: Portfolio tests`). Vitest, build, first-load bench. Also runs `npm run frameworks:check`.
2. **Portfolio SEO**: `100 / 100` from `bench/latest.json` `seoScore`
3. **Portfolio speed**: `100 / 100` from `speedScore` (21 KB JS)
4. **Portfolio frameworks**: `bench/frameworks-badge.json` via shields.io endpoint. Weekly `.github/workflows/frameworks.yml` plus each Vercel build (`vercel-build --report-only`). Fail when `current !== wanted` (what `npm update` would install). A newer major is a note, not a fail.
5. **Resume**: `.github/workflows/resume.yml`

Do not relabel SEO as "on-site search". Spell out Search engine optimization in README prose. SEO on the badge is fine.

## Do not

- Reintroduce Next.js, Tailwind, Persona, framer-motion, in-browser PDF viewers, or the old slanted TidalPlayer chrome
- Hardcode project copy in React (edit `content/work/*.md`)
- Put email or phone on the public site
- Folder-reshuffle `components/` into astro/islands/static (churn, no win)
- Vanilla ContactForm or slim the current-year SVG unless the user asks
- `output: 'static'` (kills `/view` and APIs)

## After you learn something

If a change proves a new constraint, cost, or engine split, **append it to this skill** (or [reference.md](reference.md) if it is a table of numbers). Do not leave the lesson only in chat. Keep SKILL.md short: facts and verbs, not narrative.
