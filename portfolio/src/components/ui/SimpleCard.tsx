'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { CardData, GitHubRepoData, DragState } from '../CardStack/types';

interface SimpleCardProps {
  card: CardData;
  index: number;
  dragState: DragState;
  swipeDirection: 'left' | 'right' | null;
  isAnimating: boolean;
  cardLayout: 'portrait' | 'landscape' | 'compact';
  scaleFactor: number;
  contentScale: number;
  actualCardDimensions: { width: number; height: number };
  githubData?: Record<string, GitHubRepoData>;
  onViewProject?: (card: CardData) => void;
  cardClassName?: string;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

export default memo(function SimpleCard({
  card,
  index,
  dragState,
  swipeDirection,
  isAnimating,
  cardLayout,
  actualCardDimensions,
  githubData,
  onViewProject,
  cardClassName = '',
  cardRef
}: SimpleCardProps) {
  // Calculate card transform based on drag state
  const getCardTransform = () => {
    const { isDragging, deltaX, deltaY } = dragState;
    
    if (index === 0 && isDragging) {
      return `translate(${deltaX}px, ${deltaY}px) rotate(${deltaX * 0.1}deg)`;
    }
    
    // Stack positioning for non-top cards
    if (index > 0) {
      const offset = index * 8;
      const rotation = index * 2;
      return `translate(${offset}px, ${offset}px) rotate(${rotation}deg) scale(${1 - index * 0.05})`;
    }
    
    return 'translate(0px, 0px) rotate(0deg)';
  };

  // Calculate card style
  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    width: `${actualCardDimensions.width}px`,
    height: `${actualCardDimensions.height}px`,
    transform: getCardTransform(),
    transition: isAnimating ? 'transform 0.3s ease-out' : 'transform 0.1s ease-out',
    zIndex: 10 - index,
    pointerEvents: index === 0 ? 'auto' : 'none',
    opacity: index < 3 ? 1 : 0,
  };

  // Determine if we should use overlay mode
  const shouldUseOverlay = cardLayout === 'compact' || actualCardDimensions.height < 200;

  // Get swipe indicator opacity
  const swipeProgress = Math.min(Math.abs(dragState.deltaX) / 100, 1);
  const isSwipingLeft = dragState.deltaX < 0;
  const isSwipingRight = dragState.deltaX > 0;

  // Render content based on layout
  const renderContent = () => {
    if (shouldUseOverlay) {
      return (
        <div className="relative w-full h-full bg-base01 rounded-lg overflow-hidden">
          {card.image && (
            <div className="absolute inset-0">
              <Image
                src={card.image}
                alt={card.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-lg flex flex-col justify-end text-white p-4">
            <div className="space-y-1">
              <h3 className="font-bold text-white text-lg leading-tight">
                {card.title}
              </h3>
              
              <p className="text-gray-200 text-sm leading-tight">
                {card.shortDescription || card.description}
              </p>
              
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2">
                  {card.startYear && (
                    <span className="text-gray-300 text-xs">
                      {card.startYear}{card.endYear && card.endYear !== card.startYear ? `-${card.endYear}` : ''}
                    </span>
                  )}
                  {card.githubRepo && githubData?.[card.githubRepo] && (
                    <span className="text-yellow-400 text-xs">
                      ⭐ {String(githubData[card.githubRepo].stars)}
                    </span>
                  )}
                </div>
                
                {onViewProject && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewProject(card);
                    }}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded text-white text-xs transition-colors duration-200"
                  >
                    View
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Portrait or landscape layout
    return (
      <div className="relative w-full h-full bg-base01 rounded-2xl overflow-hidden shadow-xl">
        {card.image && (
          <div className="h-64 relative">
            <Image
              src={card.image}
              alt={card.title}
              fill
              className="object-cover"
            />
          </div>
        )}
        
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-base05 mb-2">
              {card.title}
            </h3>
            
            {card.startYear && (
              <p className="text-base04 text-sm">
                {card.startYear}{card.endYear && card.endYear !== card.startYear ? `-${card.endYear}` : ''}
              </p>
            )}
          </div>
          
          <p className="text-base05 leading-relaxed">
            {card.description}
          </p>
          
          {card.tags && card.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {card.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-base02 text-base04 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2">
            {card.githubRepo && githubData?.[card.githubRepo] && (
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">
                  ⭐ {String(githubData[card.githubRepo].stars)}
                </span>
                <span className="text-base04 text-sm">
                  {String(githubData[card.githubRepo].language)}
                </span>
              </div>
            )}
            
            {onViewProject && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProject(card);
                }}
                className="px-4 py-2 bg-base0D hover:bg-base0C text-base00 rounded-lg transition-colors duration-200"
              >
                View Project
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={cardRef}
      className={`relative ${cardClassName}`}
      style={cardStyle}
    >
      {renderContent()}
      
      {/* Swipe indicators */}
      {index === 0 && dragState.isDragging && swipeProgress > 0.1 && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          {isSwipingLeft && (
            <div 
              className="text-red-500 text-4xl font-bold opacity-0 transition-opacity duration-150"
              style={{ opacity: swipeProgress }}
            >
              ✕
            </div>
          )}
          {isSwipingRight && (
            <div 
              className="text-green-500 text-4xl font-bold opacity-0 transition-opacity duration-150"
              style={{ opacity: swipeProgress }}
            >
              ✓
            </div>
          )}
        </div>
      )}
      
      {/* Swipe direction overlay */}
      {index === 0 && swipeDirection && (
        <div 
          className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-200 ${
            swipeDirection === 'left' 
              ? 'bg-gradient-to-r from-red-500/40 via-red-400/25 to-transparent' 
              : 'bg-gradient-to-l from-green-500/40 via-green-400/25 to-transparent'
          } ${shouldUseOverlay ? 'rounded-lg' : 'rounded-2xl'}`}
          style={{ opacity: 0.8 }}
        />
      )}
    </div>
  );
});