'use client';

import PrintButton from '@/components/PrintButton';
import { resume } from '@/content/resume';
import { HIRE_COPY, goToHireContact, initHireMe } from '@/lib/hireMeRuntime';
import { HIRE_HREF } from '@/lib/hireIntent';
import { useLayoutEffect, useRef, useSyncExternalStore, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';

export { goToHireContact };

/** Hire me next to the name. The pair rides into the banner as one group. */
export default function HireMe() {
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
    goToHireContact(event);
  };

  useLayoutEffect(() => {
    if (!ready) return;
    const host = hostRef.current;
    const destLead = destLeadRef.current;
    const destHire = destHireRef.current;
    const heroHire = heroHireRef.current;
    const fly = flyRef.current;
    if (!host || !destLead || !destHire || !heroHire || !fly) return;
    return initHireMe({ host, destLead, destHire, heroHire, fly });
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
                  <a href="/">← Back to {name}</a>
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
