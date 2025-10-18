import React, { memo } from 'react';
import { CardData, GitHubRepoData } from '../CardStack/types';
import { getDateLabel, truncateWords } from '../CardStack/utils';

interface OverlayModeContentProps {
  card: CardData;
  contentScale: number;
  actualHeight: number;
  githubData?: Record<string, GitHubRepoData>;
  onViewProject?: (card: CardData) => void;
}

export default memo(function OverlayModeContent({
  card,
  contentScale,
  actualHeight,
  githubData,
  onViewProject
}: OverlayModeContentProps) {
  const repoData = card.githubRepo ? githubData?.[card.githubRepo] : undefined;
  const dateLabel = getDateLabel(card);
  
  const titleFontSize = Math.max(12, 16 * contentScale);
  const descFontSize = Math.max(10, 12 * contentScale);
  const buttonFontSize = Math.max(9, 11 * contentScale);
  const padding = Math.max(8, 12 * contentScale);
  
  const maxDescWords = actualHeight < 150 ? 8 : actualHeight < 180 ? 12 : 16;
  const truncatedDesc = truncateWords(card.description, maxDescWords);

  return (
    <div 
      className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-lg flex flex-col justify-end text-white"
      style={{ padding: `${padding}px` }}
    >
      <div className="space-y-1">
        <h3 
          className="font-bold leading-tight text-white"
          style={{ fontSize: `${titleFontSize}px` }}
        >
          {card.title}
        </h3>
        
        <p 
          className="text-gray-200 leading-tight"
          style={{ fontSize: `${descFontSize}px` }}
        >
          {truncatedDesc}
        </p>
        
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            {dateLabel && (
              <span 
                className="text-gray-300"
                style={{ fontSize: `${buttonFontSize}px` }}
              >
                {dateLabel}
              </span>
            )}
            {repoData && (
              <div className="flex items-center space-x-1">
                <span 
                  className="text-yellow-400"
                  style={{ fontSize: `${buttonFontSize}px` }}
                >
                  ⭐ {String(repoData.stars)}
                </span>
              </div>
            )}
          </div>
          
          {onViewProject && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewProject(card);
              }}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded px-2 py-1 text-white transition-colors duration-200"
              style={{ fontSize: `${buttonFontSize}px` }}
            >
              View
            </button>
          )}
        </div>
      </div>
    </div>
  );
});