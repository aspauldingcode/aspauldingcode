/** Window scroll on the homepage overlay shell. Inner-pane scroll on MPA /work. */
export function homeSectionScrollTarget(): 'window' | 'main' {
  if (typeof document === 'undefined') return 'window';
  if (document.querySelector('.split-shell[data-home-shell]')) return 'window';
  return 'main';
}

function chromeOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--hire-chrome');
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n + 8 : 16;
}

/** Scroll to a home-section id inside the split main column (or the window). */
export function scrollToHomeSection(id: string) {
  if (!id || typeof document === 'undefined') return;

  const el = document.getElementById(id);
  if (!el) return;

  if (homeSectionScrollTarget() === 'window') {
    const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - chromeOffset());
    const scroller = document.scrollingElement;
    if (scroller) scroller.scrollTop = top;
    else window.scrollTo(0, top);
    return;
  }

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
