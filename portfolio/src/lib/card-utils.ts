import { CardData } from '../components/CardStack/types';

/**
 * Get optimal description based on available space
 */
export function getOptimalDescription(
  card: CardData,
  containerWidth: number,
  containerHeight: number
): string {
  const availableWidth = containerWidth * 0.9; // 90% of container width
  const availableHeight = containerHeight * 0.3; // 30% of container height
  
  // Estimate characters per line and lines available
  const charsPerLine = Math.floor(availableWidth / 8); // Approx 8px per character
  const linesAvailable = Math.floor(availableHeight / 16); // Approx 16px per line
  const maxChars = charsPerLine * linesAvailable;
  
  // Start with short description if available
  if (card.shortDescription && card.shortDescription.length <= maxChars) {
    return card.shortDescription;
  }
  
  // Use full description if it fits
  if (card.description.length <= maxChars) {
    return card.description;
  }
  
  // Truncate description to fit
  return truncateWords(card.description, Math.floor(maxChars * 0.8));
}

/**
 * Get date label for project
 */
export function getDateLabel(card: CardData): string {
  if (!card.startYear) return '';
  
  if (card.endYear && card.endYear !== card.startYear) {
    return `${card.startYear}-${card.endYear}`;
  }
  
  return String(card.startYear);
}

/**
 * Truncate text to specified number of words
 */
export function truncateWords(text: string | undefined, maxWords: number): string {
  if (!text) return '';
  
  const words = text.split(' ');
  if (words.length <= maxWords) {
    return text;
  }
  
  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Calculate responsive layout for cards
 */
export function calculateResponsiveLayout(
  viewportWidth: number,
  viewportHeight: number
): {
  layout: 'portrait' | 'landscape' | 'compact';
  scaleFactor: number;
} {
  // Base card dimensions (5:7 aspect ratio)
  const BASE_CARD_WIDTH = 320;
  const BASE_CARD_HEIGHT = 448;
  
  // Margins and reserved space
  const horizontalMargin = Math.max(20, Math.min(60, viewportWidth * 0.05));
  const verticalReserved = Math.max(120, Math.min(200, viewportHeight * 0.25));
  
  const availableWidth = viewportWidth - (horizontalMargin * 2);
  const availableHeight = viewportHeight - verticalReserved;
  
  // Calculate scale factors for different orientations
  const portraitWidthScale = availableWidth / BASE_CARD_WIDTH;
  const portraitHeightScale = availableHeight / BASE_CARD_HEIGHT;
  const portraitScale = Math.min(portraitWidthScale, portraitHeightScale);
  
  // Landscape orientation swaps dimensions
  const landscapeWidthScale = availableWidth / BASE_CARD_HEIGHT;
  const landscapeHeightScale = availableHeight / BASE_CARD_WIDTH;
  const landscapeScale = Math.min(landscapeWidthScale, landscapeHeightScale);
  
  // Determine best layout
  let layout: 'portrait' | 'landscape' | 'compact' = 'portrait';
  let scaleFactor = portraitScale;
  
  // Height constraint detection
  const heightConstrained = portraitHeightScale < portraitWidthScale;
  const hasWideSpace = viewportWidth >= 640;
  const isWideSpace = (availableWidth / availableHeight) > 1.4;
  
  // Enhanced height constraint detection
  const heightSeverelyConstrained = portraitHeightScale < 0.8;
  const heightCriticallyConstrained = portraitHeightScale < 0.6;
  const heightDominatesConstraint = portraitHeightScale < portraitWidthScale * 0.9;
  const landscapeOffersImprovement = landscapeScale > portraitScale * 1.1;
  const landscapeOffersSignificantImprovement = landscapeScale > portraitScale * 1.3;
  const minimumViableWidth = viewportWidth >= 400;
  const reasonableWidth = viewportWidth >= 320;
  
  // Layout decision logic
  if (heightCriticallyConstrained && reasonableWidth && landscapeOffersImprovement) {
    layout = 'landscape';
    scaleFactor = landscapeScale;
  } else if (heightSeverelyConstrained && minimumViableWidth && landscapeOffersImprovement) {
    layout = 'landscape';
    scaleFactor = landscapeScale;
  } else if (heightConstrained && heightDominatesConstraint && minimumViableWidth && landscapeOffersSignificantImprovement) {
    layout = 'landscape';
    scaleFactor = landscapeScale;
  } else if (hasWideSpace && isWideSpace && landscapeOffersImprovement) {
    layout = 'landscape';
    scaleFactor = landscapeScale;
  }
  
  // Cap dimensions
  const MAX_CARD_DIMENSION = 500;
  let actualWidth = BASE_CARD_WIDTH * scaleFactor;
  let actualHeight = BASE_CARD_HEIGHT * scaleFactor;
  
  if (layout === 'landscape') {
    actualWidth = BASE_CARD_HEIGHT * scaleFactor;
    actualHeight = BASE_CARD_WIDTH * scaleFactor;
  }
  
  if (actualWidth > MAX_CARD_DIMENSION) {
    actualWidth = MAX_CARD_DIMENSION;
    actualHeight = actualWidth / (layout === 'landscape' ? (BASE_CARD_WIDTH / BASE_CARD_HEIGHT) : 1);
  }
  if (actualHeight > MAX_CARD_DIMENSION) {
    actualHeight = MAX_CARD_DIMENSION;
    actualWidth = actualHeight * (layout === 'landscape' ? (BASE_CARD_WIDTH / BASE_CARD_HEIGHT) : 1);
  }
  
  // Switch to compact mode when cards become too small
  const OVERLAY_MODE_THRESHOLD = 200;
  if (actualHeight < OVERLAY_MODE_THRESHOLD) {
    layout = 'compact';
  }
  
  return { layout, scaleFactor };
}

/**
 * Get container style based on layout and scale
 */
export function getContainerStyle(
  layout: 'portrait' | 'landscape' | 'compact',
  scaleFactor: number
): React.CSSProperties {
  const baseWidth = layout === 'landscape' ? 448 : 320; // Landscape uses swapped dimensions
  const baseHeight = layout === 'landscape' ? 320 : 448;
  
  const width = baseWidth * scaleFactor;
  const height = baseHeight * scaleFactor;
  
  return {
    width: `${width}px`,
    height: `${height}px`,
    position: 'relative' as const,
    transform: `scale(${scaleFactor})`,
    transformOrigin: 'center center',
  };
}

/**
 * Get card style based on position and drag state
 */
export function getCardStyle(
  index: number,
  dragState: { isDragging: boolean; deltaX: number; deltaY: number },
  swipeDirection: 'left' | 'right' | null,
  isAnimating: boolean
): React.CSSProperties {
  const baseRotation = index * 2;
  const baseOffset = index * 8;
  const baseScale = 1 - index * 0.05;
  
  let transform = `translate(${baseOffset}px, ${baseOffset}px) rotate(${baseRotation}deg) scale(${baseScale})`;
  const zIndex = 10 - index;
  const pointerEvents: 'auto' | 'none' = index === 0 ? 'auto' : 'none';
  let opacity = index < 3 ? 1 : 0;
  
  // Apply drag transform to top card
  if (index === 0 && dragState.isDragging) {
    const { deltaX, deltaY } = dragState;
    const rotation = deltaX * 0.15;
    transform = `translate(${deltaX + baseOffset}px, ${deltaY + baseOffset}px) rotate(${rotation}deg) scale(${baseScale})`;
  }
  
  // Apply swipe animation
  if (index === 0 && swipeDirection && isAnimating) {
    const direction = swipeDirection === 'left' ? -1 : 1;
    transform = `translate(${direction * 200 + baseOffset}px, ${baseOffset}px) rotate(${direction * 30}deg) scale(${baseScale})`;
    opacity = 0;
  }
  
  return {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transform,
    zIndex,
    pointerEvents,
    opacity,
    transition: isAnimating ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'transform 0.1s ease-out',
  };
}

/**
 * Determine if overlay mode should be used
 */
export function shouldUseOverlayMode(
  layout: 'portrait' | 'landscape' | 'compact',
  scaleFactor: number
): { shouldUse: boolean; actualHeight: number } {
  const BASE_CARD_HEIGHT = 448;
  const actualHeight = BASE_CARD_HEIGHT * scaleFactor;
  const shouldUse = layout === 'compact' || actualHeight < 200;
  
  return { shouldUse, actualHeight };
}