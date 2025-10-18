import { useCallback, useMemo, useReducer } from 'react';
import { CardData, DragState, CardStackAction } from './types';
import { cardStackReducer, initialCardStackState } from './reducer';
import { FILOCardDeck, calculateResponsiveLayout } from './utils';
import { SWIPE_THRESHOLD, CARD_TRANSITION_DURATION, SPAWN_ANIMATION_DURATION } from './constants';

/**
 * Hook for managing card stack state with FILO deck and animations
 */
export function useCardStack(
  cards: CardData[],
  externalSwipedCardIds?: Set<string>,
  onSwipe?: (card: CardData, direction: 'left' | 'right') => void,
  onStackEmpty?: () => void
) {
  const [state, dispatch] = useReducer(cardStackReducer, initialCardStackState);

  // Build deck synchronously so visible cards render on first paint
  // Recreate deck whenever cards or external swiped IDs change
  const effectiveSwipedCardIds = externalSwipedCardIds || state.swipedCardIds;
  const deck = useMemo(() => new FILOCardDeck(cards, effectiveSwipedCardIds), [cards, externalSwipedCardIds, state.swipedCardIds]);

  // Handle swipe completion with animations
  const handleSwipeComplete = useCallback((card: CardData, direction: 'left' | 'right') => {
    // Prevent multiple swipes on the same card while animating
    if (state.swipeDirection !== null) return;

    // Set swipe direction to trigger exit animation
    dispatch({ type: 'SET_SWIPE_DIRECTION', payload: direction });
    if (onSwipe) onSwipe(card, direction);

    // After animation completes, update swiped set and check for empty stack
    const timeout = setTimeout(() => {
      if (!externalSwipedCardIds) {
        const newSwipedIds = new Set([...state.swipedCardIds, card.id]);
        dispatch({ type: 'SET_SWIPED_CARDS', payload: newSwipedIds });

        // Determine remaining cards after swipe using updated set
        const remainingAfterSwipe = cards.filter(c => !newSwipedIds.has(c.id)).length;
        if (remainingAfterSwipe === 0 && onStackEmpty) {
          onStackEmpty();
        }
      } else {
        // External control of swiped IDs: rely on parent to update and re-render
        const remaining = deck.getRemainingCount();
        if (remaining <= 1 && onStackEmpty) {
          onStackEmpty();
        }
      }

      // Clear swipe direction and stop animation
      dispatch({ type: 'SET_SWIPE_DIRECTION', payload: null });
    }, CARD_TRANSITION_DURATION);

    return () => clearTimeout(timeout);
  }, [onSwipe, onStackEmpty, externalSwipedCardIds, state.swipedCardIds, state.swipeDirection, deck, cards]);

  // Spawn animation for new cards
  const triggerSpawnAnimation = useCallback((newCard: CardData) => {
    dispatch({ type: 'ADD_PENDING_CARD', payload: newCard });
    dispatch({ type: 'SET_ANIMATING', payload: true });

    setTimeout(() => {
      dispatch({ type: 'REMOVE_PENDING_CARD', payload: newCard.id });
      dispatch({ type: 'SET_ANIMATING', payload: false });
    }, SPAWN_ANIMATION_DURATION);
  }, []);

  // Reset state
  const resetStack = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    // Clear internal swiped set so deck recomputes with no swiped cards
    dispatch({ type: 'SET_SWIPED_CARDS', payload: new Set() });
  }, []);

  return {
    state,
    dispatch,
    handleSwipeComplete,
    triggerSpawnAnimation,
    resetStack,
    deck,
  };
}

/**
 * Hook for handling drag interactions
 */
export function useDragInteraction(
  onSwipeComplete: (card: CardData, direction: 'left' | 'right') => void,
  visibleCards: CardData[],
  dragState: DragState,
  dispatch: React.Dispatch<CardStackAction>
) {
  const handleStart = useCallback((clientX: number, clientY: number) => {
    dispatch({
      type: 'SET_DRAG_STATE',
      payload: {
        isDragging: true,
        startX: clientX,
        startY: clientY,
        currentX: clientX,
        currentY: clientY,
        deltaX: 0,
        deltaY: 0,
      }
    });
  }, [dispatch]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState.isDragging) return;

    const deltaX = clientX - dragState.startX;
    const deltaY = clientY - dragState.startY;

    dispatch({
      type: 'SET_DRAG_STATE',
      payload: {
        ...dragState,
        currentX: clientX,
        currentY: clientY,
        deltaX,
        deltaY,
      }
    });
  }, [dragState, dispatch]);

  const handleEnd = useCallback(() => {
    if (!dragState.isDragging) return;

    const { deltaX } = dragState;
    const absDeltaX = Math.abs(deltaX);

    if (absDeltaX > SWIPE_THRESHOLD && visibleCards[0]) {
      const direction = deltaX > 0 ? 'right' : 'left';
      onSwipeComplete(visibleCards[0], direction);
    }

    dispatch({
      type: 'SET_DRAG_STATE',
      payload: {
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deltaX: 0,
        deltaY: 0,
      }
    });
  }, [dragState, visibleCards, onSwipeComplete, dispatch]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragState.isDragging) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [dragState.isDragging, handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}

/**
 * Hook for responsive layout management
 */
export function useResponsiveLayout(dispatch: React.Dispatch<CardStackAction>) {
  // This should be handled by CSS media queries and container queries instead
  // For now, we'll provide a simple utility function that can be called when needed
  const updateLayout = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const { layout, scaleFactor } = calculateResponsiveLayout(
      window.innerWidth,
      window.innerHeight
    );
    
    dispatch({ type: 'SET_CARD_LAYOUT', payload: layout });
    dispatch({ type: 'SET_SCALE_FACTOR', payload: scaleFactor });
  }, [dispatch]);

  return { updateLayout };
}

/**
 * Hook for preventing scroll during drag
 */
export function useScrollPrevention(isDragging: boolean) {
  // This should be handled by CSS overscroll-behavior and touch-action properties
  // For now, we'll provide a simple utility that can be called when needed
  const preventScroll = useCallback((e: Event) => {
    if (isDragging) {
      e.preventDefault();
    }
  }, [isDragging]);

  return { preventScroll };
}