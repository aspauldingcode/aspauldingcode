'use client';

import { useState } from 'react';
import { Project } from './projectData';
import ProjectsHeader from '../components/ProjectsHeader';
import UltraSimpleCardStack from '@/components/layout/UltraSimpleCardStack';
import SimpleProjectModal from '@/components/layout/SimpleProjectModal';
import { CardData } from '@/components/CardStack/types';

interface SimpleProjectsClientProps {
  projects: Project[];
}

export default function SimpleProjectsClient({ projects }: SimpleProjectsClientProps) {
  const [swipedCards, setSwipedCards] = useState<Project[]>([]);
  const [dismissedCards, setDismissedCards] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showLikedOnly, setShowLikedOnly] = useState(false);

  // Convert projects to card format
  const convertToCardData = (project: Project): CardData => ({
    id: project.id.toString(),
    title: project.title,
    description: project.description,
    shortDescription: project.shortDescription,
    threeWordDescriptor: project.threeWordDescriptor,
    image: project.images[0],
    startYear: project.startYear,
    endYear: project.endYear,
    githubRepo: project.githubRepo,
    link: project.link,
    tags: [],
  });

  // Get available projects (not swiped or dismissed)
  const availableProjects = projects.filter(project => 
    !swipedCards.some(swiped => swiped.id === project.id) &&
    !dismissedCards.some(dismissed => dismissed.id === project.id)
  );

  // Get liked projects
  const likedProjects = swipedCards;

  // Current display projects
  const displayProjects = showLikedOnly ? likedProjects : availableProjects;
  const displayCards = displayProjects.map(convertToCardData);

  const handleSwipe = (card: CardData, direction: 'left' | 'right') => {
    const project = projects.find(p => p.id.toString() === card.id);
    if (!project) return;

    if (direction === 'right') {
      setSwipedCards(prev => [...prev, project]);
    } else {
      setDismissedCards(prev => [...prev, project]);
    }
  };

  const handleViewProject = (card: CardData) => {
    const project = projects.find(p => p.id.toString() === card.id);
    if (project) {
      setSelectedProject(project);
    }
  };

  const handleModalClose = () => {
    setSelectedProject(null);
  };

  const handleModalSwipe = (direction: 'left' | 'right') => {
    if (selectedProject) {
      if (direction === 'right') {
        setSwipedCards(prev => [...prev, selectedProject]);
      } else {
        setDismissedCards(prev => [...prev, selectedProject]);
      }
    }
    handleModalClose();
  };

  const handleSeeMore = () => {
    setShowLikedOnly(!showLikedOnly);
  };

  return (
    <div className="min-h-screen bg-base00">
      <ProjectsHeader />
      
      <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Toggle between available and liked projects */}
          <div className="flex justify-center mb-8">
            <div className="bg-base01 rounded-lg p-1 flex">
              <button
                onClick={() => setShowLikedOnly(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !showLikedOnly
                    ? 'bg-base0D text-base00'
                    : 'text-base04 hover:text-base05'
                }`}
              >
                Available ({availableProjects.length})
              </button>
              <button
                onClick={() => setShowLikedOnly(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  showLikedOnly
                    ? 'bg-base0D text-base00'
                    : 'text-base04 hover:text-base05'
                }`}
              >
                Liked ({likedProjects.length})
              </button>
            </div>
          </div>

          {/* Card Stack */}
          <div className="flex justify-center">
            <div className="w-full max-w-md h-[600px]">
              {displayCards.length > 0 ? (
                <UltraSimpleCardStack
                  cards={displayCards}
                  onSwipe={handleSwipe}
                  onViewProject={handleViewProject}
                  onSeeMore={showLikedOnly ? handleSeeMore : undefined}
                  className="w-full h-full"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-base04 mb-4">
                    {showLikedOnly ? (
                      <>
                        <h3 className="text-xl font-semibold mb-2">No liked projects</h3>
                        <p>Swipe right on some projects to like them!</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold mb-2">All done!</h3>
                        <p>You&apos;ve reviewed all available projects.</p>
                        <button
                          onClick={handleSeeMore}
                          className="mt-4 px-6 py-2 bg-base0D hover:bg-base0C text-base00 rounded-lg transition-colors"
                        >
                          View Liked Projects
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Modal */}
      <SimpleProjectModal
        project={selectedProject}
        onClose={handleModalClose}
        onSwipe={handleModalSwipe}
      />
    </div>
  );
}