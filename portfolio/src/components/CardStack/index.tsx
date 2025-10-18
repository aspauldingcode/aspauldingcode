'use client';

import React, { useRef } from 'react';
import { CardStackProps } from './types';
import { useCardStack, useDragInteraction, useResponsiveLayout, useScrollPrevention } from './hooks';
import { getContainerStyle } from './utils';
import Card from './Card';

export default function CardStack({ 
  cards, 
  onSwipe, 
  onStackEmpty, 
  onSeeMore,
  // onViewProject,
  // dismissedCount = 0,
  className = '',
  cardClassName = '',
  swipedCardIds: externalSwipedCardIds,
  // githubData
}: CardStackProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Use the card stack hook for state management
  const {
    state,
    dispatch,
    handleSwipeComplete,
    resetStack,
    deck
  } = useCardStack(cards, externalSwipedCardIds, onSwipe, onStackEmpty);

  // Derive visible cards directly from the deck for simpler logic
  const visibleCards = deck ? deck.getVisibleCards(state.currentIndex, 3) : [];

  // Use drag interaction hook
  const dragHandlers = useDragInteraction(
    handleSwipeComplete,
    visibleCards,
    state.dragState,
    dispatch
  );

  // Use responsive layout hook
  useResponsiveLayout(dispatch);

  // Use scroll prevention hook
  useScrollPrevention(state.dragState.isDragging);

  // Auto-scaling should be handled by CSS container queries and flexbox
  // For now, we'll use a simple fixed scale approach based on layout
  // const contentScale = state.cardLayout === 'compact' ? 0.9 : 1;

  // Handle empty stack (only after deck is initialized)
  if (deck && visibleCards.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-96 ${className}`}>
        <p className="text-base04 text-lg mb-4">No more projects</p>
        {onSeeMore && (
          <button
            onClick={() => {
              resetStack();
              onSeeMore();
            }}
            className="px-6 py-3 bg-base0D hover:bg-base0C text-base00 rounded-lg transition-colors"
          >
            See More
          </button>
        )}
      </div>
    );
  }

  const containerStyle = getContainerStyle(state.cardLayout, state.scaleFactor);

  return (
    <div 
      className={`relative mx-auto ${className} card-stack-container`}
      style={containerStyle}
      onMouseMove={dragHandlers.handleMouseMove}
      onMouseUp={dragHandlers.handleMouseUp}
      onMouseLeave={dragHandlers.handleMouseUp}
    >
      {visibleCards.map((card, index) => (
        <Card
          key={card.id}
          card={card}
          index={index}
          dragState={state.dragState}
          swipeDirection={state.swipeDirection}
          isAnimating={state.isAnimating}
          cardLayout={state.cardLayout}
          scaleFactor={state.scaleFactor}
          contentScale={state.contentScale}
          actualCardDimensions={state.actualCardDimensions}
          // githubData={githubData}
          // onViewProject={onViewProject}
          onMouseDown={index === 0 ? dragHandlers.handleMouseDown : undefined}
          onTouchStart={index === 0 ? dragHandlers.handleTouchStart : undefined}
          onTouchMove={index === 0 ? dragHandlers.handleTouchMove : undefined}
          onTouchEnd={index === 0 ? dragHandlers.handleTouchEnd : undefined}
          cardClassName={cardClassName}
          cardRef={index === 0 ? cardRef : undefined}
        />
      ))}
    </div>
  );
}