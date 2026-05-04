'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Project } from './projectData';
import ProjectsHeader, { AlexProjectsInlineTitle } from '../components/ProjectsHeader';
import ProjectCard from '@/components/ProjectCard';
import { GitHubRepoData } from '@/lib/github';
import { motion } from 'framer-motion';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { FeaturedMobileStack } from './FeaturedMobileStack';
import { PinnedVerticalRail } from './PinnedVerticalRail';

const PROJECT_CARD_FOCUSABLE_SELECTOR = '[role="button"][aria-label^="View details"]';

/** Pinned / featured cards: document top so the fixed header title stays sharp (it blurs with scrollY). */
function scrollPinnedProjectsToPageTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

/**
 * Never scroll horizontally: `scrollIntoView` / focus heuristics use the full transformed + outline
 * bounds (skewed cards extend past layout width), which nudges the window on edge columns.
 */
function scrollProjectCardIntoViewVertically(el: HTMLElement) {
  if (el.closest('[data-pinned-projects-section]')) {
    scrollPinnedProjectsToPageTop();
    return;
  }
  const rect = el.getBoundingClientRect();
  const margin = Math.min(96, Math.max(40, window.innerHeight * 0.1));
  const topGap = margin - rect.top;
  const bottomGap = rect.bottom - (window.innerHeight - margin);
  if (topGap > 0) {
    window.scrollBy({ top: -topGap, behavior: 'smooth' });
  } else if (bottomGap > 0) {
    window.scrollBy({ top: bottomGap, behavior: 'smooth' });
  }
}

function ProjectSheetLoading() {
  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      <div className="absolute inset-0 bg-base00/80 backdrop-blur-sm" />
      <div className="absolute inset-x-0 bottom-0 h-[96dvh] sm:h-[94dvh] rounded-t-3xl sm:rounded-2xl border border-base02 bg-base01/90 p-6 sm:p-8">
        <div
          className="h-full w-full rounded-2xl animate-shimmer"
          style={{
            backgroundSize: '200% 100%',
            backgroundImage: 'linear-gradient(to right, rgba(56,56,56,0.9), rgba(40,40,40,0.8), rgba(56,56,56,0.9))',
          }}
        />
      </div>
    </div>
  );
}

// Dynamically import the sheet/modal to reduce initial bundle size
const loadProjectSheet = () => import('@/components/ProjectSheet');
const ProjectSheet = dynamic(loadProjectSheet, {
  loading: () => <ProjectSheetLoading />,
});

interface ProjectsClientProps {
  projects: Project[];
  initialGithubData?: Record<string, GitHubRepoData>;
}

function FloatingShapes() {
  const seeded = (seed: number) => {
    const value = Math.sin(seed * 9999.91) * 10000;
    return value - Math.floor(value);
  };

  const shapes = [
    // P1/P2: Gothic Butterfly (Outline)
    <svg key="p12" viewBox="0 0 100 100" className="w-full h-full stroke-current fill-none stroke-[2]">
      <path d="M50 50 L30 20 Q 10 10, 10 40 L30 50 L10 60 Q 10 90, 30 80 L50 50 L70 20 Q 90 10, 90 40 L70 50 L90 60 Q 90 90, 70 80 Z" strokeLinejoin="round" />
    </svg>,
    // P3: Moon & Gear (Outline)
    <svg key="p3" viewBox="0 0 100 100" className="w-full h-full stroke-current fill-none stroke-[2]">
      <path d="M30 20 A 40 40 0 1 0 30 80 A 30 30 0 1 1 30 20" />
      <circle cx="55" cy="50" r="10" strokeDasharray="4 2" />
    </svg>,
    // P4: TV Frame (Outline)
    <svg key="p4" viewBox="0 0 100 100" className="w-full h-full stroke-current fill-none stroke-[2.5]">
      <rect x="15" y="25" width="70" height="55" rx="5" />
      <path d="M35 25 L25 10 M65 25 L75 10" strokeLinecap="round" />
      <path d="M25 35 L75 35" opacity="0.3" />
    </svg>,
    // P5: Phantom Star (20-point rounded uneven - Outline)
    <svg key="p5" viewBox="0 0 100 100" className="w-full h-full stroke-current fill-none stroke-[2]">
      <path d="M50 5 L55 35 L85 25 L65 45 L95 55 L65 65 L85 85 L55 75 L50 95 L45 75 L15 85 L35 65 L5 55 L35 45 L15 25 L45 35 Z" strokeLinejoin="round" />
    </svg>
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Top Left Hero Shape - Multi-Era Composition */}
      <motion.div
        initial={{ rotate: 0, scale: 0.8, x: '-20%', y: '-20%' }}
        animate={{ 
          rotate: [0, 90, 180, 270, 360],
          scale: [0.8, 1.1, 0.8],
        }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 left-0 w-80 h-80 text-base08 opacity-10"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-current fill-none stroke-[1] filter blur-[1.5px]">
          <circle cx="50" cy="50" r="45" strokeDasharray="10 5" />
          <path d="M50 5 L55 35 L85 25 L65 45 L95 55 L65 65 L85 85 L55 75 L50 95 L45 75 L15 85 L35 65 L5 55 L35 45 L15 25 L45 35 Z" strokeWidth="2" strokeLinejoin="round" />
          <path d="M10 10 L90 20 L80 90 L20 80 Z" strokeWidth="1" strokeDasharray="5 5" />
        </svg>
      </motion.div>

      {/* Floating Debris */}
      {[...Array(6)].map((_, i) => (
        (() => {
          const xSeed = seeded(i + 1);
          const ySeed = seeded(i + 11);
          const rotSeed = seeded(i + 21);
          const scaleSeed = seeded(i + 31);
          const durationSeed = seeded(i + 41);
          return (
        <motion.div
          key={i}
          initial={{ 
            x: `${(xSeed * 100).toFixed(3)}%`, 
            y: `${(ySeed * 100).toFixed(3)}%`,
            rotate: Number((rotSeed * 360).toFixed(3)),
            scale: Number((0.4 + scaleSeed * 0.8).toFixed(3)),
            opacity: 0.05
          }}
          animate={{ 
            y: ['-20%', '120%'],
            rotate: [0, 360],
          }}
          transition={{ 
            duration: Number((30 + durationSeed * 40).toFixed(3)), 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className={`absolute w-16 h-16 sm:w-24 sm:h-24 ${i % 2 === 0 ? 'text-base0D' : 'text-base0E'}`}
        >
          {shapes[i % shapes.length]}
        </motion.div>
          );
        })()
      ))}
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

export default function ProjectsClient({ projects, initialGithubData = {} }: ProjectsClientProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [githubData, setGithubData] = useState<Record<string, GitHubRepoData>>(initialGithubData);
  const { isLowEnd } = useNetworkStatus();
  const bp = useBreakpoints();
  /** Viewport height ≤550px: compact pinned hero (deck + desktop grid + label) */
  const shortHero = bp.isMounted && bp.isH550;
  /** Title moves beside the pinned rail; frees vertical space under the fixed chrome. */
  const ultraShortViewport = bp.isMounted && bp.height < 350;
  /**
   * Wide pinned grid + vertical rail only when lg-wide and not ultra-short.
   * Height under 350px: always use `FeaturedMobileStack` so the swipe deck still renders on wide but very short viewports.
   */
  const showDesktopPinnedHero =
    !bp.isMounted || (bp.width >= 1024 && !ultraShortViewport);
  const [hasOpenedSheet, setHasOpenedSheet] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'mouse' | 'keyboard'>('mouse');
  const hasPrewarmedSheetRef = useRef(false);

  useEffect(() => {
    const scrollTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollTop();
    const raf = requestAnimationFrame(scrollTop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (selectedProject && !hasOpenedSheet) {
      setHasOpenedSheet(true);
    }
  }, [selectedProject, hasOpenedSheet]);

  // Fetch GitHub data on client side
  useEffect(() => {
    // Skip fetching if we already have initial data from the server
    if (Object.keys(initialGithubData).length > 0) return;

    // Skip fetching extra data on low-end connections to save bandwidth/processing
    if (isLowEnd) return;

    const fetchStars = async () => {
      const repos = projects
        .filter(p => p.githubRepo)
        .map(p => p.githubRepo!);

      if (repos.length === 0) return;

      try {
        const response = await fetch(`/api/github-stars?repos=${encodeURIComponent(repos.join(','))}`);
        if (response.ok) {
          const data = await response.json();
          setGithubData(data);
        }
      } catch (error) {
        console.error('Failed to fetch GitHub stars:', error);
      }
    };

    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(fetchStars, { timeout: 1200 })
      : window.setTimeout(fetchStars, 150);

    return () => {
      if (window.cancelIdleCallback && typeof schedule === 'number') {
        window.cancelIdleCallback(schedule);
      } else {
        clearTimeout(schedule as number);
      }
    };
  }, [projects, isLowEnd, initialGithubData]);

  const handleViewProject = useCallback((project: Project) => {
    if (typeof window !== 'undefined' && typeof performance !== 'undefined') {
      const now = performance.now();
      (window as Window & { __projectSheetPerf?: { intentAt?: number; projectId?: number } }).__projectSheetPerf = {
        intentAt: now,
        projectId: project.id,
      };
      performance.mark('project-sheet-open-intent');
    }
    setSelectedProject(project);
  }, []);

  const prewarmProjectSheet = useCallback(() => {
    if (hasPrewarmedSheetRef.current || isLowEnd) return;
    hasPrewarmedSheetRef.current = true;
    void loadProjectSheet();
  }, [isLowEnd]);

  const handleModalClose = useCallback(() => {
    setSelectedProject(null);
  }, []);

  // Keyboard Navigation for Sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Set interaction mode to keyboard on arrow keys or tab
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab', 'enter'].includes(key)) {
        setInteractionMode('keyboard');
      }

      if ((key === 'escape' || e.key === '`' || e.code === 'Backquote') && selectedProject) {
        handleModalClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    const handleMouseMove = () => {
      if (interactionMode !== 'mouse') {
        setInteractionMode('mouse');
        // Clear keyboard focus so mouse takes priority
        if (document.activeElement instanceof HTMLElement && 
           (document.activeElement.getAttribute('role') === 'button' || 
            document.activeElement.tagName === 'BUTTON')) {
          document.activeElement.blur();
        }
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [selectedProject, handleModalClose, interactionMode]);

  useEffect(() => {
    if (isLowEnd || hasPrewarmedSheetRef.current) return;

    const idle = window.requestIdleCallback;
    if (idle) {
      const idleId = idle(() => prewarmProjectSheet(), { timeout: 1000 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(prewarmProjectSheet, 250);
    return () => window.clearTimeout(timeoutId);
  }, [isLowEnd, prewarmProjectSheet]);

  const { featuredProjects, regularProjects } = useMemo(() => {
    // Hand-picked featured projects: Apple Sharpener (4), TintedMac (8) [temp for Wawona], Whisperer (2)
    const featuredIds = [4, 8, 2];
    
    const featured = featuredIds
      .map(id => projects.find(p => p.id === id))
      .filter((p): p is Project => !!p);
    
    const remaining = projects.filter(p => !featuredIds.includes(p.id));
    
    // Sort remaining projects by stars
    const sortedRemaining = [...remaining].sort((a, b) => {
      const repoA = a.githubRepo ? githubData[a.githubRepo] : null;
      const repoB = b.githubRepo ? githubData[b.githubRepo] : null;

      const starsA = repoA?.stargazers_count || 0;
      const starsB = repoB?.stargazers_count || 0;

      return starsB - starsA;
    });

    return { featuredProjects: featured, regularProjects: sortedRemaining };
  }, [projects, githubData]);

  const cardPriorityLimit = useMemo(() => {
    // Restrict preload priority to the first visible row in the current grid.
    if (!bp.isMounted) return 3;
    if (bp.width >= 1536) return 4;
    if (bp.width >= 1024) return 3;
    if (bp.width >= 640) return 2;
    return 1;
  }, [bp.isMounted, bp.width]);

  /**
   * Below lg width and h≤550: pinned deck dots sit under the fixed “Alex’s Projects” bar.
   * Trim main top padding on that layout only; keep default clearance elsewhere.
   * Height under 350px: title beside rail. Main keeps **2.75rem** below safe for the home control; slide dots are
   * fixed at `var(--safe-top)`. `FeaturedMobileStack` applies **-mt + same extra height** so the deck kisses the dots.
   */
  const projectsMainTopPaddingClass = useMemo(() => {
    const defaultPt =
      'pt-[calc(4.5rem+var(--safe-top))] sm:pt-[calc(5rem+var(--safe-top))] md:pt-[calc(6rem+var(--safe-top))] lg:pt-[calc(6.5rem+var(--safe-top))]';
    const ultraShortPt =
      'pt-[calc(2.75rem+var(--safe-top))] sm:pt-[calc(2.75rem+var(--safe-top))] md:pt-[calc(2.75rem+var(--safe-top))] lg:pt-[calc(2.75rem+var(--safe-top))]';
    if (!bp.isMounted) return defaultPt;
    if (ultraShortViewport) return ultraShortPt;
    if (bp.isLg || !shortHero) return defaultPt;
    return 'pt-[calc(4rem+var(--safe-top))] sm:pt-[calc(4.2rem+var(--safe-top))] md:pt-[calc(4.45rem+var(--safe-top))]';
  }, [bp.isMounted, bp.isLg, shortHero, ultraShortViewport]);

  const projectsMainBottomPaddingClass = ultraShortViewport ? 'pb-4 sm:pb-5' : 'pb-10 sm:pb-20';

  // Advanced Keyboard Grid Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with modal/sheet if open
      if (selectedProject) return;

      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
      if (!keys.includes(e.key)) return;

      // Handle Space/Shift-Space for row-by-row scrolling
      const isSpace = e.key === ' ';
      const isShift = e.shiftKey;

      // Focusable project cards (skip tabIndex -1, e.g. back faces of pinned mobile stack)
      const cards = Array.from(
        document.querySelectorAll(PROJECT_CARD_FOCUSABLE_SELECTOR)
      ).filter((el) => (el as HTMLElement).tabIndex !== -1) as HTMLElement[];
      if (cards.length === 0) return;

      const currentIndex = cards.indexOf(document.activeElement as HTMLElement);
      
      // If nothing focused, focus first card on any arrow/space press
      if (currentIndex === -1) {
        e.preventDefault();
        cards[0].focus({ preventScroll: true });
        scrollProjectCardIntoViewVertically(cards[0]);
        return;
      }

      let nextIndex = currentIndex;
      const cols = bp.width >= 1024 ? 3 : bp.width >= 640 ? 2 : 1;
      const clamp = (value: number) => Math.max(0, Math.min(cards.length - 1, value));

      if (isSpace) {
        // Space moves by row without wrapping.
        nextIndex = clamp(isShift ? currentIndex - cols : currentIndex + cols);
      } else {
        switch (e.key) {
          case 'ArrowLeft':
            nextIndex = clamp(currentIndex - 1);
            break;
          case 'ArrowRight':
            nextIndex = clamp(currentIndex + 1);
            break;
          case 'ArrowUp':
            nextIndex = clamp(currentIndex - cols);
            break;
          case 'ArrowDown':
            nextIndex = clamp(currentIndex + cols);
            break;
        }
      }

      if (nextIndex !== currentIndex) {
        e.preventDefault();
        cards[nextIndex].focus({ preventScroll: true });
        scrollProjectCardIntoViewVertically(cards[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProject, bp.width]);

  /** Tab / programmatic focus on featured pins: same as arrow nav — page top so header isn’t scroll-blurred. */
  useEffect(() => {
    if (selectedProject) return;
    const onFocusIn = (e: Event) => {
      const t = e.target as HTMLElement;
      if (!t?.matches?.(PROJECT_CARD_FOCUSABLE_SELECTOR)) return;
      if (!t.closest('[data-pinned-projects-section]')) return;
      scrollPinnedProjectsToPageTop();
    };
    document.addEventListener('focusin', onFocusIn, true);
    return () => document.removeEventListener('focusin', onFocusIn, true);
  }, [selectedProject]);

  useEffect(() => {
    // Apply specialized persona scroller to the entire page
    document.documentElement.classList.add('projects-scroll');
    return () => {
      document.documentElement.classList.remove('projects-scroll');
    };
  }, []);

  /** Browsers scroll focused elements into view using transformed bounds; skewed cards nudge window.scrollX — snap X without clobbering vertical (e.g. scroll-to-top on pinned cards). */
  useEffect(() => {
    const snapPageX = (target: EventTarget | null) => {
      const t = target as HTMLElement | null;
      if (!t?.matches?.(PROJECT_CARD_FOCUSABLE_SELECTOR)) return;
      const fix = () => {
        if (window.scrollX !== 0) {
          window.scrollTo({ left: 0, top: window.scrollY, behavior: 'auto' });
        }
      };
      queueMicrotask(fix);
      requestAnimationFrame(fix);
      requestAnimationFrame(() => requestAnimationFrame(fix));
    };
    document.addEventListener('focus', snapPageX, true);
    return () => document.removeEventListener('focus', snapPageX, true);
  }, []);

  return (
    <div
      className={
        ultraShortViewport
          ? 'relative flex min-h-dvh flex-col bg-base00 text-base05'
          : 'relative min-h-screen bg-base00 text-base05'
      }
    >

      {/* Persona Background Elements */}
      <FloatingShapes />
      <div className="absolute inset-0 halftone-bg opacity-10 pointer-events-none z-0" />

      {/* Main Grid Layout */}
      <motion.main
        className={`mx-auto w-full max-w-[1920px] flex-1 px-4 sm:px-8 md:px-12 ${projectsMainTopPaddingClass} ${projectsMainBottomPaddingClass} relative z-10 projects-scroll ${ultraShortViewport ? 'flex min-h-0 flex-col' : ''}`}
        animate={{
          filter: selectedProject ? "blur(5px)" : "blur(0px)",
          scale: selectedProject ? 0.98 : 1,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Hero Section - Featured/Pinned Projects (Compact on Mobile) */}
      <section
        className={
          shortHero
            ? ultraShortViewport
              ? 'relative flex w-full min-h-0 flex-1 flex-col items-stretch justify-start pt-0 pb-1 sm:pb-2 md:pb-2 lg:pb-3 max-lg:min-h-0'
              : 'relative flex w-full flex-col items-center justify-start min-h-fit pt-0 pb-2 sm:pb-2 md:pb-3 lg:pb-4 max-lg:min-h-0'
            : 'relative flex w-full flex-col items-center justify-start min-h-fit pt-1 pb-3 sm:pt-2 sm:pb-5 md:pt-6 md:pb-10 lg:pt-8 lg:pb-14 max-lg:min-h-0'
        }
      >
        <div
          className={
            shortHero
              ? ultraShortViewport
                ? 'flex w-full min-h-0 flex-1 flex-col items-stretch gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2'
                : 'flex w-full min-h-0 flex-col items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3'
              : 'flex w-full min-h-0 flex-col items-center gap-1.5 sm:gap-2 md:gap-5 lg:gap-8'
          }
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={ultraShortViewport && shortHero ? 'flex min-h-0 w-full flex-1 flex-col' : 'w-full'}
          >
            {/* Featured / pinned cards only (for focus → scroll to page top) */}
            <div
              data-pinned-projects-section
              className={ultraShortViewport && shortHero ? 'flex min-h-0 w-full flex-1 flex-col' : 'w-full'}
            >
            {showDesktopPinnedHero ? (
              shortHero ? (
                <div
                  className={`mx-auto flex min-h-0 w-full max-w-7xl flex-row items-stretch justify-center gap-2 sm:gap-3 lg:gap-4 ${ultraShortViewport ? 'flex-1' : ''}`}
                >
                  {ultraShortViewport ? (
                    <AlexProjectsInlineTitle
                      className="hidden min-h-0 self-stretch lg:flex"
                      isHidden={!!selectedProject}
                    />
                  ) : null}
                  <PinnedVerticalRail className="hidden min-h-0 self-stretch lg:flex" />
                  <div
                    className={
                      'grid min-h-0 grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 w-full min-w-0 flex-1 justify-items-center self-stretch'
                    }
                  >
                    {featuredProjects.map((project) => (
                      <div
                        key={`featured-${project.id}`}
                        className={
                          ultraShortViewport
                            ? 'aspect-[5/3] mx-auto w-full max-w-[440px] max-h-[min(calc(100svh-6.5rem),420px)] px-0.5 sm:px-1 lg:max-h-[min(calc(100dvh-7rem),480px)]'
                            : 'aspect-[5/3] mx-auto w-full max-w-[440px] max-h-[min(38svh,260px)] px-0.5 sm:px-1'
                        }
                      >
                        <ProjectCard
                          project={project}
                          onViewProject={handleViewProject}
                          onIntent={prewarmProjectSheet}
                          priority={true}
                          quality={isLowEnd ? 75 : 90}
                          repoData={project.githubRepo ? githubData[project.githubRepo] : undefined}
                          interactionMode={interactionMode}
                          compactOverlay={shortHero}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6 w-full max-w-7xl mx-auto justify-items-center">
                  {featuredProjects.map((project) => (
                    <div
                      key={`featured-${project.id}`}
                      className="aspect-[4/5] w-full max-w-[450px] scale-100 sm:scale-[1.02] lg:scale-105 transition-transform duration-500 px-1 sm:p-2"
                    >
                      <ProjectCard
                        project={project}
                        onViewProject={handleViewProject}
                        onIntent={prewarmProjectSheet}
                        priority={true}
                        quality={isLowEnd ? 75 : 90}
                        repoData={project.githubRepo ? githubData[project.githubRepo] : undefined}
                        interactionMode={interactionMode}
                      />
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Tinder-style Swipe Stack (Mobile/Tablet) */
              <FeaturedMobileStack 
                projects={featuredProjects}
                onViewProject={handleViewProject}
                onIntent={prewarmProjectSheet}
                githubData={githubData}
                quality={isLowEnd ? 70 : 85}
                interactionMode={interactionMode}
                compactVertical={shortHero}
                inlinePageTitle={ultraShortViewport}
                inlinePageTitleHidden={!!selectedProject}
              />
            )}
            </div>

            {/* Aesthetic Divider - Tablet/Desktop Grid (Persona-inspired Stylization) */}
            {showDesktopPinnedHero ? (
              !shortHero ? (
                <div className="relative w-full flex flex-col items-center justify-center mt-32 mb-20 sm:mt-36 sm:mb-24 overflow-visible">
                  <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-base02 to-transparent" />

                  <div className="relative group overflow-visible">
                    <div className="absolute inset-0 bg-base08 translate-x-1.5 translate-y-1.5 -skew-x-12 opacity-80 pointer-fine:group-hover:translate-x-2 pointer-fine:group-hover:translate-y-2 transition-transform duration-300" />

                    <div className="relative bg-base00 border-2 border-base09 px-12 py-4 -skew-x-12 flex items-center gap-8 shadow-2xl transition-all duration-300">
                      <span className="text-base08 font-nerd text-xl sm:text-2xl animate-pulse shrink-0">󰓎</span>
                      <h3 className="text-sm sm:text-base font-black uppercase tracking-[0.6em] text-base05 skew-x-0 whitespace-nowrap">
                        Pinned Projects
                      </h3>
                      <span className="text-base08 font-nerd text-xl sm:text-2xl animate-pulse shrink-0">󰓎</span>
                    </div>

                    <div className="absolute -top-3 -left-3 w-6 h-6 border-t-4 border-l-4 border-base0B z-20" />
                    <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-4 border-r-4 border-base0B z-20" />
                  </div>
                </div>
              ) : (
                <div
                  className={
                    ultraShortViewport
                      ? 'relative mb-3 mt-3 flex w-full flex-col items-center justify-center overflow-visible'
                      : 'relative mt-8 mb-10 flex w-full flex-col items-center justify-center overflow-visible sm:mt-10 sm:mb-12'
                  }
                >
                  <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-base02 to-transparent" />
                </div>
              )
            ) : null}
          </motion.div>
        </div>

        {/* Scroll Hint Indicator (Persona-styled) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 flex-col items-center gap-2 pointer-events-none z-30"
        >
          <div className="bg-base09 px-4 py-1 -skew-x-12 shadow-[4px_4px_0px_var(--base08)]">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.5em] text-base00 ml-[0.5em] italic">
              Explore
            </span>
          </div>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ 
              repeat: Infinity, 
              duration: 2,
              ease: "easeInOut" 
            }}
            className="text-base09"
          >
            <svg className="w-6 h-6 drop-shadow-[0_0_10px_rgba(220,150,86,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

        {/* Regular Projects Grid */}
        <motion.div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-y-2 gap-x-3 sm:gap-y-3 sm:gap-x-5 lg:gap-x-6 lg:gap-y-4 xl:gap-x-8 xl:gap-y-5 ${ultraShortViewport ? 'shrink-0' : ''}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {regularProjects.map((project, index) => (
            <div
              key={project.id}
              className="aspect-[4/5] w-full scale-90 sm:scale-100 transition-transform duration-300 px-1 sm:p-2"
            >
              <ProjectCard
                project={project}
                onViewProject={handleViewProject}
                onFocus={handleModalClose}
                interactionMode={interactionMode}
                onIntent={prewarmProjectSheet}
                priority={index < cardPriorityLimit}
                quality={isLowEnd ? 60 : 75}
                repoData={project.githubRepo ? githubData[project.githubRepo] : undefined}
              />
            </div>
          ))}
        </motion.div>
      </motion.main>

      {/* Project Details Sheet - loaded on first open, then kept mounted */}
      {(selectedProject || hasOpenedSheet) && (
        <ProjectSheet
          key="project-sheet"
          project={selectedProject}
          onClose={handleModalClose}
          githubData={githubData}
        />
      )}

      {/* Keep header on top of everything */}
      <ProjectsHeader isSheetOpen={!!selectedProject} hideMainTitle={ultraShortViewport} />
    </div>
  );
}