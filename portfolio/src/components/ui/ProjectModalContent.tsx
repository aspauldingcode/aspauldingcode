'use client';

import React from 'react';
import { Project } from '../../app/projects/projectData';
import { GitHubRepoData } from '../../lib/github';

interface ProjectModalContentProps {
  project: Project;
  githubData?: Record<string, GitHubRepoData>;
}

export default function ProjectModalContent({ project, githubData }: ProjectModalContentProps) {
  const repoData = project.githubRepo ? githubData?.[project.githubRepo] : undefined;
  
  return (
    <div className="p-6 space-y-6">
      {/* Title and Metadata */}
      <div className="space-y-2">
        <h2 className="text-3xl md:text-4xl font-bold text-base05">
          {project.title}
        </h2>
        
        <div className="flex flex-wrap items-center gap-4 text-base04">
          {project.startYear && (
            <span className="text-sm">
              {project.startYear}{project.endYear && project.endYear !== project.startYear ? `-${project.endYear}` : ''}
            </span>
          )}
          
          {repoData && (
              <>
                <span className="text-yellow-400">
                  ⭐ {repoData.stargazers_count}
                </span>
                <span className="text-sm">
                  {repoData.full_name}
                </span>
              </>
            )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-4">
        <p className="text-base05 leading-relaxed text-lg">
          {project.description}
        </p>
        
        {project.shortDescription && (
          <p className="text-base04 text-sm">
            {project.shortDescription}
          </p>
        )}
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3">
        {project.githubRepo && (
          <a
            href={`https://github.com/${project.githubRepo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-base0D hover:bg-base0C text-base00 rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            <span>View on GitHub</span>
            <span>↗</span>
          </a>
        )}
        
        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-base0A hover:bg-base09 text-base00 rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            <span>Live Demo</span>
            <span>↗</span>
          </a>
        )}
      </div>

      {/* Three Word Descriptor */}
      {project.threeWordDescriptor && (
        <div className="pt-4 border-t border-base02">
          <p className="text-base04 text-sm italic">
            &ldquo;{project.threeWordDescriptor}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}