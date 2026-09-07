import { reviveAstroProps } from '@/lib/astroProps';

type IslandHydrator = (
  Component: unknown,
  props: Record<string, unknown>,
  slots: Record<string, string>,
  meta: { client: string }
) => void | Promise<void>;

/**
 * Parked work panes use visibility:hidden, so Astro client:visible never
 * intersects. Retarget islands before insert so a work-page astro-island
 * custom element does not steal them, then hydrate immediately.
 */
export function retargetWorkIslands(root: ParentNode) {
  for (const el of [...root.querySelectorAll('astro-island')]) {
    const next = document.createElement('div');
    next.setAttribute('data-work-island', '');
    for (const attr of el.attributes) {
      next.setAttribute(attr.name, attr.value);
    }
    next.replaceChildren(...el.childNodes);
    el.replaceWith(next);
  }
}

export async function hydrateWorkIslands(root: ParentNode) {
  const islands = [...root.querySelectorAll<HTMLElement>('[data-work-island][ssr]')];
  await Promise.all(islands.map((el) => hydrateOne(el)));
}

async function hydrateOne(el: HTMLElement) {
  if (el.dataset.workHydrated === '1' || !el.hasAttribute('ssr')) return;
  const componentHref = el.getAttribute('component-url');
  const rendererHref = el.getAttribute('renderer-url');
  const componentExport = el.getAttribute('component-export') || 'default';
  if (!componentHref || !rendererHref) return;

  try {
    const [componentMod, rendererMod] = await Promise.all([
      import(/* @vite-ignore */ new URL(componentHref, window.location.origin).href),
      import(/* @vite-ignore */ new URL(rendererHref, window.location.origin).href),
    ]);
    const hydrator = (rendererMod as { default?: (node: Element) => IslandHydrator }).default;
    if (!hydrator) return;

    let Component: unknown = componentMod;
    for (const part of componentExport.split('.')) {
      Component = (Component as Record<string, unknown> | null)?.[part];
    }
    if (!Component) return;

    const props = reviveAstroProps(el.getAttribute('props') || '');
    // client:only remounts. Extracted HTML (scripts stripped) often fails hydrateRoot.
    await hydrator(el)(Component, props, {}, { client: 'only' });
    el.dataset.workHydrated = '1';
    el.removeAttribute('ssr');
  } catch {
    return;
  }
}
