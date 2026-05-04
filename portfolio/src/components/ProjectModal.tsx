'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Project } from '../app/projects/projectData';
import Image from 'next/image';
import { useTheme } from '../app/context/ThemeContext';
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from 'framer-motion';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { useSliderSwipeMachine } from '@/hooks/useSliderSwipeMachine';
import { useFullscreenCloseHint } from '@/hooks/useFullscreenCloseHint';

import { GitHubRepoData } from '../lib/github';
import { clipBoth, projectSlantForId } from '@/lib/projectSlantVariants';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onLike?: (project: Project) => void;
  onPass?: (project: Project) => void;
  onSwipe?: (direction: 'left' | 'right') => void;
  githubData?: Record<string, GitHubRepoData>;
}


const SWIPE_THRESHOLD = 40;
const MOUSE_SWIPE_THRESHOLD = 50;

// Custom arrow components for carousel
const CustomPrevArrow = ({
  onClick,
  currentSlide,
  hasKeyboard
}: { onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void; currentSlide?: number; hasKeyboard?: boolean }) => {
  if (currentSlide === 0) return null;

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center group/nav">
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        aria-label="Previous image"
        className="p-2 bg-base00 bg-opacity-80 hover:bg-opacity-100 rounded-full text-base05 transition-all duration-200 shadow-sm touch-manipulation"
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      {hasKeyboard && (
        <div className="p6-tooltip top-full left-0 mt-2 opacity-0 pointer-fine:group-hover/nav:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <span className="p6-tooltip-text">PREV [←]</span>
        </div>
      )}
    </div>
  );
};

const CustomNextArrow = ({
  onClick,
  currentSlide,
  slideCount,
  hasKeyboard
}: { onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void; currentSlide?: number; slideCount?: number; hasKeyboard?: boolean }) => {
  if (currentSlide !== undefined && slideCount !== undefined && currentSlide >= slideCount - 1) return null;

  // Add horizontal pulse animation when on first slide
  const isFirstSlide = currentSlide === 0;

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center group/nav">
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        aria-label="Next image"
        className={`p-2 bg-base00 bg-opacity-80 hover:bg-opacity-100 rounded-full text-base05 transition-all duration-200 shadow-sm touch-manipulation ${isFirstSlide ? 'animate-pulse' : ''}`}
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
          ...(isFirstSlide && {
            animation: 'horizontal-bounce 2s infinite'
          })
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
      {hasKeyboard && (
        <div className="p6-tooltip top-full right-0 mt-2 opacity-0 pointer-fine:group-hover/nav:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <span className="p6-tooltip-text">NEXT [→]</span>
        </div>
      )}
    </div>
  );
};

export default function ProjectModal({
  project,
  onClose,
  onLike,
  onPass,
  onSwipe,
  githubData
}: ProjectModalProps) {
  const HINT_PADDING = 12;

  const bp = useBreakpoints();
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasUserSwiped, setHasUserSwiped] = useState(false);
  const [loadedSlides, setLoadedSlides] = useState<Record<string, boolean>>({});
  const [dotWindowStart, setDotWindowStart] = useState(0);
  const { closeHintKeyHuman } = useFullscreenCloseHint();
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeHintTooltipRef = useRef<HTMLSpanElement>(null);
  const [isCloseHintVisible, setIsCloseHintVisible] = useState(false);
  const [closeHintPosition, setCloseHintPosition] = useState({ x: 0, y: 0 });
  const isModalDraggingRef = useRef(false);
  const cancelDragRef = useRef(false);
  const modalDragControls = useDragControls();
  const modalBoundsCleanupRef = useRef<null | (() => void)>(null);
  const { setDimmed } = useTheme();
  const imageCount = project?.images.length ?? 0;

  const goToNext = useCallback(() => {
    if (currentSlide >= imageCount - 1) return;
    const nextSlide = currentSlide + 1;
    setCurrentSlide(nextSlide);
    setHasUserSwiped(true);

    if (imageCount > 3) {
      setDotWindowStart(Math.max(0, Math.min(nextSlide - 1, imageCount - 3)));
    }
  }, [currentSlide, imageCount]);

  const goToPrev = useCallback(() => {
    if (currentSlide <= 0) return;
    const prevSlide = currentSlide - 1;
    setCurrentSlide(prevSlide);
    setHasUserSwiped(true);

    if (imageCount > 3) {
      setDotWindowStart(Math.max(0, Math.min(prevSlide - 1, imageCount - 3)));
    }
  }, [currentSlide, imageCount]);

  const {
    isDragging,
    swipeAreaRef,
    sliderRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
  } = useSliderSwipeMachine({
    currentSlide,
    imageCount,
    onNext: goToNext,
    onPrev: goToPrev,
    mouseThreshold: MOUSE_SWIPE_THRESHOLD,
    touchThreshold: SWIPE_THRESHOLD,
  });

  useEffect(() => {
    setCurrentSlide(0);
    setHasUserSwiped(false);
    setLoadedSlides({});
    setDotWindowStart(0);
  }, [project?.title]);

  useEffect(() => {
    if (!project) return;
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [project]);

  // Handle WebKit UI dimming
  useEffect(() => {
    if (project) {
      setDimmed(true);
      return () => setDimmed(false);
    }
  }, [project, setDimmed]);

  // Handle scroll detection for hint visibility
  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // If we are more than 20px from the bottom, show the hint
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;
      const needsScroll = scrollHeight > clientHeight;
      setCanScrollDown(needsScroll && !isAtBottom);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      // Small timeout to allow content to render/measure
      const timer = setTimeout(checkScroll, 100);
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);

      return () => {
        clearTimeout(timer);
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [checkScroll, project]);

  // --- Keyboard Support ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape' || e.key === '`' || e.code === 'Backquote') {
        onClose();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.stopPropagation();
        goToPrev();
      }
      if (e.key === 'ArrowRight') {
        e.stopPropagation();
        goToNext();
      }

      // Scroll content with Up/Down
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollContainerRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollContainerRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
      }

      // Like / Pass shortcuts (L = like = left swipe, P = pass = right swipe)
      if (e.key.toLowerCase() === 'l') {
        if (onSwipe) {
          onSwipe('left');
        } else if (onLike && project) {
          onLike(project);
          onClose();
        }
      }
      if (e.key.toLowerCase() === 'p') {
        if (onSwipe) {
          onSwipe('right');
        } else if (onPass && project) {
          onPass(project);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus the modal when it opens to capture events immediately
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onLike, onPass, project, onSwipe, goToPrev, goToNext]);

  // Framer Motion values for drag
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);
  const opacity = useTransform(x, [-300, -200, 0, 200, 300], [0, 1, 1, 1, 0]);

  // Indicators opacity and colors
  const { effectiveTheme } = useTheme();
  const dimmedColor = effectiveTheme === 'dark' ? '#282828' : '#585853';
  const green = '#a1b56c';
  const red = '#ab4642';

  const indicatorOpacity = useTransform(x, [-60, -20, 0, 20, 60], [1, 0, 0, 0, 1]);
  const likeColor = useTransform(x, [0, 40], [dimmedColor, green]);
  const passColor = useTransform(x, [-40, 0], [red, dimmedColor]);
  const likeBorderColor = useTransform(x, [0, 40], [dimmedColor, green]);
  const passBorderColor = useTransform(x, [-40, 0], [red, dimmedColor]);

  const modalLatestPanRef = useRef({ offset: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } });

  const clearModalBoundsWatcher = useCallback(() => {
    modalBoundsCleanupRef.current?.();
    modalBoundsCleanupRef.current = null;
  }, []);

  const handleDragEnd = useCallback((_event: any, info: any) => {
    clearModalBoundsWatcher();
    if (cancelDragRef.current) {
      cancelDragRef.current = false;
      isModalDraggingRef.current = false;
      x.set(0);
      y.set(0);
      return;
    }
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);

    // Swipe down to dismiss
    const isAtTop = scrollContainerRef.current ? scrollContainerRef.current.scrollTop <= 5 : true;
    if (offset.y > 100 && velocity.y > 0 && isAtTop && absY > absX) {
      isModalDraggingRef.current = false;
      onClose();
      return;
    }

    // Swipe horizontal
    if (absX > 100 || (absX > 50 && Math.abs(velocity.x) > 500)) {
      const direction = offset.x > 0 ? 'right' : 'left';
      if (onSwipe) {
        onSwipe(direction);
      } else {
        if (direction === 'right' && onLike && project) {
          onLike(project);
        } else if (direction === 'left' && onPass && project) {
          onPass(project);
        }
      }
      isModalDraggingRef.current = false;
      onClose();
      return;
    }
    isModalDraggingRef.current = false;
    x.set(0);
    y.set(0);
  }, [project, onLike, onPass, onClose, onSwipe, x, y, clearModalBoundsWatcher]);

  const updateCloseHintPosition = useCallback(() => {
    const button = closeButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const anchorX = rect.left + rect.width / 2;
    const tooltipRect = closeHintTooltipRef.current?.getBoundingClientRect();
    const hintHalfWidth = Math.max(56, (tooltipRect?.width ?? 168) / 2);
    const hintHeight = Math.max(20, tooltipRect?.height ?? 28);
    const minX = HINT_PADDING + hintHalfWidth;
    const maxX = window.innerWidth - HINT_PADDING - hintHalfWidth;
    const minY = HINT_PADDING + hintHeight;
    const maxY = window.innerHeight - HINT_PADDING;
    setCloseHintPosition({
      x: maxX < minX ? window.innerWidth / 2 : Math.min(maxX, Math.max(minX, anchorX)),
      y: maxY < minY ? Math.max(HINT_PADDING, rect.top - 10) : Math.min(maxY, Math.max(minY, rect.top - 10)),
    });
  }, [HINT_PADDING]);

  const showCloseHint = useCallback(() => {
    setIsCloseHintVisible(true);
    requestAnimationFrame(() => {
      updateCloseHintPosition();
    });
  }, [updateCloseHintPosition]);

  useEffect(() => {
    if (!isCloseHintVisible || !bp.hasKeyboard) return;
    updateCloseHintPosition();
    const rafId = requestAnimationFrame(updateCloseHintPosition);
    window.addEventListener('resize', updateCloseHintPosition);
    window.addEventListener('scroll', updateCloseHintPosition, true);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateCloseHintPosition);
      window.removeEventListener('scroll', updateCloseHintPosition, true);
    };
  }, [isCloseHintVisible, bp.hasKeyboard, updateCloseHintPosition]);

  useEffect(() => {
    const endModalDrag = () => {
      modalDragControls.stop();
    };

    window.addEventListener('pointerup', endModalDrag);
    window.addEventListener('mouseup', endModalDrag, true);
    window.addEventListener('pointercancel', endModalDrag);
    window.addEventListener('lostpointercapture', endModalDrag);
    const onDocOut = (event: MouseEvent) => {
      if (event.relatedTarget !== null) return;
      endModalDrag();
    };
    const onDocLeave = () => endModalDrag();
    document.documentElement.addEventListener('mouseout', onDocOut);
    document.documentElement.addEventListener('mouseleave', onDocLeave);
    const onVis = () => {
      if (document.visibilityState === 'hidden') endModalDrag();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', endModalDrag);

    return () => {
      window.removeEventListener('pointerup', endModalDrag);
      window.removeEventListener('mouseup', endModalDrag, true);
      window.removeEventListener('pointercancel', endModalDrag);
      window.removeEventListener('lostpointercapture', endModalDrag);
      document.documentElement.removeEventListener('mouseout', onDocOut);
      document.documentElement.removeEventListener('mouseleave', onDocLeave);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', endModalDrag);
    };
  }, [modalDragControls]);








  if (!project) return null;

  const slant = projectSlantForId(project.id);
  const eraSeed = project.title.length % 3;
  const eraColor =
    eraSeed === 0 ? 'var(--base0D)' : eraSeed === 1 ? 'var(--base0A)' : 'var(--base08)';

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      {/* Backdrop */}
      <div
        className="absolute top-0 left-0 right-0 bottom-7 sm:bottom-9 z-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        ref={modalRef}
        drag
        dragControls={modalDragControls}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.8}
        onDrag={(_, info) => {
          modalLatestPanRef.current = { offset: info.offset, velocity: info.velocity };
        }}
        onDragStart={() => {
          isModalDraggingRef.current = true;
          cancelDragRef.current = false;
          modalLatestPanRef.current = { offset: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
          clearModalBoundsWatcher();
          const onLeaveViewport = (e: PointerEvent) => {
            if (!isModalDraggingRef.current) return;
            if (e.pointerType === 'mouse' && e.buttons === 0) {
              modalDragControls.stop();
              return;
            }
            const w = window.innerWidth;
            const h = window.innerHeight;
            const { clientX: cx, clientY: cy } = e;
            if (cx < 0 || cy < 0 || cx >= w || cy >= h) {
              modalDragControls.stop();
            }
          };
          window.addEventListener('pointermove', onLeaveViewport, { capture: true });
          modalBoundsCleanupRef.current = () => {
            window.removeEventListener('pointermove', onLeaveViewport, { capture: true });
          };
        }}
        onDragEnd={handleDragEnd}
        style={{ x, y, rotate, scale }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 300
        }}
        className="relative z-10 isolate w-full max-w-md h-[80vh] select-none overflow-visible flex flex-col"
      >
        <div
          className="absolute inset-0 translate-x-2.5 translate-y-2.5 opacity-55 pointer-events-none z-0"
          style={clipBoth(slant.shadowFar)}
          aria-hidden
        >
          <div className="absolute inset-0" style={{ backgroundColor: eraColor }} />
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background:
                'linear-gradient(118deg, rgba(255,252,248,0.38) 0%, transparent 32%, transparent 58%, rgba(0,0,0,0.14) 100%)',
              mixBlendMode: 'overlay',
            }}
          />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 45%)',
              mixBlendMode: 'soft-light',
            }}
          />
        </div>
        <div
          className="absolute inset-0 translate-x-1 translate-y-1 pointer-events-none z-0"
          style={clipBoth(slant.shadowNear)}
          aria-hidden
        >
          <div className="absolute inset-0 bg-base00" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                'linear-gradient(95deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
              mixBlendMode: 'screen',
            }}
          />
        </div>
        <div
          className="relative z-[1] flex flex-col h-full overflow-hidden bg-base01 isolate"
          style={clipBoth(slant.main)}
        >
          <div
            className="relative z-[26] h-2.5 shrink-0 overflow-hidden sm:h-3 pointer-events-none"
            aria-hidden
          >
            <div
              className="absolute inset-0"
              style={{
                ...clipBoth(slant.highlightRail),
                background: `linear-gradient(100deg, transparent 0%, color-mix(in srgb, ${eraColor} 55%, transparent) 18%, ${eraColor} 38%, rgba(255,250,245,0.5) 52%, color-mix(in srgb, ${eraColor} 70%, #1e3a5f) 78%, transparent 100%)`,
                boxShadow:
                  'inset 0 -2px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35)',
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.42] mix-blend-overlay halftone-bg"
              style={clipBoth(slant.highlightRail)}
            />
            <div
              className="absolute inset-0"
              style={{
                ...clipBoth(slant.highlightRail),
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 47%, transparent 54%)',
                mixBlendMode: 'soft-light',
                opacity: 0.35,
              }}
            />
          </div>
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 z-[3] h-16 bg-gradient-to-b from-white/10 to-transparent mix-blend-soft-light"
            aria-hidden
          />

        {/* Close button - matches Contact / Resume modal style */}
        <div className="absolute top-2 right-3 sm:top-3 sm:right-4 z-30 flex flex-col items-center group/close">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            onMouseEnter={() => {
              if (!bp.hasFinePointer) return;
              showCloseHint();
            }}
            onMouseLeave={() => {
              if (!bp.hasFinePointer) return;
              setIsCloseHintVisible(false);
            }}
            onFocus={() => {
              if (!bp.hasKeyboard) return;
              showCloseHint();
            }}
            onBlur={() => setIsCloseHintVisible(false)}
            className="p-2 bg-base00 bg-opacity-80 hover:bg-opacity-100 rounded-full text-base05 transition-all duration-200 shadow-sm touch-manipulation"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
            }}
            aria-label="Dismiss modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {bp.hasKeyboard && isCloseHintVisible && (
          <div
            className="fixed pointer-events-none z-[560]"
            style={{
              left: closeHintPosition.x,
              top: closeHintPosition.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <span ref={closeHintTooltipRef} className="p6-tooltip">
              <span className="p6-tooltip-text">DISMISS [{closeHintKeyHuman}]</span>
            </span>
          </div>
        )}

        {/* Scrollable content container */}
        <div
          ref={scrollContainerRef}
          className={`flex-1 modal-scrollable-content relative ${isDragging ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
          style={{ overscrollBehaviorX: 'contain' }}
        >

          {/* Image carousel */}
          <div
            className="relative h-80 bg-base02 flex-shrink-0"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Vignette overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 rounded-lg" style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.15) 100%)'
            }} />

            {/* Carousel swipe hint for multiple images - now overlays the carousel */}
            {project?.images && project.images.length > 1 && (
              <div
                className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-base00 bg-opacity-90 backdrop-blur-sm rounded-full text-base05 font-medium border border-base02 transition-opacity duration-500 ease-out pointer-events-none whitespace-nowrap"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
                  opacity: hasUserSwiped ? 0 : 1,
                  fontSize: 'clamp(10px, 2.5vw, 12px)' // Responsive text size that shrinks on smaller screens
                }}
              >
                Swipe for more images ({project.images.length})
              </div>
            )}

            {imageCount > 1 && (
              <>
                <CustomPrevArrow onClick={goToPrev} currentSlide={currentSlide} hasKeyboard={bp.hasKeyboard} />
                <CustomNextArrow onClick={goToNext} currentSlide={currentSlide} slideCount={imageCount} hasKeyboard={bp.hasKeyboard} />
              </>
            )}

            <div
              ref={swipeAreaRef}
              className="relative h-full overflow-hidden select-none"
              style={{
                cursor: imageCount > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                touchAction: 'pan-y pinch-zoom',
                overscrollBehaviorX: 'contain',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onDragStart={(e) => e.preventDefault()}
            >
              <div
                ref={sliderRef}
                className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: `translate3d(-${currentSlide * 100}%, 0, 0)`, willChange: 'transform' }}
              >
                {project.images.map((image, index) => {
                  const imageKey = `${image}-${index}`;
                  const isLoaded = !!loadedSlides[imageKey];
                  return (
                    <div key={imageKey} className="relative h-full w-full shrink-0 overflow-hidden bg-base02">
                      <div
                        className={`absolute inset-0 animate-shimmer transition-opacity duration-700 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
                        style={{
                          backgroundSize: '200% 100%',
                          backgroundImage: 'linear-gradient(to right, rgba(56,56,56,1), rgba(40,40,40,1), rgba(56,56,56,1))'
                        }}
                      />
                      <Image
                        src={image}
                        alt={`${project.title} - Image ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 85vw, 420px"
                        priority={index === 0}
                        quality={80}
                        className={`object-contain bg-base02 transition-all duration-700 ${isLoaded ? 'blur-0 opacity-100' : 'blur-xl opacity-0 scale-105'}`}
                        draggable={false}
                        onLoad={() => {
                          setLoadedSlides((prev) => ({ ...prev, [imageKey]: true }));
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {imageCount > 1 && (
              <div
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center rounded-full"
                style={{
                  gap: '8px',
                  padding: '5px 8px',
                  background: 'rgba(24, 24, 24, 0.8)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
              >
                {imageCount === 2 ? (
                  [0, 1].map((i) => (
                    <button
                      key={`dot-${i}`}
                      type="button"
                      onClick={() => { if (i > currentSlide) goToNext(); if (i < currentSlide) goToPrev(); }}
                      className="h-2 rounded-[4px] border-none p-0 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                      style={{
                        width: currentSlide === i ? '24px' : '8px',
                        background: currentSlide === i ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        boxShadow: currentSlide === i ? '0 0 8px rgba(255, 255, 255, 0.5)' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))
                ) : (
                  <div className="relative overflow-hidden" style={{ width: '72px', height: '18px', margin: '-5px -8px' }}>
                    <div
                      className="absolute inset-y-0 flex items-center transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                      style={{
                        gap: '8px',
                        transform: `translateX(${8 - dotWindowStart * 16}px)`
                      }}
                    >
                      {project.images.map((_, i) => (
                        <div
                          key={`dot-${i}`}
                          className="h-2 shrink-0 rounded-[4px] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                          style={{
                            width: currentSlide === i ? '24px' : '8px',
                            background: currentSlide === i ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                            boxShadow: currentSlide === i ? '0 0 8px rgba(255, 255, 255, 0.5)' : 'none',
                          }}
                        />
                      ))}
                    </div>
                    <button type="button" className="absolute inset-y-0 left-0 bg-transparent border-none p-0 z-10" style={{ width: '33%', cursor: currentSlide === 0 ? 'default' : 'pointer' }} disabled={currentSlide === 0} onClick={goToPrev} aria-label="Previous image" />
                    <button type="button" className="absolute inset-y-0 bg-transparent border-none p-0 z-10" style={{ left: '33%', width: '34%', cursor: (currentSlide === 0 || currentSlide === imageCount - 1) ? 'pointer' : 'default' }} disabled={currentSlide > 0 && currentSlide < imageCount - 1} onClick={() => { if (currentSlide === 0) goToNext(); else if (currentSlide === imageCount - 1) goToPrev(); }} aria-label="Navigate" />
                    <button type="button" className="absolute inset-y-0 right-0 bg-transparent border-none p-0 z-10" style={{ width: '33%', cursor: currentSlide >= imageCount - 1 ? 'default' : 'pointer' }} disabled={currentSlide >= imageCount - 1} onClick={goToNext} aria-label="Next image" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-2xl font-bold text-base05">
                {project.title}
              </h2>
              <span className="text-base0D text-lg font-semibold opacity-80">
                {project.startYear && project.endYear
                  ? project.startYear === project.endYear
                    ? project.startYear.toString()
                    : `${project.startYear} - ${project.endYear}`
                  : project.startYear
                    ? `${project.startYear} - Present`
                    : project.endYear?.toString()
                }
              </span>
            </div>

            {/* GitHub star and fork count display */}
            {project.githubRepo && githubData?.[project.githubRepo] && (
              <div className="flex items-center gap-4 text-base0D text-sm font-semibold opacity-80 font-mono">
                {/* Stars - only show if count > 0 */}
                {githubData[project.githubRepo].stargazers_count > 0 && (
                  <div className="flex items-center">
                    <span className="mr-1 font-nerd">󰓎</span>
                    {githubData[project.githubRepo].stargazers_count}
                  </div>
                )}

                {/* Forks - only show if count > 0 */}
                {githubData[project.githubRepo].forks_count > 0 && (
                  <div className="flex items-center">
                    <span className="mr-1 font-nerd">󰓁</span>
                    {githubData[project.githubRepo].forks_count}
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <p lang="en" className="project-modal-description text-base04 text-sm">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                {project.githubRepo && (
                  <a
                    href={project.githubRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 sm:flex-none min-w-[140px] items-center justify-center gap-2 px-3 py-2 bg-base02 hover:bg-base03 text-base05 text-sm rounded-lg transition-colors relative group/github"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="font-nerd text-lg"></span>
                    <span className="font-semibold">View Source</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 opacity-60 pointer-fine:group-hover/github:opacity-100 transition-opacity">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    <div className="p6-tooltip top-full left-0 mt-2 opacity-0 pointer-fine:group-hover/github:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      <span className="p6-tooltip-text">SOURCE CODE</span>
                    </div>
                  </a>
                )}
                {project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 sm:flex-none min-w-[140px] items-center justify-center px-3 py-2 bg-base0E hover:bg-base0F text-base00 text-sm rounded-lg transition-colors relative group/live"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {project.githubRepo ? 'Visit Live Site →' : 'Visit Project →'}
                    <div className="p6-tooltip top-full right-0 mt-2 opacity-0 pointer-fine:group-hover/live:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      <span className="p6-tooltip-text">VISIT WEBSITE</span>
                    </div>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons - Fixed at bottom */}
        <div
          className="flex-shrink-0 p-6 pt-0 relative z-40"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex space-x-4">
            <div className="flex-1 flex flex-col items-center gap-1">
              <button
                onClick={() => {
                  if (onSwipe) {
                    onSwipe('left');
                  } else if (onPass) {
                    onPass(project);
                    onClose();
                  }
                }}
                className="w-full py-2 bg-base08 hover:bg-base09 text-base00 rounded-lg font-semibold transition-colors flex items-center justify-center shadow-md active:scale-95"
              >
                <span>Pass</span>
              </button>
              {bp.hasKeyboard && (
                <span className="text-[10px] text-base04 font-mono opacity-50 hidden sm:block">(p)</span>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center gap-1">
              <button
                onClick={() => {
                  if (onSwipe) {
                    onSwipe('right');
                  } else if (onLike) {
                    onLike(project);
                    onClose();
                  }
                }}
                className="w-full py-2 bg-base0B hover:bg-base0A text-base00 rounded-lg font-semibold transition-colors flex items-center justify-center shadow-md active:scale-95"
              >
                <span>Like</span>
              </button>
              {bp.hasKeyboard && (
                <span className="text-[10px] text-base04 font-mono opacity-50 hidden sm:block">(l)</span>
              )}
            </div>
          </div>
        </div>

        {/* Swipe indicators - show only after significant horizontal movement */}
        <motion.div
          className="absolute top-20 left-6 sm:top-24 sm:left-8 border-4 px-4 py-1 text-3xl font-bold z-50 pointer-events-none transform -rotate-12 bg-base00/40 backdrop-blur-sm"
          style={{ opacity: indicatorOpacity, color: likeColor, borderColor: likeBorderColor }}
        >
          LIKE
        </motion.div>
        <motion.div
          className="absolute top-20 right-6 sm:top-24 sm:right-8 border-4 px-4 py-1 text-3xl font-bold z-50 pointer-events-none transform rotate-12 bg-base00/40 backdrop-blur-sm"
          style={{ opacity: indicatorOpacity, color: passColor, borderColor: passBorderColor }}
        >
          PASS
        </motion.div>

        {/* Edge Glow Overlays */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-base0B via-transparent to-transparent pointer-events-none z-40"
          style={{ opacity: useTransform(x, [0, 200], [0, 0.5]) }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-l from-base08 via-transparent to-transparent pointer-events-none z-40"
          style={{ opacity: useTransform(x, [0, -200], [0, 0.5]) }}
        />

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-base01 to-transparent pointer-events-none z-20"></div>

        {/* Scroll indicator - Fixed at modal bottom, behind pass/like buttons */}
        {canScrollDown && (
          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-30">
            <div className="flex flex-col items-center justify-center h-full pb-16 gap-2">
              <div
                className="animate-bounce relative"
                style={{
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))'
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                  className="w-6 h-6 text-base05"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
              {bp.hasKeyboard && (
                <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold hidden sm:block">Scroll: ↑ / ↓</span>
              )}
            </div>
          </div>
        )}
      </div>
      </motion.div>
    </motion.div>
  );
}