export const HIRE_PARAM = 'hire';
export const HIRE_EVENT = 'aspauldingcode:hire';

export function searchHasHireIntent(search: string): boolean {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(HIRE_PARAM) === '1';
}

export function hasHireIntent(): boolean {
  if (typeof window === 'undefined') return false;
  return searchHasHireIntent(window.location.search);
}

/** Mark this visit as a hiring inquiry and point at the contact form. */
export function markHireIntent(): void {
  const url = new URL(window.location.href);
  url.searchParams.set(HIRE_PARAM, '1');
  url.hash = 'contact';
  window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new Event(HIRE_EVENT));
}
