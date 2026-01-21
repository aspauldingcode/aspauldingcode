export interface CardData {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  threeWordDescriptor: string;
  image?: string;
  tags?: string[];
  startYear?: number;
  endYear?: number;
  githubRepo?: string;
  link?: string;
  [key: string]: string | string[] | number | undefined;
}

export interface CardStackProps {
  cards: CardData[];
  onSwipe?: (card: CardData, direction: 'left' | 'right') => void;
  onStackEmpty?: () => void;
  onSeeMore?: () => void;
  onViewProject?: (card: CardData) => void;
  dismissedCount?: number;
  className?: string;
  cardClassName?: string;
  swipedCardIds?: Set<string>;
  githubData?: Record<string, GitHubRepoData>;
  onUndo?: (card: CardData) => void;
  inputDisabled?: boolean;
  onReset?: () => void;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
}

export interface CardStackState {
  currentIndex: number;
  swipedCardIds: Set<string>;
  dragState: DragState;
  swipeDirection: 'left' | 'right' | null;
  cardLayout: 'portrait' | 'landscape' | 'compact';
  scaleFactor: number;
  contentScale: number;
  actualCardDimensions: { width: number; height: number };
  isAnimating: boolean;
  pendingCards: CardData[];
}

import { GitHubRepoData } from '../../lib/github';

export type { GitHubRepoData };

export type CardStackAction =
  | { type: 'SET_CURRENT_INDEX'; payload: number }
  | { type: 'SET_SWIPED_CARDS'; payload: Set<string> }
  | { type: 'SET_DRAG_STATE'; payload: DragState }
  | { type: 'SET_SWIPE_DIRECTION'; payload: 'left' | 'right' | null }
  | { type: 'SET_CARD_LAYOUT'; payload: 'portrait' | 'landscape' | 'compact' }
  | { type: 'SET_SCALE_FACTOR'; payload: number }
  | { type: 'SET_CONTENT_SCALE'; payload: number }
  | { type: 'SET_ACTUAL_DIMENSIONS'; payload: { width: number; height: number } }
  | { type: 'SET_ANIMATING'; payload: boolean }
  | { type: 'ADD_PENDING_CARD'; payload: CardData }
  | { type: 'REMOVE_PENDING_CARD'; payload: string }
  | { type: 'RESET_STATE' };