export const HIRE_PARAM = 'hire';
export const HIRE_EVENT = 'aspauldingcode:hire';
export const CLOSE_WORK_EVENT = 'aspauldingcode:close-work';
export const HIRE_HREF = '/?hire=1#contact';

export function searchHasHireIntent(search: string): boolean {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(HIRE_PARAM) === '1';
}

export function hasHireIntent(): boolean {
  if (typeof window === 'undefined') return false;
  return searchHasHireIntent(window.location.search);
}

/** Check the contact hire box even if the React island has not hydrated. */
export function applyHireCheckbox(): void {
  if (typeof document === 'undefined') return;
  const box = document.getElementById('contact-hiring');
  if (!(box instanceof HTMLInputElement)) return;
  box.checked = true;
  box.setAttribute('checked', '');
}

/** Mark this visit as a hiring inquiry and point at the contact form. */
export function markHireIntent(): void {
  window.history.pushState(null, '', HIRE_HREF);
  applyHireCheckbox();
  window.dispatchEvent(new Event(HIRE_EVENT));
}
