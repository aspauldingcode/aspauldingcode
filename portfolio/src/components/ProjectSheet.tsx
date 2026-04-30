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

        // Determine Era Motif based on project title (deterministic)
        const eraSeed = proj.title.length % 3; // 0 = P3, 1 = P4, 2 = P5
        const eraColor = eraSeed === 0 ? 'var(--base0D)' : eraSeed === 1 ? 'var(--base0A)' : 'var(--base08)';
        const eraLabel = eraSeed === 0 ? 'P3 ERA' : eraSeed === 1 ? 'P4 ERA' : 'P5 ERA';

        return (
            <div className="fixed inset-0 z-[250] flex items-end justify-center pointer-events-none">
                {/* Backdrop Container - Era Varied */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 pointer-events-auto overflow-hidden"
                    onClick={onClose}
                >
                    <motion.div
                        style={{ opacity: backdropOpacity }}
                        className="absolute inset-0 bg-base00/90 backdrop-blur-md touch-none"
                    />
                    
                    {/* Era Specific Background Motifs */}
                    <AnimatePresence>
                        {eraSeed === 0 && ( // P3: Gears & Blue
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-10 right-10 w-64 h-64 border-8 border-base0D rounded-full opacity-20 animate-[spin_20s_linear_infinite]" style={{ borderStyle: 'dashed' }} />
                                <div className="absolute bottom-20 left-10 w-96 h-96 border-4 border-base0D rounded-full opacity-10 animate-[spin_35s_linear_infinite_reverse]" style={{ borderStyle: 'dotted' }} />
                            </motion.div>
                        )}
                        {eraSeed === 1 && ( // P4: TV & Yellow
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-none">
                                <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, var(--base0A) 1px, var(--base0A) 2px)', backgroundSize: '100% 4px', opacity: 0.1 }} />
                                <div className="absolute top-20 left-1/4 w-32 h-32 border-4 border-base0A opacity-20 rotate-45 animate-pulse" />
                                <div className="absolute bottom-40 right-1/4 w-48 h-48 border-4 border-base0A opacity-20 -rotate-12 animate-bounce" />
                            </motion.div>
                        )}
                        {eraSeed === 2 && ( // P5: Stars & Red
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-none">
                                <div className="absolute inset-0 halftone-bg opacity-20" />
                                <div className="absolute top-1/4 right-1/4 text-base08 opacity-20 text-9xl animate-spin">★</div>
                                <div className="absolute bottom-1/4 left-1/4 text-base08 opacity-10 text-8xl animate-pulse">★</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Sheet Container - Era Modified */}
                <motion.div
                    initial={{ y: "100%", rotate: eraSeed === 0 ? -2 : eraSeed === 1 ? 0 : 2 }}
                    animate={{ y: 0, rotate: 0 }}
                    exit={{ y: "100%", rotate: eraSeed === 0 ? 2 : eraSeed === 1 ? 0 : -2 }}
                    transition={{ type: "spring", damping: 25, stiffness: 180 }}
                    drag="y"
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 1 }}
                    style={{ 
                        y: dragY,
                        borderColor: eraColor,
                        clipPath: eraSeed === 0 ? 'none' : eraSeed === 1 ? 'polygon(0% 2%, 100% 0%, 100% 98%, 0% 100%)' : 'polygon(0% 0%, 100% 3%, 97% 100%, 3% 97%)'
                    }}
                    onDragEnd={handleDragEnd}
                    className={`relative w-full sm:max-w-6xl h-[96dvh] sm:h-[94dvh] bg-base01 shadow-2xl overflow-hidden flex flex-col border-t-8 pointer-events-auto will-change-transform`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Draggable Header (Overlay) */}
                    <div
                        onPointerDown={(e) => dragControls.start(e)}
                        className="absolute top-0 left-0 right-0 pt-4 pb-12 cursor-grab active:cursor-grabbing shrink-0 touch-none px-6 z-[200] pointer-events-auto flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-base00 px-3 py-1 -skew-x-12 border border-base05 shadow-[4px_4px_0px_var(--base08)]">
                                <span className="text-[10px] font-black text-base05 uppercase italic skew-x-12 block tracking-widest">{eraLabel}</span>
                            </div>
                        </div>

                        {/* Close Button - Era Style */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-base00 -skew-x-12 translate-x-1 translate-y-1" style={{ backgroundColor: eraColor }} />
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="relative px-6 py-2 bg-base00 text-base05 -skew-x-12 hover:scale-105 transition-all border-2 border-base05 font-black uppercase italic tracking-tighter text-sm flex items-center gap-2"
                            >
                                <span className="skew-x-12">Close [ESC]</span>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div ref={scrollRef} className={`flex-1 overflow-x-hidden pb-10 ${isDragging ? 'overflow-y-hidden' : 'overflow-y-auto'} projects-scroll`} style={{ overscrollBehaviorX: 'contain' }}>
                        {/* Hero / Carousel Section */}
                        <div className="relative w-full h-[50vh] sm:h-[65vh] bg-base00 border-b-4 border-base02 overflow-hidden">
                            <div className="absolute inset-0 halftone-bg opacity-10 z-10 pointer-events-none mix-blend-overlay" />
                            <SwirlingBackdrop colors={extractedColors} />

                            {proj.images && proj.images.length > 0 ? (
                                <div className="h-full project-sheet-slider relative">
                                    {proj.images.length > 1 && (
                                        <>
                                            <button onClick={goToPrev} disabled={currentSlide === 0} className="absolute left-6 top-1/2 -translate-y-1/2 z-[70] p-4 bg-base00 text-base05 -skew-x-12 border-2 border-base05 shadow-[4px_4px_0px_var(--base08)] disabled:opacity-30 transition-all hover:-translate-x-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-6 h-6 skew-x-12"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                                            </button>
                                            <button onClick={goToNext} disabled={currentSlide >= imageCount - 1} className="absolute right-6 top-1/2 -translate-y-1/2 z-[70] p-4 bg-base00 text-base05 -skew-x-12 border-2 border-base05 shadow-[4px_4px_0px_var(--base08)] disabled:opacity-30 transition-all hover:translate-x-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-6 h-6 skew-x-12"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                            </button>
                                        </>
                                    )}

                                    <div ref={swipeAreaRef} className="relative h-full overflow-hidden select-none" style={{ cursor: imageCount > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default', touchAction: 'pan-y pinch-zoom' }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                                        <div ref={sliderRef} className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ transform: `translate3d(-${currentSlide * 100}%, 0, 0)`, willChange: 'transform' }}>
                                            {proj.images.map((img, idx) => (
                                                <div key={idx} className="h-full relative w-full shrink-0">
                                                    <Image src={img} alt={proj.title} fill className={`object-contain transition-all duration-700 ${loadedSlides[`${img}-${idx}`] ? 'blur-0 opacity-100' : 'blur-xl opacity-0'}`} sizes={SHEET_IMAGE_SIZES} quality={imageQuality} priority={idx === 0} onLoad={() => setLoadedSlides(prev => ({ ...prev, [`${img}-${idx}`]: true }))} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {imageCount > 1 && (
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[70] flex gap-3">
                                            {proj.images.map((_, i) => (
                                                <div key={i} className={`h-2 -skew-x-12 border border-base00 transition-all duration-300 ${i === currentSlide ? 'w-8' : 'w-2 bg-base03'}`} style={{ backgroundColor: i === currentSlide ? eraColor : '' }} />
                                            ))}
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

                                            <div className="flex gap-4">
                                                {proj.githubRepo && (
                                                    <a href={proj.githubRepo} target="_blank" rel="noopener noreferrer" className="relative group/btn">
                                                        <div className="absolute inset-0 bg-base00 -skew-x-12 translate-x-1 translate-y-1" />
                                                        <div className="relative px-6 py-3 bg-base02 text-base05 -skew-x-12 border-2 border-base00 group-hover/btn:bg-base03 transition-all flex items-center gap-3">
                                                            <span className="font-nerd text-2xl skew-x-12"></span>
                                                            <span className="text-sm font-black uppercase italic skew-x-12">Source</span>
                                                        </div>
                                                    </a>
                                                )}
                                                {proj.link && (
                                                    <a href={proj.link} target="_blank" rel="noopener noreferrer" className="relative group/btn">
                                                        <div className="absolute inset-0 bg-base00 -skew-x-12 translate-x-1 translate-y-1" />
                                                        <div className="relative px-6 py-3 -skew-x-12 border-2 border-base00 group-hover/btn:brightness-110 transition-all flex items-center gap-3" style={{ backgroundColor: eraColor, color: 'var(--base00)' }}>
                                                            <span className="font-nerd text-2xl skew-x-12">󰖟</span>
                                                            <span className="text-sm font-black uppercase italic skew-x-12">Live View</span>
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
                                <p className="text-xl sm:text-2xl text-base05/95 leading-relaxed font-bold italic uppercase tracking-tight whitespace-pre-wrap">{proj.description}</p>
                                <div className="absolute bottom-0 right-0 w-12 h-12 -skew-x-[45deg] translate-x-6 translate-y-6" style={{ backgroundColor: eraColor }} />
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
