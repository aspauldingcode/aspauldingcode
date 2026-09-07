'use client';

import ContactForm from '@/components/ContactForm';
import SiteFooter from '@/components/SiteFooter';
import { hasHireIntent } from '@/lib/hireIntent';
import { scheduleScrollToHomeSection } from '@/lib/scrollHomeSection';
import { bootHome } from '@/scripts/boot-home';
import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

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
 * First paint is MPA. Later /work/* clicks stay in-document (see bootWorkRoute).
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
  const shown = active;

  useEffect(() => {
    let cancelled = false;
    let contactRoot: Root | null = null;

    fetch('/home-fragment')
      .then((res) => {
        if (!res.ok) throw new Error('home-fragment');
        return res.text();
      })
      .then((html) => {
        if (cancelled) return;
        const main = shellRef.current?.querySelector('.split-main');
        if (!(main instanceof HTMLElement)) return;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const nodes = Array.from(doc.body.childNodes).map((node) => document.importNode(node, true));
        main.replaceChildren(...nodes);
        main.querySelectorAll('script').forEach((el) => el.remove());
        const mount = main.querySelector('#contact-form-root');
        if (mount) {
          mount.replaceChildren();
          contactRoot = createRoot(mount);
          contactRoot.render(<ContactForm initialHiring={hasHireIntent()} />);
        }
        bootHome(main);
      })
      .catch(() => {
        /* home column stays empty; detail still works */
      });

    return () => {
      cancelled = true;
      contactRoot?.unmount();
    };
  }, []);

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
      const hide = shellRef.current?.hasAttribute('data-open') && narrow.matches;
      main.toggleAttribute('inert', hide);
      if (hide) main.setAttribute('aria-hidden', 'true');
      else main.removeAttribute('aria-hidden');
    };
    sync();
    narrow.addEventListener('change', sync);
    return () => narrow.removeEventListener('change', sync);
  }, []);

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
      data-react-shell=""
      data-open={shown ? '' : undefined}
      data-active={shown || undefined}
    >
      <div className="split-main" />
      <div
        className="split-detail"
        aria-hidden={shown ? undefined : true}
        inert={shown ? undefined : true}
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
