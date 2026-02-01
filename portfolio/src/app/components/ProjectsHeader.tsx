'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useBreakpoints } from '@/hooks/useBreakpoints';

interface ProjectsHeaderProps {
  isSheetOpen?: boolean;
}

export default function ProjectsHeader({
  isSheetOpen = false
}: ProjectsHeaderProps) {
  const { scrollY } = useScroll();
  const bp = useBreakpoints();
  const [showTooltip, setShowTooltip] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleHomeClick = () => {
    // Clear existing timeout to reset the 3s clock
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Ensure tooltip is visible during interaction
    setShowTooltip(true);

    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
      // Reset after a delay so it can show again on next interaction/hover
      setTimeout(() => setShowTooltip(true), 2000);
    }, 3000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Transform scroll position to opacity/blur values
  // Fade out quickly as user scrolls (0 to 100px)
  const scrollOpacity = useTransform(scrollY, [0, 100], [1, 0]);
  const scrollBlur = useTransform(scrollY, [0, 100], ["blur(0px)", "blur(8px)"]);
  const scrollScale = useTransform(scrollY, [0, 100], [1, 0.9]);
  const scrollYOffset = useTransform(scrollY, [0, 100], [0, -20]);

  return (
    <>
      {/* Fixed Header Bar with Navigation and Title */}
      <div
        className="fixed top-0 left-0 right-0 pt-[calc(1rem+var(--safe-top))] pl-[calc(1rem+var(--safe-left))] pr-[calc(1rem+var(--safe-right))] sm:pl-[calc(1.25rem+var(--safe-left))] sm:pr-[calc(1.25rem+var(--safe-right))] lg:pl-[calc(1.5rem+var(--safe-left))] lg:pr-[calc(1.5rem+var(--safe-right))] flex items-center justify-between"
        style={{
          transform: 'translate3d(0,0,0)', // Force hardware acceleration for mobile
          WebkitTransform: 'translate3d(0,0,0)', // Safari-specific
          position: 'fixed', // Ensure fixed positioning is explicit
          pointerEvents: 'none' // Let clicks pass through empty areas
        }}
      >
        {/* Back Button */}
        <motion.div
          animate={{
            opacity: isSheetOpen ? 0 : 1,
            filter: isSheetOpen ? "blur(10px)" : "blur(0px)",
            scale: isSheetOpen ? 0.9 : 1,
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="pointer-events-auto z-[100]"
        >
          <Link
            href="/"
            onClick={handleHomeClick}
            className="block p-2 rounded-lg bg-base0B hover:bg-base0A transition-all duration-300 shadow-lg active:scale-95 touch-manipulation relative group"
            aria-label="Back to Home"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              className="text-base00 w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5"
              />
            </svg>
            {bp.hasKeyboard && (
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[10px] font-mono opacity-50 text-base04 bg-base01/80 px-1 rounded pointer-events-none hidden sm:block whitespace-nowrap z-50">
                (h)
              </span>
            )}

            {/* Hover Hint */}
            {bp.isSm && (
              <span className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-base0B text-base00 text-[10px] font-bold uppercase tracking-widest rounded transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl border border-base00/10 ${showTooltip ? 'opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0' : 'opacity-0'}`}>
                home
              </span>
            )}
          </Link>
        </motion.div>

        <motion.div
          initial={{ x: "-50%" }}
          animate={{
            x: "-50%",
            opacity: isSheetOpen ? 0 : 1,
            filter: isSheetOpen ? "blur(10px)" : "blur(0px)",
            // Use scale from animate only for sheet?
            // Actually, we want to combine them.
            // But animate overrides style scale?
            // Wrapper handles Sheet (Exit/Enter).
            // Inner handles Scroll.
            scale: isSheetOpen ? 0.9 : 1
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute left-1/2 flex flex-col items-center justify-center pointer-events-none"
        >
          {/* Inner Wrapper for Scroll Effects */}
          <motion.div
            style={{
              opacity: scrollOpacity,
              filter: scrollBlur,
              scale: scrollScale,
              y: scrollYOffset
            }}
          >
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-base05 whitespace-nowrap leading-none">
              Alex&apos;s Projects
            </h1>
          </motion.div>
        </motion.div>

        {/* Empty spacer to balance the flex layout */}
        <div className="w-9" />
      </div>
    </>
  );
}