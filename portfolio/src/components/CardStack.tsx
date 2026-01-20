'use client';

import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import Image from 'next/image';
import { GitHubRepoData } from '../lib/github';
import { useBackdropBlur } from '../hooks/useOpaqueBlur';

interface CardData {
  id: string;
  title: string;
  description: string;
  shortDescription?: string; // Add shortDescription field
  threeWordDescriptor: string; // Add threeWordDescriptor field - required to match projects page
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
  likedCount?: number;
  onViewLiked?: () => void;
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
  initialCardRect?: DOMRect;
}

const SWIPE_THRESHOLD = 75; // Reduced for easier swiping
const ROTATION_FACTOR = 0.15; // Increased for more responsive rotation
const MAX_ROTATION = 20; // Increased max rotation

// Playing card aspect ratio constants (2.5:3.5 = 5:7)
const CARD_ASPECT_RATIO = 5 / 7; // Width to height ratio
const BASE_CARD_WIDTH = 320; // Base width in pixels
const BASE_CARD_HEIGHT = BASE_CARD_WIDTH / CARD_ASPECT_RATIO; // 448px (maintains 5:7 ratio)

// Max card dimensions - 500px maximum for both orientations
const MAX_CARD_DIMENSION_PX = 500; // Maximum dimension (height for portrait, width for landscape)
const MAX_PORTRAIT_HEIGHT = MAX_CARD_DIMENSION_PX; // 500px
const MAX_PORTRAIT_WIDTH = MAX_PORTRAIT_HEIGHT * CARD_ASPECT_RATIO; // ~357px
const MAX_LANDSCAPE_WIDTH = MAX_CARD_DIMENSION_PX; // 500px  
const MAX_LANDSCAPE_HEIGHT = MAX_LANDSCAPE_WIDTH / CARD_ASPECT_RATIO; // ~700px, but capped by width

// Threshold for switching to overlay mode when cards become too small
const OVERLAY_MODE_THRESHOLD = 200; // Switch to overlay when height < 200px

export default function CardStack({
  cards,
  onSwipe,
  onStackEmpty,
  onSeeMore,
  onViewProject,
  dismissedCount = 0,
  likedCount = 0,
  onViewLiked,
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
    initialCardRect: undefined,
  });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [cardLayout, setCardLayout] = useState<'portrait' | 'landscape' | 'compact'>('portrait');
  const layoutRef = useRef(cardLayout);

  // Keep ref in sync with state
  useEffect(() => {
    layoutRef.current = cardLayout;
  }, [cardLayout]);

  const [scaleFactor, setScaleFactor] = useState(1);
  const [contentScale, setContentScale] = useState(1);
  const [actualCardDimensions, setActualCardDimensions] = useState({ width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Add refs for opaque blur elements
  const landscapeDescRef = useRef<HTMLDivElement>(null);
  const portraitDescRef = useRef<HTMLDivElement>(null);

  // Use advanced opaque blur hooks
  const landscapeBlur = useBackdropBlur(/*landscapeDescRef*/);
  const portraitBlur = useBackdropBlur(/*portraitDescRef*/);

  // Reset currentIndex and swipedCardIds when component is re-mounted (key changes)
  useEffect(() => {
    setCurrentIndex(0);
    setSwipedCardIds(new Set());
  }, []);

  // Responsive layout detection with improved scaling
  useEffect(() => {
    const updateLayout = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Dynamic margin calculation based on screen size
      const horizontalMargin = Math.max(20, Math.min(60, vw * 0.05)); // 2-6% of width, min 20px, max 60px
      const verticalReserved = Math.max(120, Math.min(200, vh * 0.25)); // 12-25% of height for UI elements

      const availableWidth = vw - (horizontalMargin * 2);
      const availableHeight = vh - verticalReserved;

      // Calculate how each orientation would fit
      const portraitWidthScale = availableWidth / BASE_CARD_WIDTH;
      const portraitHeightScale = availableHeight / BASE_CARD_HEIGHT;
      const portraitScale = Math.min(portraitWidthScale, portraitHeightScale);

      // For landscape, we swap dimensions (card becomes wider than tall)
      const landscapeWidthScale = availableWidth / BASE_CARD_HEIGHT; // Landscape card is wider
      const landscapeHeightScale = availableHeight / BASE_CARD_WIDTH; // Landscape card is shorter
      const landscapeScale = Math.min(landscapeWidthScale, landscapeHeightScale);

      // Determine the best layout based on which gives better utilization
      let newLayout: 'portrait' | 'landscape' | 'compact' = 'portrait';
      let newScaleFactor = portraitScale;

      // Key conditions for layout selection
      const heightConstrained = portraitHeightScale < portraitWidthScale; // Height is the limiting factor
      const hasWideSpace = vw >= 640; // Minimum width for landscape to make sense
      const spaceAspectRatio = availableWidth / availableHeight;
      const isWideSpace = spaceAspectRatio > 1.4; // Space is significantly wider than tall

      // Enhanced height constraint detection - more aggressive switching when height is limited
      const heightSeverelyConstrained = portraitHeightScale < 0.8; // Lowered from 0.7 for earlier detection
      const heightCriticallyConstrained = portraitHeightScale < 0.6; // More critical threshold
      const heightDominatesConstraint = portraitHeightScale < portraitWidthScale * 0.9; // More lenient ratio
      const landscapeOffersImprovement = landscapeScale > portraitScale * 1.1; // Reduced from 1.2 to 1.1
      const landscapeOffersSignificantImprovement = landscapeScale > portraitScale * 1.3; // Increased for truly significant cases
      const minimumViableWidth = vw >= 400; // Reduced from 480 for more aggressive switching
      const reasonableWidth = vw >= 320; // Even more lenient for very constrained scenarios

      // Add hysteresis to prevent rapid switching between layouts
      const currentLayout = layoutRef.current;
      const LAYOUT_SWITCH_THRESHOLD = 0.15; // 15% better to switch layouts
      const HEIGHT_PRIORITY_THRESHOLD = 0.08; // Reduced threshold when height is constrained

      // Use different thresholds based on height constraints
      const activeThreshold = (heightSeverelyConstrained || heightCriticallyConstrained)
        ? HEIGHT_PRIORITY_THRESHOLD
        : LAYOUT_SWITCH_THRESHOLD;

      // Calculate thresholds based on current layout to add stability
      const landscapeThreshold = currentLayout === 'landscape'
        ? portraitScale * (1 - activeThreshold) // Stay in landscape unless portrait is significantly better
        : portraitScale * (1 + activeThreshold); // Switch to landscape only if significantly better

      const portraitThreshold = currentLayout === 'portrait'
        ? landscapeScale * (1 - activeThreshold) // Stay in portrait unless landscape is significantly better
        : landscapeScale * (1 + activeThreshold); // Switch to portrait only if significantly better

      // Layout decision with enhanced height-priority logic
      if (heightCriticallyConstrained && reasonableWidth && landscapeOffersImprovement) {
        // Critical height constraint: switch to landscape even with very limited width
        newLayout = 'landscape';
        newScaleFactor = landscapeScale;
      } else if (heightSeverelyConstrained && minimumViableWidth && landscapeOffersImprovement) {
        // Severe height constraint: favor landscape when height is severely limited
        if (currentLayout === 'landscape' && landscapeScale > portraitThreshold) {
          // Stay in landscape
          newLayout = 'landscape';
          newScaleFactor = landscapeScale;
        } else if (currentLayout !== 'landscape' && landscapeScale > landscapeThreshold) {
          // Switch to landscape due to height constraints
          newLayout = 'landscape';
          newScaleFactor = landscapeScale;
        } else {
          // Use portrait if hysteresis prevents switching
          newLayout = 'portrait';
          newScaleFactor = portraitScale;
        }
      } else if (heightConstrained && heightDominatesConstraint && minimumViableWidth && landscapeOffersSignificantImprovement) {
        // Height-priority switching: favor landscape when height dominates the constraint
        if (currentLayout === 'landscape' && landscapeScale > portraitThreshold) {
          // Stay in landscape
          newLayout = 'landscape';
          newScaleFactor = landscapeScale;
        } else if (currentLayout !== 'landscape' && landscapeScale > landscapeThreshold) {
          // Switch to landscape due to height constraints
          newLayout = 'landscape';
          newScaleFactor = landscapeScale;
        } else {
          // Use portrait if hysteresis prevents switching
          newLayout = 'portrait';
          newScaleFactor = portraitScale;
        }
      } else if (hasWideSpace && (heightConstrained || isWideSpace)) {
        // Standard wide space logic: prefer landscape if it's viable
        if (currentLayout === 'landscape' && landscapeScale > portraitThreshold) {
          // Stay in landscape
          newLayout = 'landscape';
          newScaleFactor = landscapeScale;
        } else if (currentLayout !== 'landscape' && landscapeScale > landscapeThreshold) {
          // Switch to landscape
          newLayout = 'landscape';
          newScaleFactor = landscapeScale;
        } else {
          // Use portrait
          newLayout = 'portrait';
          newScaleFactor = portraitScale;
        }
      } else if (vw < 420 || Math.max(portraitScale, landscapeScale) < 0.6) {
        // Compact mode for very small screens or when neither orientation fits well
        newLayout = 'compact';
        newScaleFactor = Math.max(portraitScale, landscapeScale);
      } else {
        // Default to portrait for narrow screens
        newLayout = 'portrait';
        newScaleFactor = portraitScale;
      }

      // Clamp scale factor to reasonable bounds
      newScaleFactor = Math.max(0.35, Math.min(1.8, newScaleFactor));

      // Only update when values actually change to avoid re-render loops
      setCardLayout(prev => (prev !== newLayout ? newLayout : prev));
      setScaleFactor(prev => (Math.abs(prev - newScaleFactor) > 0.0001 ? newScaleFactor : prev));
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
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

  // Auto-scale inner content to fit within card bounds (grow or shrink)
  useLayoutEffect(() => {
    const cardEl = cardRef.current;
    if (!cardEl) return;

    const inner = cardEl.querySelector('.card-content') as HTMLElement | null;
    if (!inner) return;

    const availableW = cardEl.clientWidth;
    const availableH = cardEl.clientHeight;

    const contentW = inner.scrollWidth; // unaffected by transforms
    const contentH = inner.scrollHeight; // unaffected by transforms

    // Update actual card dimensions for description calculation
    setActualCardDimensions(prev => {
      const newDimensions = { width: availableW, height: availableH };
      if (prev.width !== newDimensions.width || prev.height !== newDimensions.height) {
        return newDimensions;
      }
      return prev;
    });

    if (contentW === 0 || contentH === 0 || availableW === 0 || availableH === 0) {
      return;
    }

    let newScale = Math.min(availableW / contentW, availableH / contentH);
    // Remove the buffer that prevents content from touching edges, and cap growth
    newScale = Math.min(newScale, 1.25);
    // Prevent overly tiny content
    newScale = Math.max(0.5, newScale);

    // Only update if the scale has changed significantly to prevent infinite loops
    setContentScale(prevScale => {
      const scaleDiff = Math.abs(prevScale - newScale);
      return scaleDiff > 0.01 ? newScale : prevScale;
    });
  }, [cardLayout, scaleFactor, currentIndex, visibleCards.length]);

  // Helpers: date label and scale-aware description truncation
  const getDateLabel = (card: CardData) => {
    if (!(card.startYear || card.endYear)) return '';
    if (card.startYear && card.endYear) {
      return card.startYear === card.endYear
        ? card.startYear.toString()
        : `${card.startYear} - ${card.endYear}`;
    }
    if (card.startYear) {
      return `${card.startYear} - Present`;
    }
    return card.endYear?.toString() || '';
  };

  const truncateWords = (text: string | undefined, maxWords: number) => {
    if (!text) return '';
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '…';
  };

  // Function to determine optimal text content with different thresholds for landscape vs portrait
  const getOptimalDescription = (card: CardData, containerWidth: number, containerHeight: number, isLandscape: boolean) => {
    const fullDesc = card.description;
    const shortDesc = card.shortDescription || card.description;

    // Calculate available space for text content
    const textAreaWidth = containerWidth * 0.8; // Only 80% of container width for text
    const textAreaHeight = containerHeight * 0.3; // Only 30% of container height for text
    const avgCharWidth = 8;
    const lineHeight = 20;
    const maxLinesAvailable = Math.floor(textAreaHeight / lineHeight);
    const maxCharsPerLine = Math.floor(textAreaWidth / avgCharWidth);
    const maxCharsAvailable = maxLinesAvailable * maxCharsPerLine;

    // Different thresholds for landscape vs portrait cards
    const threshold = isLandscape ? 125 : 150;

    // Use long description if we have space for threshold+ chars AND long desc has threshold+ chars
    // Otherwise use short description
    // Let CSS handle all visual truncation with line clamping
    if (maxCharsAvailable >= threshold && fullDesc.length > threshold) {
      return fullDesc;
    } else {
      return shortDesc;
    }
  };

  const handleStart = useCallback((clientX: number, clientY: number) => {
    // Capture the card's initial position when drag starts
    const cardEl = cardRef.current;
    let initialCardRect: DOMRect | undefined;
    if (cardEl) {
      initialCardRect = cardEl.getBoundingClientRect();
    }

    setDragState({
      isDragging: true,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      deltaX: 0,
      deltaY: 0,
      initialCardRect,
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
      initialCardRect: undefined,
    });
  }, [dragState, availableCards, onSwipe, onStackEmpty, visibleCards, externalSwipedCardIds]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleMouseLeave = () => {
    handleEnd();
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
        // Dragging state with fixed positioning to overlay everything
        const rotation = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, deltaX * ROTATION_FACTOR));

        // Use the initial card position captured at drag start for consistent positioning
        const initialRect = dragState.initialCardRect;
        if (initialRect) {
          // Calculate position based on initial card position plus drag offset
          const finalX = initialRect.left + deltaX;
          const finalY = initialRect.top + deltaY * 0.5;

          return {
            position: 'fixed',
            left: `${finalX}px`,
            top: `${finalY}px`,
            width: `${initialRect.width}px`,
            height: `${initialRect.height}px`,
            transform: `rotate(${rotation}deg)`,
            zIndex: 9999, // Very high z-index to overlay everything
            transition: 'none', // Remove transition during drag for immediate response
            cursor: 'grabbing',
            pointerEvents: 'auto',
          };
        }

        // Fallback to previous method if initialRect is not available
        const cardEl = cardRef.current;
        let cardRect = { left: 0, top: 0, width: 0, height: 0 };
        if (cardEl) {
          const rect = cardEl.getBoundingClientRect();
          cardRect = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          };
        }

        // Calculate the center position for the card
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;

        // Apply drag offset from the center position
        const finalX = centerX + deltaX - cardRect.width / 2;
        const finalY = centerY + deltaY * 0.5 - cardRect.height / 2;

        return {
          position: 'fixed',
          left: `${finalX}px`,
          top: `${finalY}px`,
          transform: `rotate(${rotation}deg)`,
          zIndex: 9999, // Very high z-index to overlay everything
          transition: 'none', // Remove transition during drag for immediate response
          cursor: 'grabbing',
          pointerEvents: 'auto',
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
    // Calculate remaining dismissed cards that haven't been viewed yet
    const remainingDismissedCards = dismissedCount > 0 ? dismissedCount : 0;

    return (
      <div className={`flex flex-col items-center justify-center h-96 ${className}`}>
        <p className="text-base04 text-lg mb-4">No more projects</p>
        {remainingDismissedCards > 0 && onSeeMore ? (
          <button
            onClick={() => {
              setCurrentIndex(0); // Reset the card index to show all cards again
              onSeeMore();
            }}
            className="px-6 py-3 bg-base0D hover:bg-base0C text-base00 rounded-lg transition-colors"
          >
            View More ({remainingDismissedCards})
          </button>
        ) : likedCount > 0 && onViewLiked ? (
          <button
            onClick={onViewLiked}
            className="px-6 py-3 bg-base0C hover:bg-base0D text-base00 rounded-lg transition-colors"
          >
            View Liked ({likedCount})
          </button>
        ) : null}
      </div>
    );
  }

  // Dynamic container sizing based on layout and playing card ratio
  const getContainerClasses = () => {
    const baseClasses = "relative mx-auto";

    // Remove fixed max-width constraints to allow better space utilization
    if (cardLayout === 'landscape') {
      return `${baseClasses} w-full`;
    } else if (cardLayout === 'compact') {
      return `${baseClasses} w-full`;
    } else {
      return `${baseClasses} w-full`;
    }
  };

  const getContainerStyle = (): React.CSSProperties => {
    // For landscape layout, rotate the card dimensions (7:5 instead of 5:7)
    const isLandscapeCard = cardLayout === 'landscape';
    const baseWidth = isLandscapeCard ? BASE_CARD_HEIGHT : BASE_CARD_WIDTH; // Swap for landscape
    const baseHeight = isLandscapeCard ? BASE_CARD_WIDTH : BASE_CARD_HEIGHT; // Swap for landscape

    // Apply max size caps based on orientation - both orientations max out at 330px
    const maxWidth = isLandscapeCard ? MAX_LANDSCAPE_WIDTH : MAX_PORTRAIT_WIDTH;
    const maxHeight = isLandscapeCard ? MAX_LANDSCAPE_HEIGHT : MAX_PORTRAIT_HEIGHT;

    const maxScaleByWidth = maxWidth / baseWidth;
    const maxScaleByHeight = maxHeight / baseHeight;
    const effectiveScale = Math.min(scaleFactor, maxScaleByWidth, maxScaleByHeight);

    // Calculate actual dimensions
    const actualWidth = baseWidth * effectiveScale;
    const actualHeight = baseHeight * effectiveScale;

    return {
      width: `${actualWidth}px`,
      height: `${actualHeight}px`,
      maxWidth: '100vw', // Prevent overflow on very small screens
      maxHeight: '100vh', // Prevent overflow on very small screens
      transform: `scale(1)`,
      transformOrigin: 'center center',
      position: 'relative',
      margin: '0 auto',
      // Ensure the container doesn't cause layout issues
      boxSizing: 'border-box',
    };
  };

  // Determine if we should use overlay mode based on card size
  const shouldUseOverlayMode = () => {
    const isLandscapeCard = cardLayout === 'landscape';
    const baseHeight = isLandscapeCard ? BASE_CARD_WIDTH : BASE_CARD_HEIGHT;
    const maxHeight = isLandscapeCard ? MAX_LANDSCAPE_HEIGHT : MAX_PORTRAIT_HEIGHT;
    const maxScaleByHeight = maxHeight / baseHeight;
    const effectiveScale = Math.min(scaleFactor, maxScaleByHeight);
    const actualHeight = baseHeight * effectiveScale;

    return { shouldUse: actualHeight < OVERLAY_MODE_THRESHOLD, actualHeight };
  };

  const { shouldUse: isOverlayMode, actualHeight } = shouldUseOverlayMode();

  return (
    <div
      className={`${getContainerClasses()} ${className} card-stack-container`}
      style={getContainerStyle()}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {visibleCards.map((card, index) => (
        <div
          key={`${card.id}-${currentIndex + index}`}
          ref={index === 0 ? cardRef : null}
          className={`absolute inset-0 rounded-2xl shadow-lg border border-base02 overflow-hidden select-none bg-base00 ${cardClassName}`}
          data-card-container
          style={{
            transformOrigin: '50% 100%',
            ...getCardStyle(index),
          }}
          onMouseDown={index === 0 ? handleMouseDown : undefined}
          onTouchStart={index === 0 ? handleTouchStart : undefined}
          onTouchMove={index === 0 ? handleTouchMove : undefined}
          onTouchEnd={index === 0 ? handleTouchEnd : undefined}
        >
          {/* Gradient Overlay for Swiping Effect - Applied to all card types */}
          <div
            className="absolute inset-0 pointer-events-none z-50"
            style={{
              background: (() => {
                const { deltaX } = dragState;
                const isTopCard = index === 0;

                if (isTopCard && swipeDirection) {
                  // Exit animation gradient
                  if (isOverlayMode) {
                    // Mini overlay cards - bottom edge gradient
                    if (swipeDirection === 'right') {
                      // Green gradient on bottom edge for like action
                      return `linear-gradient(to top, var(--base0B) 0%, rgba(161, 181, 108, 0.3) 15%, rgba(0,0,0,0) 30%)`;
                    } else if (swipeDirection === 'left') {
                      // Red gradient on bottom edge for pass action
                      return `linear-gradient(to top, var(--base08) 0%, rgba(171, 70, 66, 0.3) 15%, rgba(0,0,0,0) 30%)`;
                    }
                  } else {
                    // Portrait/landscape cards - side edge gradients
                    if (swipeDirection === 'right') {
                      // Green gradient on left edge for like action
                      return `linear-gradient(to right, var(--base0B) 0%, rgba(161, 181, 108, 0.3) 15%, rgba(0,0,0,0) 30%)`;
                    } else if (swipeDirection === 'left') {
                      // Red gradient on right edge for pass action
                      return `linear-gradient(to left, var(--base08) 0%, rgba(171, 70, 66, 0.3) 15%, rgba(0,0,0,0) 30%)`;
                    }
                  }
                } else if (isTopCard && Math.abs(deltaX) > 50) {
                  // Start gradient only when icons change color (at 50px threshold)
                  if (isOverlayMode) {
                    // Mini overlay cards - bottom edge gradient
                    if (deltaX > 50) {
                      // Green gradient on bottom edge for right swipe (like)
                      const intensityProgress = (Math.abs(deltaX) - 50) / 100; // 0 to 1 over 100px range
                      const intensity = Math.min(intensityProgress, 1);
                      return `linear-gradient(to top, rgba(161, 181, 108, ${intensity * 0.35}) 0%, rgba(161, 181, 108, ${intensity * 0.2}) 15%, rgba(0,0,0,0) 30%)`;
                    } else if (deltaX < -50) {
                      // Red gradient on bottom edge for left swipe (pass)
                      const intensityProgress = (Math.abs(deltaX) - 50) / 100; // 0 to 1 over 100px range
                      const intensity = Math.min(intensityProgress, 1);
                      return `linear-gradient(to top, rgba(171, 70, 66, ${intensity * 0.35}) 0%, rgba(171, 70, 66, ${intensity * 0.2}) 15%, rgba(0,0,0,0) 30%)`;
                    }
                  } else {
                    // Portrait/landscape cards - side edge gradients
                    if (deltaX > 50) {
                      // Green gradient on left edge for right swipe (like)
                      const intensityProgress = (Math.abs(deltaX) - 50) / 100; // 0 to 1 over 100px range
                      const intensity = Math.min(intensityProgress, 1);
                      return `linear-gradient(to right, rgba(161, 181, 108, ${intensity * 0.35}) 0%, rgba(161, 181, 108, ${intensity * 0.2}) 15%, rgba(0,0,0,0) 30%)`;
                    } else if (deltaX < -50) {
                      // Red gradient on right edge for left swipe (pass)
                      const intensityProgress = (Math.abs(deltaX) - 50) / 100; // 0 to 1 over 100px range
                      const intensity = Math.min(intensityProgress, 1);
                      return `linear-gradient(to left, rgba(171, 70, 66, ${intensity * 0.35}) 0%, rgba(171, 70, 66, ${intensity * 0.2}) 15%, rgba(0,0,0,0) 30%)`;
                    }
                  }
                }

                return 'transparent';
              })(),
              borderRadius: '1rem',
              opacity: (() => {
                const { deltaX } = dragState;
                const isTopCard = index === 0;

                if (isTopCard && swipeDirection) return 0.6; // Reduced from 1 to 0.6 for more subtle exit animation
                if (isTopCard && Math.abs(deltaX) > 30) {
                  return Math.min(Math.abs(deltaX) / 100, 1);
                }
                return 0;
              })()
            }}
          />

          {/* Card Content - Dynamic Layout */}
          {isOverlayMode ? (
            // Overlay Mode: Text and button overlaid on image for small cards
            <div className="card-content w-full h-full relative" style={{
              transform: `scale(${contentScale})`,
              transformOrigin: 'center center',
              padding: '6px',
              boxSizing: 'border-box'
            }}>
              {/* Background Image */}
              {card.image && (
                <div className="absolute inset-0 w-full h-full rounded-lg overflow-hidden" style={{ margin: '6px', width: 'calc(100% - 12px)', height: 'calc(100% - 12px)' }}>
                  <Image
                    src={card.image}
                    alt={card.title}
                    width={320}
                    height={448}
                    className="w-full h-full object-cover rounded-lg"
                    draggable={false}
                  />
                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg"></div>
                </div>
              )}

              {/* Overlaid Content - Simple overlay without glass effects for mini cards */}
              <div
                className="absolute inset-0 flex flex-col text-white"
                style={{
                  padding: '12px',
                  position: 'absolute',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}
              >
                {/* Top Section - Title and Date */}
                <div>
                  {(() => {
                    // Calculate dynamic sizing based on available space
                    const spaceFactor = actualHeight / OVERLAY_MODE_THRESHOLD;
                    const hasMetaContent = (card.tags && card.tags.length > 0) ||
                      (card.githubRepo && githubData?.[card.githubRepo] &&
                        (githubData[card.githubRepo].stargazers_count > 0 || githubData[card.githubRepo].forks_count > 0));

                    // Dynamic title sizing - keep original smaller sizes for overlay
                    const titleSize = spaceFactor >= 1.5 ? 'text-lg' : spaceFactor >= 1.2 ? 'text-base' : 'text-sm';
                    const titleCentered = spaceFactor >= 1.3 && !hasMetaContent;
                    // No multi-line titles for overlay style

                    return (
                      <>
                        <h3 className={`${titleSize} font-bold line-clamp-1 mb-1 drop-shadow-sm ${titleCentered ? 'text-center' : ''}`} style={{
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
                        {titleCentered && spaceFactor >= 1.3 && (
                          <div className="w-full flex justify-center mb-2">
                            <div className="bg-white bg-opacity-30 h-px" style={{ width: '60%' }}></div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {getDateLabel(card) && (
                    <div className="text-xs opacity-90 drop-shadow-sm mb-1" style={{
                      textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                    }}>
                      {getDateLabel(card)}
                    </div>
                  )}
                  {/* Description - Scale-aware based on available space */}
                  <p className={`opacity-90 drop-shadow-sm ${actualHeight > 180 ? 'text-sm' : 'text-xs'}`} style={{
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                  }}>
                    {truncateWords(card.threeWordDescriptor || card.description, actualHeight > 200 ? 5 : 3)}
                  </p>

                  {/* Badges Row - Show to the left under description when card is large enough (>140px) */}
                  {actualHeight > 140 && card.tags && card.tags.length > 0 && (
                    <div className="flex justify-start mt-1">
                      <div className="flex flex-wrap" style={{ gap: '4px' }}>
                        {card.tags.slice(0, 2).map((tag, tagIndex) => {
                          // Different colors for different tag types
                          const getTagColor = (tagName: string) => {
                            switch (tagName.toLowerCase()) {
                              case 'github':
                                return 'bg-base0E text-base00'; // Purple for GitHub
                              case 'live site':
                                return 'bg-base0B text-base00'; // Cyan for Live Site
                              default:
                                return 'bg-base0A text-base00'; // Green for other tags
                            }
                          };

                          return (
                            <span
                              key={tagIndex}
                              className={`${getTagColor(tag)} rounded-full text-xs drop-shadow-lg flex-shrink-0`}
                              style={{ padding: '2px 6px' }}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Flexible spacer to push content down when needed */}
                <div className="flex-1 min-h-0"></div>

                {/* Bottom Section - GitHub Stats and Badges above View Project Button */}
                <div className="flex-shrink-0">
                  {/* GitHub Stats Row - Always show when available (no height restriction) */}
                  {card.githubRepo && githubData?.[card.githubRepo] && (
                    <div className="flex justify-center mb-2">
                      <div className="flex items-center text-white font-mono text-xs drop-shadow-lg" style={{ gap: '8px' }}>
                        {githubData[card.githubRepo].stargazers_count > 0 && (
                          <div className="flex items-center" style={{ gap: '3px' }}>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>󓎕</span>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>{githubData[card.githubRepo].stargazers_count}</span>
                          </div>
                        )}
                        {githubData[card.githubRepo].forks_count > 0 && (
                          <div className="flex items-center" style={{ gap: '3px' }}>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>󰘬</span>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>{githubData[card.githubRepo].forks_count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* View Project Button - Normal flow positioning */}
                  <div className="flex justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewProject?.(card);
                      }}
                      className="bg-base0D hover:bg-base0C px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-200 shadow-lg flex items-center"
                      style={{
                        gap: '8px',
                        color: (() => {
                          // Dynamically choose the lightest base16 color available
                          if (typeof window !== 'undefined') {
                            const isDark = document.documentElement.classList.contains('dark');
                            return isDark ? 'var(--base07)' : 'var(--base00)';
                          }
                          return 'var(--base07)'; // fallback
                        })()
                      }}
                    >
                      <span>
                        {contentScale >= 0.95 ? 'View Project' : 'View'}
                        {/* No longer append GitHub stats to button since they're always visible above */}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : cardLayout === 'landscape' ? (
            // Landscape Layout: Horizontal layout with guaranteed space for all elements
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
                {/* Image Section - Responsive width maintaining aspect ratio */}
                {card.image && (
                  <div className="flex-shrink-0" style={{
                    width: (() => {
                      // Calculate image width based on card scale and maintain proper aspect ratio
                      // For landscape cards, image should be proportional to card size
                      const baseImageWidthPercent = 45; // Base percentage for smaller cards
                      const maxImageWidthPercent = 55; // Max percentage for larger cards

                      // Scale image width percentage based on contentScale
                      const scaleRange = Math.max(0, Math.min(1, (contentScale - 0.8) / 0.6)); // Normalize 0.8-1.4 to 0-1
                      const imageWidthPercent = baseImageWidthPercent + (maxImageWidthPercent - baseImageWidthPercent) * scaleRange;

                      return `${imageWidthPercent}%`;
                    })(),
                    height: '100%',
                    margin: '0',
                    padding: '0'
                  }}>
                    <div className="w-full h-full bg-base02 rounded-lg overflow-hidden" style={{
                      margin: '0',
                      padding: '0'
                    }}>
                      <Image
                        src={card.image}
                        alt={card.title}
                        width={500} // Use reasonable fixed size for Next.js optimization
                        height={350} // Maintain aspect ratio
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </div>
                )}

                {/* Content Section - Flexible but structured */}
                <div className="flex-1 min-h-0 flex flex-col" style={{
                  gap: '6px',
                  margin: '0',
                  padding: '0',
                  width: '100%',
                  height: '100%'
                }}>
                  {/* Header Section - Title and Date with dynamic sizing and centering */}
                  <div className="flex-shrink-0" style={{
                    margin: '0',
                    padding: '0',
                    textAlign: (() => {
                      // Center title when there's plenty of vertical space
                      // Note: isLandscapeCard calculated but not used in current implementation
                      // const isLandscapeCard = cardLayout === 'landscape';
                      // Note: baseHeight calculated but not used in current implementation
                      // const baseHeight = isLandscapeCard ? BASE_CARD_WIDTH : BASE_CARD_HEIGHT;
                      // Note: availableHeight calculated but not used in current implementation
                      // const availableHeight = baseHeight * scaleFactor;
                      const hasMetaContent = (card.tags && card.tags.length > 0) ||
                        (card.githubRepo && githubData?.[card.githubRepo] &&
                          (githubData[card.githubRepo].stargazers_count > 0 || githubData[card.githubRepo].forks_count > 0));
                      const spaceFactor = contentScale * (hasMetaContent ? 0.8 : 1.0);
                      return spaceFactor >= 1.2 ? 'center' : 'left';
                    })()
                  }}>
                    <h3 className={`font-bold text-base05 ${(() => {
                      // Dynamic title sizing based on available space - increased base sizes
                      const isLandscapeCard = cardLayout === 'landscape';
                      const baseHeight = isLandscapeCard ? BASE_CARD_WIDTH : BASE_CARD_HEIGHT;
                      const spaceFactor = contentScale * (baseHeight * scaleFactor / BASE_CARD_HEIGHT);

                      let sizeClass = '';
                      if (spaceFactor >= 1.4) sizeClass = 'text-xl';
                      else if (spaceFactor >= 1.2) sizeClass = 'text-lg';
                      else sizeClass = 'text-base';

                      return sizeClass;
                    })()}`} style={{
                      margin: '0',
                      padding: '0',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal',
                      hyphens: 'none',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {card.title}
                    </h3>

                    {/* Dynamic separator line when space is available */}
                    {(() => {
                      const isLandscapeCard = cardLayout === 'landscape';
                      const baseHeight = isLandscapeCard ? BASE_CARD_WIDTH : BASE_CARD_HEIGHT;
                      const spaceFactor = contentScale * (baseHeight * scaleFactor / BASE_CARD_HEIGHT);
                      return spaceFactor >= 1.3 ? (
                        <div
                          className="bg-base0D opacity-30"
                          style={{
                            height: '1px',
                            width: '60%',
                            margin: '8px auto',
                            borderRadius: '1px'
                          }}
                        />
                      ) : null;
                    })()}

                    {getDateLabel(card) && (
                      <div className={`${contentScale < 0.8 ? 'text-[10px]' : 'text-xs'} text-base0D font-medium opacity-80`} style={{
                        margin: '0',
                        padding: '0',
                        marginTop: (() => {
                          const isLandscapeCard = cardLayout === 'landscape';
                          const baseHeight = isLandscapeCard ? BASE_CARD_WIDTH : BASE_CARD_HEIGHT;
                          const spaceFactor = contentScale * (baseHeight * scaleFactor / BASE_CARD_HEIGHT);
                          return spaceFactor >= 1.3 ? '8px' : '6px';
                        })()
                      }}>
                        {getDateLabel(card)}
                      </div>
                    )}
                  </div>

                  {/* Description - Flexbox-based dynamic sizing */}
                  <div className="flex-1 min-h-0" style={{
                    margin: '0',
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: (() => {
                      // Center content when there's ample vertical space
                      const isLandscapeCard = cardLayout === 'landscape';
                      const baseHeight = isLandscapeCard ? BASE_CARD_WIDTH : BASE_CARD_HEIGHT;
                      const spaceFactor = contentScale * (baseHeight * scaleFactor / BASE_CARD_HEIGHT);
                      const hasMetaContent = (card.tags && card.tags.length > 0) ||
                        (card.githubRepo && githubData?.[card.githubRepo] &&
                          (githubData[card.githubRepo].stargazers_count > 0 || githubData[card.githubRepo].forks_count > 0));
                      return (spaceFactor >= 1.3 && !hasMetaContent) ? 'center' : 'flex-start';
                    })()
                  }}>
                    <div
                      className="flex-1 overflow-hidden"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                      }}
                    >
                      <div
                        ref={landscapeDescRef}
                        className="text-base04 text-xs flex-1 overflow-hidden glass-overlay-advanced"
                        style={{
                          margin: '0',
                          padding: '0',
                          border: '1px solid var(--base02)',
                          borderRadius: '0.5rem',
                          ...landscapeBlur
                        }}
                      >
                        <p
                          style={{
                            margin: '0',
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            lineHeight: '1.3',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            textAlign: 'left',
                            letterSpacing: '-0.02em',
                            wordSpacing: '0.01em',
                            position: 'relative',
                            zIndex: 10
                          }}
                        >
                          {(() => {
                            // Use actual card dimensions for more accurate description calculation
                            const containerWidth = actualCardDimensions.width || (BASE_CARD_HEIGHT * contentScale);
                            const containerHeight = actualCardDimensions.height || (BASE_CARD_WIDTH * contentScale);
                            const description = getOptimalDescription(card, containerWidth, containerHeight, true);
                            const isShortDescription = description === (card.shortDescription || card.description) && description !== card.description;

                            return (
                              <span style={{
                                textAlign: isShortDescription ? 'left' : 'justify'
                              }}>
                                {description}
                              </span>
                            );
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* View Project Button - Above badges and stats */}
                  <div className="flex-shrink-0" style={{ margin: '0', padding: '0' }}>
                    {onViewProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProject(card);
                        }}
                        className="w-full bg-base0C hover:bg-base0D text-base00 transition-colors font-medium text-xs py-1.5 px-3"
                        style={{
                          margin: '0',
                          borderRadius: '0.5rem'
                        }}
                      >
                        {contentScale >= 0.95 ? 'View Project' : 'View'}
                      </button>
                    )}
                  </div>

                  {/* Meta Row - Badges left, Stats right (below button) */}
                  <div className="flex-shrink-0 flex items-center justify-between min-w-0 overflow-hidden" style={{
                    margin: '0',
                    padding: '0'
                  }}>
                    <div className="flex flex-wrap flex-shrink min-w-0" style={{
                      gap: '6px',
                      margin: '0',
                      padding: '0'
                    }}>
                      {card.tags && card.tags.slice(0, 2).map((tag, tagIndex) => {
                        // Different colors for different tag types
                        const getTagColor = (tagName: string) => {
                          switch (tagName.toLowerCase()) {
                            case 'github':
                              return 'bg-base0E text-base00'; // Purple for GitHub
                            case 'live site':
                              return 'bg-base0B text-base00'; // Cyan for Live Site
                            default:
                              return 'bg-base0A text-base00'; // Green for other tags
                          }
                        };

                        return (
                          <span
                            key={tagIndex}
                            className={`${getTagColor(tag)} rounded-full flex-shrink-0`}
                            style={{
                              fontSize: contentScale < 0.75 ? '8px' : '10px',
                              padding: '4px 8px',
                              margin: '0'
                            }}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                    {card.githubRepo && githubData?.[card.githubRepo] && (
                      <div className="flex items-center text-base04 font-mono flex-shrink-0" style={{
                        fontSize: contentScale < 0.75 ? '10px' : '12px',
                        gap: '6px',
                        margin: '0',
                        padding: '0'
                      }}>
                        {githubData[card.githubRepo].stargazers_count > 0 && (
                          <div className="flex items-center" style={{ margin: '0', padding: '0', gap: '6px' }}>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>󓎕</span>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>{githubData[card.githubRepo].stargazers_count}</span>
                          </div>
                        )}
                        {githubData[card.githubRepo].forks_count > 0 && (
                          <div className="flex items-center" style={{ margin: '0', padding: '0', gap: '6px' }}>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>󰘬</span>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>{githubData[card.githubRepo].forks_count}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Portrait Layout: Vertical layout with guaranteed space allocation
            <div className="card-content w-full h-full" style={{
              transform: `scale(${contentScale})`,
              transformOrigin: 'center center',
              padding: '6px',
              boxSizing: 'border-box'
            }}>
              <div className="h-full flex flex-col min-h-0 overflow-hidden" style={{
                gap: '6px',
                margin: '0',
                padding: '0',
                width: '100%',
                height: '100%'
              }}>
                {/* Image Section - Responsive height maintaining aspect ratio */}
                {card.image && (
                  <div className="w-full flex-shrink-0" style={{
                    height: (() => {
                      // Calculate image height based on card scale and maintain proper aspect ratio
                      // For portrait cards, image should be proportional to card size
                      const baseImageHeightPercent = 35; // Base percentage for smaller cards
                      const maxImageHeightPercent = 60; // Max percentage for larger cards

                      // Scale image height percentage based on contentScale
                      const scaleRange = Math.max(0, Math.min(1, (contentScale - 0.8) / 0.6)); // Normalize 0.8-1.4 to 0-1
                      const imageHeightPercent = baseImageHeightPercent + (maxImageHeightPercent - baseImageHeightPercent) * scaleRange;

                      return `${imageHeightPercent}%`;
                    })(),
                    margin: '0',
                    padding: '0'
                  }}>
                    <div className="w-full h-full bg-base02 rounded-lg overflow-hidden" style={{
                      margin: '0',
                      padding: '0'
                    }}>
                      <Image
                        src={card.image}
                        alt={card.title}
                        width={400} // Use reasonable fixed size for Next.js optimization
                        height={300} // Maintain aspect ratio
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </div>
                )}

                {/* Content Section - Remaining 60% of height */}
                <div className="flex-1 min-h-0 flex flex-col" style={{
                  gap: '6px',
                  margin: '0',
                  padding: '0',
                  width: '100%',
                  height: '100%'
                }}>
                  {/* Header Section - Title and Date */}
                  <div className="flex-shrink-0" style={{
                    margin: '0',
                    padding: '0',
                    textAlign: (() => {
                      // Center title when there's plenty of vertical space
                      const isPortraitCard = cardLayout === 'portrait';
                      const baseHeight = isPortraitCard ? BASE_CARD_HEIGHT : BASE_CARD_WIDTH;
                      const availableHeight = baseHeight * scaleFactor;
                      const hasMetaContent = (card.tags && card.tags.length > 0) ||
                        (card.githubRepo && githubData?.[card.githubRepo] &&
                          (githubData[card.githubRepo].stargazers_count > 0 || githubData[card.githubRepo].forks_count > 0));
                      const spaceFactor = contentScale * (availableHeight / BASE_CARD_HEIGHT);
                      return (spaceFactor >= 1.3 && !hasMetaContent) ? 'center' : 'left';
                    })()
                  }}>
                    <h3 className={`font-bold text-base05 ${(() => {
                      // Dynamic title sizing based on available space - increased base sizes
                      const isPortraitCard = cardLayout === 'portrait';
                      const baseHeight = isPortraitCard ? BASE_CARD_HEIGHT : BASE_CARD_WIDTH;
                      const spaceFactor = contentScale * (baseHeight * scaleFactor / BASE_CARD_HEIGHT);

                      let sizeClass = '';
                      if (spaceFactor >= 1.4) sizeClass = 'text-xl';
                      else if (spaceFactor >= 1.2) sizeClass = 'text-lg';
                      else sizeClass = 'text-base';

                      return sizeClass;
                    })()}`} style={{
                      margin: '0',
                      padding: '0',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal',
                      hyphens: 'none',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {card.title}
                    </h3>

                    {/* Dynamic separator line when space is available */}
                    {(() => {
                      const isPortraitCard = cardLayout === 'portrait';
                      const baseHeight = isPortraitCard ? BASE_CARD_HEIGHT : BASE_CARD_WIDTH;
                      const spaceFactor = contentScale * (baseHeight * scaleFactor / BASE_CARD_HEIGHT);
                      return spaceFactor >= 1.3 ? (
                        <div
                          className="bg-base04 opacity-30"
                          style={{
                            height: '1px',
                            width: '60%',
                            margin: '8px auto',
                          }}
                        />
                      ) : null;
                    })()}

                    {getDateLabel(card) && (
                      <div className={`${contentScale < 0.8 ? 'text-[10px]' : 'text-xs'} text-base0D font-medium opacity-80`} style={{
                        margin: '0',
                        padding: '0',
                        marginTop: (() => {
                          const isPortraitCard = cardLayout === 'portrait';
                          const baseHeight = isPortraitCard ? BASE_CARD_HEIGHT : BASE_CARD_WIDTH;
                          const spaceFactor = contentScale * (baseHeight * scaleFactor / BASE_CARD_HEIGHT);
                          return spaceFactor >= 1.3 ? '8px' : '6px';
                        })()
                      }}>
                        {getDateLabel(card)}
                      </div>
                    )}
                  </div>

                  {/* Description - Takes available middle space with dynamic line clamping */}
                  <div className="flex-1 min-h-0" style={{
                    margin: '0',
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: (() => {
                      // Center content when there's ample vertical space
                      const isPortraitCard = cardLayout === 'portrait';
                      const baseHeight = isPortraitCard ? BASE_CARD_HEIGHT : BASE_CARD_WIDTH;
                      const spaceFactor = contentScale * (baseHeight * scaleFactor / BASE_CARD_HEIGHT);
                      const hasMetaContent = (card.tags && card.tags.length > 0) ||
                        (card.githubRepo && githubData?.[card.githubRepo] &&
                          (githubData[card.githubRepo].stargazers_count > 0 || githubData[card.githubRepo].forks_count > 0));
                      return (spaceFactor >= 1.3 && !hasMetaContent) ? 'center' : 'flex-start';
                    })()
                  }}>
                    <div
                      className="flex-1 overflow-hidden"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                      }}
                    >
                      <div
                        ref={portraitDescRef}
                        className="text-base04 text-xs flex-1 overflow-hidden glass-overlay-advanced"
                        style={{
                          margin: '0',
                          padding: '0',
                          border: '1px solid var(--base02)',
                          borderRadius: '0.5rem',
                          ...portraitBlur
                        }}
                      >

                        <p
                          style={{
                            margin: '0',
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            lineHeight: '1.3',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            textAlign: 'left',
                            letterSpacing: '-0.02em',
                            wordSpacing: '0.01em',
                            position: 'relative',
                            zIndex: 10
                          }}
                        >
                          {(() => {
                            // Use actual card dimensions for more accurate description calculation
                            const containerWidth = actualCardDimensions.width || (BASE_CARD_WIDTH * contentScale);
                            const containerHeight = actualCardDimensions.height || (BASE_CARD_HEIGHT * contentScale);
                            const description = getOptimalDescription(card, containerWidth, containerHeight, false);
                            const isShortDescription = description === (card.shortDescription || card.description) && description !== card.description;

                            return (
                              <span style={{
                                textAlign: isShortDescription ? 'left' : 'justify'
                              }}>
                                {description}
                              </span>
                            );
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* View Project Button - Above badges and stats */}
                  <div className="flex-shrink-0" style={{ margin: '0', padding: '0' }}>
                    {onViewProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProject(card);
                        }}
                        className="w-full bg-base0C hover:bg-base0D text-base00 transition-colors font-medium text-xs py-1.5 px-3"
                        style={{
                          margin: '0',
                          borderRadius: '0.5rem'
                        }}
                      >
                        {contentScale >= 0.95 ? 'View Project' : 'View'}
                      </button>
                    )}
                  </div>

                  {/* Meta Row - Badges left, Stats right (below button) */}
                  <div className="flex-shrink-0 flex items-center justify-between min-w-0 overflow-hidden" style={{
                    margin: '0',
                    padding: '0'
                  }}>
                    <div className="flex flex-wrap flex-shrink min-w-0" style={{
                      gap: '6px',
                      margin: '0',
                      padding: '0'
                    }}>
                      {card.tags && card.tags.slice(0, 2).map((tag, tagIndex) => {
                        // Different colors for different tag types
                        const getTagColor = (tagName: string) => {
                          switch (tagName.toLowerCase()) {
                            case 'github':
                              return 'bg-base0E text-base00'; // Purple for GitHub
                            case 'live site':
                              return 'bg-base0B text-base00'; // Cyan for Live Site
                            default:
                              return 'bg-base0A text-base00'; // Green for other tags
                          }
                        };

                        return (
                          <span
                            key={tagIndex}
                            className={`${getTagColor(tag)} rounded-full flex-shrink-0`}
                            style={{
                              fontSize: contentScale < 0.75 ? '8px' : '10px',
                              padding: '4px 8px',
                              margin: '0'
                            }}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                    {card.githubRepo && githubData?.[card.githubRepo] && (
                      <div className="flex items-center text-base04 font-mono flex-shrink-0" style={{
                        fontSize: contentScale < 0.75 ? '10px' : '12px',
                        gap: '6px',
                        margin: '0',
                        padding: '0'
                      }}>
                        {githubData[card.githubRepo].stargazers_count > 0 && (
                          <div className="flex items-center" style={{ margin: '0', padding: '0', gap: '6px' }}>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>󓎕</span>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>{githubData[card.githubRepo].stargazers_count}</span>
                          </div>
                        )}
                        {githubData[card.githubRepo].forks_count > 0 && (
                          <div className="flex items-center" style={{ margin: '0', padding: '0', gap: '6px' }}>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>󰘬</span>
                            <span style={{ fontFamily: 'NerdFont, monospace' }}>{githubData[card.githubRepo].forks_count}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Swipe indicators */}
          {index === 0 && dragState.isDragging && (
            <>
              <div
                className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-bold transition-opacity ${dragState.deltaX > 50
                  ? 'bg-base0B text-base00 opacity-100'
                  : 'bg-base02 text-base04 opacity-50'
                  }`}
              >
                LIKE
              </div>
              <div
                className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold transition-opacity ${dragState.deltaX < -50
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