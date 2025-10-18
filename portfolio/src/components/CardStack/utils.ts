import { CardData } from './types';
import { 
  BASE_CARD_WIDTH, 
  BASE_CARD_HEIGHT, 
  MAX_PORTRAIT_HEIGHT, 
  MAX_PORTRAIT_WIDTH,
  MAX_LANDSCAPE_WIDTH,
  MAX_LANDSCAPE_HEIGHT,
  OVERLAY_MODE_THRESHOLD,
  CARD_STACK_OFFSET,
  CARD_SCALE_DECREMENT,
  CARD_ROTATION_INCREMENT,
  MAX_ROTATION,
  ROTATION_FACTOR
} from './constants';

/**
 * FILO (First In, Last Out) deck implementation
 * Cards are processed in reverse order - the last card added is the first to be shown
 */
export class FILOCardDeck {
  private cards: CardData[] = [];
  private swipedIds: Set<string> = new Set();

  constructor(cards: CardData[], swipedIds?: Set<string>) {
    // Reverse the cards to implement FILO behavior
    this.cards = [...cards].reverse();
    this.swipedIds = swipedIds || new Set();
  }

  /**
   * Get available cards (not swiped) in FILO order
   */
  getAvailableCards(): CardData[] {
    return this.cards.filter(card => !this.swipedIds.has(card.id));
  }

  /**
   * Get visible cards for rendering (up to 3 cards)
   * Since cards are stored in reverse order for FILO behavior, we need to handle
   * the startIndex correctly to show the proper cards in the stack
   */
  getVisibleCards(startIndex: number = 0, count: number = 3): CardData[] {
    const available = this.getAvailableCards();
    
    // For FILO deck, we want to show the most recent cards first
    // The available array is already in FILO order (newest first)
    // startIndex should work from the beginning of the available array
    const endIndex = Math.min(startIndex + count, available.length);
    return available.slice(startIndex, endIndex);
  }

  /**
   * Mark a card as swiped
   */
  swipeCard(cardId: string): void {
    this.swipedIds.add(cardId);
  }

  /**
   * Check if deck is empty
   */
  isEmpty(): boolean {
    return this.getAvailableCards().length === 0;
  }

  /**
   * Get remaining card count
   */
  getRemainingCount(): number {
    return this.getAvailableCards().length;
  }

  /**
   * Add new cards to the deck (they go to the front in FILO)
   */
  addCards(newCards: CardData[]): void {
    // Add new cards to the beginning (they'll be shown first)
    this.cards = [...newCards.reverse(), ...this.cards];
  }

  /**
   * Reset swiped cards
   */
  resetSwipedCards(): void {
    this.swipedIds.clear();
  }
}

/**
 * Calculate responsive layout based on available space
 */
export function calculateResponsiveLayout(
  viewportWidth: number,
  viewportHeight: number
): {
  layout: 'portrait' | 'landscape' | 'compact';
  scaleFactor: number;
} {
  // Dynamic margin calculation based on screen size
  const horizontalMargin = Math.max(20, Math.min(60, viewportWidth * 0.05));
  const verticalReserved = Math.max(120, Math.min(200, viewportHeight * 0.25));
  
  const availableWidth = viewportWidth - (horizontalMargin * 2);
  const availableHeight = viewportHeight - verticalReserved;
  
  // Calculate how well each orientation would fit
  const portraitWidthScale = availableWidth / BASE_CARD_WIDTH;
  const portraitHeightScale = availableHeight / BASE_CARD_HEIGHT;
  const portraitScale = Math.min(portraitWidthScale, portraitHeightScale);
  
  // For landscape, we swap dimensions
  const landscapeWidthScale = availableWidth / BASE_CARD_HEIGHT;
  const landscapeHeightScale = availableHeight / BASE_CARD_WIDTH;
  const landscapeScale = Math.min(landscapeWidthScale, landscapeHeightScale);
  
  // Determine the best layout
  let layout: 'portrait' | 'landscape' | 'compact' = 'portrait';
  let scaleFactor = portraitScale;
  
  const heightConstrained = portraitHeightScale < portraitWidthScale;
  const hasWideSpace = viewportWidth >= 640;
  const spaceAspectRatio = availableWidth / availableHeight;
  const isWideSpace = spaceAspectRatio > 1.4;
  
  if (viewportWidth < 420 || Math.max(portraitScale, landscapeScale) < 0.6) {
    layout = 'compact';
    scaleFactor = Math.max(portraitScale, landscapeScale);
  } else if (hasWideSpace && (heightConstrained || isWideSpace) && landscapeScale > portraitScale * 1.1) {
    layout = 'landscape';
    scaleFactor = landscapeScale;
  } else {
    layout = 'portrait';
    scaleFactor = portraitScale;
  }
  
  // Clamp scale factor to reasonable bounds
  scaleFactor = Math.max(0.35, Math.min(1.8, scaleFactor));
  
  return { layout, scaleFactor };
}

/**
 * Get container style based on layout and scale
 */
export function getContainerStyle(
  layout: 'portrait' | 'landscape' | 'compact',
  scaleFactor: number
): React.CSSProperties {
  const isLandscapeCard = layout === 'landscape';
  const baseWidth = isLandscapeCard ? BASE_CARD_HEIGHT : BASE_CARD_WIDTH;
  const baseHeight = isLandscapeCard ? BASE_CARD_WIDTH : BASE_CARD_HEIGHT;
  
  const maxWidth = isLandscapeCard ? MAX_LANDSCAPE_WIDTH : MAX_PORTRAIT_WIDTH;
  const maxHeight = isLandscapeCard ? MAX_LANDSCAPE_HEIGHT : MAX_PORTRAIT_HEIGHT;
  
  const maxScaleByWidth = maxWidth / baseWidth;
  const maxScaleByHeight = maxHeight / baseHeight;
  const effectiveScale = Math.min(scaleFactor, maxScaleByWidth, maxScaleByHeight);

  const actualWidth = baseWidth * effectiveScale;
  const actualHeight = baseHeight * effectiveScale;

  return {
    width: `${actualWidth}px`,
    height: `${actualHeight}px`,
    maxWidth: '100vw',
    maxHeight: '100vh',
    transform: `scale(1)`,
    transformOrigin: 'center center',
    position: 'relative',
    margin: '0 auto',
    boxSizing: 'border-box',
  };
}

/**
 * Calculate card style for stacking effect with animations
 */
export function getCardStyle(
  index: number,
  dragState: { isDragging: boolean; deltaX: number; deltaY: number },
  swipeDirection: 'left' | 'right' | null,
  isAnimating: boolean
): React.CSSProperties {
  const isTopCard = index === 0;
  const { deltaX, deltaY, isDragging } = dragState;

  // Base styles for stacking
  const baseZIndex = 50 - index;
  const baseScale = 1 - (index * CARD_SCALE_DECREMENT);
  const baseY = index * CARD_STACK_OFFSET;
  const baseRotation = index * CARD_ROTATION_INCREMENT;

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
        transition: 'none',
        cursor: 'grabbing',
      };
    }

    // Default top card
    return {
      transform: `translateY(${baseY}px) rotate(${baseRotation}deg) scale(${baseScale})`,
      zIndex: baseZIndex,
      transition: isAnimating ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.2s ease-out',
      cursor: 'grab',
    };
  }

  // Cards behind the top card
  const moveUp = swipeDirection && !isDragging ? -CARD_STACK_OFFSET : 0;
  const scaleUp = swipeDirection && !isDragging ? CARD_SCALE_DECREMENT : 0;
  
  return {
    transform: `translateY(${baseY + moveUp}px) rotate(${baseRotation}deg) scale(${baseScale + scaleUp})`,
    zIndex: baseZIndex,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };
}

/**
 * Check if overlay mode should be used
 */
export function shouldUseOverlayMode(
  layout: 'portrait' | 'landscape' | 'compact',
  scaleFactor: number
): { shouldUse: boolean; actualHeight: number } {
  const isLandscapeCard = layout === 'landscape';
  const baseHeight = isLandscapeCard ? BASE_CARD_WIDTH : BASE_CARD_HEIGHT;
  const maxHeight = isLandscapeCard ? MAX_LANDSCAPE_HEIGHT : MAX_PORTRAIT_HEIGHT;
  const maxScaleByHeight = maxHeight / baseHeight;
  const effectiveScale = Math.min(scaleFactor, maxScaleByHeight);
  const actualHeight = baseHeight * effectiveScale;
  
  return { 
    shouldUse: actualHeight < OVERLAY_MODE_THRESHOLD, 
    actualHeight 
  };
}

/**
 * Get optimal description based on available space
 */
export function getOptimalDescription(
  card: CardData,
  containerWidth: number,
  containerHeight: number,
  isLandscape: boolean
): string {
  const fullDesc = card.description;
  const shortDesc = card.shortDescription || card.description;
  
  // Calculate available space for text content
  const textAreaWidth = containerWidth * 0.8;
  const textAreaHeight = containerHeight * 0.3;
  const avgCharWidth = 8;
  const lineHeight = 20;
  const maxLinesAvailable = Math.floor(textAreaHeight / lineHeight);
  const maxCharsPerLine = Math.floor(textAreaWidth / avgCharWidth);
  const maxCharsAvailable = maxLinesAvailable * maxCharsPerLine;
  
  // Different thresholds for landscape vs portrait cards
  const threshold = isLandscape ? 125 : 150;
  
  if (maxCharsAvailable >= threshold && fullDesc.length > threshold) {
    return fullDesc;
  } else {
    return shortDesc;
  }
}

/**
 * Get date label for a card
 */
export function getDateLabel(card: CardData): string {
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
}

/**
 * Truncate text to specified word count
 */
export function truncateWords(text: string | undefined, maxWords: number): string {
  if (!text) return '';
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}