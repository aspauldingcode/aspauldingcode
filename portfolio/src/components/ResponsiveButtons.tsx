'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface ButtonTextLevel {
  full: string;
  medium: string;
  short: string;
  icon: React.ReactNode;
}

interface ResponsiveButtonProps {
  texts: ButtonTextLevel;
  onClick?: () => void;
  href?: string;
  className?: string;
  target?: string;
}

const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  texts,
  onClick,
  href,
  className = '',
  target
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [currentLevel, setCurrentLevel] = useState<'full' | 'medium' | 'short' | 'icon'>('full');

  useEffect(() => {
    // Disable ResizeObserver to prevent loop errors - use static responsive design instead
    if (typeof window === 'undefined') return;
    
    // Set a default level based on screen size
    const updateLevel = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth >= 768) {
        setCurrentLevel('full');
      } else if (screenWidth >= 640) {
        setCurrentLevel('medium');
      } else if (screenWidth >= 480) {
        setCurrentLevel('short');
      } else {
        setCurrentLevel('icon');
      }
    };

    // Initial check
    updateLevel();

    // Listen for window resize instead of ResizeObserver
    const handleResize = () => {
      updateLevel();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [texts, href]);

  const renderContent = () => {
    const iconWithText = (text: string) => (
      <div className="flex items-center justify-center gap-2">
        <span>{text}</span>
        {texts.icon}
      </div>
    );

    switch (currentLevel) {
      case 'full':
        return iconWithText(texts.full);
      case 'medium':
        return iconWithText(texts.medium);
      case 'short':
        return iconWithText(texts.short);
      case 'icon':
        return (
          <div className="flex items-center justify-center w-full h-full">
            {texts.icon}
          </div>
        );
      default:
        return iconWithText(texts.full);
    }
  };

  const commonProps = {
    className: `${className} transition-all duration-200 ${currentLevel === 'icon' ? 'flex items-center justify-center' : ''}`,
    style: { minWidth: currentLevel === 'icon' ? '2.5rem' : 'auto' }
  };

  if (href) {
    return (
      <Link href={href} target={target} ref={linkRef} {...commonProps}>
        {renderContent()}
      </Link>
    );
  }

  return (
    <button onClick={onClick} ref={buttonRef} {...commonProps}>
      {renderContent()}
    </button>
  );
};

interface ResponsiveButtonsProps {
  project: {
    githubRepo?: string;
    link?: string;
  };
  onViewProject: () => void;
  className?: string;
}

export const ResponsiveButtons: React.FC<ResponsiveButtonsProps> = ({
  project,
  onViewProject,
  className = ''
}) => {
  const viewProjectTexts: ButtonTextLevel = {
    full: 'View Project',
    medium: 'View Project',
    short: 'View',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  };

  const sourceCodeTexts: ButtonTextLevel = {
    full: 'View Source Code',
    medium: 'View Source',
    short: 'Source',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    )
  };

  const visitSiteTexts: ButtonTextLevel = {
    full: project.githubRepo ? 'Visit Live Site' : 'Visit Project',
    medium: project.githubRepo ? 'Visit Site' : 'Visit',
    short: 'Visit',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    )
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <ResponsiveButton
        texts={viewProjectTexts}
        onClick={onViewProject}
        className="bg-base0B hover:bg-base0A text-base00 rounded-lg transition-colors font-medium text-xs flex-1 px-3 py-2 text-center"
      />
      
      {project.githubRepo && (
        <ResponsiveButton
          texts={sourceCodeTexts}
          href={project.githubRepo}
          target="_blank"
          className="bg-base0E hover:bg-base0F text-base00 rounded-lg transition-colors text-xs flex-1 px-3 py-2 text-center"
        />
      )}
      
      {project.link && (
        <ResponsiveButton
          texts={visitSiteTexts}
          href={project.link}
          target="_blank"
          className="bg-base0C hover:bg-base0D text-base00 rounded-lg transition-colors text-xs flex-1 px-3 py-2 text-center"
        />
      )}
    </div>
  );
};