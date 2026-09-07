import { canPrefetch } from '@/lib/prefetchImages';
import {
  WORK_STATE,
  extractWorkDetail,
  normalizeSheetPath,
  sheetsToInject,
  workPath,
  workSlugFromHref,
  workSlugFromPathname,
  shouldInterceptWorkClick,
} from '@/lib/workRoute';
import { hydrateWorkIslands, retargetWorkIslands } from '@/scripts/hydrate-islands';

const panes = new Map<string, HTMLElement>();
const titles = new Map<string, string>();
const inflight = new Map<string, Promise<HTMLElement | null>>();
const sheetLoads = new Map<string, Promise<void>>();
let booted = false;
let startedOnHome = false;
let homeTitle = '';

function knownSlugs(): string[] {
  const slugs = new Set<string>();
  document.querySelectorAll<HTMLElement>('.project-row[data-slug]').forEach((row) => {
    if (row.dataset.slug) slugs.add(row.dataset.slug);
  });
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/work/"]').forEach((a) => {
    const slug = workSlugFromPathname(a.pathname);
    if (slug) slugs.add(slug);
  });
  return [...slugs];
}

function waitLink(link: HTMLLinkElement): Promise<void> {
  if (link.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
  });
}

function ensureSheet(href: string): Promise<void> {
  const path = normalizeSheetPath(href);
  const pending = sheetLoads.get(path);
  if (pending) return pending;
  const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find(
    (l) => normalizeSheetPath(l.href) === path
  );
  const work = existing
    ? waitLink(existing)
    : (() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.append(link);
        return waitLink(link);
      })();
  sheetLoads.set(path, work);
  return work;
}

function ensureShell(): HTMLElement | null {
  const existing = document.querySelector('.split-shell');
  if (existing instanceof HTMLElement) return existing;

  const shell = document.createElement('div');
  shell.className = 'split-shell';
  shell.setAttribute('data-home-shell', '');
  shell.setAttribute('data-instant', '');
  const main = document.createElement('div');
  main.className = 'split-main';
  const detail = document.createElement('div');
  detail.className = 'split-detail';
  const cache = document.createElement('div');
  cache.className = 'split-detail-slot';
  cache.setAttribute('data-work-cache', '');
  detail.append(cache);
  const kids = [...document.body.childNodes];
  document.body.insertBefore(shell, document.body.firstChild);
  shell.append(main, detail);
  for (const node of kids) {
    if (node.nodeName === 'ASTRO-DEV-TOOLBAR') continue;
    if (
      node instanceof Element &&
      node.matches('[data-hire-host], [data-hire-fly], .hire-bar-host, .hire-group-fly')
    ) {
      continue;
    }
    main.append(node);
  }
  return shell;
}

function cacheHost(): HTMLElement | null {
  const shell = ensureShell();
  if (!shell) return null;
  const detail = shell.querySelector('.split-detail');
  if (!(detail instanceof HTMLElement)) return null;
  let host = detail.querySelector('[data-work-cache]');
  if (host instanceof HTMLElement) return host;
  host = document.createElement('div');
  host.className = 'split-detail-slot';
  host.setAttribute('data-work-cache', '');
  detail.append(host);
  return host;
}

function hideReactSlot(hide: boolean) {
  document
    .querySelectorAll('.split-shell[data-react-shell] .split-detail-slot:not([data-work-cache])')
    .forEach((el) => {
      if (el instanceof HTMLElement) el.hidden = hide;
    });
}

function syncChrome(slug: string | null, open: boolean) {
  const shell = document.querySelector('.split-shell');
  if (!(shell instanceof HTMLElement)) return;
  if (open) {
    shell.setAttribute('data-open', '');
    if (slug) shell.dataset.active = slug;
  } else {
    shell.removeAttribute('data-open');
    delete shell.dataset.active;
  }
  if (shell.hasAttribute('data-home-shell')) {
    document.documentElement.classList.toggle('work-open', open);
    document.body.classList.toggle('work-open', open);
  }

  const main = shell.querySelector('.split-main');
  const detail = shell.querySelector('.split-detail');
  const narrow = window.matchMedia('(max-width: 63.999rem)');
  if (main instanceof HTMLElement) {
    const hide = open && narrow.matches;
    main.toggleAttribute('inert', hide);
    if (hide) main.setAttribute('aria-hidden', 'true');
    else main.removeAttribute('aria-hidden');
  }
  if (detail instanceof HTMLElement) {
    detail.toggleAttribute('inert', !open);
    if (open) detail.removeAttribute('aria-hidden');
    else detail.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll<HTMLElement>('.project-row[data-slug]').forEach((row) => {
    const on = Boolean(slug && row.dataset.slug === slug);
    row.classList.toggle('is-active', on);
    const link = row.querySelector<HTMLElement>('h3 a');
    if (!link) return;
    if (on) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

/** After the flip. Never block showPrepared. */
function queuePaneHydrate(pane: HTMLElement) {
  if (pane.dataset.islands === 'ready' || pane.dataset.islands === 'busy') return;
  pane.dataset.islands = 'busy';
  const run = () => {
    void hydrateWorkIslands(pane).finally(() => {
      pane.dataset.islands = 'ready';
    });
  };
  requestAnimationFrame(run);
}

/** One compositor frame: visibility / data-open. No parse, no fetch, no innerHTML. */
function showPrepared(slug: string): boolean {
  const pane = panes.get(slug);
  const host = cacheHost();
  if (!pane || !host) return false;
  hideReactSlot(true);
  const shell = host.closest('.split-shell');
  if (shell instanceof HTMLElement && !shell.hasAttribute('data-react-shell')) {
    shell.setAttribute('data-instant', '');
  }
  for (const child of host.children) {
    if (!(child instanceof HTMLElement)) continue;
    if (child === pane) child.setAttribute('data-show', '');
    else child.removeAttribute('data-show');
  }
  syncChrome(slug, true);
  const title = titles.get(slug);
  if (title) document.title = title;
  const scroller = host.closest('.split-detail');
  if (scroller instanceof HTMLElement) scroller.scrollTop = 0;
  return true;
}

async function prepareSlug(slug: string, force = false): Promise<HTMLElement | null> {
  const ready = panes.get(slug);
  if (ready) return ready;
  const pending = inflight.get(slug);
  if (pending) return pending;
  if (!force && !canPrefetch()) return null;

  const work = (async () => {
    try {
      const res = await fetch(workPath(slug), { credentials: 'same-origin' });
      if (!res.ok) return null;
      const detail = extractWorkDetail(await res.text());
      if (!detail) return null;
      const loaded = [...document.querySelectorAll('link[rel="stylesheet"]')].map(
        (l) => l.href
      );
      await Promise.all(sheetsToInject(detail.stylesheets, loaded).map((href) => ensureSheet(href)));
      const host = cacheHost();
      if (!host) return null;
      const wrap = document.createElement('div');
      wrap.dataset.workPane = slug;
      wrap.innerHTML = detail.pane;
      wrap.querySelectorAll('script').forEach((el) => el.remove());
      retargetWorkIslands(wrap);
      wrap.querySelectorAll('img').forEach((img) => {
        void img.decode?.().catch(() => undefined);
      });
      host.append(wrap);
      panes.set(slug, wrap);
      titles.set(slug, detail.title);
      return wrap;
    } catch {
      return null;
    } finally {
      inflight.delete(slug);
    }
  })();

  inflight.set(slug, work);
  return work;
}

export function openPreparedWork(slug: string, push: boolean) {
  if (push && window.location.pathname !== workPath(slug)) {
    history.pushState({ [WORK_STATE]: slug }, '', workPath(slug));
  }
  if (showPrepared(slug)) {
    const pane = panes.get(slug);
    if (pane) queuePaneHydrate(pane);
    return;
  }
  void prepareSlug(slug, true).then((pane) => {
    if (!pane || workSlugFromPathname(window.location.pathname) !== slug) return;
    if (showPrepared(slug)) queuePaneHydrate(pane);
  });
}

function closeToHome(push: boolean) {
  const host = document.querySelector('[data-work-cache]');
  if (host) {
    const shell = host.closest('.split-shell');
    if (shell instanceof HTMLElement) shell.setAttribute('data-instant', '');
    for (const child of host.children) {
      if (child instanceof HTMLElement) child.removeAttribute('data-show');
    }
  }
  hideReactSlot(false);
  syncChrome(null, false);
  if (homeTitle) document.title = homeTitle;
  if (push) history.pushState({ [WORK_STATE]: '' }, '', '/');
}

function onClick(event: Event) {
  if (!(event instanceof MouseEvent)) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return;
  }

  if (
    shouldInterceptWorkClick({
      defaultPrevented: event.defaultPrevented,
      button: event.button,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      targetBlank: anchor.target === '_blank',
      download: anchor.hasAttribute('download'),
      origin: url.origin,
      pageOrigin: window.location.origin,
      pathname: url.pathname,
      href: url.href,
    })
  ) {
    const slug = workSlugFromHref(url.href, window.location.origin);
    if (!slug) return;
    event.preventDefault();
    const already = document.querySelector(
      `.split-shell[data-open][data-active="${slug}"]`
    );
    if (already && panes.get(slug)?.hasAttribute('data-show')) return;
    openPreparedWork(slug, true);
    return;
  }

  if (
    startedOnHome &&
    url.origin === window.location.origin &&
    url.pathname === '/' &&
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    document.querySelector('.split-shell[data-open]')
  ) {
    event.preventDefault();
    if (history.state && history.state[WORK_STATE]) history.back();
    else closeToHome(true);
  }
}

function onIntent(event: Event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  const slug = workSlugFromHref(anchor.href, window.location.origin);
  if (slug) void prepareSlug(slug, true);
}

function onPop() {
  const slug = workSlugFromPathname(window.location.pathname);
  if (slug) {
    openPreparedWork(slug, false);
    return;
  }
  if (window.location.pathname === '/') closeToHome(false);
}

export function bootWorkRoute() {
  if (booted) return;
  booted = true;
  startedOnHome = window.location.pathname === '/';
  if (startedOnHome) {
    homeTitle = document.title;
    ensureShell();
  }
  const initial = workSlugFromPathname(window.location.pathname);
  if (initial) syncChrome(initial, true);

  document.addEventListener('click', onClick);
  document.addEventListener('pointerdown', onIntent, { passive: true });
  document.addEventListener('pointerover', onIntent, { passive: true });
  document.addEventListener('focusin', onIntent, { passive: true });
  window.addEventListener('popstate', onPop);

  const slugs = knownSlugs();
  const first = initial ? [initial, ...slugs.filter((s) => s !== initial)] : slugs;
  for (const slug of first) void prepareSlug(slug, slug === initial || canPrefetch());
}
