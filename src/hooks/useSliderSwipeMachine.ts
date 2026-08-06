import { useCallback, useEffect, useReducer, useRef } from 'react';

type SwipePhase = 'idle' | 'pending' | 'dragging' | 'vertical';

interface SwipeState {
  phase: SwipePhase;
  isDragging: boolean;
}

type SwipeAction =
  | { type: 'POINTER_DOWN' }
  | { type: 'LOCK_HORIZONTAL' }
  | { type: 'LOCK_VERTICAL' }
  | { type: 'END' };

const initialSwipeState: SwipeState = {
  phase: 'idle',
  isDragging: false,
};

function swipeReducer(state: SwipeState, action: SwipeAction): SwipeState {
  switch (action.type) {
    case 'POINTER_DOWN':
      return { phase: 'pending', isDragging: false };
    case 'LOCK_HORIZONTAL':
      return { phase: 'dragging', isDragging: true };
    case 'LOCK_VERTICAL':
      return { phase: 'vertical', isDragging: false };
    case 'END':
      return initialSwipeState;
    default:
      return state;
  }
}

interface UseSliderSwipeMachineConfig {
  currentSlide: number;
  imageCount: number;
  onNext: () => void;
  onPrev: () => void;
  mouseThreshold?: number;
  touchThreshold?: number;
  axisThreshold?: number;
  edgeResistance?: number;
}

export function useSliderSwipeMachine({
  currentSlide,
  imageCount,
  onNext,
  onPrev,
  mouseThreshold = 50,
  touchThreshold = 40,
  axisThreshold = 5,
  edgeResistance = 0.35,
}: UseSliderSwipeMachineConfig) {
  const [state, dispatch] = useReducer(swipeReducer, initialSwipeState);
  const phaseRef = useRef<SwipePhase>(initialSwipeState.phase);
  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const settleInProgressRef = useRef(false);
  const dragUsesTouchRef = useRef(false);
  const windowEndLockRef = useRef(false);

  const clearPointer = useCallback(() => {
    startXRef.current = null;
    startYRef.current = null;
    dragOffsetRef.current = 0;
  }, []);

  const setSliderTransition = useCallback((transition: string) => {
    if (sliderRef.current) {
      sliderRef.current.style.transition = transition;
    }
  }, []);

  const endInteraction = useCallback(() => {
    dispatch({ type: 'END' });
    setSliderTransition('');
    clearPointer();
  }, [clearPointer, setSliderTransition]);

  const applyTransform = useCallback((offset: number) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (sliderRef.current) {
        sliderRef.current.style.transform = `translate3d(calc(-${currentSlide * 100}% + ${offset}px), 0, 0)`;
      }
    });
  }, [currentSlide]);

  const settle = useCallback((deltaX: number, threshold: number) => {
    if (settleInProgressRef.current) return;
    settleInProgressRef.current = true;
    try {
      setSliderTransition('');
      dispatch({ type: 'END' });
      clearPointer();

      if (Math.abs(deltaX) < threshold) {
        applyTransform(0);
        return;
      }

      if (deltaX > 0) {
        if (currentSlide >= imageCount - 1) {
          applyTransform(0);
          return;
        }
        onNext();
        return;
      }

      if (currentSlide <= 0) {
        applyTransform(0);
        return;
      }
      onPrev();
    } finally {
      settleInProgressRef.current = false;
    }
  }, [applyTransform, clearPointer, currentSlide, imageCount, onNext, onPrev, setSliderTransition]);

  const processMove = useCallback((clientX: number, clientY: number, preventDefault?: () => void) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const dx = clientX - startXRef.current;
    const dy = clientY - startYRef.current;
    let phase = phaseRef.current;

    if (phase === 'pending' && (Math.abs(dx) > axisThreshold || Math.abs(dy) > axisThreshold)) {
      if (Math.abs(dx) >= Math.abs(dy)) {
        dispatch({ type: 'LOCK_HORIZONTAL' });
        setSliderTransition('none');
        phase = 'dragging';
      } else {
        dispatch({ type: 'LOCK_VERTICAL' });
        phase = 'vertical';
      }
    }

    if (phase === 'dragging') {
      preventDefault?.();
      const resistedDx =
        (currentSlide <= 0 && dx > 0) || (currentSlide >= imageCount - 1 && dx < 0)
          ? dx * edgeResistance
          : dx;
      dragOffsetRef.current = resistedDx;
      applyTransform(resistedDx);
    }
  }, [applyTransform, axisThreshold, currentSlide, edgeResistance, imageCount, setSliderTransition]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (imageCount <= 1) return;
    settleInProgressRef.current = false;
    dragUsesTouchRef.current = false;
    windowEndLockRef.current = false;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    dispatch({ type: 'POINTER_DOWN' });
  }, [imageCount]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    processMove(event.clientX, event.clientY);
  }, [processMove]);

  const handleMouseUp = useCallback(() => {
    if (phaseRef.current === 'dragging' && startXRef.current !== null) {
      settle(-(dragOffsetRef.current), mouseThreshold);
      return;
    }
    endInteraction();
  }, [endInteraction, mouseThreshold, settle]);

  const handleMouseLeave = useCallback(() => {
    if (phaseRef.current === 'dragging' && startXRef.current !== null) {
      settle(-(dragOffsetRef.current), mouseThreshold);
      return;
    }
    endInteraction();
  }, [endInteraction, mouseThreshold, settle]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (imageCount <= 1) return;
    settleInProgressRef.current = false;
    dragUsesTouchRef.current = true;
    windowEndLockRef.current = false;
    startXRef.current = event.touches[0]?.clientX ?? null;
    startYRef.current = event.touches[0]?.clientY ?? null;
    dispatch({ type: 'POINTER_DOWN' });
  }, [imageCount]);

  const handleTouchEnd = useCallback((_event: React.TouchEvent<HTMLDivElement>) => {
    if (phaseRef.current === 'dragging' && startXRef.current !== null) {
      settle(-(dragOffsetRef.current), touchThreshold);
      return;
    }
    endInteraction();
  }, [endInteraction, settle, touchThreshold]);

  const handleTouchCancel = useCallback(() => {
    endInteraction();
  }, [endInteraction]);

  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);

  useEffect(() => {
    const el = swipeAreaRef.current;
    if (!el || imageCount <= 1) return;

    const onTouchMove = (event: TouchEvent) => {
      const clientX = event.touches[0]?.clientX;
      const clientY = event.touches[0]?.clientY;
      if (clientX === undefined || clientY === undefined) return;
      processMove(clientX, clientY, () => event.preventDefault());
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [imageCount, processMove]);

  useEffect(() => {
    if (state.phase !== 'dragging') {
      applyTransform(0);
    }
  }, [applyTransform, currentSlide, state.phase]);

  useEffect(() => {
    if (state.phase !== 'dragging') return;

    const onPointerMove = (event: PointerEvent) => {
      processMove(event.clientX, event.clientY);
    };

    const onMouseMove = (event: MouseEvent) => {
      if (event.buttons === 0) return;
      processMove(event.clientX, event.clientY);
    };

    const onTouchMove = (event: TouchEvent) => {
      const t = event.touches[0];
      if (!t) return;
      processMove(t.clientX, t.clientY);
    };

    const endFromWindow = () => {
      if (windowEndLockRef.current) return;
      windowEndLockRef.current = true;
      try {
        if (phaseRef.current === 'dragging' && startXRef.current !== null) {
          const th = dragUsesTouchRef.current ? touchThreshold : mouseThreshold;
          settle(-(dragOffsetRef.current), th);
        } else {
          endInteraction();
        }
      } finally {
        queueMicrotask(() => {
          windowEndLockRef.current = false;
        });
      }
    };

    const onDocumentMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget !== null) return;
      endFromWindow();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endFromWindow);
    window.addEventListener('pointercancel', endFromWindow);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endFromWindow);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', endFromWindow);
    window.addEventListener('touchcancel', endFromWindow);
    document.documentElement.addEventListener('mouseout', onDocumentMouseOut);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endFromWindow);
      window.removeEventListener('pointercancel', endFromWindow);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endFromWindow);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', endFromWindow);
      window.removeEventListener('touchcancel', endFromWindow);
      document.documentElement.removeEventListener('mouseout', onDocumentMouseOut);
    };
  }, [endInteraction, mouseThreshold, processMove, settle, state.phase, touchThreshold]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return {
    state,
    isDragging: state.isDragging,
    swipeAreaRef,
    sliderRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel,
  };
}
