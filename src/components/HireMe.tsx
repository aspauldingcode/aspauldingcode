'use client';

import { markHireIntent } from '@/lib/hireIntent';
import { scheduleScrollToHomeSection } from '@/lib/scrollHomeSection';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';

const HIRE_COPY =
  'Alex Spaulding is available for hire: internships or full-time. Systems, platform, or developer-tools roles.';

function goToContact(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  markHireIntent();
  scheduleScrollToHomeSection('contact');
}

function scrollRoot(): Element | null {
  const main = document.querySelector('.split-main');
  if (!(main instanceof HTMLElement)) return null;
  const style = window.getComputedStyle(main);
  const canScroll =
    style.overflowY === 'auto' ||
    style.overflowY === 'scroll' ||
    main.scrollHeight > main.clientHeight + 1;
  return canScroll && main.clientHeight > 0 ? main : null;
}

function barHostParent(): HTMLElement {
  const main = document.querySelector('.split-main');
  return main instanceof HTMLElement ? main : document.body;
}

/** Inline Hire me next to the name. After it leaves view, a sticky header. */
export default function HireMe() {
  const sentinelRef = useRef<HTMLAnchorElement>(null);
  const [stuck, setStuck] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const parent = barHostParent();
    const node = document.createElement('div');
    node.className = 'hire-bar-host';
    parent.prepend(node);
    setHost(node);
    return () => {
      node.remove();
      setHost(null);
    };
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let observer: IntersectionObserver | null = null;

    const watch = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(
        ([entry]) => {
          setStuck(!entry.isIntersecting);
        },
        { root: scrollRoot(), threshold: 0, rootMargin: '-12px 0px 0px 0px' }
      );
      observer.observe(sentinel);
    };

    watch();
    window.addEventListener('resize', watch);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', watch);
    };
  }, []);

  useEffect(() => {
    if (!host) return;
    host.classList.toggle('is-on', stuck);
    host.setAttribute('aria-hidden', stuck ? 'false' : 'true');
  }, [host, stuck]);

  return (
    <>
      <a
        ref={sentinelRef}
        className="hire-me"
        href="/?hire=1#contact"
        onClick={goToContact}
      >
        Hire me
      </a>
      {host
        ? createPortal(
            <a
              className="hire-bar"
              href="/?hire=1#contact"
              tabIndex={stuck ? 0 : -1}
              onClick={goToContact}
            >
              <span className="hire-me">Hire me</span>
              <span className="hire-bar-copy">{HIRE_COPY}</span>
            </a>,
            host
          )
        : null}
    </>
  );
}
