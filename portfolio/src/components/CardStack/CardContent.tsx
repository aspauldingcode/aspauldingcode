'use client';

import React from 'react';
import Image from 'next/image';
import { CardData, GitHubRepoData } from './types';

interface CardContentProps {
    card: CardData;
    onViewProject?: (card: CardData) => void;
    githubData?: Record<string, GitHubRepoData>;
    inputDisabled?: boolean;
}

export default function CardContent({ card, onViewProject, githubData, inputDisabled = false }: CardContentProps) {
    const repoData = card.githubRepo ? githubData?.[card.githubRepo] : null;

    return (
        <div className="relative w-full h-full bg-base01 rounded-2xl overflow-hidden shadow-2xl border border-base02 flex flex-col group select-none">

            {/* --- Image Section --- */}
            {/* Grows to fill available space, shrinks if text needs room */}
            <div className="relative flex-1 min-h-0 w-full bg-base00 overflow-hidden">
                {card.image ? (
                    <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 400px" // Optimization
                        priority
                        draggable={false}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-base02">
                        <span className="text-base04 text-lg">No Preview</span>
                    </div>
                )}

                {/* Subtle gradient overlay at bottom of image for text readability transition */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-base01 to-transparent opacity-80" />
            </div>

            {/* --- Content Section --- */}
            {/* Flex column that adapts to height */}
            <div className="flex flex-col p-5 gap-3 bg-base01 z-10">

                {/* Header: Title & Date */}
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-base05 leading-tight line-clamp-2">
                        {card.title}
                    </h2>
                    {card.startYear && (
                        <span className="text-xs font-mono py-1 px-2 bg-base02 rounded text-base04 whitespace-nowrap ml-2">
                            {card.startYear}
                            {card.endYear && card.endYear !== card.startYear ? `-${card.endYear}` : ''}
                        </span>
                    )}
                </div>

                {/* Descriptor (3 words) */}
                <div className="text-sm font-semibold text-base0D tracking-wide uppercase">
                    {card.threeWordDescriptor}
                </div>

                {/* Description: Auto-truncates based on space */}
                <p className="text-base04 text-sm leading-relaxed line-clamp-4 overflow-hidden">
                    {card.description}
                </p>

                {/* Footer: Tags & Button */}
                <div className="mt-auto pt-2 flex items-center justify-between gap-4">

                    {/* Tags / Stats */}
                    <div className="flex flex-wrap gap-2 items-center">
                        {/* GitHub Stats */}
                        {repoData && (
                            <div className="flex items-center gap-3 text-xs font-mono text-base04 bg-base02 px-2 py-1 rounded">
                                {repoData.stargazers_count > 0 && (
                                    <span className="flex items-center gap-1">
                                        <span className="font-nerd">󰓎</span> {repoData.stargazers_count}
                                    </span>
                                )}
                                {repoData.forks_count > 0 && (
                                    <span className="flex items-center gap-1">
                                        <span className="font-nerd">󰓁</span> {repoData.forks_count}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    {onViewProject && (
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent drag start
                                    if (!inputDisabled) onViewProject(card);
                                }}
                                onPointerDown={(e) => e.stopPropagation()} // Stop drag interaction
                                disabled={inputDisabled}
                                className={`px-5 py-2 bg-base0D hover:bg-base0C text-base00 font-bold rounded-lg transition-colors shadow-md active:scale-95 transform ${inputDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                View
                            </button>
                            <span className="hidden sm:inline-flex items-center justify-center opacity-75 text-base04 mt-1" aria-label="Spacebar">
                                <svg className="w-4 h-2" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4V8H20V4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
