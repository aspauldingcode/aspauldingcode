'use client';

import { useTheme } from '../context/ThemeContext';
import { useEffect, useRef } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mounted && buttonRef.current) {
      // Remove any placeholder styles and show the real button
      const placeholders = document.querySelectorAll('.theme-toggle-placeholder');
      placeholders.forEach(placeholder => placeholder.remove());
      
      buttonRef.current.style.opacity = '1';
    }
  }, [mounted]);

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className="fixed top-4 right-4 sm:top-5 sm:right-5 lg:top-6 lg:right-6 p-3 rounded-lg bg-base0D hover:bg-base0C transition-all duration-300 shadow-lg active:scale-95 z-30"
      style={{ opacity: 0 }}
      aria-label="Toggle theme"
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
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          )}
        </svg>
      )}
    </button>
  );
}