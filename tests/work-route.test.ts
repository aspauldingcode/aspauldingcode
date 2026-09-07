import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractWorkDetail,
  isGlobalsSheet,
  overlayHomeAction,
  sheetsToInject,
  shouldInterceptWorkClick,
  workPath,
  workSlugFromPathname,
} from '@/lib/workRoute';

const root = path.resolve(__dirname, '..');

const click = {
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  targetBlank: false,
  download: false,
  origin: 'https://www.aspauldingcode.com',
  pageOrigin: 'https://www.aspauldingcode.com',
  pathname: '/work/wawona',
};

describe('work route', () => {
  it('parses /work slugs and rejects view or nested paths', () => {
    expect(workSlugFromPathname('/work/wawona')).toBe('wawona');
    expect(workSlugFromPathname('/work/modernorange-band')).toBe('modernorange-band');
    expect(workSlugFromPathname('/work/sentinel-pc-building-club')).toBe(
      'sentinel-pc-building-club'
    );
    expect(workSlugFromPathname('/view')).toBeNull();
    expect(workSlugFromPathname('/work/wawona/extra')).toBeNull();
    expect(workPath('apple-sharpener')).toBe('/work/apple-sharpener');
  });

  it('treats Hire me as hire, not a plain overlay close', () => {
    const origin = 'https://www.aspauldingcode.com';
    expect(overlayHomeAction('/?hire=1#contact', origin)).toBe('hire');
    expect(overlayHomeAction('/#contact', origin)).toBe('hire');
    expect(overlayHomeAction('/', origin)).toBe('home');
    expect(overlayHomeAction('/work/wawona', origin)).toBeNull();
  });

  it('intercepts primary same-origin work clicks only', () => {
    expect(shouldInterceptWorkClick(click)).toBe(true);
    expect(shouldInterceptWorkClick({ ...click, metaKey: true })).toBe(false);
    expect(shouldInterceptWorkClick({ ...click, targetBlank: true })).toBe(false);
    expect(shouldInterceptWorkClick({ ...click, pathname: '/view' })).toBe(false);
    expect(
      shouldInterceptWorkClick({
        ...click,
        origin: 'https://evil.example',
        href: 'https://evil.example/work/wawona',
      })
    ).toBe(false);
    expect(
      shouldInterceptWorkClick({
        ...click,
        origin: 'http://127.0.0.1:4321',
        pageOrigin: 'http://127.0.0.1:4321',
        href: 'https://wawona.io',
        pathname: '/',
      })
    ).toBe(true);
  });

  it('extracts the detail pane and stylesheets from a work document', () => {
    const html = `<!doctype html><html><head><title>Wawona / Alex Spaulding</title>
      <link rel="stylesheet" href="/_astro/globals.css">
      <link rel="stylesheet" href="/_astro/work.css"></head>
      <body><div class="split-shell"><div class="split-main"></div>
      <div class="split-detail"><div class="split-detail-slot">
      <div class="wrap detail-pane"><article class="project-detail"><h1>Wawona</h1>
      <div class="inner"><p>body</p></div></article>
      <p class="project-home"><a href="/">back</a></p></div>
      </div></div></div></body></html>`;
    const detail = extractWorkDetail(html);
    expect(detail).toBeTruthy();
    expect(detail?.title).toBe('Wawona / Alex Spaulding');
    expect(detail?.stylesheets).toEqual(['/_astro/globals.css', '/_astro/work.css']);
    expect(detail?.pane).toContain('project-detail');
    expect(detail?.pane).toContain('Wawona');
    expect(detail?.pane).not.toContain('split-shell');
    expect(isGlobalsSheet('/_astro/globals.css')).toBe(true);
    expect(isGlobalsSheet('/_astro/index.Q8xD0zgM.css')).toBe(true);
    expect(isGlobalsSheet('/src/styles/globals.css?t=1')).toBe(true);
    expect(isGlobalsSheet('/_astro/work.CWMJuzy7.css')).toBe(false);
    expect(isGlobalsSheet('/_astro/work.css')).toBe(false);
    const slugPage = readFileSync(path.join(root, 'src/pages/work/[slug].astro'), 'utf8');
    expect(slugPage).toContain("work.css?url");
    expect(slugPage).toContain('sheets={[workSheet]}');
    expect(slugPage).toContain('ProjectFoot');
    expect(readFileSync(path.join(root, 'src/components/ProjectFoot.tsx'), 'utf8')).toContain(
      'Hire me'
    );
    expect(slugPage).not.toMatch(/import '@\/styles\/work\.css'/);
    expect(
      sheetsToInject(detail!.stylesheets, ['https://www.aspauldingcode.com/_astro/globals.css'])
    ).toEqual(['/_astro/work.css']);
  });

  it('keeps the click path to a visibility flip after idle prepare', () => {
    const route = readFileSync(path.join(root, 'src/scripts/work-route.ts'), 'utf8');
    const show = route.slice(
      route.indexOf('function showPrepared'),
      route.indexOf('async function prepareSlug')
    );
    expect(show).toContain('setPaneShown');
    expect(show).toContain('data-instant');
    expect(route).toContain("setAttribute('data-show'");
    expect(show).not.toContain('innerHTML');
    expect(show).not.toContain('fetch(');
    expect(show).not.toContain('extractWorkDetail');
    expect(show).not.toContain('hydrateWorkIslands');
    expect(show).not.toContain('queuePaneHydrate');
    const prepare = route.slice(
      route.indexOf('async function prepareSlug'),
      route.indexOf('export function openPreparedWork')
    );
    expect(prepare).not.toContain('hydrateWorkIslands');
    expect(prepare).not.toContain('document.fonts');
    expect(prepare).not.toContain('requestAnimationFrame');
    expect(route).toContain('queuePaneHydrate');
    expect(route).toContain('openPreparedView');
    expect(route).toContain('shouldInterceptViewClick');
    const viewer = readFileSync(path.join(root, 'src/components/EmbedViewer.tsx'), 'utf8');
    expect(viewer).toContain("from '@/lib/profileCardView'");
    expect(viewer).not.toMatch(/from '@\/lib\/profileCard'/);
    const css = readFileSync(path.join(root, 'src/styles/work.css'), 'utf8');
    expect(css).not.toMatch(/\.project-home\s*\{\s*display:\s*none/);
    expect(css).toContain('[data-work-pane][data-show]');
    expect(css).toContain('[data-home-shell]');
    expect(css).toContain('body:has(.split-shell:not([data-home-shell]))');
    expect(css).not.toMatch(/body:has\(\.split-shell\)\s*\{/);
    expect(css).toContain('opacity: 1 !important');
    expect(css).not.toContain('will-change: opacity');
    expect(route).toContain('data-home-shell');
    expect(route).not.toContain('parkHomeDetail');
    expect(route).toContain('sheetsToInject');
    const globals = readFileSync(path.join(root, 'src/styles/globals.css'), 'utf8');
    expect(globals).toContain('.split-shell[data-home-shell] > .split-detail');
    expect(globals).toMatch(
      /\.split-shell\[data-home-shell\] > \.split-detail \{[\s\S]*?display: none/
    );
    expect(globals).toMatch(
      /\.split-shell\[data-home-shell\] > \.split-detail \{[\s\S]*?overflow: hidden/
    );
    expect(globals).toMatch(
      /\[data-home-shell\]\[data-open\] > \.split-detail \{[\s\S]*?display: block/
    );
    expect(globals).toMatch(
      /\[data-home-shell\]\[data-open\] > \.split-detail \{[\s\S]*?overflow: auto/
    );
    expect(css).toMatch(
      /\[data-home-shell\]\[data-open\] > \.split-detail \{[\s\S]*?overflow: auto/
    );
    expect(css).not.toMatch(
      /\.split-shell:not\(\[data-home-shell\]\) \.split-detail,\s*\.split-shell\[data-home-shell\]\[data-open\]/
    );
    expect(route).toContain('aria-hidden');
    expect(css).toContain(
      '.split-shell:not([data-home-shell]) .split-detail'
    );
    expect(css).toContain('.split-shell:not([data-home-shell])');
    expect(globals).toContain('isolation: isolate');
    expect(globals).toContain('.split-shell[data-home-shell]:not([data-open]) [data-work-pane]');
    expect(globals).toContain('html.work-open');
    expect(globals).toContain(
      'html:has(.split-shell[data-home-shell]:not([data-open]))'
    );
    expect(globals).toContain('[data-work-pane][data-show] .wrap');
    expect(globals).toContain('padding-top: calc(var(--hire-chrome, 0px) + 0.45rem)');
    expect(route).toContain("classList.toggle('work-open'");
    expect(globals).toContain('content-visibility: hidden');
    expect(globals).toContain('grid-area: 1 / 1');
    expect(globals).toContain('font-display: optional');
    expect(globals).toMatch(/Symbols Nerd Font[\s\S]*font-display: swap/);
    expect(globals).toContain('[data-work-island]');
    expect(route).toContain('retargetWorkIslands');
    expect(route).toContain('enqueueImages');
    expect(route).toContain('paneImageSrcs');
    const hydrate = readFileSync(path.join(root, 'src/scripts/hydrate-islands.ts'), 'utf8');
    expect(hydrate).toContain('component-url');
    expect(hydrate).toContain('data-work-island');
    expect(hydrate).toContain('reviveAstroProps');
    expect(globals).not.toContain('will-change: opacity');
  });
});
