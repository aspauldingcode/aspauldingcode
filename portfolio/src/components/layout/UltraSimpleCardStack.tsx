'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { CardData, GitHubRepoData } from '../CardStack/types';
import { FILOCardDeck } from '../../lib/card-deck';
import { calculateResponsiveLayout, getCardStyle } from '../../lib/card-utils';
import { ResponsiveButtons } from '../ResponsiveButtons';

interface UltraSimpleCardStackProps {
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

export default function UltraSimpleCardStack({
  cards,
  onSwipe,
  onStackEmpty,
  onSeeMore,
  onViewProject,
  className = '',
  cardClassName = '',
  swipedCardIds: externalSwipedCardIds,
  githubData
}: UltraSimpleCardStackProps) {
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
  
  // Calculate responsive layout without useEffect
  calculateResponsiveLayout(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
    typeof window !== 'undefined' ? window.innerHeight : 768
  );
  
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
    } else {
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
    }
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

  return (
    <div 
      className={`relative w-full h-full ${className}`}
      style={{ perspective: '1000px' }}
    >
      <div className="relative w-full h-full">
        {visibleCards.map((card, index) => {
          const cardIndex = index;
          const isTopCard = cardIndex === 0;
          const cardStyle = getCardStyle(cardIndex, dragState, swipeDirection, isAnimating);
          
          return (
            <div
              key={card.id}
              className={`absolute inset-0 ${cardClassName}`}
              style={cardStyle}
              onMouseDown={isTopCard ? handleMouseDown : undefined}
              onMouseMove={isTopCard ? handleMouseMove : undefined}
              onMouseUp={isTopCard ? handleMouseUp : undefined}
              onTouchStart={isTopCard ? handleTouchStart : undefined}
              onTouchMove={isTopCard ? handleTouchMove : undefined}
              onTouchEnd={isTopCard ? handleTouchEnd : undefined}
            >
              {/* Simple card content */}
              <div className="w-full h-full bg-base01 rounded-2xl shadow-xl overflow-hidden border border-base02">
                {card.image && (
                  <div className="h-48 relative">
                    <Image
                      src={card.image}
                      alt={card.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-base05">
                      {card.title}
                    </h3>
                    {card.startYear && (
                      <p className="text-base04 text-sm">
                        {card.startYear}{card.endYear && card.endYear !== card.startYear ? `-${card.endYear}` : ''}
                      </p>
                    )}
                  </div>
                  
                  <p className="text-base05 text-sm leading-relaxed">
                    {card.description}
                  </p>
                  
                  {card.githubRepo && githubData?.[card.githubRepo] && (
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400 text-sm">
                        ⭐ {String(githubData[card.githubRepo].stargazers_count)}
                      </span>
                      <span className="text-base04 text-xs">
                        {String(githubData[card.githubRepo].full_name)}
                      </span>
                    </div>
                  )}
                  
                  {onViewProject && (
                    <div className="flex gap-2">
                      <ResponsiveButtons
                        project={{
                          githubRepo: card.githubRepo,
                          link: card.link
                        }}
                        onViewProject={() => onViewProject(card)}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Swipe indicators */}
              {index === 0 && dragState.isDragging && Math.abs(dragState.deltaX) > 20 && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {dragState.deltaX < 0 ? (
                    <div className="text-red-500 text-4xl font-bold">
                      ✕
                    </div>
                  ) : (
                    <div className="text-green-500 text-4xl font-bold">
                      ✓
                    </div>
                  )}
                </div>
              )}
              
              {/* Swipe direction overlay */}
              {index === 0 && swipeDirection && (
                <div 
                  className={`absolute inset-0 pointer-events-none ${
                    swipeDirection === 'left' 
                      ? 'bg-gradient-to-r from-red-500/40 via-red-400/25 to-transparent' 
                      : 'bg-gradient-to-l from-green-500/40 via-green-400/25 to-transparent'
                  } rounded-2xl`}
                />
              )}
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