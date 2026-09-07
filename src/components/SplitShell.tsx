'use client';

import HomeContent from '@/components/HomeContent';
import SiteFooter from '@/components/SiteFooter';
import type { HomeModel } from '@/lib/homeData';
import { scheduleScrollToHomeSection } from '@/lib/scrollHomeSection';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';

function activeFromPath(pathname: string): string | undefined {
  if (pathname === '/view' || pathname.startsWith('/view/')) return 'view';
  if (pathname.startsWith('/work/')) {
    const slug = pathname.slice('/work/'.length).split('/')[0];
    return slug || undefined;
  }
  return undefined;
}

function unloadIframes(root: ParentNode | null | undefined) {
  if (!root) return;
  root.querySelectorAll('iframe').forEach((frame) => {
    try {
      frame.src = 'about:blank';
      frame.removeAttribute('src');
    } catch {
      /* ignore */
    }
    frame.remove();
  });
}

function detailKeyFor(active: string | undefined, viewUrl: string | null) {
  if (active === 'view') return `view:${viewUrl ?? ''}`;
  return active ?? 'home';
}

/** Keyed slot so only one right-column target is mounted. */
function DetailSlot({
  active,
  viewUrl,
  children,
}: {
  active: string | undefined;
  viewUrl: string | null;
  children: ReactNode;
}) {
  const viewUrlRef = useRef(viewUrl);
  if (active === 'view' && viewUrl) viewUrlRef.current = viewUrl;
  const resolved = active === 'view' ? viewUrl ?? viewUrlRef.current : null;
  const detailKey = detailKeyFor(active, resolved);

  useEffect(() => {
    if (active === 'view') return;
    unloadIframes(document.querySelector('.split-detail'));
  }, [active, detailKey]);

  return (
    <div className="split-detail-slot" key={detailKey}>
      {children}
    </div>
  );
}

/**
 * Work / view chrome. Home column loads after mount so /work HTML stays unique.
 * Pathname is passed from the page (MPA); no client router.
 */
export default function SplitShell({
  children,
  pathname,
  viewUrl = null,
}: {
  children: ReactNode;
  pathname: string;
  viewUrl?: string | null;
}) {
  const active = activeFromPath(pathname);
  const open = Boolean(active);
  const shellRef = useRef<HTMLDivElement>(null);
  const [home, setHome] = useState<HomeModel | null>(null);
  const [showHome, setShowHome] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/home.json')
      .then((res) => {
        if (!res.ok) throw new Error('home.json');
        return res.json() as Promise<HomeModel>;
      })
      .then((model) => {
        if (cancelled) return;
        setHome(model);
        setShowHome(true);
      })
      .catch(() => {
        if (!cancelled) setShowHome(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = shellRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('.project-row[data-slug]').forEach((row) => {
      const on = row.dataset.slug === active;
      row.classList.toggle('is-active', on);
      const link = row.querySelector<HTMLElement>('h3 a');
      if (link) {
        if (on) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    });
  }, [active, children]);

  useEffect(() => {
    if (!open) return;
    window.scrollTo(0, 0);
    const detail = shellRef.current?.querySelector('.split-detail');
    if (detail instanceof HTMLElement) detail.scrollTop = 0;
  }, [active, open, children]);

  useEffect(() => {
    const main = shellRef.current?.querySelector('.split-main');
    if (!(main instanceof HTMLElement)) return;
    const narrow = window.matchMedia('(max-width: 63.999rem)');
    const sync = () => {
      const hide = open && narrow.matches;
      main.toggleAttribute('inert', hide);
      if (hide) main.setAttribute('aria-hidden', 'true');
      else main.removeAttribute('aria-hidden');
    };
    sync();
    narrow.addEventListener('change', sync);
    return () => narrow.removeEventListener('change', sync);
  }, [open]);

  useEffect(() => {
    if (open || pathname !== '/') return;

    const syncHash = () => {
      const id = window.location.hash.replace(/^#/, '');
      if (id) scheduleScrollToHomeSection(id);
    };

    const t = window.setTimeout(syncHash, 60);
    window.addEventListener('hashchange', syncHash);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('hashchange', syncHash);
    };
  }, [pathname, open]);

  return (
    <div
      ref={shellRef}
      className="split-shell"
      data-open={open ? '' : undefined}
      data-active={active || undefined}
    >
      <div className="split-main">
        {showHome && home ? <HomeContent model={home} /> : null}
      </div>
      <div
        className="split-detail"
        aria-hidden={open ? undefined : true}
        inert={open ? undefined : true}
      >
        <Suspense fallback={<div className="split-detail-slot">{children}</div>}>
          <DetailSlot active={active} viewUrl={viewUrl}>
            {children}
          </DetailSlot>
        </Suspense>
      </div>
      <SiteFooter className="site-chrome-foot" />
    </div>
  );
}
