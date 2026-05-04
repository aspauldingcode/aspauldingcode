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
    /** Enables HDR metallic glitter shader effect */
    isFeatured?: boolean;
}

const ProjectCard = memo(function ProjectCard({ project, onViewProject, onIntent, priority = false, quality = 70, repoData, onFocus, interactionMode = 'mouse', tabIndex = 0, compactOverlay = false, isFeatured = false }: ProjectCardProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
    const lastOrientationRef = React.useRef({ beta: 0, gamma: 0 });

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        
        // Only activate gyro if it's likely a mobile device
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isTouch) return;

        const handleOrientation = (e: DeviceOrientationEvent) => {
            if (e.beta === null || e.gamma === null) return;
            
            // Smooth the values to prevent jitter
            const beta = e.beta;
            const gamma = e.gamma;
            
            // Normalize tilt to 0-100 range
            // We assume typical holding tilt is ~45deg beta and 0deg gamma
            const targetX = Math.min(100, Math.max(0, (gamma + 20) / 40 * 100));
            const targetY = Math.min(100, Math.max(0, (beta - 25) / 40 * 100));
            
            setMousePos({ x: targetX, y: targetY });
            lastOrientationRef.current = { beta, gamma };
        };

        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

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
            onMouseMove={(e) => {
                if (!isFeatured) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setMousePos({ x, y });
            }}
            onTouchStart={onIntent}
            onFocus={(e) => {
                setIsFocused(true);
                onFocus?.();
                onIntent?.();
            }}
            onBlur={() => setIsFocused(false)}
        >
            {/* Persona Offset Shadow Layer — keep translate small so focus/hover ink does not widen scroll overflow */}
            {/* Persona Offset Shadow Layer — re-introduced as a sharp, vibrant accent for focus/hover clarity */}
            <div className={`absolute inset-0 bg-base08 translate-x-1 translate-y-1 opacity-0 group-focus-visible:opacity-100 transition-all duration-300 rounded-3xl ${interactionMode === 'mouse' ? 'pointer-fine:group-hover:opacity-100 pointer-fine:group-hover:translate-x-1.5 pointer-fine:group-hover:translate-y-1.5' : ''}`} />
            
            <motion.div
                className={`w-full h-full transition-all duration-300 relative z-0 group-focus-visible:z-50 pointer-fine:group-hover:z-50 ${isFocused && interactionMode === 'keyboard' ? 'z-50' : ''}`}
                animate={isFocused && interactionMode === 'keyboard' ? { x: -6, y: -6 } : { x: 0, y: 0 }}
                whileHover={interactionMode === 'mouse' ? { x: -6, y: -6 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                {/* Main Glass Container — theme-reversed keeps greyscale dark-palette in light mode so text stays readable over the hardcoded dark gradient; accent colors (base08–0F) remain light-mode flavoured */}
                <div className={`relative flex flex-col w-full h-full overflow-hidden rounded-3xl border-2 border-base05/10 bg-base01/70 backdrop-blur-xl transition-all duration-500 theme-reversed group-focus-visible:border-base09 ${interactionMode === 'mouse' ? 'pointer-fine:group-hover:border-base09' : ''} isolation-isolate`}>

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
                                    className={`object-cover transition-all duration-700 ${interactionMode === 'mouse' ? 'pointer-fine:group-hover:scale-110' : ''} ${isFocused && interactionMode === 'keyboard' ? 'scale-110 blur-0 opacity-90' : ''} ${isLoaded ? 'blur-0 opacity-80' : 'blur-xl opacity-0 scale-110'}`}
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                                    priority={priority}
                                    quality={quality}
                                    onLoad={() => setIsLoaded(true)}
                                />
                                
                                {/* "Persona Heritage" Shader - Custom variants for P3 (Blue), P4 (Yellow), P5 (Red) */}
                                {isFeatured && (
                                    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
                                        {/* 1. Era-Specific Base Beam (P3: Smooth, P4: Static, P5: Sharp) */}
                                        <div 
                                            className="absolute inset-[-50%] opacity-20 mix-blend-screen transition-transform duration-500 ease-out"
                                            style={{
                                                background: eraSeed === 0 
                                                    ? `linear-gradient(110deg, transparent 40%, var(--base0D) 50%, transparent 60%)` // P3 Moonlight
                                                    : eraSeed === 1
                                                    ? `repeating-linear-gradient(90deg, transparent, transparent 2px, var(--base0A) 3px, transparent 4px)` // P4 Scanlines
                                                    : `linear-gradient(105deg, transparent 35%, var(--base08) 40%, transparent 45%)`, // P5 Slash
                                                transform: `translateX(${(mousePos.x - 50) * 0.3}%) skewX(-15deg)`,
                                                filter: eraSeed === 1 ? 'contrast(2) brightness(1.5)' : 'none'
                                            }}
                                        />

                                        {/* 2. Interactive Sparkle Grid (Era-Specific Shapes) */}
                                        <div 
                                            className="absolute inset-0 opacity-60 mix-blend-color-dodge"
                                            style={{
                                                backgroundImage: eraSeed === 0
                                                    ? `radial-gradient(circle, var(--base0D) 1px, transparent 1px)` // P3 Bubbles
                                                    : eraSeed === 1
                                                    ? `conic-gradient(from 0deg at 50% 50%, var(--base0A) 0deg, transparent 90deg)` // P4 Pop-art
                                                    : `radial-gradient(circle, white 1.5px, transparent 1.5px)`, // P5 Halftone
                                                backgroundSize: eraSeed === 1 ? '20px 20px' : '10px 10px',
                                                maskImage: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, black 0%, transparent 45%)`,
                                                WebkitMaskImage: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, black 0%, transparent 45%)`
                                            }}
                                        />

                                        {/* 3. Heritage Glitter Particles */}
                                        <div className="absolute inset-0 z-30">
                                            {[...Array(14)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    className="absolute"
                                                    style={{
                                                        backgroundColor: eraColor,
                                                        width: eraSeed === 0 ? '4px' : eraSeed === 1 ? '6px' : '5px',
                                                        height: eraSeed === 0 ? '4px' : eraSeed === 1 ? '6px' : '5px',
                                                        clipPath: eraSeed === 0 
                                                            ? 'circle(50%)' // P3
                                                            : eraSeed === 1 
                                                            ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' // P4 Diamond
                                                            : 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', // P5 Star
                                                        left: `${5 + Math.random() * 90}%`,
                                                        top: `${5 + Math.random() * 90}%`,
                                                        filter: `drop-shadow(0 0 2px ${eraColor})`,
                                                    }}
                                                    animate={{
                                                        scale: [0, 1, 0],
                                                        y: eraSeed === 0 ? [0, -20, 0] : [0, 0, 0],
                                                        rotate: [0, 90, 180],
                                                        opacity: [0, 0.8, 0]
                                                    }}
                                                    transition={{
                                                        duration: 1 + Math.random() * 1,
                                                        repeat: Infinity,
                                                        delay: Math.random() * 5,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        {/* 4. Persona Signature Overlay (Scanlines/Noise) */}
                                        <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none">
                                            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20" />
                                            {eraSeed === 1 && (
                                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent bg-[length:100%_4px]" />
                                            )}
                                        </div>

                                    </div>
                                )}

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
                        <div className={`flex items-center gap-2 transition-all duration-300 ${interactionMode === 'mouse' ? 'opacity-0 pointer-fine:group-hover:opacity-100' : isFocused ? 'opacity-100' : 'opacity-0'} ${compactOverlay ? 'mt-1' : 'mt-3'}`}>
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
