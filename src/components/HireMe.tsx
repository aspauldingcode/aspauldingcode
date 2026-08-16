'use client';

import PrintButton from '@/components/PrintButton';
import { resume } from '@/content/resume';
import { HIRE_EVENT, HIRE_HREF, markHireIntent } from '@/lib/hireIntent';
import { scheduleScrollToHomeSection } from '@/lib/scrollHomeSection';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';

const HIRE_COPY =
  'Available for internships or full-time. Systems Software Engineer, Platform Engineer, or Developer Tools Engineer.';

const IDLE = 0;
const TRAVEL = 1;
const DOCKED = 2;
const FLY_MS = 420;

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

function scroller(): HTMLElement | Window {
  const main = document.querySelector('.split-main');
  if (
    main instanceof HTMLElement &&
    main.scrollHeight > main.clientHeight + 1
  ) {
    return main;
  }
  return window;
}

function scrollTop(el: HTMLElement | Window) {
  return el instanceof HTMLElement ? el.scrollTop : el.scrollY;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function sampleBez(t: number, a: number, b: number) {
  return 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
}

function sampleBezDeriv(t: number, a: number, b: number) {
  return 3 * (1 - t) * (1 - t) * a + 6 * (1 - t) * t * (b - a) + 3 * t * t * (1 - b);
}

/** Same curve as the split column: cubic-bezier(0.22, 1, 0.36, 1). */
function easeColumn(x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 6; i++) {
    const dx = sampleBezDeriv(t, 0.22, 0.36);
    if (Math.abs(dx) < 1e-6) break;
    t = Math.min(1, Math.max(0, t - (sampleBez(t, 0.22, 0.36) - x) / dx));
  }
  return sampleBez(t, 1, 1);
}

function onScreen(b: Box) {
  return b.width > 2 && b.top + b.height > 8 && b.top < window.innerHeight - 8;
}

/** Hire me next to the name. The pair rides into the banner as one group. */
export default function HireMe() {
  const router = useRouter();
  const destLeadRef = useRef<HTMLDivElement>(null);
  const destHireRef = useRef<HTMLAnchorElement>(null);
  const heroHireRef = useRef<HTMLAnchorElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLParagraphElement>(null);
  const [ready, setReady] = useState(false);
  const name = resume.basics.name;
  const onHire = (event: MouseEvent<HTMLAnchorElement>) => {
    goToHireContact(event, router);
  };

  useLayoutEffect(() => setReady(true), []);

  useLayoutEffect(() => {
    if (!ready) return;
    const host = hostRef.current;
    const destLead = destLeadRef.current;
    const destHire = destHireRef.current;
    const heroHire = heroHireRef.current;
    const fly = flyRef.current;
    const probe = probeRef.current;
    const bar = host?.querySelector('.hire-bar');
    const dest = destLead?.querySelector('.hire-bar-name');
    const flyName = fly?.querySelector('.hire-group-fly-name');
    const flyHire = fly?.querySelector('.hire-me');
    const hero = document.querySelector('h1.hero-title');
    const heroRow = hero?.closest('.hero-name');
    const main = document.querySelector('.split-main');
    const shell = document.querySelector('.split-shell');
    const flyHireEl = flyHire;
    if (
      !(host instanceof HTMLElement) ||
      !(destLead instanceof HTMLElement) ||
      !(dest instanceof HTMLElement) ||
      !(destHire instanceof HTMLElement) ||
      !(heroHire instanceof HTMLElement) ||
      !(probe instanceof HTMLElement) ||
      !(bar instanceof HTMLElement) ||
      !(fly instanceof HTMLElement) ||
      !(flyName instanceof HTMLElement) ||
      !(flyHireEl instanceof HTMLElement) ||
      !(hero instanceof HTMLElement) ||
      !(heroRow instanceof HTMLElement)
    ) {
      return;
    }

    const narrow = window.matchMedia('(max-width: 63.999rem)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let root: HTMLElement | Window = scroller();
    let phase = -1;
    let restGap = 1;
    let raf = 0;
    let settle = 0;
    let flying = 0;
    let flyStart = 0;
    let flyFrom: Box | null = null;
    let flyFromHire: Box | null = null;
    let flyRaf = 0;
    let wasDetail = false;
    let pinnedLeft = '';
    let pinnedWidth = '';
    let stackBarW = -1;

    const detailOpen = () =>
      narrow.matches && shell instanceof HTMLElement && shell.hasAttribute('data-open');

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
      const width = bar.clientWidth;
      if (width === stackBarW) return;
      stackBarW = width;
      const cs = getComputedStyle(bar);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const gap = parseFloat(cs.columnGap) || 0;
      const leadGap =
        parseFloat(getComputedStyle(destLead).columnGap) ||
        parseFloat(getComputedStyle(destLead).gap) ||
        0;
      const available = width - pad - dest.offsetWidth - destHire.offsetWidth - leadGap - gap;
      probe.style.width = `${Math.max(available, 0)}px`;
      const stack = available < 8 || countLines(probe) >= 3;
      bar.classList.toggle('is-stack', stack);
      host.classList.toggle('is-stack', stack);
    }

    function pin() {
      host.hidden = false;
      let left = '0';
      let width = '100%';
      if (!detailOpen() && main instanceof HTMLElement && main.clientHeight >= 2) {
        left = `${main.getBoundingClientRect().left}px`;
        width = `${main.clientWidth}px`;
      }
      if (pinnedLeft !== left) {
        pinnedLeft = left;
        host.style.left = left;
      }
      if (pinnedWidth !== width) {
        pinnedWidth = width;
        host.style.width = width;
      }
      syncStack();
    }

    function measureRest() {
      pin();
      const a = hero.getBoundingClientRect();
      const b = dest.getBoundingClientRect();
      if (a.width > 2 && b.width > 2) restGap = Math.max(a.top - b.top, 1);
    }

    function setPhase(next: number) {
      if (next === phase) return;
      phase = next;
      host.classList.toggle('is-on', next !== IDLE);
      host.setAttribute('aria-hidden', next === IDLE ? 'true' : 'false');
      heroRow.classList.toggle('is-group-hidden', next !== IDLE);
      destLead.classList.toggle('is-group-hidden', next !== DOCKED);
      fly.classList.toggle('is-live', next === TRAVEL);
      dest.tabIndex = destHire.tabIndex = next === DOCKED ? 0 : -1;
      if (next !== TRAVEL) {
        fly.style.transform = '';
        flyName.style.transform = '';
        flyHireEl.style.transform = '';
      }
    }

    /** One t drives name and Hire me so the pair cannot drift. */
    function place(t: number, from: Box, to: Box, fromHire: Box, toHire: Box) {
      const u = Math.min(1, Math.max(0, t));
      const scale = lerp(1, to.width / Math.max(from.width, 1), u);
      const gap = lerp(
        fromHire.left - from.left - from.width,
        toHire.left - to.left - to.width,
        u
      );
      fly.style.transform = `translate3d(${lerp(from.left, to.left, u)}px,${lerp(
        from.top,
        to.top,
        u
      )}px,0)`;
      flyName.style.transform = `scale(${scale})`;
      flyHireEl.style.transform = `translate3d(${from.width * scale + gap}px,${
        (from.height * scale - fromHire.height) / 2
      }px,0)`;
    }

    function stopFlight() {
      if (flyRaf) cancelAnimationFrame(flyRaf);
      flyRaf = 0;
      flying = 0;
      flyFrom = null;
      flyFromHire = null;
    }

    function stepFlight(now: number) {
      if (!flyFrom || !flyFromHire || !flying) return;
      const u = Math.min(1, (now - flyStart) / FLY_MS);
      const t = easeColumn(u);
      if (flying > 0) {
        place(t, flyFrom, boxOf(dest), flyFromHire, boxOf(destHire));
      } else {
        place(t, flyFrom, boxOf(hero), flyFromHire, boxOf(heroHire));
      }
      if (u < 1) {
        flyRaf = requestAnimationFrame(stepFlight);
        return;
      }
      const dir = flying;
      stopFlight();
      setPhase(dir > 0 ? DOCKED : IDLE);
      if (dir < 0) {
        measureRest();
        sync();
      }
    }

    function beginFlight(dir: 1 | -1) {
      if (motion.matches) {
        stopFlight();
        setPhase(dir > 0 ? DOCKED : IDLE);
        return;
      }
      const fromEl = dir > 0 ? hero : dest;
      const fromHireEl = dir > 0 ? heroHire : destHire;
      const from = boxOf(fromEl);
      if (dir > 0 ? !onScreen(from) : from.width < 2) {
        stopFlight();
        setPhase(dir > 0 ? DOCKED : IDLE);
        return;
      }
      flyFrom = from;
      flyFromHire = boxOf(fromHireEl);
      flying = dir;
      flyStart = performance.now();
      setPhase(TRAVEL);
      if (flyRaf) cancelAnimationFrame(flyRaf);
      flyRaf = requestAnimationFrame(stepFlight);
    }

    function sync() {
      pin();
      if (flying) return;

      const detail = detailOpen();
      if (detail) {
        wasDetail = true;
        if (phase !== DOCKED) beginFlight(1);
        return;
      }
      if (wasDetail) {
        wasDetail = false;
        if (phase !== IDLE && onScreen(boxOf(hero))) {
          beginFlight(-1);
          return;
        }
      }

      const st = scrollTop(root);
      if (st <= 1) {
        if (phase !== IDLE) {
          setPhase(IDLE);
          measureRest();
        }
        return;
      }
      const from = boxOf(hero);
      const to = boxOf(dest);
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
      place(t, from, to, boxOf(heroHire), boxOf(destHire));
    }

    function onScroll() {
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
      window.clearTimeout(settle);
      settle = window.setTimeout(sync, 80);
    }

    function onResize() {
      stackBarW = -1;
      pinnedLeft = '';
      pinnedWidth = '';
      const next = scroller();
      if (next !== root) {
        root.removeEventListener('scroll', onScroll);
        root.removeEventListener('scrollend', onScroll);
        root = next;
        root.addEventListener('scroll', onScroll, { passive: true });
        root.addEventListener('scrollend', onScroll, { passive: true });
      }
      measureRest();
      sync();
    }

    measureRest();
    root.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('scrollend', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    narrow.addEventListener('change', sync);
    const mo = new MutationObserver(sync);
    if (shell) mo.observe(shell, { attributes: true, attributeFilter: ['data-open'] });
    const ro = new ResizeObserver(onResize);
    if (main instanceof HTMLElement) ro.observe(main);
    const fonts = document.fonts;
    fonts?.ready.then(() => {
      stackBarW = -1;
      syncStack();
    });
    sync();

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(flyRaf);
      window.clearTimeout(settle);
      root.removeEventListener('scroll', onScroll);
      root.removeEventListener('scrollend', onScroll);
      window.removeEventListener('resize', onResize);
      narrow.removeEventListener('change', sync);
      mo.disconnect();
      ro.disconnect();
      heroRow.classList.remove('is-group-hidden');
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
                    <a className="hire-bar-name" href="/" tabIndex={-1}>
                      {name}
                    </a>
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
                <p ref={probeRef} className="hire-bar-copy hire-bar-copy-probe" aria-hidden>
                  {HIRE_COPY} <a className="ctrl-link resume-print">Resume</a>
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
