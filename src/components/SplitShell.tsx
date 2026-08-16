'use client';

import SiteFooter from '@/components/SiteFooter';
import { scheduleScrollToHomeSection } from '@/lib/scrollHomeSection';
import { usePathname, useSearchParams } from 'next/navigation';
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
  children,
}: {
  active: string | undefined;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const liveUrl = active === 'view' ? searchParams.get('u') : null;
  const viewUrlRef = useRef(liveUrl);
  if (active === 'view' && liveUrl) viewUrlRef.current = liveUrl;
  const viewUrl = active === 'view' ? liveUrl ?? viewUrlRef.current : null;
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
  const heldRef = useRef<{ active: string; node: ReactNode } | null>(null);
  const [, setHeldTick] = useState(0);

  if (open && active) {
    heldRef.current = { active, node: children };
  }

  const held = heldRef.current;
  const paneActive = active ?? held?.active;
  const paneChildren = open ? children : held?.node;

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

  // Keep the departing page mounted so the 0fr track still has something to lerp.
  useEffect(() => {
    if (open) return;
    if (!heldRef.current) return;

    const shell = shellRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      if (!heldRef.current) return;
      heldRef.current = null;
      setHeldTick((n) => n + 1);
    };

    if (!shell || reduce) {
      finish();
      return;
    }

    const onEnd = (event: TransitionEvent) => {
      if (event.target !== shell) return;
      if (event.propertyName !== 'grid-template-columns') return;
      finish();
    };
    shell.addEventListener('transitionend', onEnd);
    const t = window.setTimeout(finish, 500);
    return () => {
      shell.removeEventListener('transitionend', onEnd);
      window.clearTimeout(t);
    };
  }, [open]);

  // Safari often leaves window scroll at the home footer after soft nav.
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
      <div
        className="split-detail"
        aria-hidden={open ? undefined : true}
        inert={open ? undefined : true}
      >
        {paneChildren ? (
          <Suspense
            fallback={
              <div className="split-detail-slot">{paneChildren}</div>
            }
          >
            <DetailSlot active={paneActive}>{paneChildren}</DetailSlot>
          </Suspense>
        ) : null}
      </div>
      <SiteFooter className="site-chrome-foot" />
    </div>
  );
}
