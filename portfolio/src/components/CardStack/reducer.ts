import { CardStackState, CardStackAction, DragState } from './types';

export const initialDragState: DragState = {
  isDragging: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  deltaX: 0,
  deltaY: 0,
};

export const initialCardStackState: CardStackState = {
  currentIndex: 0,
  swipedCardIds: new Set(),
  dragState: initialDragState,
  swipeDirection: null,
  cardLayout: 'portrait',
  scaleFactor: 1,
  contentScale: 1,
  actualCardDimensions: { width: 0, height: 0 },
  isAnimating: false,
  pendingCards: [],
};

export function cardStackReducer(state: CardStackState, action: CardStackAction): CardStackState {
  switch (action.type) {
    case 'SET_CURRENT_INDEX':
      return {
        ...state,
        currentIndex: action.payload,
      };

    case 'SET_SWIPED_CARDS':
      return {
        ...state,
        swipedCardIds: action.payload,
      };

    case 'SET_DRAG_STATE':
      return {
        ...state,
        dragState: action.payload,
      };

    case 'SET_SWIPE_DIRECTION':
      return {
        ...state,
        swipeDirection: action.payload,
        isAnimating: action.payload !== null,
      };

    case 'SET_CARD_LAYOUT':
      return {
        ...state,
        cardLayout: action.payload,
      };

    case 'SET_SCALE_FACTOR':
      return {
        ...state,
        scaleFactor: action.payload,
      };

    case 'SET_CONTENT_SCALE':
      return {
        ...state,
        contentScale: action.payload,
      };

    case 'SET_ACTUAL_DIMENSIONS':
      return {
        ...state,
        actualCardDimensions: action.payload,
      };

    case 'SET_ANIMATING':
      return {
        ...state,
        isAnimating: action.payload,
      };

    case 'ADD_PENDING_CARD':
      return {
        ...state,
        pendingCards: [...state.pendingCards, action.payload],
      };

    case 'REMOVE_PENDING_CARD':
      return {
        ...state,
        pendingCards: state.pendingCards.filter(card => card.id !== action.payload),
      };

    case 'RESET_STATE':
      return {
        ...initialCardStackState,
        cardLayout: state.cardLayout, // Preserve layout
        scaleFactor: state.scaleFactor, // Preserve scale
      };

    default:
      return state;
  }
}