'use client';

import React, { useState, memo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Project } from '@/app/projects/projectData';

import { GitHubRepoData } from '@/lib/github';

interface ProjectCardProps {
    project: Project;
    onViewProject: (project: Project) => void;
    priority?: boolean;
    quality?: number;
    repoData?: GitHubRepoData;
}

const ProjectCard = memo(function ProjectCard({ project, onViewProject, priority = false, quality = 75, repoData }: ProjectCardProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div
            className="relative w-full h-full group cursor-pointer"
            onClick={(e) => {
                e.stopPropagation();
                onViewProject(project);
            }}
        >
            <motion.div
                className="w-full h-full"
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                {/* Main Glass Container */}
                <div className="relative w-full h-full overflow-hidden rounded-3xl border border-base05/10 bg-base01/70 backdrop-blur-xl shadow-xl transition-all duration-500 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] isolation-isolate theme-reversed">

                    {/* Background Image Layer */}
                    <div className="absolute inset-0 z-0 bg-base00">
                        {project.images?.[0] ? (
                            <>
                                {/* Skeleton/Shimmer underlying layer */}
                                <div
                                    className={`absolute inset-0 bg-gradient-to-r from-base02 via-base01 to-base02 animate-shimmer transition-opacity duration-700 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
                                    style={{ backgroundSize: '200% 100%' }}
                                />
                                <Image
                                    src={project.images[0]}
                                    alt={project.title}
                                    fill
                                    className={`object-cover transition-all duration-700 group-hover:scale-105 ${isLoaded ? 'blur-0 opacity-100' : 'blur-xl opacity-0 scale-110'
                                        }`}
                                    // Optimized sizes: 1 col on mobile, 2 on tablet, 3 on desktop, 4 on large
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                                    priority={priority}
                                    quality={quality}
                                    onLoad={() => setIsLoaded(true)}
                                />
                            </>
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-base02 font-mono uppercase tracking-widest text-base05/50">
                                No Preview
                            </div>
                        )}
                        {/* Gradient Overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-base00 via-base00/40 to-transparent opacity-80" />
                        <div className="absolute inset-0 bg-base00/0 transition-colors duration-300 group-hover:bg-base00/20" />
                    </div>

                    {/* Content Layer */}
                    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-5 sm:p-6">
                        {/* Metadata Pill */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="rounded bg-base05/10 px-2 py-1 text-xs font-bold uppercase tracking-widest text-base0B backdrop-blur-md">
                                {project.threeWordDescriptor}
                            </span>
                            {project.startYear && (
                                <span className="font-mono text-xs text-base04">
                                    {project.startYear}
                                </span>
                            )}
                            {repoData && (
                                <div className="flex items-center gap-3 text-xs font-mono text-base04 border-l border-base05/10 pl-3">
                                    {repoData.stargazers_count > 0 && (
                                        <div className="flex items-center gap-1" title="Stars">
                                            <span className="font-nerd">󰓎</span>
                                            <span>{repoData.stargazers_count}</span>
                                        </div>
                                    )}
                                    {repoData.forks_count > 0 && (
                                        <div className="flex items-center gap-1" title="Forks">
                                            <span className="font-nerd">󰓁</span>
                                            <span>{repoData.forks_count}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-black leading-none tracking-tight text-base05 drop-shadow-md sm:text-3xl">
                            {project.title}
                        </h2>

                        {/* Description */}
                        <p className="line-clamp-2 text-xs sm:text-sm font-medium leading-relaxed text-base04 drop-shadow-sm">
                            {project.description}
                        </p>

                        {/* Hover Indicator */}
                        <div className="flex translate-y-4 items-center gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 mt-2">
                            <div className="h-px w-8 bg-base05/60" />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-base05/80">
                                View Project
                            </span>
                        </div>
                    </div>

                    {/* Gloss/Sheen Effects */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-base05/10 via-transparent to-transparent opacity-50" />
                </div>
            </motion.div>
        </div>
    );
});

export default ProjectCard;
