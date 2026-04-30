'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Project } from './projectData';
import ProjectsHeader from '../components/ProjectsHeader';
import ProjectCard from '@/components/ProjectCard';
import { GitHubRepoData } from '@/lib/github';
import { motion } from 'framer-motion';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBreakpoints } from '@/hooks/useBreakpoints';

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
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 + '%', 
            y: Math.random() * 100 + '%',
            rotate: Math.random() * 360,
            scale: 0.4 + Math.random() * 0.8,
            opacity: 0.05
          }}
          animate={{ 
            y: ['-20%', '120%'],
            rotate: [0, 360],
          }}
          transition={{ 
            duration: 30 + Math.random() * 40, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className={`absolute w-16 h-16 sm:w-24 sm:h-24 ${i % 2 === 0 ? 'text-base0D' : 'text-base0E'}`}
        >
          {shapes[i % shapes.length]}
        </motion.div>
      ))}
    </div>
  );
}

function FeaturedMobileStack({ 
  projects, 
  onViewProject, 
  onIntent, 
  githubData,
  quality,
  interactionMode
}: { 
  projects: Project[], 
  onViewProject: (p: Project) => void,
  onIntent: () => void,
  githubData: Record<string, GitHubRepoData>,
  quality: number,
  interactionMode: 'mouse' | 'keyboard'
}) {
  const [index, setIndex] = useState(0);
  const dragActive = useRef(false);

  const handleDragStart = () => {
    dragActive.current = true;
  };

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) {
      setIndex((prev) => (prev === 0 ? projects.length - 1 : prev - 1));
    } else if (info.offset.x < -100) {
      setIndex((prev) => (prev === projects.length - 1 ? 0 : prev + 1));
    }
    
    setTimeout(() => {
      dragActive.current = false;
    }, 100);
  };

  const handleProjectClick = (project: Project) => {
    if (!dragActive.current) {
      onViewProject(project);
    }
  };

  return (
    <div className="relative w-full aspect-[3/4] max-w-[82vw] sm:max-w-[420px] mx-auto flex items-center justify-center perspective-1000">
      <div className="absolute -bottom-10 left-0 right-0 flex justify-center gap-3 z-20">
        {projects.map((_, i) => (
          <div 
            key={i} 
            className={`h-2 -skew-x-12 transition-all duration-300 border border-base00 ${i === index ? 'w-8 bg-base09' : 'w-2 bg-base03'}`}
          />
        ))}
      </div>

      <div className="relative w-full h-full touch-pan-y overflow-visible">
        {projects.map((project, i) => {
          const isCurrent = i === index;
          const isNext = i === (index + 1) % projects.length;
          const isPrev = i === (index - 1 + projects.length) % projects.length;
          
          if (!isCurrent && !isNext && !isPrev) return null;

          return (
            <motion.div
              key={project.id}
              className="absolute inset-0 cursor-grab active:cursor-grabbing p-4"
              style={{
                zIndex: isCurrent ? 10 : 5,
                display: isCurrent || isNext || isPrev ? 'block' : 'none',
              }}
              initial={false}
              animate={{
                x: isCurrent ? 0 : isNext ? '12%' : '-12%',
                y: isCurrent ? 0 : 12,
                scale: isCurrent ? 1 : 0.88,
                opacity: isCurrent ? 1 : 0.3,
                rotate: isCurrent ? 0 : isNext ? 4 : -4,
                filter: isCurrent ? "grayscale(0%) brightness(100%)" : "grayscale(50%) brightness(70%)",
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 25
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <ProjectCard
                project={project}
                onViewProject={handleProjectClick}
                onIntent={onIntent}
                priority={isCurrent}
                quality={quality}
                repoData={project.githubRepo ? githubData[project.githubRepo] : undefined}
                onFocus={() => {
                  if (isNext) setIndex((prev) => (prev + 1) % projects.length);
                  if (isPrev) setIndex((prev) => (prev - 1 + projects.length) % projects.length);
                }}
                interactionMode={interactionMode}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Aesthetic Divider - Positioned under dots for Mobile Stack - Persona Stylized */}
      <div className="absolute -bottom-28 left-0 right-0 flex items-center justify-center pointer-events-auto">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-2 border-base09 opacity-30"></div>
        </div>
        <div className="relative group">
          <div className="absolute inset-0 bg-base08 -skew-x-12 translate-x-1 translate-y-1" />
          <div className="relative bg-base00 border-2 border-base09 px-6 py-2 -skew-x-12 flex items-center gap-3">
            <span className="text-base09 font-nerd text-sm animate-pulse">󰓎</span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-base05 skew-x-12 block ml-1">
              Pinned Projects
            </span>
            <span className="text-base09 font-nerd text-sm animate-pulse">󰓎</span>
          </div>
        </div>
      </div>
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

      if (key === 'escape' && selectedProject) {
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

      // Find all focusable project cards
      const cards = Array.from(document.querySelectorAll('[role="button"][aria-label^="View details"]')) as HTMLElement[];
      if (cards.length === 0) return;

      const currentIndex = cards.indexOf(document.activeElement as HTMLElement);
      
      // If nothing focused, focus first card on any arrow/space press
      if (currentIndex === -1) {
        cards[0].focus();
        e.preventDefault();
        return;
      }

      let nextIndex = currentIndex;
      const cols = bp.width >= 1024 ? 3 : bp.width >= 640 ? 2 : 1;

      if (isSpace) {
        // Space moves down a row, Shift-Space moves up a row
        nextIndex = isShift 
          ? (currentIndex - cols + cards.length) % cards.length
          : (currentIndex + cols) % cards.length;
      } else {
        switch (e.key) {
          case 'ArrowLeft':
            nextIndex = (currentIndex - 1 + cards.length) % cards.length;
            break;
          case 'ArrowRight':
            nextIndex = (currentIndex + 1) % cards.length;
            break;
          case 'ArrowUp':
            nextIndex = (currentIndex - cols + cards.length) % cards.length;
            break;
          case 'ArrowDown':
            nextIndex = (currentIndex + cols) % cards.length;
            break;
        }
      }

      if (nextIndex !== currentIndex) {
        e.preventDefault();
        cards[nextIndex].focus();
        cards[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProject, bp.width]);

  useEffect(() => {
    // Apply specialized persona scroller to the entire page
    document.documentElement.classList.add('projects-scroll');
    return () => {
      document.documentElement.classList.remove('projects-scroll');
    };
  }, []);

  return (
    <div className="min-h-screen bg-base00 text-base05 relative">

      {/* Persona Background Elements */}
      <FloatingShapes />
      <div className="absolute inset-0 halftone-bg opacity-10 pointer-events-none z-0" />

      {/* Main Grid Layout */}
      <motion.main
        className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 pt-12 sm:pt-16 pb-14 sm:pb-20 relative z-10 overflow-x-hidden projects-scroll"
        animate={{
          filter: selectedProject ? "blur(5px)" : "blur(0px)",
          scale: selectedProject ? 0.98 : 1,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Hero Section - Featured/Pinned Projects (Compact on Mobile) */}
      <section className="relative w-full flex flex-col items-center justify-start min-h-fit py-8 sm:pt-12 sm:pb-16 md:pt-14 md:pb-20">
        <div className="w-full flex flex-col items-center gap-4 sm:gap-8 lg:gap-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full"
          >
            {/* Responsive featured projects display */}
            {!bp.isMounted || bp.width >= 1024 ? (
              /* 3-column layout centered for featured projects (Desktop/Tablet) */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 w-full max-w-7xl mx-auto justify-items-center">
                {featuredProjects.map((project) => (
                  <div
                    key={`featured-${project.id}`}
                    className="aspect-[4/5] w-full max-w-[450px] scale-100 sm:scale-[1.02] lg:scale-105 transition-transform duration-500 p-2"
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
            ) : (
              /* Tinder-style Swipe Stack (Mobile/Tablet) */
              <FeaturedMobileStack 
                projects={featuredProjects}
                onViewProject={handleViewProject}
                onIntent={prewarmProjectSheet}
                githubData={githubData}
                quality={isLowEnd ? 70 : 85}
                interactionMode={interactionMode}
              />
            )}

            {/* Aesthetic Divider - Tablet/Desktop Grid (Persona-inspired Stylization) */}
            {!bp.isMounted || bp.width >= 1024 ? (
              <div className="relative w-full flex flex-col items-center justify-center mt-32 mb-20 sm:mt-36 sm:mb-24 overflow-visible">
                {/* Background Line */}
                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-base02 to-transparent" />
                
                {/* Stylized Box */}
                <div className="relative group overflow-visible">
                  {/* Offset Shadow Layer */}
                  <div className="absolute inset-0 bg-base08 translate-x-1.5 translate-y-1.5 -skew-x-12 opacity-80 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-300" />
                  
                  {/* Main Label Box */}
                  <div className="relative bg-base00 border-2 border-base09 px-12 py-4 -skew-x-12 flex items-center gap-8 shadow-2xl transition-all duration-300">
                    <span className="text-base08 font-nerd text-xl sm:text-2xl animate-pulse shrink-0">󰓎</span>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-[0.6em] text-base05 skew-x-0 whitespace-nowrap">
                      Pinned Projects
                    </h3>
                    <span className="text-base08 font-nerd text-xl sm:text-2xl animate-pulse shrink-0">󰓎</span>
                  </div>
                  
                  {/* Accent Corner Ticks - Fixed Positioning */}
                  <div className="absolute -top-3 -left-3 w-6 h-6 border-t-4 border-l-4 border-base0B z-20" />
                  <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-4 border-r-4 border-base0B z-20" />
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>

        {/* Scroll Hint Indicator (Persona-styled) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-30"
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {regularProjects.map((project, index) => (
            <div
              key={project.id}
              className="aspect-[4/5] w-full scale-90 sm:scale-100 transition-transform duration-300 p-2"
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
      <ProjectsHeader isSheetOpen={!!selectedProject} />
    </div>
  );
}