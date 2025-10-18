'use client';

import { useEffect, useState } from 'react';

interface TutorialHintProps {
  isVisible: boolean;
  onDismiss: () => void;
  targetSelector?: string;
}

export default function TutorialHint({ 
  isVisible, 
  onDismiss, 
  targetSelector = '[aria-label*="View liked projects"]' 
}: TutorialHintProps) {
  const [targetPosition, setTargetPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (isVisible) {
      const updateTargetPosition = () => {
        const targetElement = document.querySelector(targetSelector) as HTMLElement;
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          setTargetPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
          
          // Bring the target button to the same z-index level as the tutorial hint
          targetElement.style.position = 'relative';
          targetElement.style.zIndex = '51';
        }
      };

      // Initial position
      updateTargetPosition();

      // Update on resize
      window.addEventListener('resize', updateTargetPosition);
      
      // Cleanup function to reset z-index when tutorial is dismissed
      return () => {
        window.removeEventListener('resize', updateTargetPosition);
        const targetElement = document.querySelector(targetSelector) as HTMLElement;
        if (targetElement) {
          targetElement.style.zIndex = '';
          targetElement.style.position = '';
        }
      };
    }
  }, [isVisible, targetSelector]);

  if (!isVisible || !targetPosition) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Dimmed overlay with rounded cutout matching button's border radius */}
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        onClick={onDismiss}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          mask: `radial-gradient(circle ${Math.max(targetPosition.width, targetPosition.height)/2 + 12}px at ${targetPosition.left + targetPosition.width/2}px ${targetPosition.top + targetPosition.height/2}px, transparent ${Math.max(targetPosition.width, targetPosition.height)/2 + 8}px, black ${Math.max(targetPosition.width, targetPosition.height)/2 + 10}px)`
        }}
      />
      
      {/* Highlight circle around target */}
      <div
        className="absolute rounded-full border-4 border-base0D shadow-lg animate-pulse"
        style={{
          top: targetPosition.top - 8,
          left: targetPosition.left - 8,
          width: targetPosition.width + 16,
          height: targetPosition.height + 16,
          boxShadow: '0 0 0 4px rgba(var(--base0D-rgb, 116, 199, 236), 0.3), 0 0 20px rgba(var(--base0D-rgb, 116, 199, 236), 0.5)'
        }}
      />

      {/* Arrow pointing to target */}
      <div
        className="absolute"
        style={{
          top: targetPosition.top + targetPosition.height + 20,
          left: targetPosition.left + targetPosition.width / 2 - 12,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="text-base0D animate-bounce"
        >
          <path
            d="M12 2L12 20M12 20L5 13M12 20L19 13"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Tutorial text */}
      <div
        className="absolute bg-base01 border border-base02 rounded-lg p-4 shadow-xl max-w-xs"
        style={{
          top: targetPosition.top + targetPosition.height + 60,
          left: Math.max(16, Math.min(
            window.innerWidth - 320, 
            targetPosition.left + targetPosition.width / 2 - 160
          )),
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-base0D rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-base00"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base05 font-semibold text-sm mb-1">
              Great! You liked a project
            </h3>
            <p className="text-base04 text-xs leading-relaxed mb-3">
              Click the heart button here to view all your liked projects anytime.
            </p>
            <button
              onClick={onDismiss}
              className="px-3 py-2 bg-base0B hover:bg-base0A text-base00 rounded-lg transition-colors font-medium text-xs"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}