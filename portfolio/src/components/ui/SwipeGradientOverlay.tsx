import React, { memo } from 'react';
import { DragState } from '../CardStack/types';

interface SwipeGradientOverlayProps {
  index: number;
  dragState: DragState;
  swipeDirection: 'left' | 'right' | null;
  isOverlayMode: boolean;
}

export default memo(function SwipeGradientOverlay({
  index,
  dragState,
  swipeDirection,
  isOverlayMode
}: SwipeGradientOverlayProps) {
  if (index !== 0) return null;

  const { deltaX, isDragging } = dragState;
  const swipeProgress = Math.min(Math.abs(deltaX) / 100, 1);
  const isSwipingLeft = deltaX < -10;
  const isSwipingRight = deltaX > 10;

  let gradientClass = '';
  let opacity = 0;

  if (isDragging && (isSwipingLeft || isSwipingRight)) {
    opacity = swipeProgress * 0.6;
    
    if (isSwipingLeft) {
      gradientClass = 'bg-gradient-to-r from-red-500/30 via-red-400/20 to-transparent';
    } else if (isSwipingRight) {
      gradientClass = 'bg-gradient-to-l from-green-500/30 via-green-400/20 to-transparent';
    }
  }

  if (swipeDirection === 'left') {
    gradientClass = 'bg-gradient-to-r from-red-500/40 via-red-400/25 to-transparent';
    opacity = 0.8;
  } else if (swipeDirection === 'right') {
    gradientClass = 'bg-gradient-to-l from-green-500/40 via-green-400/25 to-transparent';
    opacity = 0.8;
  }

  if (!gradientClass) return null;

  return (
    <div 
      className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-200 ${gradientClass} ${
        isOverlayMode ? 'rounded-lg' : 'rounded-2xl'
      }`}
      style={{ opacity }}
    />
  );
});