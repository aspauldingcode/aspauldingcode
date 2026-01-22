'use client';

import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

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
      className="fixed top-4 right-4 sm:top-5 sm:right-5 lg:top-6 lg:right-6 z-50 flex flex-col items-center"
      style={{
        transform: 'translate3d(0,0,0)',
        WebkitTransform: 'translate3d(0,0,0)'
      }}
    >
      <button
        onClick={toggleTheme}
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
      <span className="text-[10px] font-mono text-base04 opacity-50 mt-1 pointer-events-none">(t)</span>
    </div>
  );
}