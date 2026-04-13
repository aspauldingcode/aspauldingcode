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
  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

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

  const applyTransform = useCallback((offset: number) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (sliderRef.current) {
        sliderRef.current.style.transform = `translate3d(calc(-${currentSlide * 100}% + ${offset}px), 0, 0)`;
      }
    });
  }, [currentSlide]);

  const settle = useCallback((deltaX: number, threshold: number) => {
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
  }, [applyTransform, clearPointer, currentSlide, imageCount, onNext, onPrev, setSliderTransition]);

  const processMove = useCallback((clientX: number, clientY: number, preventDefault?: () => void) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const dx = clientX - startXRef.current;
    const dy = clientY - startYRef.current;

    if (state.phase === 'pending' && (Math.abs(dx) > axisThreshold || Math.abs(dy) > axisThreshold)) {
      if (Math.abs(dx) >= Math.abs(dy)) {
        dispatch({ type: 'LOCK_HORIZONTAL' });
        setSliderTransition('none');
      } else {
        dispatch({ type: 'LOCK_VERTICAL' });
      }
    }

    if (state.phase === 'dragging') {
      preventDefault?.();
      const resistedDx =
        (currentSlide <= 0 && dx > 0) || (currentSlide >= imageCount - 1 && dx < 0)
          ? dx * edgeResistance
          : dx;
      dragOffsetRef.current = resistedDx;
      applyTransform(resistedDx);
    }
  }, [applyTransform, axisThreshold, currentSlide, edgeResistance, imageCount, setSliderTransition, state.phase]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (imageCount <= 1) return;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    dispatch({ type: 'POINTER_DOWN' });
  }, [imageCount]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    processMove(event.clientX, event.clientY);
  }, [processMove]);

  const handleMouseUp = useCallback(() => {
    if (state.phase === 'dragging' && startXRef.current !== null) {
      settle(-(dragOffsetRef.current), mouseThreshold);
      return;
    }
    dispatch({ type: 'END' });
    setSliderTransition('');
    clearPointer();
  }, [clearPointer, mouseThreshold, settle, setSliderTransition, state.phase]);

  const handleMouseLeave = useCallback(() => {
    if (state.phase === 'dragging' && startXRef.current !== null) {
      settle(-(dragOffsetRef.current), mouseThreshold);
      return;
    }
    dispatch({ type: 'END' });
    setSliderTransition('');
    clearPointer();
  }, [clearPointer, mouseThreshold, settle, setSliderTransition, state.phase]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (imageCount <= 1) return;
    startXRef.current = event.touches[0]?.clientX ?? null;
    startYRef.current = event.touches[0]?.clientY ?? null;
    dispatch({ type: 'POINTER_DOWN' });
  }, [imageCount]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (state.phase === 'dragging' && startXRef.current !== null) {
      const endX = event.changedTouches[0]?.clientX ?? startXRef.current;
      settle(-(endX - startXRef.current), touchThreshold);
      return;
    }
    dispatch({ type: 'END' });
    setSliderTransition('');
    clearPointer();
  }, [clearPointer, setSliderTransition, settle, state.phase, touchThreshold]);

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
  };
}
