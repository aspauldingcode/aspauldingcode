#!/usr/bin/env node
/**
 * Measure transferable JS/CSS referenced by built HTML (or a live server).
 * Homepage first-load JS is inline scripts (except JSON-LD / application/json)
 * plus every same-origin module reachable from <script src> and client="load"
 * islands. Hard-fails / if that graph exceeds 25 KB.
 * Writes bench/latest.json. Compares homepage script bytes to a baseline when present.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROUTES = ['/', '/work/wawona', '/work/whisperer', '/work/modernorange-band'];
const ORIGIN = process.env.BENCH_ORIGIN || 'http://127.0.0.1:3000';
const budgetGrow = Number(process.env.BENCH_BUDGET_GROW_BYTES || 8192);
const NEXT_HOME_JS = 437369;
const HOME_FIRST_LOAD_JS_MAX = 25 * 1024;

function abs(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function sameOrigin(url, origin) {
  try {
    return new URL(url).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

async function fetchBytes(href, origin) {
  if (!href || !sameOrigin(href, origin)) return 0;
  const r = await fetch(href);
  const buf = await r.arrayBuffer();
  return { bytes: buf.byteLength, text: Buffer.from(buf).toString('utf8') };
}

function moduleImports(source, baseHref) {
  return [...source.matchAll(/\bfrom\s*["'](\.[^"']+)["']/g)]
    .map((m) => abs(m[1], baseHref))
    .filter(Boolean);
}

async function scriptGraphBytes(entryHrefs, origin) {
  const seen = new Set();
  let total = 0;
  const queue = [...entryHrefs];
  while (queue.length) {
    const href = queue.pop();
    if (!href || seen.has(href) || !sameOrigin(href, origin)) continue;
    seen.add(href);
    const file = await fetchBytes(href, origin);
    if (!file) continue;
    total += file.bytes;
    if (href.endsWith('.js') || href.endsWith('.mjs')) {
      queue.push(...moduleImports(file.text, href));
    }
  }
  return total;
}

function inlineScriptBytes(html) {
  return [...html.matchAll(/<script\b(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/gi)].reduce(
    (sum, m) => {
      const attrs = m[1] || '';
      if (/type\s*=\s*["']application\/(?:ld\+)?json["']/i.test(attrs)) return sum;
      return sum + Buffer.byteLength(m[2] || '');
    },
    0
  );
}

function loadIslandHrefs(html, pageUrl) {
  return [...html.matchAll(/<astro-island\b[^>]*>/gi)].flatMap((m) => {
    const tag = m[0];
    if (!/client="load"/.test(tag)) return [];
    return [tag.match(/component-url="([^"]+)"/)?.[1], tag.match(/renderer-url="([^"]+)"/)?.[1]]
      .filter(Boolean)
      .map((href) => abs(href, pageUrl));
  });
}

async function measureRoute(path) {
  const pageUrl = new URL(path, ORIGIN).href;
  const res = await fetch(pageUrl);
  const html = await res.text();
  const scriptSrc = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/gi)].map((m) =>
    abs(m[1], pageUrl)
  );
  const loadIslands = loadIslandHrefs(html, pageUrl);
  const firstLoadHrefs = [...new Set([...scriptSrc, ...loadIslands].filter(Boolean))];
  const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/gi)].map(
    (m) => abs(m[1], pageUrl)
  );

  const scriptBytes = inlineScriptBytes(html) + (await scriptGraphBytes(firstLoadHrefs, ORIGIN));
  let styleBytes = 0;
  for (const href of styles.filter(Boolean)) {
    const file = await fetchBytes(href, ORIGIN);
    if (file) styleBytes += file.bytes;
  }

  return {
    path,
    status: res.status,
    htmlBytes: Buffer.byteLength(html),
    scriptBytes,
    styleBytes,
    containsEducation: /id="education"|aria-labelledby="education"/i.test(html),
    containsContactForm: /id="contact-name"|class="contact"/i.test(html),
    title: (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '',
    h1: (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '',
    canonical: (html.match(/rel="canonical"[^>]*href="([^"]+)"/i) || [])[1] || '',
    html,
  };
}

function jsonLdHasEmail(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  return blocks.some((m) => {
    try {
      const data = JSON.parse(m[1]);
      return JSON.stringify(data).includes('"email"');
    } catch {
      return /mailto:/i.test(m[1]);
    }
  });
}

function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** On-site search checks only. Off-site authority is not scored here. */
function seoScore(pages, extras) {
  const home = pages['/'];
  const wawona = pages['/work/wawona'];
  const whisperer = pages['/work/whisperer'];
  const checks = [
    { id: 'home-title', pts: 8, ok: /Alex Spaulding/i.test(home.title) },
    { id: 'home-h1', pts: 8, ok: home.h1 === 'Alex Spaulding' },
    { id: 'home-canonical-www', pts: 8, ok: home.canonical === 'https://www.aspauldingcode.com/' },
    {
      id: 'wawona-title',
      pts: 12,
      ok: /Wayland compositor for macOS/i.test(wawona.title + wawona.h1),
    },
    {
      id: 'whisperer-title',
      pts: 12,
      ok: /ChatGPT for Apple Watch/i.test(whisperer.title + whisperer.h1),
    },
    {
      id: 'unique-work-html',
      pts: 16,
      ok: !wawona.containsEducation && !wawona.containsContactForm,
    },
    { id: 'jsonld-no-email', pts: 8, ok: !jsonLdHasEmail(home.html) },
    {
      id: 'robots',
      pts: 10,
      ok:
        extras.robots.includes('Disallow: /api/') &&
        extras.robots.includes('Disallow: /view') &&
        extras.robots.includes('https://www.aspauldingcode.com/sitemap.xml'),
    },
    {
      id: 'sitemap-www',
      pts: 10,
      ok:
        extras.sitemap.includes('https://www.aspauldingcode.com/work/wawona') &&
        extras.sitemap.includes('https://www.aspauldingcode.com/work/whisperer'),
    },
    { id: 'projects-301', pts: 8, ok: extras.projectsStatus === 301 },
  ];
  const earned = checks.reduce((s, c) => s + (c.ok ? c.pts : 0), 0);
  return { score: earned, checks };
}

/**
 * First-load weight vs a static-first budget.
 * Script: 80 KB earns 70 points, then -1 per 5 KB.
 * CSS: 25 KB earns 30 points, then -1 per 2 KB.
 */
function speedScore(home) {
  const scriptPts = Math.max(0, 70 - Math.max(0, home.scriptBytes - 80_000) / 5_000);
  const stylePts = Math.max(0, 30 - Math.max(0, home.styleBytes - 25_000) / 2_000);
  return {
    score: clampScore(scriptPts + stylePts),
    homepageScriptKb: Math.round(home.scriptBytes / 1024),
    nextHomepageScriptKb: Math.round(NEXT_HOME_JS / 1024),
  };
}

const results = {};
for (const path of ROUTES) {
  results[path] = await measureRoute(path);
}

const [robotsRes, sitemapRes, projectsRes] = await Promise.all([
  fetch(new URL('/robots.txt', ORIGIN)),
  fetch(new URL('/sitemap.xml', ORIGIN)),
  fetch(new URL('/projects', ORIGIN), { redirect: 'manual' }),
]);
const extras = {
  robots: await robotsRes.text(),
  sitemap: await sitemapRes.text(),
  projectsStatus: projectsRes.status,
};
const seo = seoScore(results, extras);
const speed = speedScore(results['/']);

mkdirSync(join(root, 'bench'), { recursive: true });
const latest = {
  framework: 'astro',
  measuredAt: new Date().toISOString().slice(0, 10),
  origin: ORIGIN,
  seoScore: seo.score,
  speedScore: speed.score,
  seo,
  speed,
  routes: Object.fromEntries(
    Object.entries(results).map(([path, row]) => {
      const { html: _html, ...rest } = row;
      return [path, rest];
    })
  ),
};
writeFileSync(join(root, 'bench', 'latest.json'), `${JSON.stringify(latest, null, 2)}\n`);

const home = results['/'];
const work = results['/work/wawona'];
if (work.containsEducation || work.containsContactForm) {
  console.error('FAIL: /work/wawona HTML still contains homepage Education/Contact');
  process.exitCode = 1;
}
if (home.scriptBytes > HOME_FIRST_LOAD_JS_MAX) {
  console.error(
    `FAIL: / first-load script ${home.scriptBytes} exceeds ${HOME_FIRST_LOAD_JS_MAX}`
  );
  process.exitCode = 1;
}

const astroBase = join(root, 'bench', 'baseline-astro.json');
if (existsSync(astroBase)) {
  const base = JSON.parse(readFileSync(astroBase, 'utf8'));
  const prev = base.routes?.['/']?.scriptBytes;
  if (typeof prev === 'number' && home.scriptBytes > prev + budgetGrow) {
    console.error(
      `FAIL: / script bytes ${home.scriptBytes} exceed baseline ${prev} + ${budgetGrow}`
    );
    process.exitCode = 1;
  }
} else {
  writeFileSync(astroBase, `${JSON.stringify(latest, null, 2)}\n`);
  console.log('Wrote first Astro baseline to bench/baseline-astro.json');
}

console.log(
  JSON.stringify(
    {
      seoScore: seo.score,
      speedScore: speed.score,
      speed,
      seoChecks: seo.checks,
      routes: latest.routes,
    },
    null,
    2
  )
);
