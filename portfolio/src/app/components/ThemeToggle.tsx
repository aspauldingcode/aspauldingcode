'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useBreakpoints } from '@/hooks/useBreakpoints';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const bp = useBreakpoints();
  const [showTooltip, setShowTooltip] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggle = () => {
    toggleTheme();

    // Clear existing timeout to reset the 3s clock
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Ensure tooltip is visible during interaction
    setShowTooltip(true);

    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
      // Re-enable after another delay so it shows on next hover
      setTimeout(() => setShowTooltip(true), 2000);
    }, 3000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Use a consistent icon during initial render to prevent hydration mismatch
  const getThemeIcon = () => {
    // During initial render and before mounting, always show the auto icon
    if (!mounted) {
      return (
        <>
          {/* Auto icon - half sun, half moon */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8a4 4 0 100 8V8z"
            fill="currentColor"
          />
        </>
      );
    }

    switch (theme) {
      case 'light':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        );
      case 'dark':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        );
      case 'auto':
        return (
          <>
            {/* Auto icon - half sun, half moon */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8a4 4 0 100 8V8z"
              fill="currentColor"
            />
          </>
        );
      default:
        return null;
    }
  };

  const getAriaLabel = () => {
    // During initial render, use a consistent label
    if (!mounted) {
      return 'Toggle theme';
    }

    switch (theme) {
      case 'light':
        return 'Switch to dark mode';
      case 'dark':
        return 'Switch to auto mode';
      case 'auto':
        return 'Switch to light mode';
      default:
        return 'Toggle theme';
    }
  };

  return (
    <div
      id="theme-toggle-ui"
      className="fixed top-0 right-0 pt-[calc(1rem+var(--safe-top))] pr-[calc(1rem+var(--safe-right))] sm:pt-[calc(1.25rem+var(--safe-top))] sm:pr-[calc(1.25rem+var(--safe-right))] lg:pt-[calc(1.5rem+var(--safe-top))] lg:pr-[calc(1.5rem+var(--safe-right))] z-50 flex flex-col items-center transition-all duration-500 will-change-transform"
      style={{
        transform: 'translate3d(0,0,0)',
        WebkitTransform: 'translate3d(0,0,0)'
      }}
    >
      <div className="group relative flex flex-col items-center">
        <button
          onClick={handleToggle}
          className="p-2 rounded-lg bg-base0D hover:bg-base0C transition-all duration-300 shadow-lg active:scale-95 touch-manipulation overflow-hidden"
          aria-label={getAriaLabel()}
          title={`Cycle theme (t)`}
        >
          <svg
            className="w-5 h-5 text-base00"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              opacity: 1,
              transition: 'none',
              transform: 'translate3d(0,0,0)',
              WebkitTransform: 'translate3d(0,0,0)'
            }}
          >
            {getThemeIcon()}
          </svg>
        </button>

        {/* Hover Hint */}
        <span className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-base0D text-base00 text-[10px] font-bold uppercase tracking-widest rounded transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl border border-base00/10 ${showTooltip ? 'opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0' : 'opacity-0'}`}>
          {mounted ? theme : 'auto'}
        </span>
      </div>
      {bp.hasKeyboard && (
        <span className="text-[10px] font-mono text-base04 opacity-50 mt-1 pointer-events-none">(t)</span>
      )}
    </div>
  );
}