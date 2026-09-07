import { applyHireCheckbox, hasHireIntent } from '@/lib/hireIntent';
import { goToHireContact, initHireMe } from '@/lib/hireMeRuntime';
import { scheduleScrollToHomeSection } from '@/lib/scrollHomeSection';

function isHireLink(anchor: HTMLAnchorElement): boolean {
  if (anchor.matches('[data-hero-hire], [data-dest-hire], a.hire-me')) return true;
  try {
    const u = new URL(anchor.href, window.location.href);
    return u.searchParams.get('hire') === '1' && u.hash === '#contact';
  } catch {
    return false;
  }
}

let clickBound = false;

export function bootHireMe() {
  if (!clickBound) {
    clickBound = true;
    document.addEventListener('click', (event) => {
      if (!(event instanceof MouseEvent) || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank') return;
      if (!isHireLink(anchor)) return;
      goToHireContact(event);
    });
  }

  if (hasHireIntent()) {
    applyHireCheckbox();
    scheduleScrollToHomeSection('contact');
  }

  const heroHire = document.querySelector<HTMLElement>('[data-hero-hire]');
  const host = document.querySelector<HTMLElement>('[data-hire-host]');
  const destLead = host?.querySelector<HTMLElement>('.hire-bar-lead');
  const destHire = host?.querySelector<HTMLElement>('[data-dest-hire]');
  const fly = document.querySelector<HTMLElement>('[data-hire-fly]');
  if (!heroHire || !host || !destLead || !destHire || !fly) return;

  initHireMe({ host, destLead, destHire, heroHire, fly });
}
