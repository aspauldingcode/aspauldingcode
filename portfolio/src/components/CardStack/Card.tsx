'use client';

import React, { useRef, memo } from 'react';
import Image from 'next/image';
import { CardData, GitHubRepoData, DragState } from './types';
import { getCardStyle, shouldUseOverlayMode, getOptimalDescription, getDateLabel, truncateWords } from './utils';
import { useBackdropBlur } from '../../hooks/useOpaqueBlur';

interface CardProps {
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
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  cardClassName?: string;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

export default memo(function Card({
  card,
  index,
  dragState,
  swipeDirection,
  isAnimating,
  cardLayout,
  scaleFactor,
  contentScale,
  actualCardDimensions,
  githubData,
  onViewProject,
  onMouseDown,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  cardClassName = '',
  cardRef
}: CardProps) {
  const landscapeDescRef = useRef<HTMLDivElement>(null);
  const portraitDescRef = useRef<HTMLDivElement>(null);
  
  const landscapeBlur = useBackdropBlur(/*landscapeDescRef*/);
  const portraitBlur = useBackdropBlur(/*portraitDescRef*/);

  const { shouldUse: isOverlayMode, actualHeight } = shouldUseOverlayMode(cardLayout, scaleFactor);
  const isTopCard = index === 0;

  const cardStyle = getCardStyle(index, dragState, swipeDirection, isAnimating);

  // Spawn animation for new cards (when they first appear)
  const spawnStyle: React.CSSProperties = index > 0 && isAnimating ? {
    ...cardStyle,
    transform: `${cardStyle.transform} scale(0.8)`,
    opacity: 0.6,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  } : cardStyle;

  return (
    <div
      ref={cardRef}
      className={`absolute inset-0 rounded-2xl shadow-lg border border-base02 overflow-hidden select-none bg-base00 ${cardClassName}`}
      data-card-container
      style={{
        transformOrigin: '50% 100%',
        ...spawnStyle,
      }}
      onMouseDown={isTopCard ? onMouseDown : undefined}
      onTouchStart={isTopCard ? onTouchStart : undefined}
      onTouchMove={isTopCard ? onTouchMove : undefined}
      onTouchEnd={isTopCard ? onTouchEnd : undefined}
    >
      {/* Gradient Overlay for Swiping Effect */}
      <SwipeGradientOverlay
        index={index}
        dragState={dragState}
        swipeDirection={swipeDirection}
        isOverlayMode={isOverlayMode}
      />
      
      {/* Card Content */}
      {isOverlayMode ? (
        <OverlayModeContent
          card={card}
          contentScale={contentScale}
          actualHeight={actualHeight}
          githubData={githubData}
          onViewProject={onViewProject}
        />
      ) : cardLayout === 'landscape' ? (
        <LandscapeContent
          card={card}
          contentScale={contentScale}
          actualCardDimensions={actualCardDimensions}
          githubData={githubData}
          onViewProject={onViewProject}
          landscapeDescRef={landscapeDescRef}
          landscapeBlur={landscapeBlur}
        />
      ) : (
        <PortraitContent
          card={card}
          contentScale={contentScale}
          actualCardDimensions={actualCardDimensions}
          githubData={githubData}
          onViewProject={onViewProject}
          portraitDescRef={portraitDescRef}
          portraitBlur={portraitBlur}
        />
      )}

      {/* Swipe Indicators */}
      {isTopCard && dragState.isDragging && (
        <SwipeIndicators dragState={dragState} />
      )}
    </div>
  );
});

// Swipe gradient overlay component
const SwipeGradientOverlay = memo(function SwipeGradientOverlay({
  index,
  dragState,
  swipeDirection,
  isOverlayMode
}: {
  index: number;
  dragState: DragState;
  swipeDirection: 'left' | 'right' | null;
  isOverlayMode: boolean;
}) {
  const isTopCard = index === 0;
  const { deltaX } = dragState;

  const getGradientBackground = () => {
    if (isTopCard && swipeDirection) {
      // Exit animation gradient
      if (isOverlayMode) {
        if (swipeDirection === 'right') {
          return `linear-gradient(to top, var(--base0B) 0%, rgba(161, 181, 108, 0.3) 15%, rgba(0,0,0,0) 30%)`;
        } else if (swipeDirection === 'left') {
          return `linear-gradient(to top, var(--base08) 0%, rgba(171, 70, 66, 0.3) 15%, rgba(0,0,0,0) 30%)`;
        }
      } else {
        if (swipeDirection === 'right') {
          return `linear-gradient(to right, var(--base0B) 0%, rgba(161, 181, 108, 0.3) 15%, rgba(0,0,0,0) 30%)`;
        } else if (swipeDirection === 'left') {
          return `linear-gradient(to left, var(--base08) 0%, rgba(171, 70, 66, 0.3) 15%, rgba(0,0,0,0) 30%)`;
        }
      }
    } else if (isTopCard && Math.abs(deltaX) > 50) {
      const intensityProgress = (Math.abs(deltaX) - 50) / 100;
      const intensity = Math.min(intensityProgress, 1);
      
      if (isOverlayMode) {
        if (deltaX > 50) {
          return `linear-gradient(to top, rgba(161, 181, 108, ${intensity * 0.35}) 0%, rgba(161, 181, 108, ${intensity * 0.2}) 15%, rgba(0,0,0,0) 30%)`;
        } else if (deltaX < -50) {
          return `linear-gradient(to top, rgba(171, 70, 66, ${intensity * 0.35}) 0%, rgba(171, 70, 66, ${intensity * 0.2}) 15%, rgba(0,0,0,0) 30%)`;
        }
      } else {
        if (deltaX > 50) {
          return `linear-gradient(to right, rgba(161, 181, 108, ${intensity * 0.35}) 0%, rgba(161, 181, 108, ${intensity * 0.2}) 15%, rgba(0,0,0,0) 30%)`;
        } else if (deltaX < -50) {
          return `linear-gradient(to left, rgba(171, 70, 66, ${intensity * 0.35}) 0%, rgba(171, 70, 66, ${intensity * 0.2}) 15%, rgba(0,0,0,0) 30%)`;
        }
      }
    }
    
    return 'transparent';
  };

  const getOpacity = () => {
    if (isTopCard && swipeDirection) return 0.6;
    if (isTopCard && Math.abs(deltaX) > 30) {
      return Math.min(Math.abs(deltaX) / 100, 1);
    }
    return 0;
  };

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-50"
      style={{
        background: getGradientBackground(),
        borderRadius: '1rem',
        opacity: getOpacity(),
      }}
    />
  );
});

// Swipe indicators component
const SwipeIndicators = memo(function SwipeIndicators({ dragState }: { dragState: DragState }) {
  return (
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
  );
});

// Overlay mode content (for small cards)
const OverlayModeContent = memo(function OverlayModeContent({
  card,
  contentScale,
  actualHeight,
  githubData,
  onViewProject
}: {
  card: CardData;
  contentScale: number;
  actualHeight: number;
  githubData?: Record<string, GitHubRepoData>;
  onViewProject?: (card: CardData) => void;
}) {
  return (
    <div className="card-content w-full h-full relative" style={{ 
      transform: `scale(${contentScale})`, 
      transformOrigin: 'center center', 
      padding: '6px',
      boxSizing: 'border-box'
    }}>
      {/* Background Image */}
      {card.image && (
        <div className="absolute inset-0 w-full h-full rounded-lg overflow-hidden" style={{ 
          margin: '6px', 
          width: 'calc(100% - 12px)', 
          height: 'calc(100% - 12px)' 
        }}>
          <Image 
            src={card.image} 
            alt={card.title}
            width={320}
            height={448}
            className="w-full h-full object-cover rounded-lg"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg"></div>
        </div>
      )}
      
      {/* Overlaid Content */}
      <div 
        className="absolute inset-0 flex flex-col text-white" 
        style={{ 
          padding: '12px',
          position: 'absolute',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        {/* Top Section */}
        <div>
          <h3 className={`${actualHeight >= 180 ? 'text-lg' : actualHeight >= 150 ? 'text-base' : 'text-sm'} font-bold line-clamp-1 mb-1 drop-shadow-sm`} 
              style={{
                wordBreak: 'break-all',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                hyphens: 'none',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 1px 2px rgba(0,0,0,0.4)'
              }}>
            {card.title}
          </h3>
          
          {getDateLabel(card) && (
            <div className="text-xs opacity-90 drop-shadow-sm mb-1" style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.4)'
            }}>
              {getDateLabel(card)}
            </div>
          )}
          
          <p className={`opacity-90 drop-shadow-sm ${actualHeight > 180 ? 'text-sm' : 'text-xs'}`} style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.4)'
          }}>
            {truncateWords(card.threeWordDescriptor || card.description, actualHeight > 200 ? 5 : 3)}
          </p>
        </div>
        
        <div className="flex-1 min-h-0"></div>
        
        {/* Bottom Section */}
        <div className="flex-shrink-0">
          {/* GitHub Stats */}
          {card.githubRepo && githubData?.[card.githubRepo] && (
            <div className="flex justify-center mb-2">
              <div className="flex items-center text-white font-mono text-xs drop-shadow-lg" style={{ gap: '8px' }}>
                {githubData[card.githubRepo].stargazers_count > 0 && (
                  <div className="flex items-center" style={{ gap: '3px' }}>
                    <span style={{fontFamily: 'NerdFont, monospace'}}>󰓎</span>
                    <span style={{fontFamily: 'NerdFont, monospace'}}>{githubData[card.githubRepo].stargazers_count}</span>
                  </div>
                )}
                {githubData[card.githubRepo].forks_count > 0 && (
                  <div className="flex items-center" style={{ gap: '3px' }}>
                    <span style={{fontFamily: 'NerdFont, monospace'}}>󰘬</span>
                    <span style={{fontFamily: 'NerdFont, monospace'}}>{githubData[card.githubRepo].forks_count}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* View Project Button */}
          <div className="flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewProject?.(card);
              }}
              className="bg-base0D hover:bg-base0C px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-200 shadow-lg"
              style={{ 
                gap: '8px',
                color: 'var(--base07)'
              }}
            >
              {contentScale >= 0.95 ? 'View Project' : 'View'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Landscape content component
const LandscapeContent = memo(function LandscapeContent({
  card,
  contentScale,
  actualCardDimensions,
  githubData,
  onViewProject,
  landscapeDescRef,
  landscapeBlur
}: {
  card: CardData;
  contentScale: number;
  actualCardDimensions: { width: number; height: number };
  githubData?: Record<string, GitHubRepoData>;
  onViewProject?: (card: CardData) => void;
  landscapeDescRef: React.RefObject<HTMLDivElement | null>;
  landscapeBlur: React.CSSProperties;
}) {
  return (
    <div className="card-content w-full h-full" style={{ 
      transform: `scale(${contentScale})`, 
      transformOrigin: 'center center', 
      padding: '6px',
      boxSizing: 'border-box'
    }}>
      <div className="h-full flex min-h-0 overflow-hidden" style={{ 
        gap: '6px',
        margin: '0',
        padding: '0',
        width: '100%',
        height: '100%'
      }}>
        {/* Image Section */}
        {card.image && (
          <div className="flex-shrink-0" style={{ 
            width: `${45 + (contentScale - 0.8) / 0.6 * 10}%`,
            height: '100%',
            margin: '0',
            padding: '0'
          }}>
            <div className="w-full h-full bg-base02 rounded-lg overflow-hidden">
              <Image 
                src={card.image} 
                alt={card.title}
                width={500}
                height={350}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          </div>
        )}
        
        {/* Content Section */}
        <div className="flex-1 min-h-0 flex flex-col" style={{ gap: '6px' }}>
          {/* Header */}
          <div className="flex-shrink-0">
            <h3 className="font-bold text-base05 text-lg mb-2">{card.title}</h3>
            {getDateLabel(card) && (
              <div className="text-xs text-base0D font-medium opacity-80 mb-2">
                {getDateLabel(card)}
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="flex-1 min-h-0">
            <div 
              ref={landscapeDescRef}
              className="text-base04 text-xs flex-1 overflow-hidden glass-overlay-advanced"
              style={{ 
                border: '1px solid var(--base02)',
                borderRadius: '0.5rem',
                ...landscapeBlur
              }}
            >
              <p style={{ 
                margin: '0',
                padding: '6px',
                lineHeight: '1.3',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                textAlign: 'justify',
                position: 'relative',
                zIndex: 10
              }}>
                {getOptimalDescription(card, actualCardDimensions.width, actualCardDimensions.height, true)}
              </p>
            </div>
          </div>
          
          {/* View Project Button and Meta Row Container */}
          <div className="flex-shrink-0" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            marginBottom: '8px' // 8px distance to inside edge
          }}>
            {/* View Project Button */}
            {onViewProject && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProject(card);
                }}
                className="w-full bg-base0C hover:bg-base0D text-base00 transition-colors font-medium text-xs py-1.5 px-3 rounded-lg"
              >
                {contentScale >= 0.95 ? 'View Project' : 'View'}
              </button>
            )}

            {/* Meta Row - Only show if there are tags or GitHub stats */}
            {((card.tags && card.tags.length > 0) || 
              (card.githubRepo && githubData?.[card.githubRepo] && 
               (githubData[card.githubRepo].stargazers_count > 0 || githubData[card.githubRepo].forks_count > 0))) && (
              <div className="flex items-center justify-between min-w-0 overflow-hidden">
                <div className="flex flex-wrap flex-shrink min-w-0" style={{ gap: '6px' }}>
                  {card.tags && card.tags.slice(0, 2).map((tag, tagIndex) => (
                    <span 
                      key={tagIndex}
                      className="bg-base0A text-base00 rounded-full flex-shrink-0"
                      style={{
                        fontSize: contentScale < 0.75 ? '8px' : '10px',
                        padding: '4px 8px',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {card.githubRepo && githubData?.[card.githubRepo] && (
                  <div className="flex items-center text-base04 font-mono flex-shrink-0" style={{
                    fontSize: contentScale < 0.75 ? '10px' : '12px',
                    gap: '6px',
                  }}>
                    {githubData[card.githubRepo].stargazers_count > 0 && (
                      <div className="flex items-center" style={{ gap: '6px' }}>
                        <span style={{fontFamily: 'NerdFont, monospace'}}>󰓎</span>
                        <span style={{fontFamily: 'NerdFont, monospace'}}>{githubData[card.githubRepo].stargazers_count}</span>
                      </div>
                    )}
                    {githubData[card.githubRepo].forks_count > 0 && (
                      <div className="flex items-center" style={{ gap: '6px' }}>
                        <span style={{fontFamily: 'NerdFont, monospace'}}>󰘬</span>
                        <span style={{fontFamily: 'NerdFont, monospace'}}>{githubData[card.githubRepo].forks_count}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Portrait content component
const PortraitContent = memo(function PortraitContent({
  card,
  contentScale,
  actualCardDimensions,
  githubData,
  onViewProject,
  portraitDescRef,
  portraitBlur,
  
}: {
  card: CardData;
  contentScale: number;
  actualCardDimensions: { width: number; height: number };
  githubData?: Record<string, GitHubRepoData>;
  onViewProject?: (card: CardData) => void;
  portraitDescRef: React.RefObject<HTMLDivElement | null>;
  portraitBlur: React.CSSProperties;
}) {
  return (
    <div className="card-content w-full h-full" style={{ 
      transform: `scale(${contentScale})`, 
      transformOrigin: 'center center', 
      padding: '6px',
      boxSizing: 'border-box'
    }}>
      <div className="h-full flex flex-col min-h-0 overflow-hidden" style={{ gap: '6px' }}>
        {/* Image Section */}
        {card.image && (
          <div className="w-full flex-shrink-0" style={{ 
            height: `${35 + (contentScale - 0.8) / 0.6 * 25}%`,
          }}>
            <div className="w-full h-full bg-base02 rounded-lg overflow-hidden">
              <Image 
                src={card.image} 
                alt={card.title}
                width={400}
                height={300}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          </div>
        )}
        
        {/* Content Section */}
        <div className="flex-1 min-h-0 flex flex-col" style={{ gap: '6px' }}>
          {/* Header */}
          <div className="flex-shrink-0">
            <h3 className="font-bold text-base05 text-lg mb-2">{card.title}</h3>
            {getDateLabel(card) && (
              <div className="text-xs text-base0D font-medium opacity-80 mb-2">
                {getDateLabel(card)}
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="flex-1 min-h-0">
            <div 
              ref={portraitDescRef}
              className="text-base04 text-xs flex-1 overflow-hidden glass-overlay-advanced"
              style={{ 
                border: '1px solid var(--base02)',
                borderRadius: '0.5rem',
                ...portraitBlur
              }}
            >
              <p style={{ 
                margin: '0',
                padding: '6px',
                lineHeight: '1.3',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                textAlign: 'justify',
                position: 'relative',
                zIndex: 10
              }}>
                {getOptimalDescription(card, actualCardDimensions.width, actualCardDimensions.height, false)}
              </p>
            </div>
          </div>
          
          {/* View Project Button and Meta Row Container */}
          <div className="flex-shrink-0" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            marginBottom: '8px' // 8px distance to inside edge
          }}>
            {/* View Project Button */}
            {onViewProject && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProject(card);
                }}
                className="w-full bg-base0C hover:bg-base0D text-base00 transition-colors font-medium text-xs py-1.5 px-3 rounded-lg"
              >
                {contentScale >= 0.95 ? 'View Project' : 'View'}
              </button>
            )}

            {/* Meta Row - Only show if there are tags or GitHub stats */}
            {((card.tags && card.tags.length > 0) || 
              (card.githubRepo && githubData?.[card.githubRepo] && 
               (githubData[card.githubRepo].stargazers_count > 0 || githubData[card.githubRepo].forks_count > 0))) && (
              <div className="flex items-center justify-between min-w-0 overflow-hidden">
                <div className="flex flex-wrap flex-shrink min-w-0" style={{ gap: '6px' }}>
                  {card.tags && card.tags.slice(0, 2).map((tag, tagIndex) => (
                    <span 
                      key={tagIndex}
                      className="bg-base0A text-base00 rounded-full flex-shrink-0"
                      style={{
                        fontSize: contentScale < 0.75 ? '8px' : '10px',
                        padding: '4px 8px',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {card.githubRepo && githubData?.[card.githubRepo] && (
                  <div className="flex items-center text-base04 font-mono flex-shrink-0" style={{
                    fontSize: contentScale < 0.75 ? '10px' : '12px',
                    gap: '6px',
                  }}>
                    {githubData[card.githubRepo].stargazers_count > 0 && (
                      <div className="flex items-center" style={{ gap: '6px' }}>
                        <span style={{fontFamily: 'NerdFont, monospace'}}>󰓎</span>
                        <span style={{fontFamily: 'NerdFont, monospace'}}>{githubData[card.githubRepo].stargazers_count}</span>
                      </div>
                    )}
                    {githubData[card.githubRepo].forks_count > 0 && (
                      <div className="flex items-center" style={{ gap: '6px' }}>
                        <span style={{fontFamily: 'NerdFont, monospace'}}>󰘬</span>
                        <span style={{fontFamily: 'NerdFont, monospace'}}>{githubData[card.githubRepo].forks_count}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});