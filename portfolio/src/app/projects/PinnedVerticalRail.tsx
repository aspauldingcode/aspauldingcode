'use client';

/** Typography for the vertical rail label (two-line uppercase block). Shared with the inline Alex’s Projects title on very short viewports. */
export const pinnedRailLabelTypographyClass =
  'inline-block whitespace-pre-line text-center font-black uppercase text-base05 text-[12px] leading-none tracking-[0.1em] h-550:text-[13px] h-550:tracking-[0.09em] min-[400px]:text-[13px] sm:text-[14px] sm:tracking-[0.14em]';

/**
 * Shallow viewports (≤550px): “Pinned” / “Projects” on two lines (newline in markup), stars on the sides.
 * Row is rotated −90° about the **center**; no extra skew so glyphs follow the same `persona-skew` (−12°) as the
 * bordered box. Height follows the featured **card stage** (`items-stretch` beside the stack), not a fixed min-height.
 */
export function PinnedVerticalRail({
  className = '',
}: {
  className?: string;
}) {
  const starClass =
    'font-nerd shrink-0 leading-none text-base09 animate-pulse text-[13px] h-550:text-[12px] min-[400px]:text-[14px] sm:text-[14px]';

  return (
    <aside
      className={`flex h-full min-h-0 shrink-0 flex-col self-stretch overflow-visible w-[3.5rem] min-[400px]:w-14 sm:w-[4rem] ${className}`}
      aria-label="Pinned projects"
    >
      <div className="relative flex h-full min-h-0 flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 origin-center bg-base08 opacity-90"
          style={{ transform: 'skewX(-12deg) translate(2px, 2px)' }}
        />
        <div className="persona-skew relative flex min-h-0 flex-1 items-center justify-center overflow-visible border border-base09 bg-base00 px-0.5 py-1 shadow-[2px_2px_0_var(--base08)] h-550:px-0.5 h-550:py-0.5 sm:px-1 sm:py-2 sm:h-550:py-0.5">
          <div className="flex h-full w-full min-w-0 items-center justify-center">
            <div className="-rotate-90 flex w-max flex-row flex-nowrap items-center justify-center gap-x-1.5 origin-center h-550:gap-x-1">
              <span className={starClass} aria-hidden>
                󰓎
              </span>
              <span className={pinnedRailLabelTypographyClass}>{'Pinned\nProjects'}</span>
              <span className={starClass} aria-hidden>
                󰓎
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
