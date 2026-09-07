import { goToHireContact, initHireMe } from '@/lib/hireMeRuntime';

export function bootHireMe() {
  const heroHire = document.querySelector<HTMLElement>('[data-hero-hire]');
  const host = document.querySelector<HTMLElement>('[data-hire-host]');
  const destLead = host?.querySelector<HTMLElement>('.hire-bar-lead');
  const destHire = host?.querySelector<HTMLElement>('[data-dest-hire]');
  const fly = document.querySelector<HTMLElement>('[data-hire-fly]');
  if (!heroHire || !host || !destLead || !destHire || !fly) return;

  const onHire = (event: Event) => {
    goToHireContact(event);
  };
  heroHire.addEventListener('click', onHire);
  destHire.addEventListener('click', onHire);

  initHireMe({ host, destLead, destHire, heroHire, fly });
}
