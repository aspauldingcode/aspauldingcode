'use client';

import { useState } from 'react';
import { projects, Project } from './projectData';
import Link from 'next/link';
import ProjectsHeader from '../components/ProjectsHeader';
import CardStack from '../../components/CardStack';
import ProjectModal from '../../components/ProjectModal';

interface CardData {
  id: string;
  title: string;
  description: string;
  image?: string;
  tags?: string[];
  link?: string;
  images?: string[];
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

  // Convert projects to CardStack format
  const cardData = showDismissedOnly 
    ? dismissedCards.map(project => ({
        id: project.id.toString(),
        title: project.title,
        description: project.description,
        image: project.images[0],
        tags: project.link ? ['Live Site'] : [],
        link: project.link,
        images: project.images
      }))
    : projects.map(project => ({
        id: project.id.toString(),
        title: project.title,
        description: project.description,
        image: project.images[0],
        tags: project.link ? ['Live Site'] : [],
        link: project.link,
        images: project.images
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
    <div className="h-screen bg-base00 relative overflow-hidden">
      {/* Background layer with gradient and fade overlays - Fixed to viewport */}
      <div className="fixed inset-0">
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
      
      {/* Scrollable content container */}
      <div className="relative z-10 h-full overflow-y-auto">
        <div className="min-h-full pb-16">
          <ProjectsHeader />
          
          <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-base05 mb-4" style={{textShadow: '0 0 8px var(--glow-red), 0 0 16px var(--glow-purple), 0 0 24px var(--glow-red-light)'}}>
            My Projects
          </h1>
          <p className="text-base04 text-lg max-w-2xl mx-auto" style={{textShadow: '0 0 6px var(--glow-red-light), 0 0 12px var(--glow-purple-light)'}}>
            Swipe right to like a project, left to pass.
          </p>
        </div>

        <div className="flex justify-center">
          {showAllCards ? (
            <CardStack 
              key={cardStackKey}
              cards={cardData}
              onSwipe={handleSwipe}
              onStackEmpty={showDismissedOnly ? handleDismissedStackEmpty : handleStackEmpty}
              onSeeMore={handleSeeMore}
              onViewProject={handleViewProject}
              dismissedCount={dismissedCards.length}
              className="mb-8"
              cardClassName="backdrop-blur-sm"
              swipedCardIds={swipedCardIds}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-96 mb-8">
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

        {swipedCards.length > 0 && (
          <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-base05 mb-6 text-center" style={{textShadow: '0 0 8px var(--glow-red), 0 0 16px var(--glow-purple-light)'}}>
            Projects You Liked ({swipedCards.length})
          </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {swipedCards.map((project) => (
                <div key={project.id} className="bg-base01 backdrop-blur-sm rounded-lg p-6 border border-base02">
                  <h3 className="text-xl font-bold text-base05 mb-2">{project.title}</h3>
                  <p className="text-base04 mb-4">{project.description}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setSelectedProjectSource('liked'); // Opened from liked section
                      }}
                      className="px-4 py-2 bg-base0C hover:bg-base0D text-base00 rounded-lg transition-colors font-medium"
                    >
                      View Project
                    </button>
                    {project.link && (
                      <Link 
                        href={project.link} 
                        target="_blank"
                        className="inline-flex items-center px-4 py-2 bg-base0D hover:bg-base0C text-base00 rounded-lg transition-colors"
                      >
                        Visit Project →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </main>
        </div>
      </div>
      
      {/* Project Modal */}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onSwipe={handleModalSwipe}
        />
      )}
    </div>
  );
}
