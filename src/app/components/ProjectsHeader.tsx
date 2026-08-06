'use client';

import { MouseEvent, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { usePathname, useRouter } from 'next/navigation';
import { pinnedRailLabelTypographyClass } from '@/app/projects/PinnedVerticalRail';

interface ProjectsHeaderProps {
  isSheetOpen?: boolean;
  /** When true, the centered fixed title is omitted (e.g. title is shown inline beside the pinned rail). */
  hideMainTitle?: boolean;
}

/**
 * Same shell as `PinnedVerticalRail`: offset skew shadow, `persona-skew` frame (`border-base09`), −90° label
 * column and `pinnedRailLabelTypographyClass` — no stars — so Alex’s title lines up with the pinned label.
 */
export function AlexProjectsInlineTitle({
  className = '',
  isHidden = false,
}: {
  className?: string;
  /** Match main header: fade when project sheet is open. */
  isHidden?: boolean;
}) {
  return (
    <motion.aside
      animate={{
        opacity: isHidden ? 0 : 1,
        filter: isHidden ? 'blur(10px)' : 'blur(0px)',
        scale: isHidden ? 0.9 : 1,
      }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      aria-label="Alex's projects"
      className={`pointer-events-none flex h-full min-h-0 shrink-0 flex-col self-stretch overflow-visible w-[3.5rem] min-[400px]:w-14 sm:w-[4rem] ${className}`}
    >
      <div className="relative flex h-full min-h-0 flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 origin-center bg-base08 opacity-90"
          style={{ transform: 'skewX(-12deg) translate(2px, 2px)' }}
        />
        <div className="persona-skew relative flex min-h-0 flex-1 items-center justify-center overflow-visible border border-base09 bg-base00 px-0.5 py-1 shadow-[2px_2px_0_var(--base08)] h-550:px-0.5 h-550:py-0.5 sm:px-1 sm:py-2 sm:h-550:py-0.5">
          <div className="flex h-full w-full min-w-0 items-center justify-center">
            <div className="-rotate-90 flex w-max flex-row flex-nowrap items-center justify-center origin-center">
              <h1 className={pinnedRailLabelTypographyClass}>{'Alex\'s\nProjects'}</h1>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

export default function ProjectsHeader({
  isSheetOpen = false,
  hideMainTitle = false,
}: ProjectsHeaderProps) {
  const { scrollY } = useScroll();
  const bp = useBreakpoints();
  const router = useRouter();
  const pathname = usePathname();
  const [showTooltip, setShowTooltip] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const homePath = pathname.replace(/\/projects\/?$/, '') || '/';

  const handleHomeClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Clear existing timeout to reset the 3s clock
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Ensure tooltip is visible during interaction
    setShowTooltip(true);

    router.push(homePath);

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
  // On mobile, keep title present longer (until they leave the hero)
  const fadeRange = bp.width < 640 ? 500 : 100;
  
  const scrollOpacity = useTransform(scrollY, [0, fadeRange], [1, 0]);
  const scrollBlur = useTransform(scrollY, [0, fadeRange], ["blur(0px)", "blur(8px)"]);
  const scrollScale = useTransform(scrollY, [0, fadeRange], [1, 0.9]);
  const scrollYOffset = useTransform(scrollY, [0, fadeRange], [0, -20]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const headerContent = (
    <>
      {/* Isolated Home Button - Fixed to top left like Theme Toggle */}
      <div
        className="fixed top-0 left-0 z-[210] pt-[calc(1rem+var(--safe-top))] pl-[calc(1rem+var(--safe-left))] sm:pt-[calc(1.25rem+var(--safe-top))] sm:pl-[calc(1.25rem+var(--safe-left))] lg:pt-[calc(1.5rem+var(--safe-top))] lg:pl-[calc(1.5rem+var(--safe-left))] transition-all duration-500 will-change-transform"
        style={{
          transform: 'translate3d(0,0,0)',
          WebkitTransform: 'translate3d(0,0,0)',
        }}
      >
        <motion.div
          animate={{
            opacity: isSheetOpen ? 0 : 1,
            filter: isSheetOpen ? "blur(10px)" : "blur(0px)",
            scale: isSheetOpen ? 0.9 : 1,
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="pointer-events-auto"
        >
          <div className="relative group flex flex-col items-center">
            {/* Unified Persona Offset Shadow */}
            <div className="p6-button-shadow" />
            
            <button
              type="button"
              onClick={handleHomeClick}
              className="p6-button p-2 bg-base09 hover:bg-base0A text-base00"
              aria-label="Back to Home"
            >
              <div className="skew-x-12 relative z-10">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5"
                  />
                </svg>
              </div>
            </button>

            {/* Unified Hover Hint */}
            <div className={`p6-tooltip left-full ml-3 top-1/2 -translate-y-1/2 transition-all duration-300 ${showTooltip ? 'opacity-0 pointer-fine:group-hover:opacity-100 -translate-x-2 pointer-fine:group-hover:translate-x-0' : 'opacity-0'}`}>
              <span className="p6-tooltip-text">home</span>
            </div>

            {bp.hasKeyboard && (
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[10px] font-black italic text-base04 opacity-50 uppercase tracking-widest whitespace-nowrap">
                (h)
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Main Header Title - Centered and Fades on Scroll */}
      {!hideMainTitle ? (
      <div
        className="fixed top-0 left-0 right-0 z-[200] pointer-events-none pt-[calc(1rem+var(--safe-top))] pl-[calc(1rem+var(--safe-left))] pr-[calc(1rem+var(--safe-right))] sm:pt-[calc(1.25rem+var(--safe-top))] sm:pl-[calc(1.25rem+var(--safe-left))] sm:pr-[calc(1.25rem+var(--safe-right))] lg:pt-[calc(1.5rem+var(--safe-top))] lg:pl-[calc(1.5rem+var(--safe-left))] lg:pr-[calc(1.5rem+var(--safe-right))]"
        style={{
          transform: 'translate3d(0,0,0)',
          WebkitTransform: 'translate3d(0,0,0)',
        }}
      >
        <div className="relative h-12 flex items-center justify-center">
          <motion.div
            initial={{ x: "-50%" }}
            animate={{
              x: "-50%",
              opacity: isSheetOpen ? 0 : 1,
              filter: isSheetOpen ? "blur(10px)" : "blur(0px)",
              scale: isSheetOpen ? 0.9 : 1
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none"
          >
            {/* Inner Wrapper for Scroll Effects */}
            <motion.div
              style={{
                opacity: scrollOpacity,
                filter: scrollBlur,
                scale: scrollScale,
                y: scrollYOffset
              }}
              className="relative"
            >
              {/* Persona Slanted Title Bar - Layered Shadows */}
              <div className="absolute inset-0 bg-base09 -skew-x-12 translate-x-3 translate-y-2 opacity-30" />
              <div className="absolute inset-0 bg-base08 -skew-x-12 translate-x-1.5 translate-y-1 opacity-50" />
              
              <div className="relative border-2 border-base05 px-8 py-2 h-600:px-6 h-600:py-1.5 h-500:px-5 h-500:py-1 -skew-x-12 bg-base00/90 backdrop-blur-md shadow-2xl">
                <h1 className="text-xl sm:text-2xl md:text-4xl h-600:text-lg h-500:text-base font-black text-base05 whitespace-nowrap leading-none uppercase italic tracking-tighter skew-x-0">
                  Alex&apos;s Projects
                </h1>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      ) : null}
    </>
  );

  return createPortal(headerContent, document.body);
}