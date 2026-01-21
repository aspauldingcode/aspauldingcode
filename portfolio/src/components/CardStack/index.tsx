'use client';

import React, { useEffect } from 'react';
import { CardData, GitHubRepoData } from './types';
import { useCardDeck } from './useCardDeck';
import SwipeableCard from './SwipeableCard';
import { AnimatePresence } from 'framer-motion';

interface CardStackProps {
  cards: CardData[];
  onSwipe?: (card: CardData, direction: 'left' | 'right') => void;
  onStackEmpty?: () => void;
  onViewProject?: (card: CardData) => void;
  // Legacy props we might ignore or adapt
  className?: string;
  githubData?: Record<string, GitHubRepoData>;
  swipedCardIds?: Set<string>; // Handled internally but accepted for compat
  onSeeMore?: () => void;
  dismissedCount?: number;
  likedCount?: number;
  onViewLiked?: () => void;
  onUndo?: (card: CardData) => void;
  inputDisabled?: boolean;
  onReset?: () => void;
  onSwipeRefReady?: (swipeFn: (direction: 'left' | 'right') => void) => void;
  initialIndex?: number;
}

export default function CardStack({
  cards,
  onSwipe,
  onStackEmpty,
  onViewProject,
  onUndo,
  onReset,
  className = '',
  githubData,
  inputDisabled = false,
  onSwipeRefReady,
  initialIndex = 0,
}: CardStackProps) {
  // --- 1. Robust State Machine ---
  const {
    currentCard,
    nextCard,
    isFinished,
    currentIndex,
    next,
    back,
    reset
  } = useCardDeck(cards, initialIndex);

  const [sliderValue, setSliderValue] = React.useState(10);
  const [isReseting, setIsReseting] = React.useState(false);

  // --- 2. Check for Completion ---
  useEffect(() => {
    if (isFinished && onStackEmpty) {
      // Delay slightly to allow exit animation to finish visually
      const timer = setTimeout(onStackEmpty, 300);
      return () => clearTimeout(timer);
    }
  }, [isFinished, onStackEmpty]);

  // --- 3. Handle Swipe Action ---
  const handleSwipe = (direction: 'left' | 'right') => {
    if (inputDisabled) return;

    if (currentCard && onSwipe) {
      onSwipe(currentCard, direction);
    }
    next(direction);
  };

  // Expose handleSwipe to parent via callback
  useEffect(() => {
    if (onSwipeRefReady) {
      onSwipeRefReady(handleSwipe);
    }
  }, [onSwipeRefReady]);


  const handleUndo = () => {
    if (inputDisabled) return;

    if (currentIndex > 0) {
      const prevCard = cards[currentIndex - 1];
      if (onUndo && prevCard) {
        onUndo(prevCard);
      }
    }
    back();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(Number(e.target.value));
  };

  const triggerReset = () => {
    setIsReseting(true);
    setTimeout(() => {
      if (onReset) onReset();
      reset();
      setIsReseting(false);
      setSliderValue(10);
    }, 1500); // Cinematic delay
  };

  const handleSliderRelease = () => {
    // Trigger reset if moved significantly
    if (sliderValue > 15) {
      triggerReset();
    }
  };

  // --- 4. Responsive Container Logic (Simplified) ---
  // We just need a responsive "frame" for the cards to live in.
  // The cards themselves (SwipeableCard) will fill this frame 100%.

  if (isFinished) {
    return (
      <div className={`flex flex-col items-center justify-center h-full w-full ${className} text-center p-6`}>
        {isReseting ? (
          <div className="flex flex-col items-center animate-pulse">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 border-4 border-base0D border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🌍</span>
              </div>
            </div>
            <span className="text-base05 font-bold text-lg">Finding projects near you...</span>
          </div>
        ) : (
          <>
            <div className="relative mb-8 mt-[-40px]">
              <div className="w-24 h-24 bg-base01 rounded-full flex items-center justify-center border-4 border-base02 shadow-2xl relative z-10">
                <svg className="w-12 h-12 text-base04 opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
              </div>
              {/* Radar Rings */}
              <div className="absolute inset-0 bg-base0D rounded-full opacity-20 animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="absolute inset-[-15px] border border-base0D rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>

            <h3 className="text-xl font-bold text-base05 mb-3">There&apos;s no one new around you.</h3>
            <p className="text-base04 text-sm mb-8 max-w-xs leading-relaxed mx-auto">
              This projects page replicates dating app style concepts—but with code instead of candidates.<br />
              Grow your perimeter to view more projects.<br />
              <span className="text-xs opacity-60 mt-2 block font-mono">Previous matches will re-appear for your re-consideration.</span>
            </p>

            <div className="w-full max-w-xs bg-base01 p-6 rounded-xl border border-base02 shadow-xl hover:border-base0D/30 transition-colors">
              <div className="flex justify-between items-end mb-4 select-none">
                <span className="text-xs font- bold text-base05 uppercase tracking-wider">Distance Preference</span>
                <span className="text-lg font-bold text-base0D">{sliderValue === 100 ? 'Global' : `${sliderValue} mi`}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={sliderValue}
                onChange={handleSliderChange}
                onMouseUp={handleSliderRelease}
                onTouchEnd={handleSliderRelease}
                className="w-full h-2 bg-base02 rounded-lg appearance-none cursor-pointer accent-base0D hover:accent-base0C transition-all"
              />
              <div className="flex justify-between text-[10px] text-base04 mt-2 font-mono uppercase">
                <span>10 mi</span>
                <span>Global</span>
              </div>
              <span className="text-[10px] opacity-40 mt-4 block font-mono text-center uppercase tracking-widest italic leading-none">
                this slider doesn&apos;t do anything lol
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full flex items-center justify-center p-4 overflow-hidden ${className}`}>
      {/* 
        The Card Container 
        - Max width restricted for larger screens to maintain "Card" aspect
        - Max height restricted to avoid overflow
        - Aspect ratio roughly maintained for aesthetics, but flexible
      */}
      <div
        className="relative w-full max-w-md h-[65vh] max-h-[700px] min-h-[400px]"
        style={{ perspective: 1000 }}
      >
        {/* 
          Render Strategy:
          We render the top 3 cards for visual depth. 
          index 0 = current
          index 1 = next
          index 2 = next next (peek)
        */}

        <AnimatePresence mode="popLayout">
          {currentIndex + 2 < cards.length && (
            <div className="absolute inset-0 pointer-events-none" key={cards[currentIndex + 2].id}>
              <SwipeableCard
                card={cards[currentIndex + 2]}
                index={2}
                onSwipe={() => { }}
                onViewProject={onViewProject}
                githubData={githubData}
                inputDisabled={inputDisabled}
              />
            </div>
          )}

          {currentIndex + 1 < cards.length && (
            <div className="absolute inset-0 pointer-events-none" key={cards[currentIndex + 1].id}>
              <SwipeableCard
                card={cards[currentIndex + 1]}
                index={1}
                onSwipe={() => { }}
                onViewProject={onViewProject}
                githubData={githubData}
                inputDisabled={inputDisabled}
              />
            </div>
          )}

          {currentCard && (
            <SwipeableCard
              key={currentCard.id}
              card={currentCard}
              index={0}
              onSwipe={handleSwipe}
              onViewProject={onViewProject}
              githubData={githubData}
              inputDisabled={inputDisabled}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Optional: Keyboard Controls Hint (Hidden on mobile) */}
      <div className="hidden md:flex absolute bottom-8 gap-4 text-xs text-base04 font-mono opacity-50">
        <span>← Undo</span>
        <span>Space to View</span>
        <span>Like →</span>
      </div>

      {/* 
        Keyboard Listeners 
        Implemented purely for desktop accessibility 
      */}
      <KeyboardListener
        onSwipe={handleSwipe}
        onView={() => !inputDisabled && currentCard && onViewProject?.(currentCard)}
        onUndo={handleUndo}
        onReset={triggerReset}
        disabled={inputDisabled}
      />
    </div>
  );
}

// Helper component for keyboard events
function KeyboardListener({
  onSwipe,
  onView,
  onUndo,
  onReset,
  disabled
}: {
  onSwipe: (d: 'left' | 'right') => void,
  onView: () => void,
  onUndo: () => void,
  onReset?: () => void,
  disabled: boolean
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const key = e.key.toLowerCase();

      // Navigation / Action Keys
      if (e.key === 'ArrowLeft') onUndo();
      if (e.key === 'ArrowRight') onSwipe('right');
      if (e.key === ' ') {
        e.preventDefault(); // Prevent scrolling
        onView();
      }
      if (e.key === 'Backspace') onUndo();

      // Projects Interaction Keys (User Requested)
      if (key === 'l') onSwipe('right'); // Like
      if (key === 'p') onSwipe('left');  // Pass
      if (key === 'r') onReset?.();      // Restart
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSwipe, onView, onUndo, onReset, disabled]);
  return null;
}