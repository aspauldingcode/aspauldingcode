'use client';

import { useState, useEffect, useRef } from 'react';
import { projects, Project } from './projectData';
import ProjectsHeader from '../components/ProjectsHeader';
import CardStack from '../../components/CardStack';
import { ResponsiveButtons } from '@/components/ResponsiveButtons';
import ProjectModal from '@/components/ProjectModal';
import { fetchMultipleGitHubRepoData, GitHubRepoData } from '../../lib/github';

interface CardData {
  id: string;
  title: string;
  description: string;
  shortDescription?: string; // Add shortDescription field
  threeWordDescriptor: string; // Add threeWordDescriptor field
  image?: string;
  tags?: string[];
  link?: string;
  images?: string[];
  startYear?: number;
  endYear?: number;
  githubRepo?: string;
}

export default function Projects() {
  const [swipedCards, setSwipedCards] = useState<Project[]>([]);
  const [dismissedCards, setDismissedCards] = useState<Project[]>([]);
  const [dismissedViewSwipedCards, setDismissedViewSwipedCards] = useState<Set<string>>(new Set()); // Track cards swiped in dismissed view
  const [showAllCards, setShowAllCards] = useState(true);
  const [showDismissedOnly, setShowDismissedOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectSource, setSelectedProjectSource] = useState<'stack' | 'liked'>('stack'); // Track where the project was opened from
  const [cardStackKey, setCardStackKey] = useState(0); // Key to force CardStack re-render
  const [githubData, setGithubData] = useState<Record<string, GitHubRepoData>>({});
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [hintHasBeenShown, setHintHasBeenShown] = useState(false); // Track if hint has been shown before
  const [hintVisible, setHintVisible] = useState(false); // Control fade animations
  const [isInLikedSection, setIsInLikedSection] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Disable page scrolling when component mounts
  useEffect(() => {
    // Save the original overflow style
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocumentOverflow = document.documentElement.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyWidth = document.body.style.width;
    const originalBodyHeight = document.body.style.height;
    
    // Disable scrolling
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalDocumentOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.width = originalBodyWidth;
      document.body.style.height = originalBodyHeight;
    };
  }, []);

  // Fetch GitHub repository data on component mount
  useEffect(() => {
    const fetchRepoData = async () => {
      const reposWithGithub = projects.filter(p => p.githubRepo);
      if (reposWithGithub.length > 0) {
        const repoUrls = reposWithGithub.map(p => p.githubRepo!);
        const repoData = await fetchMultipleGitHubRepoData(repoUrls);
        setGithubData(repoData);
      }
    };

    fetchRepoData();
  }, []);



  // Show scroll hint when there are liked projects (only once)
  useEffect(() => {
    if (swipedCards.length > 0 && !hintHasBeenShown) {
      setHintHasBeenShown(true); // Mark as shown
      setShowScrollHint(true);
      
      // Fade in animation
      setTimeout(() => setHintVisible(true), 100);
    }
  }, [swipedCards.length, hintHasBeenShown]);

  // Simple scroll detection for liked section
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const likedSection = document.querySelector('[data-liked-section]');
        if (likedSection) {
          const containerRect = scrollContainerRef.current.getBoundingClientRect();
          const sectionRect = likedSection.getBoundingClientRect();
          
          // Check if My Projects section is still visible using the main element
          const mainElement = scrollContainerRef.current.querySelector('main');
          const myProjectsTitle = mainElement ? mainElement.querySelector('h1') : null;
          const myProjectsVisible = myProjectsTitle ? 
            myProjectsTitle.getBoundingClientRect().bottom > containerRect.top + 100 : false; // Add 100px buffer
          
          // Check if we're at the bottom of the page
          const scrollContainer = scrollContainerRef.current;
          const isAtBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 50; // 50px buffer
          
          // Calculate liked section visibility
          const sectionHeight = sectionRect.bottom - sectionRect.top;
          const visibleHeight = Math.min(sectionRect.bottom, containerRect.bottom) - Math.max(sectionRect.top, containerRect.top);
          const visibilityRatio = sectionHeight > 0 ? visibleHeight / sectionHeight : 0;
          
          // Show scroll button only when:
          // 1. My Projects section is visible (user can see it) AND
          // 2. There are swiped cards to show AND
          // 3. User is NOT at the bottom of the page
          // Hide when liked section is dominant (>50% visible) AND My Projects is scrolled past OR when at bottom
          const likedSectionDominant = visibilityRatio > 0.5;
          const myProjectsScrolledPast = !myProjectsVisible;
          
          setIsInLikedSection((likedSectionDominant && myProjectsScrolledPast) || isAtBottom);
          
          // Dismiss hint when user scrolls to liked section
          if (showScrollHint && (likedSectionDominant || isAtBottom)) {
            setHintVisible(false);
            setTimeout(() => setShowScrollHint(false), 300); // Hide after fade out
          }
        } else {
          setIsInLikedSection(false);
        }
      } else {
        setIsInLikedSection(false);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      handleScroll(); // Check initial state
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [swipedCards.length, showScrollHint]);

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

  const handleSwipe = (card: CardData, direction: 'left' | 'right') => {
    const project = projects.find(p => p.id.toString() === card.id);
    
    if (project) {
      // Delay state updates to match CardStack animation duration (300ms)
      setTimeout(() => {
        // If we're in dismissed view, track the swiped card
        if (showDismissedOnly) {
          setDismissedViewSwipedCards(prev => new Set([...prev, card.id]));
        }
        
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
          // Remove from liked list if it was liked (when passing from profile modal)
          setSwipedCards(prev => prev.filter(p => p.id !== project.id));
          
          // Always add to dismissed list when passing (swiping left)
          setDismissedCards(prev => {
            const isAlreadyDismissed = prev.some(p => p.id === project.id);
            return isAlreadyDismissed ? prev : [...prev, project];
          });
        }
      }, 300); // Match CardStack animation duration
    }
  };

  const handleStackEmpty = () => {
    // When stack is empty, show "see more" option
    setShowAllCards(false);
  };

  const handleSeeMore = () => {
    // Show only dismissed cards when "See More" is clicked
    setShowDismissedOnly(true);
    setShowAllCards(true);
    // Reset the dismissed view swiped cards when entering dismissed view
    setDismissedViewSwipedCards(new Set());
  };

  const handleDismissedStackEmpty = () => {
    // Just exit dismissed view mode without clearing anything
    setShowDismissedOnly(false);
    setShowAllCards(false);
  };

  const handleViewProject = (card: CardData) => {
    const project = projects.find(p => p.id.toString() === card.id);
    if (project) {
      setSelectedProject(project);
      setSelectedProjectSource('stack'); // Opened from card stack
    }
  };

  const handleModalSwipe = (direction: 'left' | 'right') => {
    if (selectedProject) {
      // Only handle swipe actions if the project was opened from the card stack
      if (selectedProjectSource === 'stack') {
        // Handle the swipe from the modal
        handleSwipe({
          id: selectedProject.id.toString(),
          title: selectedProject.title,
          description: selectedProject.description,
          threeWordDescriptor: selectedProject.threeWordDescriptor,
          image: selectedProject.images[0],
          tags: selectedProject.link ? ['Live Site'] : [],
          link: selectedProject.link,
          images: selectedProject.images
        }, direction);
        
        // Force CardStack to advance to next card by incrementing the key
        setCardStackKey(prev => prev + 1);
      }
      // If opened from liked section, update the liked/dismissed state and advance the card stack
      else if (selectedProjectSource === 'liked') {
        handleSwipe({
          id: selectedProject.id.toString(),
          title: selectedProject.title,
          description: selectedProject.description,
          threeWordDescriptor: selectedProject.threeWordDescriptor,
          image: selectedProject.images[0],
          tags: selectedProject.link ? ['Live Site'] : [],
          link: selectedProject.link,
          images: selectedProject.images
        }, direction);
        
        // Also advance the card stack to show the next card
        setCardStackKey(prev => prev + 1);
      }
      
      // Close the modal
      setSelectedProject(null);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background layer with gradient and fade overlays - Fixed to viewport */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          transform: 'translate3d(0,0,0)', // Force hardware acceleration for mobile
          WebkitTransform: 'translate3d(0,0,0)', // Safari-specific
          position: 'fixed' // Ensure fixed positioning is explicit
        }}
      >
        {/* Fixed gradient background with blur, darkening, and desaturation */}
        <div 
          className="absolute inset-0 blur-sm saturate-50 dark:opacity-60 opacity-30"
          style={{
            background: `linear-gradient(135deg, var(--base08) 0%, var(--base0E) 30%, var(--base08) 60%, var(--base0E) 100%)`,
            filter: 'brightness(0.9) blur(8px) saturate(0.6)'
          }}
        />
        
        {/* Fixed fade overlay for top */}
        <div 
          className="absolute inset-x-0 top-0 h-32 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, var(--base00) 0%, transparent 100%)`
          }}
        />
        
        {/* Fixed fade overlay for bottom */}
        <div 
          className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
          style={{
            background: `linear-gradient(to top, var(--base00) 0%, transparent 100%)`
          }}
        />
      </div>
      
      {/* Scrollable content container - replaces body scroll */}
      <div 
        ref={scrollContainerRef}
        className="fixed inset-0 z-10 overflow-y-auto"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <ProjectsHeader />
        
        <main className="container mx-auto px-4 pt-8 sm:pt-12 md:pt-16 pb-2 bg-base00/90 min-h-screen relative">


          {/* Card Stack Container - Fixed positioning to prevent shifting */}
          <div className="relative" style={{ height: 'calc(100vh - 100px)', minHeight: '400px' }}>
            <div className="absolute inset-0 flex justify-center items-start pt-2 w-full">
              {showAllCards ? (
                <CardStack 
                  key={cardStackKey}
                  cards={cardData}
                  onSwipe={handleSwipe}
                  onStackEmpty={showDismissedOnly ? handleDismissedStackEmpty : handleStackEmpty}
                  onSeeMore={handleSeeMore}
                  onViewProject={handleViewProject}
                  dismissedCount={dismissedCards.length}
                  className="w-full max-w-sm"
                  cardClassName=""
                  swipedCardIds={swipedCardIds}
                  githubData={githubData}
                />
              ) : (
              <div className="flex flex-col items-center justify-center">
                <p className="text-base05 text-lg mb-2" style={{textShadow: '0 0 6px var(--glow-red-light), 0 0 12px var(--glow-purple-light)'}}>No more projects to swipe!</p>
                <p className="text-base04 text-sm mb-6 text-center max-w-md" style={{textShadow: '0 0 4px var(--glow-red-light), 0 0 8px var(--glow-purple-light)'}}>
                  Scroll down to view the projects you liked and learn more about them.
                </p>
                <button
                  onClick={handleSeeMore}
                  className="px-6 py-3 bg-base0D hover:bg-base0C text-base00 rounded-lg transition-colors drop-shadow-md"
                >
                  See More ({dismissedCards.length})
                </button>
              </div>
            )}
            </div>
          </div>

        {swipedCards.length > 0 && (
          <div 
            className="mt-16 max-w-4xl mx-auto px-4 sm:px-6 animate-fade-in-up" 
            data-liked-section
            style={{
              animation: 'fadeInUp 0.8s ease-out forwards',
              opacity: 0,
              transform: 'translateY(30px)'
            }}
          >
            {/* Enhanced visual separator */}
            <div 
              className="w-full h-px bg-gradient-to-r from-transparent via-base0D to-transparent mb-8 opacity-60"
              style={{
                animation: 'fadeIn 1.2s ease-out 0.2s forwards',
                opacity: 0
              }}
            ></div>
            
            {/* Enhanced heading with better mobile visibility */}
            <div 
              className="text-center mb-8"
              style={{
                animation: 'fadeInUp 0.8s ease-out 0.4s forwards',
                opacity: 0,
                transform: 'translateY(20px)'
              }}
            >
              <div className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-base0D/20 to-base0C/20 rounded-full border border-base0D/30 backdrop-blur-sm mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 mr-2 text-base0D"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span className="text-base0D font-semibold text-sm uppercase tracking-wider">Favorites</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-base05 mb-2">
                Projects You Liked ({swipedCards.length})
              </h2>
              <p className="text-base04 text-sm sm:text-base max-w-2xl mx-auto" style={{textShadow: '0 0 4px var(--glow-red-light), 0 0 8px var(--glow-purple-light)'}}>
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
                    animation: `fadeInUp 0.6s ease-out ${0.8 + (index * 0.1)}s forwards`,
                    opacity: 0,
                    transform: 'translateY(20px)'
                  }}
                >
                  <h3 className="text-xl font-bold text-base05 mb-2">{project.title}</h3>
                  
                  {/* Date stamp and GitHub stats on same line */}
                  <div className="flex items-center justify-between mb-3">
                    {/* Timestamp always on the left */}
                    <span className="text-base0D text-sm font-semibold opacity-80">
                      {project.startYear && project.endYear 
                        ? project.startYear === project.endYear 
                          ? project.startYear.toString()
                          : `${project.startYear} - ${project.endYear}`
                        : project.startYear 
                          ? `${project.startYear} - Present`
                          : project.endYear?.toString()
                      }
                    </span>
                    
                    {/* GitHub star and fork count display for liked projects - always on the right */}
                    {project.githubRepo && githubData[project.githubRepo] && (
                      <div className="flex items-center gap-4 text-base0D text-sm font-semibold opacity-80" style={{fontFamily: 'NerdFont, monospace'}}>
                        {/* Stars */}
                        {githubData[project.githubRepo].stargazers_count > 0 && (
                          <div className="flex items-center">
                            <span className="mr-1">󰓎</span>
                            <span style={{fontFamily: 'NerdFont, monospace'}}>{githubData[project.githubRepo].stargazers_count}</span>
                          </div>
                        )}
                        
                        {/* Forks */}
                        {githubData[project.githubRepo].forks_count > 0 && (
                          <div className="flex items-center">
                            <span className="mr-1">󰓁</span>
                            <span style={{fontFamily: 'NerdFont, monospace'}}>{githubData[project.githubRepo].forks_count}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
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
        )}
        </main>
        
        {/* Scroll Indicator with Hint */}
        {swipedCards.length > 0 && !isInLikedSection && (
          <div className="fixed bottom-12 right-4 sm:right-5 lg:right-6 z-20">
            {/* Scroll Hint Popup */}
            {showScrollHint && swipedCards.length > 0 && (
              <div className={`absolute bottom-16 right-0 mb-2 px-4 py-2 bg-base01 border border-base02 rounded-lg shadow-lg backdrop-blur-sm transition-opacity duration-300 animate-bounce ${hintVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-base05 text-sm font-medium whitespace-nowrap">
                  Projects you&apos;ve liked ↓
                </div>
                {/* Tail with proper border outline */}
                <div className="absolute top-full right-7">
                  {/* Outer triangle for border - slightly larger */}
                  <div className="absolute w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-base02"></div>
                  {/* Inner triangle for fill - smaller and offset */}
                  <div className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-base01" style={{top: '-1px', left: '1px'}}></div>
                </div>
              </div>
            )}
            
            {/* Scroll Indicator Button */}
            <button
              onClick={() => {
                const likedSection = document.querySelector('[data-liked-section]');
                if (scrollContainerRef.current && likedSection) {
                  const containerRect = scrollContainerRef.current.getBoundingClientRect();
                  const sectionRect = likedSection.getBoundingClientRect();
                  const scrollTop = scrollContainerRef.current.scrollTop;
                  const targetScrollTop = scrollTop + sectionRect.top - containerRect.top;
                  
                  scrollContainerRef.current.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                  });
                }
                setShowScrollHint(false);
              }}
              className="p-3 rounded-lg bg-base0D hover:bg-base0C transition-all duration-300 shadow-lg active:scale-95"
              title="Scroll to liked projects"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6 text-base00"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Project Modal */}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onSwipe={handleModalSwipe}
          githubData={githubData}
        />
      )}
    </div>
  );
}
