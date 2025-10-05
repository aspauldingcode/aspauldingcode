'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Project } from '../app/projects/projectData';
import Slider from 'react-slick';
import Image from 'next/image';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

// Custom styles for carousel dots and animations
const customDotsStyle = `
  .custom-dots {
    bottom: 15px !important;
  }
  .custom-dots li button:before {
    font-size: 10px !important;
    color: rgba(255, 255, 255, 0.5) !important;
  }
  .custom-dots li.slick-active button:before {
    color: rgba(255, 255, 255, 0.9) !important;
  }
  @keyframes horizontal-bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateX(0) translateY(-50%);
    }
    40% {
      transform: translateX(4px) translateY(-50%);
    }
    60% {
      transform: translateX(2px) translateY(-50%);
    }
  }
`;

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customDotsStyle;
  document.head.appendChild(styleElement);
}

import { GitHubRepoData } from '../lib/github';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onLike?: (project: Project) => void;
  onPass?: (project: Project) => void;
  onSwipe?: (direction: 'left' | 'right') => void;
  githubData?: Record<string, GitHubRepoData>;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
}

const SWIPE_THRESHOLD = 40;
const ROTATION_FACTOR = 0.1;
const MAX_ROTATION = 15;

// Custom arrow components for carousel
const CustomPrevArrow = ({ onClick, currentSlide }: { onClick?: () => void; currentSlide?: number }) => {
  if (currentSlide === 0) return null;
  
  return (
    <button
      onClick={onClick}
      className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-base00 bg-opacity-80 hover:bg-opacity-100 rounded-full transition-all duration-200 shadow-2xl"
      style={{
        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-5 h-5 text-base05"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </button>
  );
};

const CustomNextArrow = ({ onClick, currentSlide, slideCount }: { onClick?: () => void; currentSlide?: number; slideCount?: number }) => {
  if (currentSlide !== undefined && slideCount !== undefined && currentSlide >= slideCount - 1) return null;
  
  // Add horizontal pulse animation when on first slide
  const isFirstSlide = currentSlide === 0;
  
  return (
    <button
      onClick={onClick}
      className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-base00 bg-opacity-80 hover:bg-opacity-100 rounded-full transition-all duration-200 shadow-2xl ${isFirstSlide ? 'animate-pulse' : ''}`}
      style={{
        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
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
        className="w-5 h-5 text-base05"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
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
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
  });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasUserSwiped, setHasUserSwiped] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<Slider>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Prevent page scrolling when modal is open
  useEffect(() => {
    if (project) {
      // Store the original overflow and position values
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Disable scrolling completely
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // Cleanup function to restore original scrolling when modal closes
      return () => {
        document.body.style.overflow = originalOverflow || '';
        document.body.style.position = originalPosition || '';
        document.body.style.top = originalTop || '';
        document.body.style.width = originalWidth || '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [project]);

  // Check if content can scroll down
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        setCanScrollDown(scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 10);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      checkScrollable();
      scrollContainer.addEventListener('scroll', checkScrollable);
      return () => scrollContainer.removeEventListener('scroll', checkScrollable);
    }
  }, [project]);

  const handleStart = useCallback((clientX: number, clientY: number, target?: EventTarget | null) => {
    // Check if the swipe started within the carousel area
    if (target && target instanceof Element) {
      const carouselElement = target.closest('.slick-slider, .slick-list, .slick-track');
      if (carouselElement) {
        // Don't start modal swipe if it's within the carousel
        return;
      }
      
      // Check if the swipe started within the scrollable content area
      const scrollableElement = target.closest('.modal-scrollable-content');
      if (scrollableElement) {
        // Don't start modal swipe if it's within the scrollable content
        return;
      }
    }

    setDragState({
      isDragging: true,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      deltaX: 0,
      deltaY: 0,
    });
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState.isDragging) return;

    const deltaX = clientX - dragState.startX;
    const deltaY = clientY - dragState.startY;

    setDragState(prev => ({
      ...prev,
      currentX: clientX,
      currentY: clientY,
      deltaX,
      deltaY,
    }));
  }, [dragState.isDragging, dragState.startX, dragState.startY]);

  const handleEnd = useCallback(() => {
    if (!dragState.isDragging || !project) return;

    const { deltaX, deltaY } = dragState;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // If vertical movement is significant, treat it as scrolling and don't trigger swipe
    if (absDeltaY > absDeltaX || absDeltaY > 30) {
      setDragState({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deltaX: 0,
        deltaY: 0,
      });
      return;
    }

    if (absDeltaX > SWIPE_THRESHOLD) {
      const direction = deltaX > 0 ? 'right' : 'left';
      setSwipeDirection(direction);
      
      // Execute action after animation
      setTimeout(() => {
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
        setSwipeDirection(null);
      }, 300);
    }

    setDragState({
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
    });
  }, [dragState, project, onLike, onPass, onClose, onSwipe]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY, e.target);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY, e.target);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragState.isDragging) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Slick slider settings
  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    swipe: true,
    touchMove: true,
    arrows: !!(project?.images.length && project.images.length > 1), // Show arrows only if multiple images
    prevArrow: <CustomPrevArrow currentSlide={currentSlide} />,
    nextArrow: <CustomNextArrow currentSlide={currentSlide} slideCount={project?.images.length} />,
    dotsClass: "slick-dots custom-dots",
    afterChange: (current: number) => {
      setCurrentSlide(current);
      setHasUserSwiped(true); // Hide swipe message after first swipe
    },
  };

  const getModalStyle = (): React.CSSProperties => {
    const { deltaX, deltaY, isDragging } = dragState;

    if (swipeDirection) {
      // Exit animation
      const exitX = swipeDirection === 'right' ? 400 : -400;
      const exitRotation = swipeDirection === 'right' ? 20 : -20;
      
      return {
        transform: `translateX(${exitX}px) translateY(-50px) rotate(${exitRotation}deg) scale(0.9)`,
        opacity: 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      };
    }

    if (isDragging) {
      // Dragging state
      const rotation = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, deltaX * ROTATION_FACTOR));
      
      return {
        transform: `translateX(${deltaX}px) translateY(${deltaY * 0.3}px) rotate(${rotation}deg)`,
        transition: 'none',
      };
    }

    // Default state
    return {
      transform: 'translateX(0px) translateY(0px) rotate(0deg)',
      transition: 'transform 0.2s ease-out',
    };
  };

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-md h-[80vh] bg-base01 rounded-2xl shadow-2xl border border-base02 overflow-hidden select-none flex flex-col"
        style={getModalStyle()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 bg-base00 bg-opacity-80 hover:bg-opacity-100 rounded-full transition-all duration-200 shadow-2xl"
          style={{
            filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))'
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 text-base05"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Scrollable content container */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto modal-scrollable-content relative"
        >
          
          {/* Image carousel */}
          <div 
            className="relative h-80 bg-base02 flex-shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Vignette overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 rounded-lg" style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.15) 100%)'
            }} />
            
            {/* Carousel swipe hint for multiple images - now overlays the carousel */}
            {project?.images && project.images.length > 1 && (
              <div 
                className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-base00 bg-opacity-90 backdrop-blur-sm rounded-full text-xs text-base05 font-medium border border-base02 transition-opacity duration-500 ease-out pointer-events-none"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
                  opacity: hasUserSwiped ? 0 : 1
                }}
              >
                Swipe for more images ({project.images.length})
              </div>
            )}
            
            <Slider ref={sliderRef} {...sliderSettings}>
              {project?.images.map((image, index) => (
                <div key={index}>
                  <Image 
                    src={image} 
                    alt={`${project.title} - Image ${index + 1}`}
                    width={400}
                    height={320}
                    className="w-full h-80 object-contain bg-base02"
                    draggable={false}
                  />
                </div>
              ))}
            </Slider>
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
              <div className="flex items-center gap-4 text-base0D text-sm font-semibold mb-3 opacity-80 font-mono">
                {/* Stars - only show if count > 0 */}
                {githubData[project.githubRepo].stargazers_count > 0 && (
                  <div className="flex items-center">
                    <span className="mr-1" style={{fontFamily: 'NerdFont, monospace'}}>󰓎</span>
                    {githubData[project.githubRepo].stargazers_count}
                  </div>
                )}
                
                {/* Forks - only show if count > 0 */}
                {githubData[project.githubRepo].forks_count > 0 && (
                  <div className="flex items-center">
                    <span className="mr-1" style={{fontFamily: 'NerdFont, monospace'}}>󰓁</span>
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
                    className="inline-flex items-center px-3 py-2 bg-base0D hover:bg-base0C text-base00 text-sm rounded-lg transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Source Code →
                  </a>
                )}
                {project.link && (
                  <a 
                    href={project.link} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 bg-base0C hover:bg-base0D text-base00 text-sm rounded-lg transition-colors"
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
        <div className="flex-shrink-0 p-6 pt-0 relative z-40">
          <div className="flex space-x-4">
            <button
              onClick={() => {
                if (onSwipe) {
                  onSwipe('left');
                } else if (onPass) {
                  onPass(project);
                  onClose();
                }
              }}
              className="flex-1 py-3 bg-base08 hover:bg-base09 text-base00 rounded-lg font-semibold transition-colors"
            >
              Pass
            </button>
            <button
              onClick={() => {
                if (onSwipe) {
                  onSwipe('right');
                } else if (onLike) {
                  onLike(project);
                  onClose();
                }
              }}
              className="flex-1 py-3 bg-base0B hover:bg-base0A text-base00 rounded-lg font-semibold transition-colors"
            >
              Like
            </button>
          </div>
        </div>

        {/* Swipe indicators */}
        {dragState.isDragging && (
          <>
            <div 
              className={`absolute top-8 left-8 px-4 py-2 rounded-full text-lg font-bold transition-opacity z-40 ${
                dragState.deltaX > 50 
                  ? 'bg-base0B text-base00 opacity-100' 
                  : 'bg-base02 text-base04 opacity-50'
              }`}
            >
              LIKE
            </div>
            <div 
              className={`absolute top-8 right-8 px-4 py-2 rounded-full text-lg font-bold transition-opacity z-40 ${
                dragState.deltaX < -50 
                  ? 'bg-base08 text-base00 opacity-100' 
                  : 'bg-base02 text-base04 opacity-50'
              }`}
            >
              PASS
            </div>
          </>
        )}

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-base01 to-transparent pointer-events-none z-20"></div>

        {/* Scroll indicator - Fixed at modal bottom, behind pass/like buttons */}
        {canScrollDown && (
          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-30">
            <div className="flex items-center justify-center h-full pb-16">
              <div 
                className="animate-bounce relative"
                style={{
                  filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.8)) drop-shadow(0 3px 6px rgba(0, 0, 0, 0.6))'
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                  className="w-8 h-8 text-base05"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}