import { useState } from 'react';

// Playing card aspect ratio constants (2.5:3.5 = 5:7)
// const CARD_ASPECT_RATIO = 5 / 7; // Width to height ratio
// const BASE_CARD_WIDTH = 320; // Base width in pixels
// const BASE_CARD_HEIGHT = BASE_CARD_WIDTH / CARD_ASPECT_RATIO; // 448px (maintains 5:7 ratio)

// Max card dimensions - 500px maximum for both orientations
// const MAX_CARD_DIMENSION_PX = 500; // Maximum dimension (height for portrait, width for landscape)
// const MAX_PORTRAIT_HEIGHT = MAX_CARD_DIMENSION_PX; // 500px
// const MAX_PORTRAIT_WIDTH = MAX_PORTRAIT_HEIGHT * CARD_ASPECT_RATIO; // ~357px
// const MAX_LANDSCAPE_WIDTH = MAX_CARD_DIMENSION_PX; // 500px  
// const MAX_LANDSCAPE_HEIGHT = MAX_LANDSCAPE_WIDTH / CARD_ASPECT_RATIO; // ~700px, but capped by width

// Threshold for switching to overlay mode when cards become too small
// const OVERLAY_MODE_THRESHOLD = 200; // Switch to overlay when height < 200px

interface CardDimensions {
  layout: 'portrait' | 'landscape' | 'compact';
  scaleFactor: number;
  contentScale: number;
  actualDimensions: { width: number; height: number };
}

export function useResponsiveCardLayout(): CardDimensions {
  const [layout, /*setLayout*/] = useState<'portrait' | 'landscape' | 'compact'>('portrait');
  // const [setLayout] = useState<'portrait' | 'landscape' | 'compact'>('portrait');
  // const [scaleFactor, setScaleFactor] = useState(1);
  // const [contentScale, setContentScale] = useState(1);
  // const [actualDimensions, setActualDimensions] = useState({ width: BASE_CARD_WIDTH, height: BASE_CARD_HEIGHT });

  // const updateLayout = useCallback(() => {
  //   const vw = window.innerWidth;
  //   const vh = window.innerHeight;
  //   
  //   // Dynamic margin calculation based on screen size
  //   const horizontalMargin = Math.max(20, Math.min(60, vw * 0.05)); // 2-6% of width, min 20px, max 60px
  //   const verticalReserved = Math.max(120, Math.min(200, vh * 0.25)); // 12-25% of height for UI elements
  //   
  //   const availableWidth = vw - (horizontalMargin * 2);
  //   const availableHeight = vh - verticalReserved;
  //   
  //   // Calculate how well each orientation would fit
  //   const portraitWidthScale = availableWidth / BASE_CARD_WIDTH;
  //   const portraitHeightScale = availableHeight / BASE_CARD_HEIGHT;
  //   const portraitScale = Math.min(portraitWidthScale, portraitHeightScale);
  //   
  //   // For landscape, we swap dimensions (card becomes wider than tall)
  //   const landscapeWidthScale = availableWidth / BASE_CARD_HEIGHT; // Landscape card is wider
  //   const landscapeHeightScale = availableHeight / BASE_CARD_WIDTH; // Landscape card is shorter
  //   const landscapeScale = Math.min(landscapeWidthScale, landscapeHeightScale);
  //   
  //   // Determine the best layout based on which gives better utilization
  //   let newLayout: 'portrait' | 'landscape' | 'compact' = 'portrait';
  //   let newScaleFactor = portraitScale;
  //   
  //   // Key conditions for layout selection
  //   const heightConstrained = portraitHeightScale < portraitWidthScale; // Height is the limiting factor
  //   const hasWideSpace = vw >= 640; // Minimum width for landscape to make sense
  //   const spaceAspectRatio = availableWidth / availableHeight;
  //   const isWideSpace = spaceAspectRatio > 1.4; // Space is significantly wider than tall
  //   
  //   // Enhanced height constraint detection - more aggressive switching when height is limited
  //   const heightSeverelyConstrained = portraitHeightScale < 0.8; // Lowered from 0.7 for earlier detection
  //   const heightCriticallyConstrained = portraitHeightScale < 0.6; // More critical threshold
  //   const heightDominatesConstraint = portraitHeightScale < portraitWidthScale * 0.9; // More lenient ratio
  //   const landscapeOffersImprovement = landscapeScale > portraitScale * 1.1; // Reduced from 1.2 to 1.1
  //   const landscapeOffersSignificantImprovement = landscapeScale > portraitScale * 1.3; // Increased for truly significant cases
  //   const minimumViableWidth = vw >= 400; // Reduced from 480 for more aggressive switching
  //   const reasonableWidth = vw >= 320; // Even more lenient for very constrained scenarios
  //   
  //   // Layout decision with enhanced height-priority logic
  //   if (heightCriticallyConstrained && reasonableWidth && landscapeOffersImprovement) {
  //     // Critical height constraint: switch to landscape even with very limited width
  //     newLayout = 'landscape';
  //     newScaleFactor = landscapeScale;
  //   } else if (heightSeverelyConstrained && minimumViableWidth && landscapeOffersImprovement) {
  //     // Severe height constraint: favor landscape when height is severely limited
  //     newLayout = 'landscape';
  //     newScaleFactor = landscapeScale;
  //   } else if (heightConstrained && heightDominatesConstraint && minimumViableWidth && landscapeOffersSignificantImprovement) {
  //     // Height-priority switching: favor landscape when height dominates the constraint
  //     newLayout = 'landscape';
  //     newScaleFactor = landscapeScale;
  //   } else if (hasWideSpace && isWideSpace && landscapeOffersImprovement) {
  //     // Wide space switching: switch to landscape in wide spaces
  //     newLayout = 'landscape';
  //     newScaleFactor = landscapeScale;
  //   } else {
  //     // Default to portrait
  //     newLayout = 'portrait';
  //     newScaleFactor = portraitScale;
  //   }
  //   
  //   // Apply max dimension constraints
  //   let actualWidth = BASE_CARD_WIDTH * newScaleFactor;
  //   let actualHeight = BASE_CARD_HEIGHT * newScaleFactor;
  //   
  //   if (newLayout === 'landscape') {
  //     actualWidth = BASE_CARD_HEIGHT * newScaleFactor;
  //     actualHeight = BASE_CARD_WIDTH * newScaleFactor;
  //   }
  //   
  //   // Cap dimensions
  //   if (actualWidth > MAX_CARD_DIMENSION_PX) {
  //     actualWidth = MAX_CARD_DIMENSION_PX;
  //     actualHeight = actualWidth / (newLayout === 'landscape' ? CARD_ASPECT_RATIO : 1);
  //   }
  //   if (actualHeight > MAX_CARD_DIMENSION_PX) {
  //     actualHeight = MAX_CARD_DIMENSION_PX;
  //     actualWidth = actualHeight * (newLayout === 'landscape' ? CARD_ASPECT_RATIO : 1);
  //   }
  //   
  //   // Determine content scale based on layout and available space
  //   let newContentScale = 1;
  //   if (newLayout === 'landscape') {
  //     newContentScale = Math.min(1.2, newScaleFactor * 0.9); // Landscape gets slightly larger content
  //   } else if (newLayout === 'portrait') {
  //     newContentScale = Math.min(1.0, newScaleFactor * 1.1); // Portrait gets standard content
  //   }
  //   
  //   // Switch to compact mode when cards become too small
  //   if (actualHeight < OVERLAY_MODE_THRESHOLD) {
  //     newLayout = 'compact';
  //     newContentScale = Math.min(0.8, newScaleFactor * 1.3); // Compact gets smaller content
  //   }
  //   
  //   setLayout(newLayout);
  //   setScaleFactor(newScaleFactor);
  //   setContentScale(newContentScale);
  //   setActualDimensions({ width: actualWidth, height: actualHeight });
  // }, []);

  return {
    layout,
    scaleFactor: 1,
    contentScale: 1,
    actualDimensions: { width: 320, height: 448 }
  };
}