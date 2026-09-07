/** Helpers for same-document /work/* routing. No DOM. */

import { localPathForHref } from '@/lib/viewHref';

export const WORK_STATE = 'workRoute';

export function workSlugFromPathname(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 2 || parts[0] !== 'work') return null;
  const slug = parts[1] ?? '';
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  return slug;
}

export function workPath(slug: string): string {
  return `/work/${slug}`;
}

/** /work slug from a local path, first-party URL, mapped host, or /view?u=… */
export function workSlugFromHref(href: string, pageOrigin?: string): string | null {
  try {
    const u = new URL(href, pageOrigin || 'https://www.aspauldingcode.com');
    if (u.pathname === '/view' || u.pathname === '/view/') {
      const raw = u.searchParams.get('u');
      if (!raw) return null;
      const local = localPathForHref(raw, pageOrigin);
      return local ? workSlugFromPathname(local.split(/[?#]/)[0] || '/') : null;
    }
    const local = localPathForHref(href, pageOrigin);
    if (local) return workSlugFromPathname(local.split(/[?#]/)[0] || '/');
    if (pageOrigin && u.origin !== new URL(pageOrigin).origin) return null;
    return workSlugFromPathname(u.pathname);
  } catch {
    return null;
  }
}

/** True when a primary click should stay in-document and open the work pane. */
export function shouldInterceptWorkClick(opts: {
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  targetBlank: boolean;
  download: boolean;
  origin: string;
  pageOrigin: string;
  pathname: string;
  href?: string;
}): boolean {
  if (opts.defaultPrevented || opts.button !== 0) return false;
  if (opts.metaKey || opts.ctrlKey || opts.shiftKey || opts.altKey) return false;
  if (opts.targetBlank || opts.download) return false;
  const href = opts.href || `${opts.origin}${opts.pathname}`;
  return workSlugFromHref(href, opts.pageOrigin) != null;
}

export function normalizeSheetPath(href: string): string {
  try {
    return new URL(href, 'https://www.aspauldingcode.com').pathname;
  } catch {
    return href;
  }
}

export function isGlobalsSheet(href: string): boolean {
  const path = normalizeSheetPath(href);
  const file = path.split('/').pop() || '';
  if (/global/i.test(file)) return true;
  return /(?:^|\/)(index|Base)\.[^/]+\.css$/i.test(path);
}

/** Work.css only. Do not append globals again: a second @font-face swap paints type twice. */
export function sheetsToInject(hrefs: string[], loadedHrefs: string[]): string[] {
  const have = new Set(loadedHrefs.map(normalizeSheetPath));
  const pageHasCss = loadedHrefs.length > 0;
  return hrefs.filter((href) => {
    const path = normalizeSheetPath(href);
    if (have.has(path)) return false;
    if (pageHasCss && isGlobalsSheet(href)) return false;
    return true;
  });
}

export function extractWorkDetail(html: string): {
  pane: string;
  title: string;
  stylesheets: string[];
} | null {
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim() || '';
  const sheets = [
    ...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi),
  ].map((m) => m[1] || '');
  const start = html.search(/<div class="wrap detail-pane"/);
  if (start < 0) return null;
  const pane = sliceBalancedDiv(html, start);
  if (!pane || !pane.includes('project-detail')) return null;
  return { pane, title, stylesheets: sheets.filter(Boolean) };
}

function sliceBalancedDiv(html: string, start: number): string | null {
  if (!html.startsWith('<div', start) && html.slice(start, start + 4) !== '<div') {
    return null;
  }
  let depth = 0;
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('</')) depth -= 1;
    else depth += 1;
    if (depth === 0) return html.slice(start, m.index + m[0].length);
  }
  return null;
}
