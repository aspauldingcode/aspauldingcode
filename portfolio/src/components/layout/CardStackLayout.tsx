import { useState, useCallback } from 'react';
import { CardData, GitHubRepoData } from '../CardStack/types';

interface CardStackLayoutProps {
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
}

export default function CardStackLayout({
  cards,
  onSwipe,
  onStackEmpty,
  // onSeeMore,
  // onViewProject,
  // dismissedCount = 0,
  // className = '',
  // cardClassName = '',
  // swipedCardIds: externalSwipedCardIds,
  // githubData
}: CardStackLayoutProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedCardIds, setSwipedCardIds] = useState<Set<string>>(new Set());

  // Handle card swipe with proper state management
  const handleSwipeComplete = useCallback((card: CardData, direction: 'left' | 'right') => {
    setSwipedCardIds(prev => new Set([...prev, card.id]));
    setCurrentIndex(prev => prev + 1);
    
    if (onSwipe) {
      onSwipe(card, direction);
    }
    
    // Check if stack is empty
    const remainingCards = cards.length - currentIndex - 1;
    if (remainingCards <= 0 && onStackEmpty) {
      onStackEmpty();
    }
  }, [cards.length, currentIndex, onSwipe, onStackEmpty]);

  // Reset functionality
  const resetStack = useCallback(() => {
    setCurrentIndex(0);
    setSwipedCardIds(new Set());
  }, []);

  // Calculate visible cards
  const visibleCards = cards.slice(currentIndex, currentIndex + 3);
  const hasMoreCards = currentIndex < cards.length;

  return {
    currentIndex,
    swipedCardIds,
    visibleCards,
    hasMoreCards,
    handleSwipeComplete,
    resetStack
  };
}