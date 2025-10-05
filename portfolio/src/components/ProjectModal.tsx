'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Project } from '../app/projects/projectData';
import Slider from 'react-slick';
import Image from 'next/image';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onLike?: (project: Project) => void;
  onPass?: (project: Project) => void;
  onSwipe?: (direction: 'left' | 'right') => void;
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

export default function ProjectModal({ 
  project, 
  onClose, 
  onLike, 
  onPass,
  onSwipe
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
  const modalRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<Slider>(null);

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
    arrows: false,
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
          className="absolute top-4 right-4 z-30 p-2 bg-base00 bg-opacity-80 hover:bg-opacity-100 rounded-full transition-all duration-200"
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
        <div className="flex-1 overflow-y-auto modal-scrollable-content">
          {/* Image carousel */}
          <div 
            className="relative h-80 bg-base02 flex-shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <Slider ref={sliderRef} {...sliderSettings}>
              {project.images.map((image, index) => (
                <div key={index}>
                  <Image 
                    src={image} 
                    alt={`${project.title} - Image ${index + 1}`}
                    width={400}
                    height={320}
                    className="w-full h-80 object-cover"
                    draggable={false}
                  />
                </div>
              ))}
            </Slider>
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col">
            <h2 className="text-2xl font-bold text-base05 mb-3">
              {project.title}
            </h2>
            
            <div className="mb-4">
              <p className="text-base04 text-sm leading-relaxed">
                {project.description.replace('...', '')}
              </p>
              
              {project.link && (
                <a 
                  href={project.link} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-4 px-3 py-2 bg-base0D hover:bg-base0C text-base00 text-sm rounded-lg transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Visit Live Site →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons - Fixed at bottom */}
        <div className="flex-shrink-0 p-6 pt-0">
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
              className={`absolute top-8 left-8 px-4 py-2 rounded-full text-lg font-bold transition-opacity ${
                dragState.deltaX > 50 
                  ? 'bg-base0B text-base00 opacity-100' 
                  : 'bg-base02 text-base04 opacity-50'
              }`}
            >
              LIKE
            </div>
            <div 
              className={`absolute top-8 right-8 px-4 py-2 rounded-full text-lg font-bold transition-opacity ${
                dragState.deltaX < -50 
                  ? 'bg-base08 text-base00 opacity-100' 
                  : 'bg-base02 text-base04 opacity-50'
              }`}
            >
              PASS
            </div>
          </>
        )}
      </div>
    </div>
  );
}