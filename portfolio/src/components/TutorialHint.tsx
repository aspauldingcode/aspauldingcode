'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Allow Enter/Esc to dismiss, but don't capture (don't block other shortcuts)
  useEffect(() => {
    if (isVisible) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          onDismiss();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, onDismiss]);

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

          targetElement.style.position = 'relative';
          targetElement.style.zIndex = '51';
        }
      };

      updateTargetPosition();
      window.addEventListener('resize', updateTargetPosition);

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

  return (
    <AnimatePresence>
      {isVisible && targetPosition && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Dimmed overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-auto cursor-pointer"
            onClick={onDismiss}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              mask: `radial-gradient(circle ${Math.max(targetPosition.width, targetPosition.height) / 2 + 12}px at ${targetPosition.left + targetPosition.width / 2}px ${targetPosition.top + targetPosition.height / 2}px, transparent ${Math.max(targetPosition.width, targetPosition.height) / 2 + 8}px, black ${Math.max(targetPosition.width, targetPosition.height) / 2 + 10}px)`,
              WebkitMask: `radial-gradient(circle ${Math.max(targetPosition.width, targetPosition.height) / 2 + 12}px at ${targetPosition.left + targetPosition.width / 2}px ${targetPosition.top + targetPosition.height / 2}px, transparent ${Math.max(targetPosition.width, targetPosition.height) / 2 + 8}px, black ${Math.max(targetPosition.width, targetPosition.height) / 2 + 10}px)`
            }}
          />

          {/* Highlight circle around target */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: 1
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              scale: {
                repeat: Infinity,
                duration: 2,
                ease: "easeInOut"
              },
              opacity: { duration: 0.3 }
            }}
            className="absolute rounded-full border-4 border-base0D shadow-lg pointer-events-none"
            style={{
              top: targetPosition.top - 8,
              left: targetPosition.left - 8,
              width: targetPosition.width + 16,
              height: targetPosition.height + 16,
              boxShadow: '0 0 0 4px rgba(95, 139, 167, 0.3), 0 0 20px rgba(95, 139, 167, 0.5)'
            }}
          />

          {/* Arrow pointing to target */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{
              y: [0, 10, 0],
              opacity: 1
            }}
            exit={{ y: -20, opacity: 0 }}
            transition={{
              y: {
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut"
              },
              opacity: { duration: 0.3 }
            }}
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
              className="text-base0D"
            >
              <path
                d="M12 2L12 20M12 20L5 13M12 20L19 13"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

          {/* Tutorial text box */}
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.9, pointerEvents: 'none' }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300
            }}
            className="absolute bg-base01 border border-base02 rounded-lg p-5 shadow-2xl max-w-xs pointer-events-auto"
            style={{
              top: targetPosition.top + targetPosition.height + 60,
              left: Math.max(16, Math.min(
                window.innerWidth - 320,
                targetPosition.left + targetPosition.width / 2 - 160
              )),
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-base0D rounded-full flex items-center justify-center shadow-lg">
                <svg
                  className="w-5 h-5 text-base00"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base05 font-bold text-base mb-1">
                  Nice! You liked a project
                </h3>
                <p className="text-base04 text-sm leading-relaxed mb-4">
                  Tap the heart in the header anytime to browse your collection of saved projects.
                </p>
                <button
                  onClick={onDismiss}
                  className="w-full sm:w-auto px-6 py-2 bg-base0B hover:bg-base0A text-base00 rounded-lg transition-all font-bold text-sm shadow-md active:scale-95"
                >
                  Got it!
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}