/** Scroll to a home-section id inside the split main column (or the window). */
export function scrollToHomeSection(id: string) {
  if (!id || typeof document === 'undefined') return;

  const el = document.getElementById(id);
  if (!el) return;

  const main = document.querySelector('.split-main');
  if (main instanceof HTMLElement) {
    const style = window.getComputedStyle(main);
    const canScroll =
      style.overflowY === 'auto' ||
      style.overflowY === 'scroll' ||
      main.scrollHeight > main.clientHeight + 1;

    if (canScroll && main.clientHeight > 0) {
      const top =
        el.getBoundingClientRect().top -
        main.getBoundingClientRect().top +
        main.scrollTop -
        16;
      main.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      return;
    }
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Run after layout settles (closing the detail pane, soft nav, etc.). */
export function scheduleScrollToHomeSection(id: string) {
  if (!id) return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollToHomeSection(id);
    });
  });
}
