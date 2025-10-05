'use client';

import Link from 'next/link';
import { useTheme } from '../context/ThemeContext';
import { useEffect, useRef } from 'react';

export default function ProjectsHeader() {
  const { theme, toggleTheme, mounted } = useTheme();
  const themeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mounted && themeButtonRef.current) {
      themeButtonRef.current.style.opacity = '1';
    }
  }, [mounted]);

  return (
    <>
      {/* Consolidated Header Bar - Fixed position for small screens */}
      <div 
        className="fixed top-4 left-4 right-4 sm:top-5 sm:left-5 sm:right-5 lg:top-6 lg:left-6 lg:right-6 z-30 flex items-center justify-between"
        style={{
          transform: 'translate3d(0,0,0)', // Force hardware acceleration for mobile
          WebkitTransform: 'translate3d(0,0,0)', // Safari-specific
          position: 'fixed' // Ensure fixed positioning is explicit
        }}
      >
        {/* Back Button */}
        <Link 
          href="/" 
          className="p-3 rounded-lg bg-base0B hover:bg-base0A transition-all duration-300 shadow-lg active:scale-95"
          aria-label="Back to Home"
        >
          <svg
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="text-base00 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>

        {/* Theme Toggle Button */}
        <button
          ref={themeButtonRef}
          onClick={toggleTheme}
          className="p-3 rounded-lg bg-base0D hover:bg-base0C transition-all duration-300 shadow-lg active:scale-95"
          style={{ opacity: 0 }}
          aria-label={`Current: ${theme} mode`}
          title={`Current: ${theme} mode`}
        >
          {mounted && (
            <svg
              className="w-6 h-6 text-base00"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {theme === 'light' ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              ) : theme === 'dark' ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              ) : (
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
              )}
            </svg>
          )}
        </button>
      </div>

      {/* Minimal Title - Only visible on larger screens, positioned to not interfere */}
      {/* Removed duplicate "Projects" title since "My Projects" is already shown in the main content */}
    </>
  );
}