'use client';

import React, { useState, memo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Project } from '@/app/projects/projectData';

import { GitHubRepoData } from '@/lib/github';

interface ProjectCardProps {
    project: Project;
    onViewProject: (project: Project) => void;
    onIntent?: () => void;
    priority?: boolean;
    quality?: number;
    repoData?: GitHubRepoData;
    onFocus?: () => void;
    interactionMode?: 'mouse' | 'keyboard';
}

const ProjectCard = memo(function ProjectCard({ project, onViewProject, onIntent, priority = false, quality = 70, repoData, onFocus, interactionMode = 'mouse' }: ProjectCardProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div
            className="relative w-full h-full group cursor-pointer focus:outline-none persona-skew"
            tabIndex={0}
            role="button"
            aria-label={`View details for ${project.title}`}
            onClick={(e) => {
                e.stopPropagation();
                onViewProject(project);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onViewProject(project);
                }
            }}
            onMouseEnter={() => {
                onIntent?.();
            }}
            onTouchStart={onIntent}
            onFocus={(e) => {
                onFocus?.();
                onIntent?.();
            }}
        >
            {/* Persona Offset Shadow Layer */}
            <div className={`absolute inset-0 bg-base08 translate-x-2 translate-y-2 opacity-0 group-focus-visible:opacity-100 transition-all duration-300 rounded-3xl ${interactionMode === 'mouse' ? 'group-hover:opacity-100' : ''}`} />
            
            <motion.div
                className={`w-full h-full group-focus-visible:ring-4 group-focus-visible:ring-base09/40 group-focus-visible:rounded-3xl group-focus-visible:shadow-[0_0_30px_rgba(220,150,86,0.4)] transition-all duration-300 relative z-0 group-focus-visible:z-50 ${interactionMode === 'mouse' ? 'group-hover:z-50' : ''}`}
                whileHover={interactionMode === 'mouse' ? { x: -6, y: -6 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                {/* Main Glass Container */}
                <div className={`relative w-full h-full overflow-hidden rounded-3xl border-2 border-base05/10 bg-base01/70 backdrop-blur-xl shadow-xl transition-all duration-500 
                    group-focus-visible:border-base09/50 
                    ${interactionMode === 'mouse' ? 'group-hover:border-base09/50' : ''}
                    isolation-isolate theme-reversed`}>

                    {/* Background Image Layer */}
                    <div className="absolute inset-0 z-0 bg-base00">
                        {project.images?.[0] ? (
                            <>
                                <Image
                                    src={project.images[0]}
                                    alt={project.title}
                                    fill
                                    className={`object-cover transition-all duration-700 group-hover:scale-110 ${isLoaded ? 'blur-0 opacity-80' : 'blur-xl opacity-0 scale-110'
                                        }`}
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                                    priority={priority}
                                    quality={quality}
                                    onLoad={() => setIsLoaded(true)}
                                />
                                {/* Persona Halftone Overlay */}
                                <div className="absolute inset-0 halftone-bg opacity-30 mix-blend-overlay pointer-events-none" />
                            </>
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-base02 font-mono uppercase tracking-widest text-base05/50">
                                No Preview
                            </div>
                        )}
                        {/* Gradient Overlays */}
                        <div
                            className="absolute inset-0 opacity-80"
                            style={{ backgroundImage: 'linear-gradient(to top, rgba(24,24,24,1), rgba(24,24,24,0.4), transparent)' }}
                        />
                    </div>

                    {/* Content Layer */}
                    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-5 sm:p-6 persona-skew-rev">
                        {/* Metadata Pill */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="rounded-sm bg-base09 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-base00">
                                {project.threeWordDescriptor}
                            </span>
                            {project.startYear && (
                                <span className="font-mono text-[10px] font-bold text-base04 bg-base00/50 px-1">
                                    {project.startYear}
                                </span>
                            )}
                        </div>

                        {/* Title - Handle long text with Persona-style tight wrapping */}
                        <h2 className="text-2xl min-[400px]:text-3xl font-black leading-[0.9] tracking-tighter text-base05 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)] sm:text-4xl italic uppercase break-words hyphens-auto">
                            {project.title}
                        </h2>

                        {/* Description */}
                        <p className="line-clamp-2 text-xs font-bold leading-tight text-base04/90">
                            {project.description}
                        </p>

                        {/* Hover Indicator */}
                        <div className={`flex items-center gap-2 mt-3 opacity-0 transition-all duration-300 ${interactionMode === 'mouse' ? 'group-hover:opacity-100' : ''}`}>
                            <div className="h-1 w-12 bg-base09" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-base09">
                                [ View ]
                            </span>
                        </div>
                    </div>

                    {/* Gloss/Sheen Effects */}
                    <div
                        className="pointer-events-none absolute inset-0 opacity-50"
                        style={{ backgroundImage: 'linear-gradient(to bottom right, rgba(216,216,216,0.1), transparent, transparent)' }}
                    />
                </div>
            </motion.div>
        </div>
    );
});

export default ProjectCard;
