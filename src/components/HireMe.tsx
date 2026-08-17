'use client';

import PrintButton from '@/components/PrintButton';
import { resume } from '@/content/resume';
import { HIRE_EVENT, HIRE_HREF, markHireIntent } from '@/lib/hireIntent';
import { scheduleScrollToHomeSection } from '@/lib/scrollHomeSection';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef, useSyncExternalStore, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';

const HIRE_COPY =
  'Available for internships or full-time. Systems Software Engineer, Platform Engineer, or Developer Tools Engineer.';

const IDLE = 0;
const TRAVEL = 1;
const DOCKED = 2;

type Box = { left: number; top: number; width: number; height: number };

export function goToHireContact(
  event: MouseEvent<HTMLAnchorElement>,
  router: { push: (href: string) => void }
) {
  event.preventDefault();
  window.dispatchEvent(new Event(HIRE_EVENT));
  if (window.location.pathname !== '/') {
    router.push(HIRE_HREF);
    return;
  }
  markHireIntent();
  scheduleScrollToHomeSection('contact');
}

function scrollTop(main: Element | null) {
  const pane = main instanceof HTMLElement ? main.scrollTop : 0;
  return Math.max(pane, window.scrollY);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/** Hire me next to the name. The pair rides into the banner as one group. */
export default function HireMe() {
  const router = useRouter();
  const destLeadRef = useRef<HTMLDivElement>(null);
  const destHireRef = useRef<HTMLAnchorElement>(null);
  const heroHireRef = useRef<HTMLAnchorElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const name = resume.basics.name;
  const onHire = (event: MouseEvent<HTMLAnchorElement>) => {
    goToHireContact(event, router);
  };

  useLayoutEffect(() => {
    if (!ready) return;
    const host = hostRef.current;
    const destLead = destLeadRef.current;
    const destHire = destHireRef.current;
    const heroHire = heroHireRef.current;
    const fly = flyRef.current;
    const bar = host?.querySelector('.hire-bar');
    const dest = destLead?.querySelector('.hire-bar-name');
    const flyName = fly?.querySelector('.hire-group-fly-name');
    const flyHire = fly?.querySelector('.hire-me');
    const hero = document.querySelector('h1.hero-title');
    const heroRow = hero?.closest('.hero-name');
    const main = document.querySelector('.split-main');
    const wrap = main instanceof HTMLElement ? main.querySelector('.wrap') : null;
    const shell = document.querySelector('.split-shell');
    const flyHireEl = flyHire;
    if (
      !(host instanceof HTMLElement) ||
      !(destLead instanceof HTMLElement) ||
      !(dest instanceof HTMLElement) ||
      !(destHire instanceof HTMLElement) ||
      !(heroHire instanceof HTMLElement) ||
      !(bar instanceof HTMLElement) ||
      !(fly instanceof HTMLElement) ||
      !(flyName instanceof HTMLElement) ||
      !(flyHireEl instanceof HTMLElement) ||
      !(hero instanceof HTMLElement) ||
      !(heroRow instanceof HTMLElement)
    ) {
      return;
    }

    const hostEl = host;
    const destLeadEl = destLead;
    const destEl = dest;
    const destHireEl = destHire;
    const heroHireEl = heroHire;
    const barEl = bar;
    const flyEl = fly;
    const flyNameEl = flyName;
    const flyHireNode = flyHireEl;
    const heroEl = hero;
    const heroRowEl = heroRow;

    const narrow = window.matchMedia('(max-width: 63.999rem)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let phase = -1;
    let restGap = 1;
    let raf = 0;
    let settle = 0;
    let scrolling = false;
    let destBox: Box | null = null;
    let destHireBox: Box | null = null;
    let wasDetail = false;
    let pinnedLeft = '';
    let pinnedWidth = '';
    let stackBarW = -1;
    let chromeH = '';

    const probe = document.createElement('p');
    probe.className = 'hire-bar-copy';
    probe.replaceChildren(
      document.createTextNode(`${HIRE_COPY} `),
      Object.assign(document.createElement('a'), {
        className: 'ctrl-link resume-print',
        textContent: 'Resume',
      })
    );
    const measure = document.createElement('div');
    measure.setAttribute('aria-hidden', 'true');
    measure.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;clip-path:inset(50%);pointer-events:none;';
    measure.append(probe);
    document.body.append(measure);

    const columnOpen = () =>
      shell instanceof HTMLElement && shell.hasAttribute('data-open');

    // Narrow + data-open only. Do not read window.location: Safari can still
    // report / while the project column is already taking the view.
    const detailOpen = () => narrow.matches && columnOpen();

    function countLines(el: HTMLElement) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = new Set<number>();
      for (const rect of range.getClientRects()) {
        if (rect.width < 2 || rect.height < 2) continue;
        tops.add(Math.round(rect.top));
      }
      if (tops.size) return tops.size;
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 16;
      return Math.max(1, Math.round(el.getBoundingClientRect().height / lh));
    }

    function syncStack() {
      const width = barEl.clientWidth;
      if (width === stackBarW) return;
      stackBarW = width;
      const cs = getComputedStyle(barEl);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const gap = parseFloat(cs.columnGap) || 0;
      const leadGap =
        parseFloat(getComputedStyle(destLeadEl).columnGap) ||
        parseFloat(getComputedStyle(destLeadEl).gap) ||
        0;
      const available = width - pad - destEl.offsetWidth - destHireEl.offsetWidth - leadGap - gap;
      probe.style.width = `${Math.max(available, 0)}px`;
      const stack = available < 8 || countLines(probe) >= 3;
      barEl.classList.toggle('is-stack', stack);
      hostEl.classList.toggle('is-stack', stack);
    }

    function pin() {
      hostEl.hidden = false;
      let left = '0';
      let width = '100%';
      if (detailOpen()) {
        left = '0';
        width = '100%';
      } else if (columnOpen() && main instanceof HTMLElement && main.clientWidth >= 2) {
        const pane = main.getBoundingClientRect();
        left = `${pane.left}px`;
        width = `${main.clientWidth}px`;
      } else if (wrap instanceof HTMLElement && wrap.clientWidth >= 2) {
        const box = wrap.getBoundingClientRect();
        left = `${box.left}px`;
        width = `${box.width}px`;
      } else if (main instanceof HTMLElement && main.clientWidth >= 2) {
        const pane = main.getBoundingClientRect();
        left = `${pane.left}px`;
        width = `${main.clientWidth}px`;
      }
      if (pinnedLeft !== left) {
        pinnedLeft = left;
        hostEl.style.left = left;
      }
      if (pinnedWidth !== width) {
        pinnedWidth = width;
        hostEl.style.width = width;
      }
      syncStack();
      writeChrome();
    }

    function rowHeight(el: Element | null) {
      if (!(el instanceof HTMLElement)) return 0;
      if (getComputedStyle(el).display === 'none') return 0;
      return el.offsetHeight;
    }

    function writeChrome() {
      if (!detailOpen()) {
        if (!chromeH) return;
        chromeH = '';
        document.documentElement.style.removeProperty('--hire-chrome');
        return;
      }
      const back = hostEl.querySelector('.hire-bar-back');
      const h = Math.min(rowHeight(barEl) + rowHeight(back), 220);
      const next = h > 8 ? `${h}px` : '';
      if (next === chromeH) return;
      chromeH = next;
      if (next) document.documentElement.style.setProperty('--hire-chrome', next);
      else document.documentElement.style.removeProperty('--hire-chrome');
    }

    function measureRest() {
      pin();
      const a = heroEl.getBoundingClientRect();
      const destNow = readDest();
      if (a.width > 2 && destNow) restGap = Math.max(a.top - destNow.to.top, 1);
    }

    function setPhase(next: number) {
      if (next === phase) return;
      phase = next;
      hostEl.classList.toggle('is-on', next !== IDLE);
      hostEl.setAttribute('aria-hidden', next === IDLE ? 'true' : 'false');
      heroRowEl.classList.toggle('is-group-hidden', next !== IDLE);
      destLeadEl.classList.toggle('is-group-hidden', next !== DOCKED);
      flyEl.classList.toggle('is-live', next === TRAVEL);
      destEl.tabIndex = destHireEl.tabIndex = next === DOCKED ? 0 : -1;
      if (next !== TRAVEL) {
        flyEl.style.transform = '';
        flyNameEl.style.transform = '';
        flyHireNode.style.transform = '';
      }
    }

    function readDest() {
      const to = boxOf(destEl);
      const hire = boxOf(destHireEl);
      if (to.width > 2) {
        destBox = to;
        destHireBox = hire;
      }
      return destBox && destHireBox ? { to: destBox, hire: destHireBox } : null;
    }

    /** One t drives name and Hire me. Scroll keeps Y on the live title. */
    function place(
      t: number,
      from: Box,
      to: Box,
      fromHire: Box,
      toHire: Box,
      stickY = false
    ) {
      if (from.width < 2 || to.width < 2) return;
      const u = Math.min(1, Math.max(0, t));
      const scale = lerp(1, to.width / Math.max(from.width, 1), u);
      const gap = lerp(
        fromHire.left - from.left - from.width,
        toHire.left - to.left - to.width,
        u
      );
      flyEl.style.transform = `translate3d(${lerp(from.left, to.left, u)}px,${
        stickY ? from.top : lerp(from.top, to.top, u)
      }px,0)`;
      flyNameEl.style.transform = `scale(${scale})`;
      flyHireNode.style.transform = `translate3d(${from.width * scale + gap}px,${
        (from.height * scale - fromHire.height) / 2
      }px,0)`;
    }

    function sync() {
      pin();

      const detail = detailOpen();
      if (detail) {
        wasDetail = true;
        if (phase !== DOCKED) setPhase(DOCKED);
        writeChrome();
        return;
      }
      if (wasDetail) wasDetail = false;

      const st = scrollTop(main);
      if (st <= 1) {
        if (phase !== IDLE) {
          setPhase(IDLE);
          measureRest();
        }
        return;
      }
      const from = boxOf(heroEl);
      const destNow = readDest();
      if (!destNow || from.width < 2) return;
      const { to, hire: toHire } = destNow;
      if (motion.matches && from.top > to.top) {
        if (phase !== IDLE) {
          setPhase(IDLE);
          measureRest();
        }
        return;
      }
      if (from.top <= to.top) {
        setPhase(DOCKED);
        return;
      }
      if (motion.matches) {
        if (phase !== IDLE) setPhase(IDLE);
        return;
      }
      const t = Math.min(1, Math.max(0, 1 - (from.top - to.top) / restGap));
      if (t <= 0) {
        if (phase !== IDLE) {
          setPhase(IDLE);
          measureRest();
        }
        return;
      }
      setPhase(TRAVEL);
      place(t, from, to, boxOf(heroHireEl), toHire, true);
    }

    function onScroll() {
      scrolling = true;
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        scrolling = false;
        sync();
      }, 120);
      if (raf) return;
      const tick = () => {
        sync();
        raf = scrolling ? requestAnimationFrame(tick) : 0;
      };
      raf = requestAnimationFrame(tick);
    }

    function onResize() {
      stackBarW = -1;
      pinnedLeft = '';
      pinnedWidth = '';
      destBox = null;
      destHireBox = null;
      measureRest();
      sync();
    }

    measureRest();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scrollend', onScroll, { passive: true });
    if (main instanceof HTMLElement) {
      main.addEventListener('scroll', onScroll, { passive: true });
      main.addEventListener('scrollend', onScroll, { passive: true });
    }
    window.addEventListener('resize', onResize, { passive: true });
    narrow.addEventListener('change', sync);
    const mo = new MutationObserver(sync);
    if (shell) mo.observe(shell, { attributes: true, attributeFilter: ['data-open'] });
    const ro = new ResizeObserver(onResize);
    if (main instanceof HTMLElement) ro.observe(main);
    if (wrap instanceof HTMLElement) ro.observe(wrap);
    const chromeRo = new ResizeObserver(() => writeChrome());
    chromeRo.observe(hostEl);
    const fonts = document.fonts;
    fonts?.ready.then(() => {
      stackBarW = -1;
      syncStack();
    });
    sync();

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScroll);
      if (main instanceof HTMLElement) {
        main.removeEventListener('scroll', onScroll);
        main.removeEventListener('scrollend', onScroll);
      }
      window.removeEventListener('resize', onResize);
      narrow.removeEventListener('change', sync);
      mo.disconnect();
      ro.disconnect();
      chromeRo.disconnect();
      document.documentElement.style.removeProperty('--hire-chrome');
      measure.remove();
      heroRowEl.classList.remove('is-group-hidden');
    };
  }, [ready]);

  return (
    <>
      <a ref={heroHireRef} className="hire-me" href={HIRE_HREF} onClick={onHire}>
        Hire me
      </a>
      {ready
        ? createPortal(
            <>
              <div ref={hostRef} className="hire-bar-host" aria-hidden="true">
                <div className="hire-bar">
                  <div ref={destLeadRef} className="hire-bar-lead is-group-hidden">
                    <Link className="hire-bar-name" href="/" tabIndex={-1}>
                      {name}
                    </Link>
                    <a
                      ref={destHireRef}
                      className="hire-me"
                      href={HIRE_HREF}
                      tabIndex={-1}
                      onClick={onHire}
                    >
                      Hire me
                    </a>
                  </div>
                  <p className="hire-bar-copy">
                    {HIRE_COPY} <PrintButton />
                  </p>
                </div>
                <p className="hire-bar-back">
                  <Link href="/">← Back to {name}</Link>
                </p>
              </div>
              <div ref={flyRef} className="hire-group-fly" aria-hidden>
                <span className="hire-group-fly-name">{name}</span>
                <span className="hire-me">Hire me</span>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
