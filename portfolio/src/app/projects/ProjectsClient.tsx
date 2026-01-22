'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Project } from './projectData';
import ProjectsHeader from '../components/ProjectsHeader';
import CardStack from '@/components/CardStack';
import { ResponsiveButtons } from '@/components/ResponsiveButtons';
import ProjectModal from '@/components/ProjectModal';
import TutorialHint from '@/components/TutorialHint';
import { fetchMultipleGitHubRepoData, GitHubRepoData } from '@/lib/github';
import { AnimatePresence } from 'framer-motion';

interface CardData {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  threeWordDescriptor: string;
  image?: string;
  tags?: string[];
  link?: string;
  images?: string[];
  startYear?: number;
  endYear?: number;
  githubRepo?: string;
  [key: string]: unknown;
}

interface ProjectsClientProps {
  projects: Project[];
  initialGithubData?: Record<string, GitHubRepoData>;
}

export default function ProjectsClient({ projects, initialGithubData = {} }: ProjectsClientProps) {
  const [swipedCards, setSwipedCards] = useState<Project[]>([]);
  const [dismissedCards, setDismissedCards] = useState<Project[]>([]);
  const [dismissedViewSwipedCards, setDismissedViewSwipedCards] = useState<Set<string>>(new Set());
  const [showAllCards, setShowAllCards] = useState(true);
  const [showDismissedOnly, setShowDismissedOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectSource, setSelectedProjectSource] = useState<'stack' | 'liked'>('stack');
  const [showTutorialHint, setShowTutorialHint] = useState(false);
  const [hasShownTutorial, setHasShownTutorial] = useState(false);
  const [hasDismissedTutorial, setHasDismissedTutorial] = useState(false);
  const [githubData] = useState<Record<string, GitHubRepoData>>(initialGithubData);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardStackSwipeRef = useRef<((direction: 'left' | 'right') => void) | null>(null);

  // Convert projects to CardStack format
  const cardData = showDismissedOnly
    ? dismissedCards.map(project => ({
      id: project.id.toString(),
      title: project.title,
      description: project.description,
      shortDescription: project.shortDescription,
      threeWordDescriptor: project.threeWordDescriptor,
      image: project.images[0],
      tags: [
        ...(project.githubRepo ? ['GitHub'] : []),
        ...(project.link ? ['Live Site'] : [])
      ],
      link: project.link,
      images: project.images,
      startYear: project.startYear,
      endYear: project.endYear,
      githubRepo: project.githubRepo
    }))
    : projects.map(project => ({
      id: project.id.toString(),
      title: project.title,
      description: project.description,
      shortDescription: project.shortDescription,
      threeWordDescriptor: project.threeWordDescriptor,
      image: project.images[0],
      tags: [
        ...(project.githubRepo ? ['GitHub'] : []),
        ...(project.link ? ['Live Site'] : [])
      ],
      link: project.link,
      images: project.images,
      startYear: project.startYear,
      endYear: project.endYear,
      githubRepo: project.githubRepo
    }));

  // Create a set of swiped card IDs from liked and dismissed cards
  const swipedCardIds = showDismissedOnly
    ? dismissedViewSwipedCards
    : new Set([
      ...swipedCards.map(card => card.id.toString()),
      ...dismissedCards.map(card => card.id.toString())
    ]);

  const handleProjectAction = useCallback((project: Project, direction: 'left' | 'right', delay: number = 300) => {
    setTimeout(() => {
      // If we're in dismissed view, track the swiped card
      if (showDismissedOnly) {
        setDismissedViewSwipedCards(prev => new Set([...prev, project.id.toString()]));
      }

      // User Request: Only show on first LIKE (Right swipe)
      if (!hasShownTutorial && !showDismissedOnly && direction === 'right') {
        setHasShownTutorial(true);
      }

      // Right is now LIKE
      if (direction === 'right') {
        // Add to liked list if not already liked
        setSwipedCards(prev => {
          const isAlreadyLiked = prev.some(p => p.id === project.id);
          return isAlreadyLiked ? prev : [...prev, project];
        });

        // If we're viewing dismissed cards and like one, remove it from dismissed list
        if (showDismissedOnly) {
          setDismissedCards(prev => prev.filter(p => p.id !== project.id));
        }
      } else {
        // Left is now PASS
        // Remove from liked list
        setSwipedCards(prev => prev.filter(p => p.id !== project.id));

        // Always add to dismissed list when passing
        setDismissedCards(prev => {
          const isAlreadyDismissed = prev.some(p => p.id === project.id);
          return isAlreadyDismissed ? prev : [...prev, project];
        });
      }
    }, delay);
  }, [showDismissedOnly, hasShownTutorial]);

  const handleSwipe = (card: CardData, direction: 'left' | 'right') => {
    const project = projects.find(p => p.id.toString() === card.id);
    if (project) {
      handleProjectAction(project, direction, 300);
    }
  };

  // Show tutorial immediately after first swipe animation completes
  useEffect(() => {
    // Show tutorial if we have at least one liked card and haven't shown it yet
    if (hasShownTutorial && !showTutorialHint && !hasDismissedTutorial && swipedCards.length > 0) {
      setShowTutorialHint(true);
    }

    // Hide and reset tutorial state if we have no liked cards (e.g. after undo)
    if (swipedCards.length === 0 && (showTutorialHint || hasShownTutorial)) {
      setShowTutorialHint(false);
      setHasShownTutorial(false);
    }
  }, [hasShownTutorial, showTutorialHint, hasDismissedTutorial, swipedCards.length]);

  const handleUndo = (card: CardData) => {
    // Remove from liked list if present
    setSwipedCards(prev => prev.filter(p => p.id.toString() !== card.id));

    // Remove from dismissed list if present
    setDismissedCards(prev => prev.filter(p => p.id.toString() !== card.id));

    // Remove from dismissed view tracking
    setDismissedViewSwipedCards(prev => {
      const nextSet = new Set(prev);
      nextSet.delete(card.id);
      return nextSet;
    });
  };

  const handleReset = () => {
    setSwipedCards([]);
    setDismissedCards([]);
    setDismissedViewSwipedCards(new Set());
    setShowAllCards(true);
    setShowDismissedOnly(false);
    setHasShownTutorial(false);
    setHasDismissedTutorial(false);
  };

  const handleStackEmpty = () => {
    // Stay on the deck page instead of auto-switching to liked projects
    // User can manually click "View Liked" button or use header navigation
  };

  const handleViewLiked = () => {
    if (swipedCards.length === 0) {
      return;
    }

    setShowAllCards(false);
    setShowDismissedOnly(false);

    // Scroll to top when switching views
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // const handleViewDismissed = () => {
  //   setShowAllCards(false);
  //   setShowDismissedOnly(true);
  // };

  const handleBackToStack = () => {
    setShowAllCards(true);
    setShowDismissedOnly(false);
  };

  const handleDismissedStackEmpty = () => {
    setShowDismissedOnly(false);
    setShowAllCards(true);
  };

  const handleSeeMore = () => {
    // Reshow dismissed cards in a dedicated stack
    setDismissedViewSwipedCards(new Set());
    setShowAllCards(false);
    setShowDismissedOnly(true);
  };

  const handleViewProject = (card: CardData) => {
    const project = projects.find(p => p.id.toString() === card.id);
    if (project) {
      setSelectedProject(project);
      setSelectedProjectSource('stack');
    }
  };

  const handleModalClose = () => {
    setSelectedProject(null);
  };

  const handleModalSwipe = (direction: 'left' | 'right') => {
    if (!selectedProject) return;

    const project = selectedProject;
    handleModalClose();

    if (showAllCards) {
      // Deck view: trigger animation
      setTimeout(() => {
        if (cardStackSwipeRef.current) {
          cardStackSwipeRef.current(direction);
        }
      }, 50);
    } else {
      // Grid view: update state immediately
      handleProjectAction(project, direction, 0);
    }
  };

  // Keyboard Navigation for 'f' (View Liked) and 'b' (Back to Stack)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if a modal is open or if typing in an input
      if (selectedProject || ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // 'f' -> View Liked (if on stack and has liked projects)
      if (key === 'f' && showAllCards && swipedCards.length > 0) {
        handleViewLiked();
      }

      // 'b' -> Back to Stack (if showing liked)
      if (key === 'b' && !showAllCards && !showDismissedOnly) {
        handleBackToStack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAllCards, showDismissedOnly, swipedCards.length, selectedProject]);

  return (
    <div className="min-h-screen bg-base00 text-base05 overflow-hidden">
      <ProjectsHeader
        onViewLiked={handleViewLiked}
        onBackToStack={handleBackToStack}
        likedCount={swipedCards.length}
        showingLiked={!showAllCards && !showDismissedOnly}
      />

      <div className="pt-16 sm:pt-20 lg:pt-24 pb-16 h-screen flex flex-col pointer-events-none relative z-[70]">
        <main className={`flex-1 pointer-events-auto ${showAllCards || showDismissedOnly ? 'overflow-visible' : 'overflow-hidden flex flex-col min-h-0'}`}>
          {showAllCards ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-visible">
                <CardStack
                  cards={cardData}
                  onSwipe={handleSwipe}
                  onUndo={handleUndo}
                  onReset={handleReset}
                  onStackEmpty={handleStackEmpty}
                  onSeeMore={handleSeeMore}
                  onViewProject={handleViewProject}
                  swipedCardIds={swipedCardIds}
                  dismissedCount={dismissedCards.length}
                  likedCount={swipedCards.length}
                  onViewLiked={handleViewLiked}
                  githubData={githubData}
                  inputDisabled={!!selectedProject}
                  onSwipeRefReady={(swipeFn) => { cardStackSwipeRef.current = swipeFn; }}
                  initialIndex={swipedCards.length + dismissedCards.length}
                  cardHeightClass="h-full"
                  className="items-start py-4"
                />
              </div>
            </div>
          ) : showDismissedOnly ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <CardStack
                  cards={cardData}
                  onSwipe={handleSwipe}
                  onUndo={handleUndo}
                  onStackEmpty={handleDismissedStackEmpty}
                  onViewProject={handleViewProject}
                  swipedCardIds={swipedCardIds}
                  githubData={githubData}
                  inputDisabled={!!selectedProject}
                  initialIndex={dismissedViewSwipedCards.size}
                  cardHeightClass="h-full"
                  className="items-start py-4"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 relative min-h-0 pointer-events-none">
              <div
                className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-base00 via-base00/80 to-transparent z-20 pointer-events-none"
                style={{ transform: 'translateZ(0)' }}
              />
              <div
                ref={scrollContainerRef}
                data-scroll-container
                className="h-full overflow-y-auto px-4 sm:px-6 lg:px-8 pointer-events-auto"
              >
                <div className="max-w-6xl mx-auto py-8 sm:py-12 lg:py-16">
                  <div className="text-center mb-8 sm:mb-12 lg:mb-16">
                    <div className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-base0D/20 to-base0C/20 rounded-full border border-base0D/30 backdrop-blur-sm mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        className="w-5 h-5 mr-2 text-base0D"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span className="text-base0D font-semibold text-sm uppercase tracking-wider">Favorites ({swipedCards.length})</span>
                    </div>
                    <p className="text-base04 text-sm sm:text-base max-w-2xl mx-auto" style={{ textShadow: '0 0 4px var(--glow-red-light), 0 0 8px var(--glow-purple-light)' }}>
                      These are the projects you&apos;ve shown interest in. Explore them further!
                    </p>
                  </div>
                  <div
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-16 sm:pb-20"
                    style={{
                      animation: 'fadeIn 0.8s ease-out 0.6s forwards',
                      opacity: 0
                    }}
                  >
                    {swipedCards.map((project, index) => (
                      <div
                        key={project.id}
                        className="bg-base01 rounded-lg p-6 border border-base02 flex flex-col"
                        style={{
                          animation: `slideInUp 0.6s ease-out ${0.1 * index}s forwards`,
                          opacity: 0,
                          transform: 'translateY(20px)'
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-xl font-bold text-base05 flex-1">{project.title}</h3>
                          <div className="text-xs text-base04 opacity-70 ml-4 flex-shrink-0">
                            {project.startYear && (
                              <span>
                                {project.startYear}{project.endYear && project.endYear !== project.startYear ? `-${project.endYear}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* GitHub Stats */}
                        {project.githubRepo && githubData[project.githubRepo] && (
                          <div className="flex items-center gap-4 text-base0D text-sm font-semibold opacity-80 mb-3" style={{ fontFamily: 'NerdFont, monospace' }}>
                            {/* Stars */}
                            {githubData[project.githubRepo].stargazers_count > 0 && (
                              <div className="flex items-center">
                                <span className="mr-1">󰓎</span>
                                <span style={{ fontFamily: 'NerdFont, monospace' }}>{githubData[project.githubRepo].stargazers_count}</span>
                              </div>
                            )}

                            {/* Forks */}
                            {githubData[project.githubRepo].forks_count > 0 && (
                              <div className="flex items-center">
                                <span className="mr-1">󰓁</span>
                                <span style={{ fontFamily: 'NerdFont, monospace' }}>{githubData[project.githubRepo].forks_count}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-base04 mb-4 project-description flex-grow">
                          {project.shortDescription
                            ? project.shortDescription.length > 150
                              ? `${project.shortDescription.substring(0, 150)}...`
                              : project.shortDescription
                            : project.description.length > 150
                              ? `${project.description.substring(0, 150)}...`
                              : project.description
                          }
                        </p>
                        <ResponsiveButtons
                          project={project}
                          onViewProject={() => {
                            setSelectedProject(project);
                            setSelectedProjectSource('liked');
                          }}
                          className="mt-auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <AnimatePresence>
          {selectedProject && (
            <ProjectModal
              key="project-modal"
              project={selectedProject}
              onClose={handleModalClose}
              onSwipe={handleModalSwipe}
              githubData={githubData}
            />
          )}
        </AnimatePresence>

        <TutorialHint
          isVisible={showTutorialHint}
          onDismiss={() => {
            setShowTutorialHint(false);
            setHasDismissedTutorial(true);
          }}
        />
      </div>
    </div>
  );
}