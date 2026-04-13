'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Project } from '../app/projects/projectData';
import Image from 'next/image';
import { useTheme } from '../app/context/ThemeContext';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { useSliderSwipeMachine } from '@/hooks/useSliderSwipeMachine';

import { GitHubRepoData } from '../lib/github';

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
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        title="Previous Image (Arrow Left)"
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
        <span className="text-[10px] font-mono text-base04 opacity-50 mt-1 pointer-events-none">(←)</span>
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
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        title="Next Image (Arrow Right)"
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
        <span className="text-[10px] font-mono text-base04 opacity-50 mt-1 pointer-events-none">(→)</span>
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

  const bp = useBreakpoints();
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasUserSwiped, setHasUserSwiped] = useState(false);
  const [loadedSlides, setLoadedSlides] = useState<Record<string, boolean>>({});
  const [dotWindowStart, setDotWindowStart] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
      if (e.key === 'Escape') {
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

  const handleDragEnd = useCallback((_event: any, info: any) => {
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);

    // Swipe down to dismiss
    const isAtTop = scrollContainerRef.current ? scrollContainerRef.current.scrollTop <= 5 : true;
    if (offset.y > 100 && velocity.y > 0 && isAtTop && absY > absX) {
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
      onClose();
    }
  }, [project, onLike, onPass, onClose, onSwipe]);








  if (!project) return null;

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
        className="absolute top-0 left-0 right-0 bottom-7 sm:bottom-9 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        ref={modalRef}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.8}
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
        className="relative w-full max-w-md h-[80vh] bg-base01 rounded-2xl shadow-2xl border border-base02 overflow-hidden select-none flex flex-col"
      >
        {/* Close button - matches Contact / Resume modal style */}
        <div className="absolute top-4 right-4 z-30 flex flex-col items-center">
          <button
            onClick={onClose}
            className="p-2 bg-base00 bg-opacity-80 hover:bg-opacity-100 rounded-full text-base05 transition-all duration-200 shadow-sm touch-manipulation"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
            }}
            title="Close (Esc)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {bp.hasKeyboard && (
            <span className="text-[10px] font-mono text-base04 opacity-50 mt-1 pointer-events-none">(esc)</span>
          )}
        </div>

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
              <p className="text-base04 text-sm leading-relaxed">
                {project.description}
              </p>

              <div className="flex gap-2 mt-4">
                {project.githubRepo && (
                  <a
                    href={project.githubRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-base02 hover:bg-base03 text-base05 text-sm rounded-lg transition-colors group/github"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="font-nerd text-lg"></span>
                    <span className="font-semibold">View Source</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 opacity-60 group-hover/github:opacity-100 transition-opacity">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                )}
                {project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 bg-base0E hover:bg-base0F text-base00 text-sm rounded-lg transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {project.githubRepo ? 'Visit Live Site →' : 'Visit Project →'}
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
          className="absolute top-8 left-8 border-4 px-4 py-1 rounded text-3xl font-bold z-50 pointer-events-none transform -rotate-12 bg-base00/40 backdrop-blur-sm"
          style={{ opacity: indicatorOpacity, color: likeColor, borderColor: likeBorderColor }}
        >
          LIKE
        </motion.div>
        <motion.div
          className="absolute top-8 right-8 border-4 px-4 py-1 rounded text-3xl font-bold z-50 pointer-events-none transform rotate-12 bg-base00/40 backdrop-blur-sm"
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
      </motion.div>
    </motion.div>
  );
}