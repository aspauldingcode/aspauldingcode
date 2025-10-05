'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { GitHubRepoData } from '../lib/github';

interface CardData {
  id: string;
  title: string;
  description: string;
  image?: string;
  tags?: string[];
  startYear?: number;
  endYear?: number;
  githubRepo?: string;
  [key: string]: string | string[] | number | undefined;
}

interface CardStackProps {
  cards: CardData[];
  onSwipe?: (card: CardData, direction: 'left' | 'right') => void;
  onStackEmpty?: () => void;
  onSeeMore?: () => void;
  onViewProject?: (card: CardData) => void;
  dismissedCount?: number;
  className?: string;
  cardClassName?: string;
  swipedCardIds?: Set<string>;
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

const SWIPE_THRESHOLD = 75; // Reduced for easier swiping
const ROTATION_FACTOR = 0.15; // Increased for more responsive rotation
const MAX_ROTATION = 20; // Increased max rotation

export default function CardStack({ 
  cards, 
  onSwipe, 
  onStackEmpty, 
  onSeeMore,
  onViewProject,
  dismissedCount = 0,
  className = '',
  cardClassName = '',
  swipedCardIds: externalSwipedCardIds,
  githubData
}: CardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedCardIds, setSwipedCardIds] = useState<Set<string>>(new Set());
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
  const cardRef = useRef<HTMLDivElement>(null);

  // Reset currentIndex and swipedCardIds when component is re-mounted (key changes)
  useEffect(() => {
    setCurrentIndex(0);
    setSwipedCardIds(new Set());
  }, []);

  // Filter out swiped cards and get visible cards
  const effectiveSwipedCardIds = externalSwipedCardIds || swipedCardIds;
  const availableCards = cards.filter(card => !effectiveSwipedCardIds.has(card.id));
  const visibleCards = availableCards.slice(currentIndex, currentIndex + 3);

  // Prevent scrolling when component is mounted - more targeted approach
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      // Only prevent if we're dragging a card
      if (dragState.isDragging) {
        e.preventDefault();
      }
    };

    const preventScrollWheel = (e: WheelEvent) => {
      // Only prevent wheel events when actively dragging a card
      if (dragState.isDragging) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('wheel', preventScrollWheel, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('wheel', preventScrollWheel);
    };
  }, [dragState.isDragging]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
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
    if (!dragState.isDragging) return;

    const { deltaX } = dragState;
    const absDeltaX = Math.abs(deltaX);

    if (absDeltaX > SWIPE_THRESHOLD) {
      const direction = deltaX > 0 ? 'right' : 'left';
      setSwipeDirection(direction);
      
      // Call onSwipe callback
      if (onSwipe && visibleCards[0]) {
        onSwipe(visibleCards[0], direction);
      }

      // Mark card as swiped and advance after animation
      setTimeout(() => {
        if (visibleCards[0] && !externalSwipedCardIds) {
          // Only update internal state if no external swipedCardIds are provided
          setSwipedCardIds(prev => new Set([...prev, visibleCards[0].id]));
        }
        setSwipeDirection(null);
        
        // Check if all available cards are swiped - only trigger when no cards remain
        const remainingCards = availableCards.filter(card => card.id !== visibleCards[0]?.id);
        if (remainingCards.length === 0 && onStackEmpty) {
          onStackEmpty();
        }
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
  }, [dragState, availableCards, onSwipe, onStackEmpty, visibleCards, externalSwipedCardIds]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };



  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Only prevent default if we're actually dragging
    if (dragState.isDragging) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  const getCardStyle = (index: number): React.CSSProperties => {
    const isTopCard = index === 0;
    const { deltaX, deltaY, isDragging } = dragState;

    // Base styles for stacking
    const baseZIndex = 50 - index;
    const baseScale = 1 - (index * 0.05);
    const baseY = index * 8;
    const baseRotation = index * 2;

    if (isTopCard) {
      // Top card - handle dragging and swiping
      if (swipeDirection) {
        // Exit animation
        const exitX = swipeDirection === 'right' ? 400 : -400;
        const exitRotation = swipeDirection === 'right' ? 30 : -30;
        
        return {
          transform: `translateX(${exitX}px) translateY(-100px) rotate(${exitRotation}deg) scale(0.8)`,
          opacity: 0,
          zIndex: 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        };
      }

      if (isDragging) {
        // Dragging state
        const rotation = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, deltaX * ROTATION_FACTOR));
        
        return {
          transform: `translateX(${deltaX}px) translateY(${deltaY * 0.5}px) rotate(${rotation}deg)`,
          zIndex: baseZIndex + 10,
          transition: 'none', // Remove transition during drag for immediate response
          cursor: 'grabbing',
        };
      }

      // Default top card
      return {
        transform: `translateY(${baseY}px) rotate(${baseRotation}deg) scale(${baseScale})`,
        zIndex: baseZIndex,
        transition: 'transform 0.2s ease-out',
        cursor: 'grab',
      };
    }

    // Cards behind the top card
    const moveUp = swipeDirection && !isDragging ? -8 : 0;
    const scaleUp = swipeDirection && !isDragging ? 0.05 : 0;
    
    return {
      transform: `translateY(${baseY + moveUp}px) rotate(${baseRotation}deg) scale(${baseScale + scaleUp})`,
      zIndex: baseZIndex,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth transition when not dragging
    };
  };

  if (visibleCards.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-96 ${className}`}>
        <p className="text-base04 text-lg mb-4">No more projects</p>
        {onSeeMore && (
          <button
            onClick={() => {
              setCurrentIndex(0); // Reset the card index to show all cards again
              onSeeMore();
            }}
            className="px-6 py-3 bg-base0D hover:bg-base0C text-base00 rounded-lg transition-colors"
          >
            See More ({dismissedCount})
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`relative w-80 h-96 mx-auto ${className} card-stack-container`}
      onMouseMove={(e: React.MouseEvent) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {visibleCards.map((card, index) => (
        <div
          key={`${card.id}-${currentIndex + index}`}
          ref={index === 0 ? cardRef : null}
          className={`absolute inset-0 bg-base01 rounded-2xl shadow-lg border border-base02 overflow-hidden select-none ${cardClassName}`}
          style={{
            transformOrigin: '50% 100%',
            ...getCardStyle(index),
          }}
          onMouseDown={index === 0 ? handleMouseDown : undefined}
          onTouchStart={index === 0 ? handleTouchStart : undefined}
          onTouchMove={index === 0 ? handleTouchMove : undefined}
          onTouchEnd={index === 0 ? handleTouchEnd : undefined}
        >
          {/* Card Content */}
          <div className="p-4 h-full flex flex-col">
            {card.image && (
              <div className="w-full h-40 bg-base02 rounded-lg mb-3 overflow-hidden">
                <Image 
                  src={card.image} 
                  alt={card.title}
                  width={320}
                  height={160}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            )}
            
            <h3 className="text-lg font-bold text-base05 mb-1 line-clamp-2">
              {card.title}
            </h3>
            
            {/* Year display with different styling */}
            {(card.startYear || card.endYear) && (
              <div className="text-base0D text-xs font-semibold mb-2 opacity-80">
                {card.startYear && card.endYear 
                  ? card.startYear === card.endYear 
                    ? card.startYear.toString()
                    : `${card.startYear} - ${card.endYear}`
                  : card.startYear 
                    ? `${card.startYear} - Present`
                    : card.endYear?.toString()
                }
              </div>
            )}
            
            <p className="text-base05 text-base font-semibold text-center flex-1 line-clamp-2 mb-2">
              {card.description}
            </p>
            
            {/* View Project Button */}
            {onViewProject && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProject(card);
                }}
                className="mt-1 mb-2 px-4 py-2 bg-base0C hover:bg-base0D text-base00 text-sm rounded-lg transition-colors font-medium"
              >
                View Project
              </button>
            )}
            
            {/* Tags and GitHub Stats Row */}
            <div className="flex justify-between items-center">
              {/* Tags on the left */}
              {card.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {card.tags.slice(0, 2).map((tag, tagIndex) => (
                    <span 
                      key={tagIndex}
                      className="px-2 py-0.5 bg-base0D text-base00 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* GitHub stats on the right */}
              {card.githubRepo && githubData?.[card.githubRepo] && (
                <div className="flex items-center gap-3 text-xs text-base04 font-mono">
                  {/* Stars */}
                  {githubData[card.githubRepo].stargazers_count > 0 && (
                    <div className="flex items-center font-mono">
                      <span className="mr-1 text-sm" style={{fontFamily: 'NerdFont, monospace'}}>󰓎</span>
                      {githubData[card.githubRepo].stargazers_count}
                    </div>
                  )}
                  
                  {/* Forks */}
                  {githubData[card.githubRepo].forks_count > 0 && (
                    <div className="flex items-center font-mono">
                      <span className="mr-1 text-sm" style={{fontFamily: 'NerdFont, monospace'}}>󰓁</span>
                      {githubData[card.githubRepo].forks_count}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Swipe indicators */}
          {index === 0 && dragState.isDragging && (
            <>
              <div 
                className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-bold transition-opacity ${
                  dragState.deltaX > 50 
                    ? 'bg-base0B text-base00 opacity-100' 
                    : 'bg-base02 text-base04 opacity-50'
                }`}
              >
                LIKE
              </div>
              <div 
                className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold transition-opacity ${
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
      ))}
    </div>
  );
}