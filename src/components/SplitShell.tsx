'use client';

import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { scheduleScrollToHomeSection } from '@/lib/scrollHomeSection';

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
  children,
}: {
  active: string | undefined;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const viewUrl = active === 'view' ? searchParams.get('u') : null;
  const detailKey = detailKeyFor(active, viewUrl);

  useEffect(() => {
    if (active === 'view') return;
    // Safety net: anything framed must die when we leave /view.
    unloadIframes(document.querySelector('.split-detail'));
  }, [active, detailKey]);

  return (
    <div className="split-detail-slot" key={detailKey}>
      {children}
    </div>
  );
}

/**
 * Pathname drives open state. Detail pane is keyed so only one right-column
 * target exists; leaving /view hard-unloads any framed sites.
 */
export default function SplitShell({
  home,
  children,
}: {
  home: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = activeFromPath(pathname);
  const open = Boolean(active);
  const shellRef = useRef<HTMLDivElement>(null);

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
  }, [active, open, children]);

  // Safari often leaves window scroll at the home footer after soft nav.
  useEffect(() => {
    if (!open) return;
    window.scrollTo(0, 0);
    const detail = shellRef.current?.querySelector('.split-detail');
    if (detail instanceof HTMLElement) detail.scrollTop = 0;
  }, [active, open, children]);

  // Home section crumbs (/#links, /#selected-work, …): scroll the left column.
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
      <div className="split-main">{home}</div>
      <div className="split-detail" aria-hidden={open ? undefined : true}>
        {open ? (
          <Suspense
            fallback={
              <div className="split-detail-slot">{children}</div>
            }
          >
            <DetailSlot active={active}>{children}</DetailSlot>
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
