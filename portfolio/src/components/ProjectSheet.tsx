'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Project } from '../app/projects/projectData';
import Image from 'next/image';
import { motion, AnimatePresence, useDragControls, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { GitHubRepoData } from '../lib/github';

import { useBreakpoints } from '@/hooks/useBreakpoints';
import { useImageColors, prefetchImageColors } from '@/hooks/useImageColors';
import { useSliderSwipeMachine } from '@/hooks/useSliderSwipeMachine';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useFullscreenCloseHint } from '@/hooks/useFullscreenCloseHint';
import SwirlingBackdrop from './SwirlingBackdrop';
import { clipBoth, projectSlantForId } from '@/lib/projectSlantVariants';

interface ProjectSheetProps {
    project: Project | null;
    onClose: () => void;
    githubData?: Record<string, GitHubRepoData>;
}

const TOUCH_SWIPE_THRESHOLD = 40;
const MOUSE_SWIPE_THRESHOLD = 50;
const SHEET_IMAGE_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 92vw, (max-width: 1536px) 80vw, 960px';

// Reuse custom arrows or style them differently for the bigger view
const SheetPrevArrow = ({ onClick, currentSlide, hasKeyboard }: { onClick?: () => void; currentSlide?: number; hasKeyboard?: boolean }) => {
    if (currentSlide === 0) return null;
    return (
        <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
                event.stopPropagation();
                onClick?.();
            }}
            className="absolute left-[calc(1.5rem+var(--safe-left))] top-1/2 -translate-y-1/2 z-[60] p-3 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white shadow-lg transition-all border border-white/10 group"
            aria-label="Previous slide"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {hasKeyboard && (
                <div className="p6-tooltip top-full left-0 mt-2 opacity-0 pointer-fine:group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[90]">
                    <span className="p6-tooltip-text">PREV [←]</span>
                </div>
            )}
        </button>
    );
};

const SheetNextArrow = ({ onClick, currentSlide, slideCount, hasKeyboard }: { onClick?: () => void; currentSlide?: number; slideCount?: number; hasKeyboard?: boolean }) => {
    if (currentSlide !== undefined && slideCount !== undefined && currentSlide >= slideCount - 1) return null;
    return (
        <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
                event.stopPropagation();
                onClick?.();
            }}
            className="absolute right-[calc(1.5rem+var(--safe-right))] top-1/2 -translate-y-1/2 z-[60] p-3 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white shadow-lg transition-all border border-white/10 group"
            aria-label="Next slide"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            {hasKeyboard && (
                <div className="p6-tooltip top-full right-0 mt-2 opacity-0 pointer-fine:group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[90]">
                    <span className="p6-tooltip-text">NEXT [→]</span>
                </div>
            )}
        </button>
    );
};

export default function ProjectSheet({ project, onClose, githubData }: ProjectSheetProps) {
    const HINT_PADDING = 12;
    const bp = useBreakpoints();
    const { isLowEnd } = useNetworkStatus();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loadedSlides, setLoadedSlides] = useState<Record<string, boolean>>({});
    const [dotWindowStart, setDotWindowStart] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const imageQuality = isLowEnd ? 60 : 75;
    const firstImageReportedRef = useRef<string | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const closeHintTooltipRef = useRef<HTMLSpanElement | null>(null);
    const [isCloseHintVisible, setIsCloseHintVisible] = useState(false);
    const [closeHintPosition, setCloseHintPosition] = useState({ x: 0, y: 0 });
    const { closeHintKey } = useFullscreenCloseHint();

    // Framer Motion Drag Controls
    const dragY = useMotionValue(0);
    const dragControls = useDragControls();
    const isHeaderDraggingRef = useRef(false);
    const cancelDragRef = useRef(false);
    const sheetLatestPanRef = useRef({ offset: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } });
    const sheetBoundsCleanupRef = useRef<null | (() => void)>(null);
    const backdropOpacity = useTransform(dragY, (value) => {
        if (!Number.isFinite(value)) return 0.5;
        const normalized = 0.5 - (Math.max(0, value) / 300) * 0.5;
        return Math.max(0, Math.min(0.5, normalized));
    });

    // Derived state for image colors - MUST be at top level
    // This ensures useImageColors is always called
    const currentImage = project?.images && project.images.length > 0
        ? project.images[currentSlide]
        : undefined;

    const extractedColors = useImageColors(currentImage);

    // Force re-compile check: v2
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (project) {
            document.body.classList.add('sheet-open');
            document.documentElement.classList.add('sheet-open');
            if (typeof performance !== 'undefined') {
                performance.mark('project-sheet-mounted');
            }
        } else {
            document.body.classList.remove('sheet-open');
            document.documentElement.classList.remove('sheet-open');
        }
        return () => {
            document.body.classList.remove('sheet-open');
            document.documentElement.classList.remove('sheet-open');
        };
    }, [project]);

    // Reset scroll + drag offset when opening / switching project
    useEffect(() => {
        if (project && scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [project]);

    useEffect(() => {
        if (project) dragY.set(0);
    }, [project?.id, dragY]);

    useEffect(() => {
        setCurrentSlide(0);
        setDotWindowStart(0);
        firstImageReportedRef.current = null;
    }, [project?.title, project?.images]);

    useEffect(() => {
        if (!project?.images?.length || isLowEnd) return;

        const current = project.images[currentSlide];
        const prev = project.images[currentSlide - 1];
        const next = project.images[currentSlide + 1];
        const nextTwo = project.images[currentSlide + 2];
        const targets = [prev, current, next, nextTwo].filter(Boolean) as string[];
        if (!targets.length) return;

        const runPrefetch = () => prefetchImageColors(targets);
        const idle = window.requestIdleCallback;

        if (idle) {
            const idleId = idle(runPrefetch, { timeout: 300 });
            return () => window.cancelIdleCallback?.(idleId);
        }

        const timeoutId = window.setTimeout(runPrefetch, 120);
        return () => window.clearTimeout(timeoutId);
    }, [project?.images, currentSlide, isLowEnd]);

    const imageCount = project?.images.length ?? 0;

    const goToNext = () => {
        if (currentSlide >= imageCount - 1) return;
        const nextSlide = currentSlide + 1;
        setCurrentSlide(nextSlide);

        if (imageCount > 3) {
            setDotWindowStart(Math.max(0, Math.min(nextSlide - 1, imageCount - 3)));
        }
    };

    const goToPrev = () => {
        if (currentSlide <= 0) return;
        const prevSlide = currentSlide - 1;
        setCurrentSlide(prevSlide);

        if (imageCount > 3) {
            setDotWindowStart(Math.max(0, Math.min(prevSlide - 1, imageCount - 3)));
        }
    };

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
        handleTouchCancel,
    } = useSliderSwipeMachine({
        currentSlide,
        imageCount,
        onNext: goToNext,
        onPrev: goToPrev,
        mouseThreshold: MOUSE_SWIPE_THRESHOLD,
        touchThreshold: TOUCH_SWIPE_THRESHOLD,
    });

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isTypingTarget =
                !!target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable);

            if (e.key === 'Escape' || e.key === '`' || e.code === 'Backquote') {
                onClose();
            } else if ((e.key === ' ' || e.key === 'Spacebar') && !isTypingTarget) {
                e.preventDefault();
                const container = scrollRef.current;
                const viewportStep = Math.max(220, Math.floor((container?.clientHeight ?? window.innerHeight) * 0.85));
                container?.scrollBy({
                    top: e.shiftKey ? -viewportStep : viewportStep,
                    behavior: 'smooth',
                });
            } else if (e.key === 'ArrowLeft') {
                goToPrev();
            } else if (e.key === 'ArrowRight') {
                goToNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, currentSlide, imageCount]);


    const clearSheetBoundsWatcher = useCallback(() => {
        sheetBoundsCleanupRef.current?.();
        sheetBoundsCleanupRef.current = null;
    }, []);

    const handleDragEnd = useCallback(
        (_: unknown, info: PanInfo) => {
            clearSheetBoundsWatcher();
            isHeaderDraggingRef.current = false;
            if (cancelDragRef.current) {
                cancelDragRef.current = false;
                dragY.set(0);
                return;
            }
            if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
                return;
            }
            dragY.set(0);
        },
        [dragY, onClose, clearSheetBoundsWatcher],
    );

    const beginHeaderDrag = (event: React.PointerEvent) => {
        isHeaderDraggingRef.current = true;
        cancelDragRef.current = false;
        sheetLatestPanRef.current = { offset: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
        clearSheetBoundsWatcher();
        const onLeaveViewport = (e: PointerEvent) => {
            if (!isHeaderDraggingRef.current) return;
            if (e.pointerType === 'mouse' && e.buttons === 0) {
                dragControls.stop();
                return;
            }
            const w = window.innerWidth;
            const h = window.innerHeight;
            const { clientX: cx, clientY: cy } = e;
            if (cx < 0 || cy < 0 || cx >= w || cy >= h) {
                dragControls.stop();
            }
        };
        window.addEventListener('pointermove', onLeaveViewport, { capture: true });
        sheetBoundsCleanupRef.current = () => {
            window.removeEventListener('pointermove', onLeaveViewport, { capture: true });
        };
        dragControls.start(event);
    };

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
        const endSheetDrag = () => {
            dragControls.stop();
        };

        window.addEventListener('pointerup', endSheetDrag);
        window.addEventListener('mouseup', endSheetDrag, true);
        window.addEventListener('pointercancel', endSheetDrag);
        window.addEventListener('lostpointercapture', endSheetDrag);
        const onDocOut = (event: MouseEvent) => {
            if (event.relatedTarget !== null) return;
            endSheetDrag();
        };
        const onDocLeave = () => endSheetDrag();
        document.documentElement.addEventListener('mouseout', onDocOut);
        document.documentElement.addEventListener('mouseleave', onDocLeave);
        const onVis = () => {
            if (document.visibilityState === 'hidden') endSheetDrag();
        };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('blur', endSheetDrag);

        return () => {
            window.removeEventListener('pointerup', endSheetDrag);
            window.removeEventListener('mouseup', endSheetDrag, true);
            window.removeEventListener('pointercancel', endSheetDrag);
            window.removeEventListener('lostpointercapture', endSheetDrag);
            document.documentElement.removeEventListener('mouseout', onDocOut);
            document.documentElement.removeEventListener('mouseleave', onDocLeave);
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('blur', endSheetDrag);
        };
    }, [dragControls]);

    if (!mounted) return null;

    // Renamed to avoid stale cache
    const renderSheetContent = (proj: Project) => {
        const repoData = proj.githubRepo ? githubData?.[proj.githubRepo] : null;

        // Determine Era Motif based on project title (deterministic)
        const eraSeed = proj.title.length % 3; // 0 = P3, 1 = P4, 2 = P5
        const eraColor = eraSeed === 0 ? 'var(--base0D)' : eraSeed === 1 ? 'var(--base0A)' : 'var(--base08)';
        const slant = projectSlantForId(proj.id);

        return (
            <motion.div
                key={proj.id}
                className="fixed inset-0 z-[250] flex items-end justify-center pointer-events-none"
                style={{ paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.22, ease: [0.2, 1, 0.38, 1] } }}
                exit={{ opacity: 0, transition: { duration: 0.3, ease: [0.36, 0, 0.2, 1] } }}
            >
                {/* Backdrop — crisp fade + slight “menu slam” zoom */}
                <div
                    className="absolute inset-0 z-0 pointer-events-auto overflow-hidden"
                    onClick={onClose}
                >
                    <motion.div
                        className="absolute inset-0 z-0 bg-black/60 backdrop-blur-md"
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1, transition: { duration: 0.34, ease: [0.18, 1, 0.34, 1], delay: 0.03 } }}
                    />
                    <div className="absolute inset-0 z-0 halftone-bg opacity-30 pointer-events-none" />
                </div>

                {/* Sheet — P5 enter: skew + slam up; exit: skew + drop with weight */}
                <motion.div
                    initial={{
                        y: '118%',
                        skewX: eraSeed === 0 ? 11 : eraSeed === 2 ? -11 : 5,
                        scale: 0.86,
                        opacity: 0.94,
                        rotate: eraSeed === 0 ? -3 : eraSeed === 2 ? 3 : 0,
                    }}
                    animate={{
                        y: 0,
                        skewX: 0,
                        scale: 1,
                        opacity: 1,
                        rotate: 0,
                        transition: {
                            type: 'spring',
                            stiffness: 500,
                            damping: 36,
                            mass: 0.66,
                            delay: 0.05,
                        },
                    }}
                    exit={{
                        y: '126%',
                        skewX: eraSeed === 0 ? -14 : eraSeed === 2 ? 14 : -9,
                        scale: 0.87,
                        opacity: 0.96,
                        rotate: eraSeed === 0 ? 4 : eraSeed === 2 ? -4 : 2,
                        transition: {
                            type: 'spring',
                            stiffness: 440,
                            damping: 42,
                            mass: 0.84,
                        },
                    }}
                    drag="y"
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 1 }}
                    style={{ y: dragY }}
                    onDrag={(_, info) => {
                        sheetLatestPanRef.current = { offset: info.offset, velocity: info.velocity };
                    }}
                    onDragEnd={handleDragEnd}
                    className="relative w-full sm:max-w-6xl h-[96dvh] sm:h-[94dvh] overflow-visible flex flex-col pointer-events-auto isolate drop-shadow-[10px_12px_0px_rgba(0,0,0,0.22)]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Opening slash — full bleed from top now that briefing strip is gone */}
                    <motion.div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 z-[160] h-[min(40%,260px)]"
                        initial={{ x: '-100%', skewX: -24, opacity: 0.88 }}
                        animate={{ x: '130%', skewX: -15, opacity: 0 }}
                        transition={{ duration: 0.48, ease: [0.19, 0.92, 0.24, 1], delay: 0.04 }}
                        style={{
                            background:
                                'linear-gradient(104deg, transparent 0%, rgba(185,32,48,0.62) 35%, rgba(248,246,242,0.5) 50%, rgba(40,112,168,0.4) 65%, transparent 80%)',
                            mixBlendMode: 'screen',
                        }}
                    />
                    <div
                        className="absolute inset-0 opacity-55 pointer-events-none z-0"
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
                        className="absolute inset-0 translate-x-1.5 translate-y-1.5 pointer-events-none z-0"
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
                        className="relative z-[1] flex flex-col h-full overflow-hidden bg-base01"
                        style={clipBoth(slant.main)}
                    >
                        {/* Top highlight rail — era color + menu gleam + halftone (no labels) */}
                        <div className="relative z-[26] h-2.5 shrink-0 overflow-hidden sm:h-3 pointer-events-none" aria-hidden>
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
                        {/* Subtle top read on panel */}
                        <div
                            className="pointer-events-none absolute left-0 right-0 top-0 z-[3] h-16 bg-gradient-to-b from-white/10 to-transparent mix-blend-soft-light"
                            aria-hidden
                        />

                        {/* Draggable Header (Overlay) */}
                    <div
                        onPointerDown={beginHeaderDrag}
                        className="absolute top-0 left-0 right-0 pb-12 cursor-grab active:cursor-grabbing shrink-0 touch-none px-6 z-[140] pointer-events-auto flex items-center justify-end"
                        style={{ paddingTop: 'calc(1rem + var(--safe-top))' }}
                    >
                        {/* Close Button - Resume/Contact Variant */}
                        <div className="relative group/close">
                            <div className="absolute inset-0 bg-base00 -skew-x-12 translate-x-1.5 translate-y-1.5 opacity-70 transition-transform pointer-fine:group-hover/close:translate-x-2 pointer-fine:group-hover/close:translate-y-2" style={{ backgroundColor: eraColor }} />
                            <button
                                ref={closeButtonRef}
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                onPointerDown={(e) => e.stopPropagation()}
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
                                className="relative p6-button p-2 bg-base00 text-base05 border-2 border-base05 flex items-center justify-center"
                                aria-label="Dismiss project panel"
                            >
                                <svg className="w-6 h-6 skew-x-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div ref={scrollRef} className="flex-1 overflow-x-hidden overflow-y-auto projects-scroll" style={{ overscrollBehaviorX: 'contain', paddingBottom: 'calc(2.5rem + var(--safe-bottom))' }}>
                        {/* Hero / Carousel Section */}
                        <div className="relative w-full h-[50vh] sm:h-[65vh] bg-base00 border-b-4 border-base02 overflow-hidden">
                            <div className="absolute inset-0 halftone-bg opacity-10 z-10 pointer-events-none" />
                            <SwirlingBackdrop colors={extractedColors} />

                            {proj.images && proj.images.length > 0 ? (
                                <div className="h-full project-sheet-slider relative">
                                    {proj.images.length > 1 && (
                                        <>
                                            <button onClick={goToPrev} disabled={currentSlide === 0} className="absolute left-6 top-1/2 -translate-y-1/2 z-[70] p-4 bg-base00 text-base05 -skew-x-12 border-2 border-base05 shadow-[4px_4px_0px_var(--base08)] disabled:opacity-30 transition-all hover:-translate-x-1 group/nav">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-6 h-6 skew-x-12"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                                                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[10px] font-black uppercase italic tracking-wider opacity-0 pointer-fine:group-hover/nav:opacity-100 transition-opacity text-base00 bg-black/70 px-2 py-0.5 pointer-events-none whitespace-nowrap">PREV [←]</span>
                                            </button>
                                            <button onClick={goToNext} disabled={currentSlide >= imageCount - 1} className="absolute right-6 top-1/2 -translate-y-1/2 z-[70] p-4 bg-base00 text-base05 -skew-x-12 border-2 border-base05 shadow-[4px_4px_0px_var(--base08)] disabled:opacity-30 transition-all hover:translate-x-1 group/nav">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-6 h-6 skew-x-12"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[10px] font-black uppercase italic tracking-wider opacity-0 pointer-fine:group-hover/nav:opacity-100 transition-opacity text-base00 bg-black/70 px-2 py-0.5 pointer-events-none whitespace-nowrap">NEXT [→]</span>
                                            </button>
                                        </>
                                    )}

                                    <div ref={swipeAreaRef} className="relative h-full overflow-hidden select-none" style={{ cursor: imageCount > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default', touchAction: 'pan-y pinch-zoom', overscrollBehaviorX: 'contain' }} onDragStart={(event) => event.preventDefault()} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel}>
                                        <div ref={sliderRef} className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ willChange: 'transform' }}>
                                            {proj.images.map((img, idx) => (
                                                <div key={idx} className="h-full relative w-full shrink-0">
                                                    <Image src={img} alt={proj.title} fill draggable={false} className={`object-contain transition-opacity duration-300 ${loadedSlides[`${img}-${idx}`] ? 'opacity-100' : 'opacity-60'}`} sizes={SHEET_IMAGE_SIZES} quality={imageQuality} priority={idx <= 1} onLoad={() => setLoadedSlides(prev => ({ ...prev, [`${img}-${idx}`]: true }))} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {imageCount > 1 && (
                                        <div
                                            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center border-2 border-base05 bg-base00/90 backdrop-blur-md"
                                            style={{ padding: '5px 8px' }}
                                        >
                                            {imageCount === 2 ? (
                                                [0, 1].map((i) => (
                                                    <button
                                                        key={`sheet-dot-${i}`}
                                                        type="button"
                                                        onClick={() => {
                                                            if (i > currentSlide) goToNext();
                                                            if (i < currentSlide) goToPrev();
                                                        }}
                                                        className="h-2 -skew-x-12 border border-base00 p-0 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                                                        style={{
                                                            width: currentSlide === i ? '24px' : '8px',
                                                            backgroundColor: currentSlide === i ? eraColor : 'var(--base03)',
                                                            boxShadow: currentSlide === i ? '0 0 8px color-mix(in srgb, var(--base00) 40%, transparent)' : 'none',
                                                            cursor: 'pointer',
                                                            marginInline: '4px',
                                                        }}
                                                        aria-label={`Go to image ${i + 1}`}
                                                    />
                                                ))
                                            ) : (
                                                <div className="relative overflow-hidden" style={{ width: '72px', height: '18px', margin: '-5px -8px' }}>
                                                    <div
                                                        className="absolute inset-y-0 flex items-center transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                                                        style={{
                                                            gap: '8px',
                                                            transform: `translateX(${8 - dotWindowStart * 16}px)`,
                                                        }}
                                                    >
                                                        {proj.images.map((_, i) => (
                                                            <div
                                                                key={`sheet-dot-${i}`}
                                                                className="h-2 shrink-0 -skew-x-12 border border-base00 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                                                                style={{
                                                                    width: currentSlide === i ? '24px' : '8px',
                                                                    backgroundColor: currentSlide === i ? eraColor : 'var(--base03)',
                                                                    boxShadow: currentSlide === i ? '0 0 8px color-mix(in srgb, var(--base00) 40%, transparent)' : 'none',
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="absolute inset-y-0 left-0 bg-transparent border-none p-0 z-10"
                                                        style={{ width: '33%', cursor: currentSlide === 0 ? 'default' : 'pointer' }}
                                                        disabled={currentSlide === 0}
                                                        onClick={goToPrev}
                                                        aria-label="Previous image"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="absolute inset-y-0 bg-transparent border-none p-0 z-10"
                                                        style={{ left: '33%', width: '34%', cursor: (currentSlide === 0 || currentSlide === imageCount - 1) ? 'pointer' : 'default' }}
                                                        disabled={currentSlide > 0 && currentSlide < imageCount - 1}
                                                        onClick={() => {
                                                            if (currentSlide === 0) goToNext();
                                                            else if (currentSlide === imageCount - 1) goToPrev();
                                                        }}
                                                        aria-label="Navigate"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="absolute inset-y-0 right-0 bg-transparent border-none p-0 z-10"
                                                        style={{ width: '33%', cursor: currentSlide >= imageCount - 1 ? 'default' : 'pointer' }}
                                                        disabled={currentSlide >= imageCount - 1}
                                                        onClick={goToNext}
                                                        aria-label="Next image"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {/* Content Area */}
                        <div className="relative -mt-12 px-6 sm:px-12 max-w-5xl mx-auto z-10">
                            <div className="relative mb-12">
                                <div className="absolute inset-0 bg-base00 -skew-x-1 translate-x-3 translate-y-3 opacity-20" />
                                <div className="relative bg-base01 border-2 border-base00 p-8 sm:p-12 -skew-x-1 shadow-2xl">
                                    <div className="flex flex-col gap-8 skew-x-1">
                                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
                                            <div className="space-y-4">
                                                <div className="inline-block px-4 py-1 -skew-x-12 border border-base00" style={{ backgroundColor: eraColor }}>
                                                    <span className="text-xs font-black uppercase italic tracking-widest text-base00 skew-x-12 block">{proj.threeWordDescriptor}</span>
                                                </div>
                                                <h1 className="text-5xl sm:text-7xl font-black text-base05 uppercase italic leading-[0.8] tracking-tighter drop-shadow-[6px_6px_0px_var(--base00)]">{proj.title}</h1>
                                            </div>

                                            <div className="flex flex-wrap gap-4">
                                                {proj.githubRepo && (
                                                    <a href={proj.githubRepo} target="_blank" rel="noopener noreferrer" className="relative group/btn">
                                                        <div className="absolute inset-0 bg-base00 -skew-x-12 translate-x-1 translate-y-1" />
                                                        <div className="relative px-6 py-3 bg-base02 text-base05 -skew-x-12 border-2 border-base00 pointer-fine:group-hover/btn:bg-base03 transition-all flex items-center gap-3">
                                                            <span className="font-nerd text-2xl skew-x-12"></span>
                                                            <span className="text-sm font-black uppercase italic skew-x-12">Source</span>
                                                        </div>
                                                        <div className="p6-tooltip top-full left-0 mt-2 opacity-0 pointer-fine:group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[120]">
                                                            <span className="p6-tooltip-text">SOURCE CODE</span>
                                                        </div>
                                                    </a>
                                                )}
                                                {proj.link && (
                                                    <a href={proj.link} target="_blank" rel="noopener noreferrer" className="relative group/btn">
                                                        <div className="absolute inset-0 bg-base00 -skew-x-12 translate-x-1 translate-y-1" />
                                                        <div className="relative px-6 py-3 -skew-x-12 border-2 border-base00 pointer-fine:group-hover/btn:brightness-110 transition-all flex items-center gap-3" style={{ backgroundColor: eraColor, color: 'var(--base00)' }}>
                                                            <span className="font-nerd text-2xl skew-x-12">󰖟</span>
                                                            <span className="text-sm font-black uppercase italic skew-x-12">Live View</span>
                                                        </div>
                                                        <div className="p6-tooltip top-full right-0 mt-2 opacity-0 pointer-fine:group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[120]">
                                                            <span className="p6-tooltip-text">VISIT WEBSITE</span>
                                                        </div>
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-6 text-xs font-black uppercase italic tracking-widest text-base04">
                                            {proj.startYear && <span className="bg-base02 px-3 py-1.5 border border-base00">{proj.startYear === proj.endYear ? proj.startYear : `${proj.startYear} - ${proj.endYear || 'Present'}`}</span>}
                                            {repoData && (
                                                <div className="flex gap-6">
                                                    <span className="flex items-center gap-2 border-b-4 border-base0A pb-1"><span className="font-nerd text-lg">󰓎</span> {repoData.stargazers_count}</span>
                                                    <span className="flex items-center gap-2 border-b-4 border-base0B pb-1"><span className="font-nerd text-lg">󰓁</span> {repoData.forks_count}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative bg-base00 p-10 border-l-8 shadow-2xl mb-16" style={{ borderColor: eraColor }}>
                                <p lang="en" className="project-modal-description text-xl sm:text-2xl text-base05/95 font-semibold">{proj.description}</p>
                                <div className="absolute bottom-0 right-0 w-12 h-12 -skew-x-[45deg] translate-x-6 translate-y-6" style={{ backgroundColor: eraColor }} />
                            </div>
                        </div>
                    </div>
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
                                <span className="p6-tooltip-text">DISMISS [{closeHintKey}]</span>
                            </span>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        );
    };

    return createPortal(
        <div className={!project ? "pointer-events-none [&_*]:!pointer-events-none" : ""}>
            <AnimatePresence>
                {project && renderSheetContent(project)}
            </AnimatePresence>
        </div>,
        document.body
    );
}
