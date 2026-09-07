---
name: aspauldingcode-site
description: >-
  Portfolio site architecture, first-load budget, homepage fragment, AVIF and
  icon pipeline, and Blink/Gecko/WebKit splits for aspauldingcode.com. Use when
  editing Astro pages, HomePage, SplitShell, contact, hire me, images, fonts,
  favicons, benches, Vercel, or when measuring homepage JS/CSS/HTML.
---

# aspauldingcode site

Read this before changing site architecture, first-load cost, homepage, work/view chrome, images, or icons. Identity and copy stay in `.cursor/rules/identity.mdc` and `writing.mdc`.

## Stack

- Astro 5, React islands, `@astrojs/vercel`, `output: 'server'`
- Prerender `/`, `/work/*`, `/home-fragment`, legal, sitemap, robots, manifest
- Serverless only: `/view`, `/api/contact`, `/api/preview*`, `/api/tidal-*`
- Canonical host: `https://www.aspauldingcode.com`
- Env: `PUBLIC_SITE_URL`, `PUBLIC_RECAPTCHA_SITEKEY` (no `NEXT_PUBLIC_*`)

## One homepage

[`src/components/HomePage.astro`](../../../src/components/HomePage.astro) is the only home markup.

- `/` renders it through [`src/pages/index.astro`](../../../src/pages/index.astro)
- `/work/*` and `/view` wrap detail in [`src/components/SplitShell.tsx`](../../../src/components/SplitShell.tsx)
- SplitShell fetches [`/home-fragment`](../../../src/pages/home-fragment.astro), strips `<script>`, remounts `ContactForm` into `#contact-form-root`, runs `bootHome`
- Do not bring back `HomeContent.tsx`, `HireMe.tsx`, `ContributionGraphHost.tsx`, `PrefetchViewLink.tsx`, or `home.json`
- Do not add a `hydrate` prop on `HomePage`
- `site-chrome-foot` lives only inside SplitShell (narrow, when a pane is open). Do not add it on `/`

Hire fly: `HIRE_HREF = '/?hire=1#contact'`. Vanilla [`src/scripts/hire-me.ts`](../../../src/scripts/hire-me.ts) plus [`src/lib/hireMeRuntime.ts`](../../../src/lib/hireMeRuntime.ts). Keep 1:1 with `/`.

Education is the first body section. See `education-first.mdc`.

## First-load budget

Homepage first-load JS (inline except JSON-LD/`application/json`, plus `<script src>` and `client="load"` islands) must stay **under 25 KB**. Bench hard-fails `/` otherwise: `npm run bench` after `npm run build`.

- No `client:load` React on `/`
- `ContactForm` is `client:visible` only
- Do not render `/` with React `HomeContent` to "simplify"

Current ballpark (re-measure after changes): `/` ~18 KB JS, ~57 KB HTML (half is the current-year graph SVG), ~20 KB CSS.

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

## Fonts

IBM Plex latin 400/600/700 as **woff2 only** in [`src/styles/globals.css`](../../../src/styles/globals.css). Do not re-import Fontsource CSS (it adds woff fallbacks). Nerd icons: `public/fonts/nerd-icons.woff2` (tiny subset). Do not restore the full Nerd Font TTFs.

## Engines (Blink / Gecko / WebKit)

- TIDAL: WebKit native HLS via `canPlayType('application/vnd.apple.mpegurl')`. Chromium/Firefox load `hls.js` (do not delete that path)
- `requestIdleCallback` with `setTimeout` fallback (graph, image-warm)
- Keep `-webkit-` prefixes already in CSS (`overflow-scrolling`, `user-select`, `line-clamp`)
- `100dvh` and `inert` are current-engine safe; do not replace with hacks unless a real bug shows up
- AVIF for on-page `<img>`; JPEG for unfurl

## Do not

- Reintroduce Next.js, Tailwind, Persona, framer-motion, in-browser PDF viewers
- Hardcode project copy in React (edit `content/work/*.md`)
- Put email or phone on the public site
- Folder-reshuffle `components/` into astro/islands/static (churn, no win)
- Vanilla ContactForm or slim the current-year SVG unless the user asks
- `output: 'static'` (kills `/view` and APIs)

## After you learn something

If a change proves a new constraint, cost, or engine split, **append it to this skill** (or [reference.md](reference.md) if it is a table of numbers). Do not leave the lesson only in chat. Keep SKILL.md short: facts and verbs, not narrative.
