'use client';

import React, { useState, memo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Project } from '@/app/projects/projectData';
import { GitHubRepoData } from '@/lib/github';
import { clipBoth, projectSlantForId } from '@/lib/projectSlantVariants';

interface ProjectCardProps {
    project: Project;
    onViewProject: (project: Project) => void;
    onIntent?: () => void;
    priority?: boolean;
    quality?: number;
    repoData?: GitHubRepoData;
    onFocus?: () => void;
    interactionMode?: 'mouse' | 'keyboard';
    /** Denser bottom overlay for short viewports / landscape pinned cards */
    compactOverlay?: boolean;
    /** -1 removes card from sequential focus (e.g. back of pinned stack) */
    tabIndex?: number;
}

const ProjectCard = memo(function ProjectCard({ project, onViewProject, onIntent, priority = false, quality = 70, repoData, onFocus, interactionMode = 'mouse', tabIndex = 0, compactOverlay = false }: ProjectCardProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const slant = projectSlantForId(project.id);
    const eraSeed = project.title.length % 3;
    const eraColor =
        eraSeed === 0 ? 'var(--base0D)' : eraSeed === 1 ? 'var(--base0A)' : 'var(--base08)';

    return (
        <div
            className="relative w-full h-full group cursor-pointer focus:outline-none persona-skew"
            tabIndex={tabIndex}
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
            {/* Persona Offset Shadow Layer — keep translate small so focus/hover ink does not widen scroll overflow */}
            <div className="absolute inset-0 bg-base08 translate-x-1 translate-y-1 opacity-0 group-focus-visible:opacity-100 transition-all duration-300 rounded-3xl pointer-fine:group-hover:opacity-100 pointer-fine:group-hover:translate-x-1.5 pointer-fine:group-hover:translate-y-1.5" />
            
            <motion.div
                className="w-full h-full group-focus-visible:ring-inset group-focus-visible:ring-4 group-focus-visible:ring-base09/40 group-focus-visible:rounded-3xl group-focus-visible:shadow-[inset_0_0_22px_rgba(220,150,86,0.28)] transition-all duration-300 relative z-0 group-focus-visible:z-50 pointer-fine:group-hover:z-50"
                whileHover={interactionMode === 'mouse' ? { x: -6, y: -6 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                {/* Main Glass Container — theme-reversed keeps greyscale dark-palette in light mode so text stays readable over the hardcoded dark gradient; accent colors (base08–0F) remain light-mode flavoured */}
                <div className="relative flex flex-col w-full h-full overflow-hidden rounded-3xl border-2 border-base05/10 bg-base01/70 backdrop-blur-xl shadow-xl transition-all duration-500 theme-reversed group-focus-visible:border-base09/50 pointer-fine:group-hover:border-base09/50 isolation-isolate">

                    {/* Top titlebar — solid era band + Persona slash clip + hard rule (matches sheet slant language) */}
                    <div
                        className={
                            compactOverlay
                                ? 'relative z-20 h-2.5 shrink-0 overflow-hidden sm:h-2.5 pointer-events-none'
                                : 'relative z-20 h-3 shrink-0 overflow-hidden sm:h-3.5 pointer-events-none'
                        }
                        aria-hidden
                    >
                        <div
                            className="absolute inset-0"
                            style={{
                                ...clipBoth(slant.highlightRail),
                                backgroundColor: eraColor,
                                boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.28)',
                            }}
                        />
                        <div
                            className="absolute inset-0 opacity-[0.38] mix-blend-overlay halftone-bg"
                            style={clipBoth(slant.highlightRail)}
                        />
                        <div
                            className="absolute inset-0"
                            style={{
                                ...clipBoth(slant.highlightRail),
                                background:
                                    'linear-gradient(95deg, transparent 0%, rgba(255,255,255,0.45) 48%, transparent 55%)',
                                mixBlendMode: 'soft-light',
                                opacity: 0.4,
                            }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-base00 sm:h-[3px]" />
                    </div>

                    {/* Background Image Layer */}
                    <div className="relative flex-1 min-h-0 w-full">
                        <div className="absolute inset-0 z-0 bg-base00">
                        {project.images?.[0] ? (
                            <>
                                <Image
                                    src={project.images[0]}
                                    alt={project.title}
                                    fill
                                    className={`object-cover transition-all duration-700 pointer-fine:group-hover:scale-110 ${isLoaded ? 'blur-0 opacity-80' : 'blur-xl opacity-0 scale-110'}`}
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                                    priority={priority}
                                    quality={quality}
                                    onLoad={() => setIsLoaded(true)}
                                />
                                {/* Persona Halftone Overlay */}
                                <div className="absolute inset-0 halftone-bg pointer-events-none opacity-30 mix-blend-overlay" />
                            </>
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-base02 font-mono uppercase tracking-widest text-base05/50">
                                No Preview
                            </div>
                        )}
                        {/* Gradient Overlays — always dark per design intent */}
                        <div
                            className="absolute inset-0"
                            style={{
                                opacity: 0.8,
                                backgroundImage: 'linear-gradient(to top, rgba(24,24,24,1), rgba(24,24,24,0.62), transparent)',
                            }}
                        />
                        </div>
                    </div>

                    <div
                        className={
                            compactOverlay
                                ? 'absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 py-3 pl-4 pr-8 sm:py-3.5 sm:pl-5 sm:pr-9 persona-skew-rev'
                                : 'absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 py-6 pl-6 pr-8 sm:py-8 sm:pl-8 sm:pr-11 persona-skew-rev'
                        }
                    >
                        {/* Metadata Pill */}
                        <div className={'flex items-center flex-wrap ' + (compactOverlay ? 'gap-1.5' : 'gap-3')}>
                            <span className="rounded-sm bg-base09 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-base00">
                                {project.threeWordDescriptor}
                            </span>
                            {project.startYear && (
                                <span className="font-mono text-xs sm:text-sm font-black text-base04 bg-base00/60 px-1.5 py-0.5 border border-base03/60">
                                    {project.startYear}
                                </span>
                            )}
                        </div>

                        {repoData && (
                            <div
                                className={
                                    'flex items-center text-[11px] sm:text-xs font-black uppercase tracking-wide text-base04 ' +
                                    (compactOverlay ? 'gap-2' : 'gap-4')
                                }
                            >
                                <span className="flex min-w-0 items-center gap-1.5 bg-base00/55 py-0.5 pl-2 pr-2.5 border border-base03/60">
                                    <span className="font-nerd text-sm inline-flex shrink-0 items-center justify-center leading-none [overflow:visible] min-w-[1.1em]">󰓎</span>
                                    {repoData.stargazers_count}
                                </span>
                                <span className="flex min-w-0 items-center gap-1.5 bg-base00/55 py-0.5 pl-2 pr-2.5 border border-base03/60">
                                    <span className="font-nerd text-sm inline-flex shrink-0 items-center justify-center leading-none [overflow:visible] min-w-[1.1em]">󰓁</span>
                                    {repoData.forks_count}
                                </span>
                            </div>
                        )}

                        {/* Title - Handle long text with Persona-style tight wrapping */}
                        <h2
                            className={
                                compactOverlay
                                    ? 'text-lg min-[400px]:text-xl font-black leading-[0.95] tracking-tighter text-base05 sm:text-2xl italic uppercase break-words hyphens-auto'
                                    : 'text-2xl min-[400px]:text-3xl font-black leading-[0.9] tracking-tighter text-base05 sm:text-4xl italic uppercase break-words hyphens-auto'
                            }
                            style={{ textShadow: '2px 2px 0 color-mix(in srgb, var(--base00) 82%, transparent)' }}
                        >
                            {project.title}
                        </h2>

                        {/* Description */}
                        <p
                            className={
                                compactOverlay
                                    ? 'line-clamp-1 text-[10px] font-bold leading-tight text-base04/90'
                                    : 'line-clamp-2 text-xs font-bold leading-tight text-base04/90'
                            }
                        >
                            {project.description}
                        </p>

                        {/* Hover Indicator */}
                        <div className={'flex items-center gap-2 opacity-0 transition-all duration-300 pointer-fine:group-hover:opacity-100 ' + (compactOverlay ? 'mt-1' : 'mt-3')}>
                            <div className="h-1 w-12 bg-base09" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-base09">
                                [ View ]
                            </span>
                        </div>
                    </div>

                    {/* Gloss/Sheen Effects */}
                    <div
                        className="pointer-events-none absolute inset-0 opacity-50"
                        style={{ backgroundImage: 'linear-gradient(to bottom right, color-mix(in srgb, var(--base07) 18%, transparent), transparent, transparent)' }}
                    />
                </div>
            </motion.div>
        </div>
    );
});

export default ProjectCard;
