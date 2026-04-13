'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Project } from './projectData';
import ProjectsHeader from '../components/ProjectsHeader';
import ProjectCard from '@/components/ProjectCard';
import { GitHubRepoData } from '@/lib/github';
import { motion } from 'framer-motion';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

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
const ProjectSheet = dynamic(() => import('@/components/ProjectSheet'), {
  loading: () => <ProjectSheetLoading />,
});

interface ProjectsClientProps {
  projects: Project[];
  initialGithubData?: Record<string, GitHubRepoData>;
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
  const [hasOpenedSheet, setHasOpenedSheet] = useState(false);

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
    setSelectedProject(project);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedProject(null);
  }, []);

  // Keyboard Navigation for Sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedProject) {
        handleModalClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProject, handleModalClose]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const repoA = a.githubRepo ? githubData[a.githubRepo] : null;
      const repoB = b.githubRepo ? githubData[b.githubRepo] : null;

      const starsA = repoA?.stargazers_count || 0;
      const starsB = repoB?.stargazers_count || 0;

      return starsB - starsA;
    });
  }, [projects, githubData]);

  return (
    <div className="min-h-screen bg-base00 text-base05 flex flex-col">
      {/* Keep header always rendered for immediate first paint */}
      <ProjectsHeader isSheetOpen={!!selectedProject} />

      {/* Main Grid Layout */}
      <motion.main
        className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 pt-20 sm:pt-24 pb-14 sm:pb-20 relative z-10"
        animate={{
          filter: selectedProject ? "blur(5px)" : "blur(0px)",
          scale: selectedProject ? 0.98 : 1,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* 
            Grid Configuration:
            - Mobile: 1 column
            - Tablet: 2 columns
            - Desktop: 3 columns
            - Large Desktop: 4 columns
          */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {sortedProjects.map((project, index) => (
            <div
              key={project.id}
              className="aspect-[4/5] w-full"
            >
              <ProjectCard
                project={project}
                onViewProject={handleViewProject}
                // Priority loading for the first few items above the fold
                priority={index < 4}
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
    </div>
  );
}