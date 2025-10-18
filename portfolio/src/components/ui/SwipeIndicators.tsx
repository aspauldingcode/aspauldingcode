import React, { memo } from 'react';
import { DragState } from '../CardStack/types';

interface SwipeIndicatorsProps {
  dragState: DragState;
}

export default memo(function SwipeIndicators({ dragState }: SwipeIndicatorsProps) {
  const { deltaX, isDragging } = dragState;
  const swipeProgress = Math.min(Math.abs(deltaX) / 100, 1);
  const isSwipingLeft = deltaX < 0;
  const isSwipingRight = deltaX > 0;

  if (!isDragging || swipeProgress < 0.1) return null;

  return (
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
  );
});