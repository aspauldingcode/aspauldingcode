'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, type TargetAndTransition, type PanInfo } from 'framer-motion';
import ProjectCard from '@/components/ProjectCard';
import { GitHubRepoData } from '@/lib/github';
import { Project } from './projectData';
import { PinnedVerticalRail } from './PinnedVerticalRail';
import { AlexProjectsInlineTitle } from '../components/ProjectsHeader';

function stackCardInitial(isTop: boolean, dir: number): TargetAndTransition {
  if (isTop) {
    return dir > 0
      ? { x: 14, y: 18, rotate: 2, scale: 0.96, opacity: 0 }
      : { x: -600, rotate: -15, scale: 0.9, opacity: 0 };
  }
  return { opacity: 0, scale: 0.8 };
}

function stackCardExit(dir: number): TargetAndTransition {
  return {
    x: dir > 0 ? -600 : 600,
    opacity: 0,
    rotate: dir > 0 ? -15 : 15,
    scale: 0.9,
    zIndex: dir > 0 ? 50 : 30,
    transition: { duration: 0.35, ease: 'easeIn' },
  };
}

/**
 * Persona 6 Pinned Deck:
 * — Viewport height >550px: full-width stack, dots under cards, classic horizontal “Pinned Projects” label.
 * — ≤550px: slanted vertical rail (★ Pinned / Projects ★) left, cards + compact dots under header on the right.
 */
export function FeaturedMobileStack({
  projects,
  onViewProject,
  onIntent,
  githubData,
  quality,
  interactionMode,
  compactVertical = false,
  inlinePageTitle = false,
  inlinePageTitleHidden = false,
}: {
  projects: Project[];
  onViewProject: (p: Project) => void;
  onIntent: () => void;
  githubData: Record<string, GitHubRepoData>;
  quality: number;
  interactionMode: 'mouse' | 'keyboard';
  compactVertical?: boolean;
  /** Shallow height: show "Alex's Projects" to the left of the pinned rail. */
  inlinePageTitle?: boolean;
  inlinePageTitleHidden?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const stackRef = useRef<HTMLDivElement>(null);

  const canGoPrev = index > 0;
  const canGoNext = index < projects.length - 1;

  const handleSwipe = useCallback((dir: 1 | -1) => {
    setDirection(dir);
    setIndex((prev) => Math.max(0, Math.min(projects.length - 1, prev + dir)));
  }, [projects.length]);

  const stackDragControls = useDragControls();
  const stackDragActiveRef = useRef(false);
  const stackBoundsCleanupRef = useRef<null | (() => void)>(null);
  /** After a horizontal pan on the top card, block the synthetic click so the sheet/modal does not open. */
  const suppressStackCardOpenRef = useRef(false);

  const clearStackBoundsWatcher = useCallback(() => {
    stackBoundsCleanupRef.current?.();
    stackBoundsCleanupRef.current = null;
  }, []);

  const finalizeStackPan = useCallback(
    (info: Pick<PanInfo, 'offset' | 'velocity'>) => {
      const threshold = 80;
      const velocity = info.velocity.x;
      const ox = info.offset.x;
      if (ox < -threshold && canGoNext) {
        handleSwipe(1);
        return true;
      }
      if (ox > threshold && canGoPrev) {
        handleSwipe(-1);
        return true;
      }
      if (Math.abs(velocity) > 500) {
        if (velocity < 0 && canGoNext) {
          handleSwipe(1);
          return true;
        }
        if (velocity > 0 && canGoPrev) {
          handleSwipe(-1);
          return true;
        }
      }
      return false;
    },
    [canGoNext, canGoPrev, handleSwipe],
  );

  const openPinnedProjectIfTap = useCallback(
    (p: Project) => {
      if (suppressStackCardOpenRef.current) {
        suppressStackCardOpenRef.current = false;
        return;
      }
      onViewProject(p);
    },
    [onViewProject],
  );

  const endStackDragSession = useCallback(() => {
    stackDragControls.stop();
  }, [stackDragControls]);

  useEffect(() => {
    const onDocOut = (e: MouseEvent) => {
      if (e.relatedTarget !== null) return;
      endStackDragSession();
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') endStackDragSession();
    };

    window.addEventListener('pointerup', endStackDragSession);
    window.addEventListener('pointercancel', endStackDragSession);
    window.addEventListener('lostpointercapture', endStackDragSession);
    document.documentElement.addEventListener('mouseout', onDocOut);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', endStackDragSession);

    return () => {
      window.removeEventListener('pointerup', endStackDragSession);
      window.removeEventListener('pointercancel', endStackDragSession);
      window.removeEventListener('lostpointercapture', endStackDragSession);
      document.documentElement.removeEventListener('mouseout', onDocOut);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', endStackDragSession);
    };
  }, [endStackDragSession]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const root = stackRef.current;
      if (!root?.contains(document.activeElement)) return;
      if (e.key === 'ArrowLeft' && canGoPrev) {
        e.preventDefault();
        e.stopPropagation();
        handleSwipe(-1);
      } else if (e.key === 'ArrowRight' && canGoNext) {
        e.preventDefault();
        e.stopPropagation();
        handleSwipe(1);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [canGoPrev, canGoNext, handleSwipe]);

  useEffect(() => {
    const root = stackRef.current;
    if (!root?.contains(document.activeElement)) return;
    const topBtn = root.querySelector<HTMLElement>('[role="button"][tabindex="0"]');
    if (topBtn && document.activeElement !== topBtn) {
      topBtn.focus({ preventScroll: true });
    }
  }, [index]);

  /** Tall viewports: aspect box. Shallow (≤550px / compactVertical): fill rail row height + full column width — no aspect lock (width stays column-wide when height changes). */
  const stageAspectDefault = '[aspect-ratio:4/5] sm:[aspect-ratio:3/4]';

  const stackDy = compactVertical ? 20 : 36;
  const stackDx = compactVertical ? 21 : 32;
  const stackRot = compactVertical ? 3.2 : 5.5;

  const paginationBars = (variant: 'default' | 'compactTop') =>
    projects.map((_, i) => (
      <motion.div
        key={variant === 'compactTop' ? `top-${i}` : i}
        layout
        className={
          variant === 'compactTop'
            ? 'h-[clamp(0.32rem,1.05dvmin,0.55rem)] -skew-x-12 border border-base00 shadow-sm'
            : 'h-[clamp(0.35rem,1.2dvmin,0.625rem)] -skew-x-12 border border-base00 shadow-sm'
        }
        animate={{
          /* Shallow (≤550px): same look as default bars, slightly narrower/shorter */
          width: i === index ? (variant === 'compactTop' ? 25 : 28) : variant === 'compactTop' ? 8 : 9,
          backgroundColor: i === index ? 'var(--base09)' : 'var(--base03)',
          scale: i === index ? 1.05 : 1,
          boxShadow: i === index ? '0 0 15px var(--base08)' : 'none',
        }}
        transition={{
          width: { type: 'spring', stiffness: 500, damping: 30, mass: 0.8 },
          backgroundColor: { duration: 0.2 },
        }}
      />
    ));

  const cardStageInner = (
    <div
      className={[
        'relative min-h-0 max-h-full',
        compactVertical
          ? inlinePageTitle
            ? 'h-full min-h-[9rem] w-full min-w-0'
            : 'h-full w-full min-w-0'
          : 'mx-auto min-w-0 w-full h-auto ' + stageAspectDefault,
      ].join(' ')}
    >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            {projects.map((project, i) => {
              const isPrev = i === index - 1;
              const isTop = i === index;
              const isNext = i === index + 1;
              const isNextNext = i === index + 2;

              if (!isPrev && !isTop && !isNext && !isNextNext) return null;

              const depth = i - index;

              return (
                <motion.div
                  key={project.id}
                  layout
                  custom={direction}
                  className="absolute inset-0 overflow-visible"
                  style={{
                    zIndex: isTop ? 40 : isPrev ? 45 : 30 - depth,
                    pointerEvents: isTop ? 'auto' : 'none',
                  }}
                  initial={((dir: number) => stackCardInitial(isTop, dir)) as any}
                  animate={{
                    x: isTop ? 0 : depth * stackDx,
                    y: isTop ? 0 : depth * stackDy,
                    rotate: isTop ? 0 : depth * stackRot,
                    scale: isTop ? 1 : 1 - depth * 0.078,
                    opacity: isTop ? 1 : isPrev ? 0 : Math.max(0.82, 0.99 - depth * 0.1),
                  }}
                  exit={((dir: number) => stackCardExit(dir)) as any}
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 35,
                    mass: 0.8,
                  }}
                  drag={isTop ? 'x' : false}
                  dragControls={isTop ? stackDragControls : undefined}
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragStart={() => {
                    if (!isTop) return;
                    suppressStackCardOpenRef.current = false;
                    stackDragActiveRef.current = true;
                    clearStackBoundsWatcher();
                    const onLeaveViewport = (e: PointerEvent) => {
                      if (!stackDragActiveRef.current) return;
                      const pad = 2;
                      const { clientX: cx, clientY: cy } = e;
                      if (
                        cx < -pad ||
                        cy < -pad ||
                        cx > window.innerWidth + pad ||
                        cy > window.innerHeight + pad
                      ) {
                        stackDragControls.stop();
                      }
                    };
                    window.addEventListener('pointermove', onLeaveViewport, { capture: true });
                    stackBoundsCleanupRef.current = () => {
                      window.removeEventListener('pointermove', onLeaveViewport, { capture: true });
                    };
                  }}
                  onDrag={
                    isTop
                      ? (_, info) => {
                          if (Math.abs(info.offset.x) > 12) suppressStackCardOpenRef.current = true;
                        }
                      : undefined
                  }
                  onDragEnd={(_, info) => {
                    if (!isTop) return;
                    const ox = Math.abs(info.offset.x);
                    const vx = Math.abs(info.velocity.x);
                    if (ox > 8 || vx > 380) suppressStackCardOpenRef.current = true;
                    stackDragActiveRef.current = false;
                    clearStackBoundsWatcher();
                    finalizeStackPan(info);
                  }}
                >
                  <div
                    className={
                      compactVertical
                        ? 'h-full w-full overflow-visible p-1 sm:p-1.5'
                        : 'h-full w-full overflow-visible p-[clamp(0.25rem,1.8vw,0.5rem)] sm:p-[clamp(0.35rem,2vw,1rem)]'
                    }
                  >
                    <ProjectCard
                      project={project}
                      onViewProject={openPinnedProjectIfTap}
                      onIntent={onIntent}
                      priority={isTop || isNext || isPrev}
                      quality={quality}
                      repoData={project.githubRepo ? githubData[project.githubRepo] : undefined}
                      interactionMode={interactionMode}
                      tabIndex={isTop ? 0 : -1}
                      compactOverlay={compactVertical}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
    </div>
  );

  const cardStage = (
    <div
      className={[
        'relative flex min-h-0 w-full flex-1 [perspective:680px] px-0 sm:px-1',
        compactVertical
          ? inlinePageTitle
            ? 'min-h-[9rem] items-stretch justify-center'
            : 'items-stretch justify-center'
          : 'items-center justify-center',
      ].join(' ')}
    >
      {cardStageInner}
    </div>
  );

  const mainColumn = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {compactVertical ? (
        <div
          className={
            inlinePageTitle
              ? 'flex min-h-[9rem] w-full flex-1 flex-row items-stretch gap-1.5 sm:gap-2 md:gap-3'
              : 'flex min-h-0 w-full flex-1 flex-row items-stretch gap-1.5 sm:gap-2 md:gap-3'
          }
        >
          {inlinePageTitle ? (
            <AlexProjectsInlineTitle className="min-w-0" isHidden={inlinePageTitleHidden} />
          ) : null}
          <PinnedVerticalRail />
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">{cardStage}</div>
        </div>
      ) : (
        cardStage
      )}

      {!compactVertical ? (
        <div className="flex shrink-0 justify-center gap-[clamp(0.35rem,2.5vw,0.75rem)] pt-[clamp(0.1rem,0.75dvh,0.35rem)] pb-0 z-20">
          {paginationBars('default')}
        </div>
      ) : null}

      {!compactVertical ? (
        <div className="relative flex shrink-0 w-full items-center justify-center overflow-visible px-2 pointer-events-auto pt-1 pb-[clamp(0.1rem,0.8dvh,0.3rem)]">
          <div className="absolute inset-0 flex items-center px-2" aria-hidden="true">
            <div className="w-full border-t border-base09/20" />
          </div>
          <div className="relative group overflow-visible">
            <div className="absolute inset-0 bg-base08 -skew-x-12 translate-x-1 translate-y-1" />
            <div className="relative flex items-center gap-[clamp(0.35rem,2.5vw,0.75rem)] border-2 border-base09 bg-base00 pl-[clamp(0.85rem,4.8vw,1.65rem)] pr-[clamp(1rem,5.2vw,1.85rem)] py-[clamp(0.25rem,1.2dvh,0.5rem)] -skew-x-12">
              <span className="animate-pulse font-nerd inline-flex shrink-0 items-center justify-center text-[clamp(0.65rem,3.2vw,0.875rem)] text-base09 leading-none min-w-[1.15em] [overflow:visible]">
                󰓎
              </span>
              <span className="ml-0.5 block skew-x-12 text-[clamp(0.5rem,2.6vw,0.625rem)] font-black uppercase tracking-[0.25em] text-base05 sm:tracking-[0.35em]">
                Pinned Projects
              </span>
              <span className="animate-pulse font-nerd inline-flex shrink-0 items-center justify-center text-[clamp(0.65rem,3.2vw,0.875rem)] text-base09 leading-none min-w-[1.15em] [overflow:visible]">
                󰓎
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  /**
   * Ultra-short: height uses the same **2.75rem** top reserve as main padding in the calc, then **+2rem** and
   * **-mt-[2rem]** so the border box grows and shifts up by 2rem — visual top lands ~`safe + 0.75rem` under fixed dots
   * (dots end ~`safe + 0.5rem`) while the document bottom stays aligned (extra height cancels the margin).
   */
  const compactVerticalHeightClass = inlinePageTitle
    ? 'flex-shrink-0 -mt-[2rem] min-h-[max(10.5rem,calc(100svh-var(--safe-top,0px)-2.75rem-var(--layout-fixed-footer-reserve)+2rem))] h-[min(100dvh,max(10.5rem,calc(100svh-var(--safe-top,0px)-2.75rem-var(--layout-fixed-footer-reserve)+2rem)))] max-h-[min(100dvh,max(10.5rem,calc(100svh-var(--safe-top,0px)-2.75rem-var(--layout-fixed-footer-reserve)+2rem)))] gap-0 pb-0'
    : 'h-[min(78dvh,calc(100svh-max(5.25rem,calc(4.35rem+env(safe-area-inset-top,0px)))-var(--layout-fixed-footer-reserve)))] max-h-[min(78dvh,calc(100svh-5.25rem-var(--layout-fixed-footer-reserve)))] gap-0 pb-0.5';

  return (
    <>
      {compactVertical ? (
        <div
          className={[
            'pointer-events-none fixed left-1/2 z-[205] flex -translate-x-1/2 justify-center gap-1 px-2 pt-0.5',
            inlinePageTitle
              ? 'top-[var(--safe-top)]'
              : 'top-[calc(var(--safe-top)+4.5rem)]',
          ].join(' ')}
          role="tablist"
          aria-label="Pinned project slides"
        >
          <div className="pointer-events-auto flex justify-center gap-1">{paginationBars('compactTop')}</div>
        </div>
      ) : null}
      <div
        ref={stackRef}
        data-featured-mobile-stack
        data-compact-vertical={compactVertical ? '' : undefined}
        className={[
          'mx-auto flex w-full max-w-[min(96vw,540px)] min-h-0 flex-col items-stretch select-none touch-pan-y overflow-visible',
          compactVertical ? compactVerticalHeightClass : 'h-[min(88dvh,calc(100svh-max(6.75rem,calc(5rem+env(safe-area-inset-top,0px)))-var(--layout-fixed-footer-reserve)))] max-h-[min(88dvh,calc(100svh-6rem-var(--layout-fixed-footer-reserve)))] gap-0 pb-1',
          /* 350–550px: fixed dots sit under the title — nudge rail/cards down so there is a clear gap under the dots */
          compactVertical && !inlinePageTitle ? 'pt-3 sm:pt-3.5' : '',
        ].join(' ')}
      >
        {mainColumn}
      </div>
    </>
  );
}
