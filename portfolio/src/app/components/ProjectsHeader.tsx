'use client';

import Link from 'next/link';

interface ProjectsHeaderProps {
  onViewLiked?: () => void;
  onBackToStack?: () => void;
  likedCount?: number;
  showingLiked?: boolean;
}

export default function ProjectsHeader({
  onViewLiked,
  onBackToStack,
  likedCount = 0,
  showingLiked = false
}: ProjectsHeaderProps) {
  // Simplified: no scroll-based opacity changes to avoid useEffect

  return (
    <>
      {/* Fixed Header Bar with Navigation and Title */}
      <div
        className="fixed top-4 left-4 right-4 sm:top-5 sm:left-5 sm:right-5 lg:top-6 lg:left-6 lg:right-6 z-30 flex items-center justify-between pr-12 sm:pr-14 lg:pr-16"
        style={{
          transform: 'translate3d(0,0,0)', // Force hardware acceleration for mobile
          WebkitTransform: 'translate3d(0,0,0)', // Safari-specific
          position: 'fixed' // Ensure fixed positioning is explicit
        }}
      >
        {/* Back Button */}
        <Link
          href="/"
          className="p-2 rounded-lg bg-base0B hover:bg-base0A transition-all duration-300 shadow-lg active:scale-95 touch-manipulation relative group"
          aria-label="Back to Home"
        >
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            className="text-base00 w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5"
            />
          </svg>
          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[10px] font-mono opacity-50 text-base04 bg-base01/80 px-1 rounded pointer-events-none hidden sm:block whitespace-nowrap z-50">
            (h)
          </span>
        </Link>

        <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-base05 whitespace-nowrap pointer-events-auto leading-none">
            Alex&apos;s Projects
          </h1>
          <p className="text-[10px] sm:text-xs text-base04 mt-1 opacity-70 font-mono hidden sm:block leading-none">
            Swipe Right to Like • Swipe Left to Pass
          </p>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          {/* Navigation buttons */}
          {showingLiked ? (
            <button
              onClick={onBackToStack}
              className="p-2 rounded-lg bg-base0E hover:bg-base0F transition-all duration-300 shadow-lg active:scale-95 touch-manipulation group relative"
              aria-label="Back to card stack"
              title="Back to card stack"
            >
              <svg
                className="w-5 h-5 text-base00"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[10px] font-mono opacity-50 text-base04 bg-base01/80 px-1 rounded pointer-events-none hidden sm:block whitespace-nowrap z-50">
                (b)
              </span>
            </button>
          ) : (
            likedCount > 0 && (
              <button
                onClick={onViewLiked}
                className="p-2 rounded-lg bg-base0C hover:bg-base0D transition-all duration-300 shadow-lg active:scale-95 relative touch-manipulation group"
                aria-label={`View liked projects (${likedCount})`}
                title={`View liked projects (${likedCount})`}
              >
                <svg
                  className="w-5 h-5 text-base00"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {likedCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-base08 text-base00 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {likedCount}
                  </span>
                )}
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[10px] font-mono opacity-50 text-base04 bg-base01/80 px-1 rounded pointer-events-none hidden sm:block whitespace-nowrap z-50">
                  (f)
                </span>
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
}