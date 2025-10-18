'use client';

import React, { useState, useRef, useCallback } from 'react';
import { CardData, GitHubRepoData } from '../CardStack/types';
import { FILOCardDeck } from '../../lib/card-deck';
import { useResponsiveCardLayout } from './ResponsiveCardLayout';
import SimpleCard from '../ui/SimpleCard';

interface SimpleCardStackProps {
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

const SWIPE_THRESHOLD = 75;

export default function SimpleCardStack({
  cards,
  onSwipe,
  onStackEmpty,
  onSeeMore,
  onViewProject,
  className = '',
  cardClassName = '',
  swipedCardIds: externalSwipedCardIds,
  githubData
}: SimpleCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedCardIds, setSwipedCardIds] = useState<Set<string>>(externalSwipedCardIds || new Set());
  const [dragState, setDragState] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
  });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Use responsive layout hook
  const { layout, scaleFactor, contentScale, actualDimensions } = useResponsiveCardLayout();
  
  // Create FILO deck for card management
  const deck = new FILOCardDeck(cards, swipedCardIds);
  const visibleCards = deck.getVisibleCards(currentIndex, 3);
  const hasMoreCards = currentIndex < cards.length;

  // Handle swipe completion
  const handleSwipeComplete = useCallback((card: CardData, direction: 'left' | 'right') => {
    setSwipeDirection(direction);
    setIsAnimating(true);
    
    // Update swiped cards
    setSwipedCardIds(prev => new Set([...prev, card.id]));
    
    // Move to next card after animation
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setSwipeDirection(null);
      setIsAnimating(false);
      
      if (onSwipe) {
        onSwipe(card, direction);
      }
      
      // Check if stack is empty
      if (currentIndex >= cards.length - 1 && onStackEmpty) {
        onStackEmpty();
      }
    }, 300);
  }, [cards.length, currentIndex, onSwipe, onStackEmpty]);

  // Handle drag start
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

  // Handle drag move
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

  // Handle drag end
  const handleEnd = useCallback(() => {
    if (!dragState.isDragging) return;
    
    const { deltaX } = dragState;
    const shouldSwipe = Math.abs(deltaX) > SWIPE_THRESHOLD;
    
    if (shouldSwipe && visibleCards.length > 0) {
      const direction = deltaX > 0 ? 'right' : 'left';
      handleSwipeComplete(visibleCards[0], direction);
    }
    
    // Reset drag state
    setDragState({
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
    });
  }, [dragState, visibleCards, handleSwipeComplete]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Reset functionality
  // const resetStack = useCallback(() => {
  //   setCurrentIndex(0);
  //   setSwipedCardIds(externalSwipedCardIds || new Set());
  // }, [externalSwipedCardIds]);

  return (
    <div 
      className={`relative w-full h-full ${className}`}
      style={{ perspective: '1000px' }}
    >
      <div className="relative w-full h-full">
        {visibleCards.map((card, index) => {
          const cardIndex = index;
          const isTopCard = cardIndex === 0;
          
          return (
            <div
              key={card.id}
              className={`absolute inset-0 ${cardClassName}`}
              onMouseDown={isTopCard ? handleMouseDown : undefined}
              onMouseMove={isTopCard ? handleMouseMove : undefined}
              onMouseUp={isTopCard ? handleMouseUp : undefined}
              onTouchStart={isTopCard ? handleTouchStart : undefined}
              onTouchMove={isTopCard ? handleTouchMove : undefined}
              onTouchEnd={isTopCard ? handleTouchEnd : undefined}
            >
              <SimpleCard
                card={card}
                index={cardIndex}
                dragState={dragState}
                swipeDirection={swipeDirection}
                isAnimating={isAnimating}
                cardLayout={layout}
                scaleFactor={scaleFactor}
                contentScale={contentScale}
                actualCardDimensions={actualDimensions}
                githubData={githubData}
                onViewProject={onViewProject}
                cardClassName={cardClassName}
                cardRef={cardIndex === 0 ? cardRef : undefined}
              />
            </div>
          );
        })}
        
        {!hasMoreCards && onSeeMore && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={onSeeMore}
              className="px-6 py-3 bg-base0D hover:bg-base0C text-base00 rounded-lg transition-colors duration-200"
            >
              See More Projects
            </button>
          </div>
        )}
      </div>
    </div>
  );
}