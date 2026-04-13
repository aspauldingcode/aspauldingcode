'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Project } from '../app/projects/projectData';
import Image from 'next/image';
import { motion, AnimatePresence, useDragControls, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { GitHubRepoData } from '../lib/github';

import { useBreakpoints } from '@/hooks/useBreakpoints';
import { useImageColors, prefetchImageColors } from '@/hooks/useImageColors';
import { useSliderSwipeMachine } from '@/hooks/useSliderSwipeMachine';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import SwirlingBackdrop from './SwirlingBackdrop';

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
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[10px] font-sans opacity-0 group-hover:opacity-100 transition-opacity text-white/70 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md pointer-events-none whitespace-nowrap">
                    (←)
                </span>
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
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[10px] font-sans opacity-0 group-hover:opacity-100 transition-opacity text-white/70 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md pointer-events-none whitespace-nowrap">
                    (→)
                </span>
            )}
        </button>
    );
};

export default function ProjectSheet({ project, onClose, githubData }: ProjectSheetProps) {
    const bp = useBreakpoints();
    const { isLowEnd } = useNetworkStatus();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loadedSlides, setLoadedSlides] = useState<Record<string, boolean>>({});
    const [dotWindowStart, setDotWindowStart] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const imageQuality = isLowEnd ? 60 : 75;
    const firstImageReportedRef = useRef<string | null>(null);

    // Framer Motion Drag Controls
    const dragY = useMotionValue(0);
    const dragControls = useDragControls();
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

    // Reset scroll on open
    useEffect(() => {
        if (project && scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [project]);

    useEffect(() => {
        setCurrentSlide(0);
        setLoadedSlides({});
        setDotWindowStart(0);
        firstImageReportedRef.current = null;
    }, [project?.title, project?.images]);

    useEffect(() => {
        if (!project?.images?.length || isLowEnd) return;

        const current = project.images[currentSlide];
        const next = project.images[currentSlide + 1];
        const targets = [current, next].filter(Boolean) as string[];
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
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft') {
                goToPrev();
            } else if (e.key === 'ArrowRight') {
                goToNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, currentSlide, imageCount]);


    const handleDragEnd = (_: unknown, info: PanInfo) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose();
        }
    };

    if (!mounted) return null;

    // Renamed to avoid stale cache
    const renderSheetContent = (proj: Project) => {
        const repoData = proj.githubRepo ? githubData?.[proj.githubRepo] : null;

        return (
            <div className="fixed inset-0 z-[200] flex items-end justify-center pointer-events-none">
                {/* Backdrop Container */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 pointer-events-auto"
                    onClick={onClose}
                >
                    {/* Real-time Backdrop - Syncs with dragY */}
                    <motion.div
                        style={{ opacity: backdropOpacity }}
                        className="absolute inset-0 bg-base00/90 backdrop-blur-md touch-none"
                    />
                </motion.div>

                {/* Sheet Container */}
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 260 }}
                    drag="y"
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 1 }}
                    style={{ y: dragY }}
                    onDragEnd={handleDragEnd}
                    className="relative w-full sm:max-w-5xl h-[96dvh] sm:h-[94dvh] bg-base01 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-base02 pointer-events-auto will-change-transform"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Draggable Header (Overlay) */}
                    <div
                        onPointerDown={(e) => dragControls.start(e)}
                        className="absolute top-0 left-0 right-0 pt-4 pb-10 cursor-grab active:cursor-grabbing shrink-0 touch-none px-4 bg-gradient-to-b from-base00/10 to-transparent z-[200] pointer-events-auto"
                    >
                        {/* Drag Handle Indicator */}
                        <div className="flex items-center justify-center mb-6 touch-none py-2">
                            <div className="w-12 h-1.5 bg-base05/80 rounded-full" />
                        </div>

                        {/* Header UI Row */}
                        <div className="flex items-center justify-end relative">
                            {/* Close Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="p-3 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white shadow-lg transition-all border border-white/10 group touch-manipulation relative"
                                title="Close (Esc)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                {bp.hasKeyboard && (
                                    <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[10px] font-sans opacity-0 group-hover:opacity-100 transition-opacity text-white/70 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md pointer-events-none whitespace-nowrap">
                                        (Esc)
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div ref={scrollRef} className={`flex-1 overflow-x-hidden pb-10 ${isDragging ? 'overflow-y-hidden' : 'overflow-y-auto'}`} style={{ overscrollBehaviorX: 'contain' }}>
                        {/* Hero / Carousel Section */}
                        <div className="relative w-full h-[50vh] sm:h-[60vh] bg-base00 border-b border-base02 overflow-hidden transition-colors duration-500">
                            {/* Dynamic Background */}
                            <SwirlingBackdrop colors={extractedColors} />

                            {proj.images && proj.images.length > 0 ? (
                                proj.images.length > 1 ? (
                                    <div className="h-full project-sheet-slider relative">
                                        <SheetPrevArrow onClick={goToPrev} currentSlide={currentSlide} hasKeyboard={bp.hasKeyboard} />
                                        <SheetNextArrow onClick={goToNext} currentSlide={currentSlide} slideCount={proj.images?.length} hasKeyboard={bp.hasKeyboard} />

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
                                                {proj.images.map((img, idx) => {
                                                    const imageKey = `${img}-${idx}`;
                                                    const isLoaded = !!loadedSlides[imageKey];
                                                    return (
                                                        <div key={imageKey} className="h-[50vh] sm:h-[60vh] relative w-full shrink-0 outline-none focus:outline-none">
                                                            <div
                                                                className={`absolute inset-0 animate-shimmer transition-opacity duration-700 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
                                                                style={{
                                                                    backgroundSize: '200% 100%',
                                                                    backgroundImage: 'linear-gradient(to right, rgba(56,56,56,1), rgba(40,40,40,1), rgba(56,56,56,1))'
                                                                }}
                                                            />
                                                            <Image
                                                                src={img}
                                                                alt={`${proj.title} screenshot ${idx + 1}`}
                                                                fill
                                                                className={`object-contain transition-all duration-700 ${isLoaded ? 'blur-0 opacity-100' : idx === 0 ? 'blur-md opacity-70 scale-[1.02]' : 'blur-xl opacity-0 scale-105'}`}
                                                                sizes={SHEET_IMAGE_SIZES}
                                                                quality={imageQuality}
                                                                priority={idx === 0}
                                                                onLoad={() => {
                                                                    setLoadedSlides((prev) => ({ ...prev, [imageKey]: true }));
                                                                    if (idx === 0 && firstImageReportedRef.current !== proj.title && typeof window !== 'undefined' && typeof performance !== 'undefined') {
                                                                        firstImageReportedRef.current = proj.title;
                                                                        performance.mark('project-sheet-first-image-visible');
                                                                        const perfState = (window as Window & { __projectSheetPerf?: { intentAt?: number } }).__projectSheetPerf;
                                                                        const now = performance.now();
                                                                        const tapToVisible = perfState?.intentAt ? Math.round(now - perfState.intentAt) : null;
                                                                        if (process.env.NODE_ENV !== 'production') {
                                                                            console.info('[ProjectSheetPerf]', {
                                                                                project: proj.title,
                                                                                tapToFirstImageMs: tapToVisible,
                                                                            });
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div
                                            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[70] flex items-center rounded-full"
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
                                                        key={`sheet-dot-${i}`}
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
                                                        {proj.images.map((_, i) => (
                                                            <div
                                                                key={`sheet-dot-${i}`}
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
                                    </div>
                                ) : (
                                    <div className="h-full relative">
                                        <Image
                                            src={proj.images[0]}
                                            alt={proj.title}
                                            fill
                                            className="object-contain"
                                            sizes={SHEET_IMAGE_SIZES}
                                            quality={imageQuality}
                                            priority
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-base01 via-transparent to-transparent opacity-60" />
                                    </div>
                                )
                            ) : (
                                <div className="h-full flex items-center justify-center text-base04">
                                    No Preview Available
                                </div>
                            )}
                        </div>

                        {/* Article Content */}
                        <div className="relative -mt-12 pl-[calc(1.5rem+var(--safe-left))] pr-[calc(1.5rem+var(--safe-right))] sm:pl-[calc(3rem+var(--safe-left))] sm:pr-[calc(3rem+var(--safe-right))] pb-[calc(5rem+var(--safe-bottom))] max-w-3xl mx-auto z-10">
                            {/* Header Card */}
                            <div className="bg-base01/90 backdrop-blur-md border border-base02 p-6 sm:p-8 rounded-2xl shadow-xl mb-8">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <h1 className="text-3xl sm:text-4xl font-bold text-base05">{proj.title}</h1>
                                        <div className="flex gap-2">
                                            {proj.githubRepo && (
                                                <a
                                                    href={proj.githubRepo}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-base02 rounded-lg hover:bg-base03 transition-colors text-base05 group/github"
                                                    title="View Source"
                                                >
                                                    <span className="font-nerd text-xl"></span>
                                                    <span className="text-sm font-semibold">View Source</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 opacity-60 group-hover/github:opacity-100 transition-opacity">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                                    </svg>
                                                </a>
                                            )}
                                            {proj.link && (
                                                <a
                                                    href={proj.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-base0D rounded-full hover:bg-base0C transition-colors text-base01"
                                                    title="Visit Live Site"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                                    </svg>
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-base04">
                                        {proj.startYear && (
                                            <span className="bg-base02 px-2 py-1 rounded">
                                                {proj.startYear === proj.endYear ? proj.startYear : `${proj.startYear} - ${proj.endYear || 'Present'}`}
                                            </span>
                                        )}

                                        {repoData && (
                                            <>
                                                {repoData.stargazers_count > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="font-nerd">󰓎</span> {repoData.stargazers_count} stars
                                                    </span>
                                                )}
                                                {repoData.forks_count > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="font-nerd">󰓁</span> {repoData.forks_count} forks
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div className="h-px w-full bg-base02/50 my-2" />

                                    <div className="text-base0D font-bold uppercase tracking-wider text-sm">
                                        {proj.threeWordDescriptor}
                                    </div>
                                </div>
                            </div>

                            {/* Description Body */}
                            <div className="prose prose-invert prose-lg max-w-none text-base05/90 leading-relaxed font-sans">
                                <p className="whitespace-pre-wrap">{proj.description}</p>
                            </div>

                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    return createPortal(
        <AnimatePresence>
            {project && renderSheetContent(project)}
        </AnimatePresence>,
        document.body
    );
}
