'use client';

import { useTheme } from '../context/ThemeContext';
import { useEffect, useRef, useState } from 'react';

export default function Footer() {
  const { mounted } = useTheme();
  const currentYear = new Date().getFullYear();
  const copyrightYears = currentYear > 2024 ? `2024-${currentYear}` : '2024';
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  // Check if text overflows container
  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current && mounted) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        setShouldScroll(textWidth > containerWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      window.removeEventListener('resize', checkOverflow);
    };
  }, [mounted]);

  const footerText = (
    <>
      <span className="whitespace-pre">© {copyrightYears} Alex Spaulding</span>
      <span className="whitespace-pre"> • </span>
      <span className="whitespace-pre">
        Proudly written with{' '}
        <a 
          href="https://nextjs.org" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-base0D hover:text-base0C transition-colors"
        >
          Next.js
        </a>
      </span>
      <span className="whitespace-pre"> and </span>
      <span className="whitespace-pre">
        open source at{' '}
        <a 
          href="https://github.com/aspauldingcode/aspauldingcode" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-base0D hover:text-base0C transition-colors"
        >
          GitHub
        </a>
      </span>
    </>
  );

  return (
    <>
      <footer
        className="fixed bottom-0 left-0 w-full py-1 sm:py-2 text-center text-base04 text-[10px] xs:text-xs sm:text-xs bg-base00/80 backdrop-blur-sm z-10 border-t border-base02 transition-opacity duration-300 overflow-hidden"
        style={{ 
          opacity: mounted ? 1 : 0,
          zIndex: 10, 
          transform: 'translate3d(0,0,0)', // Force hardware acceleration for mobile
          WebkitTransform: 'translate3d(0,0,0)' // Safari-specific
        }}
      >
        {mounted && (
          <div 
            ref={containerRef}
            className="relative w-full h-4 overflow-hidden"
          >
            {/* Scrolling container - only scrolls when shouldScroll is true */}
            <div 
              className={`flex whitespace-nowrap ${
                shouldScroll ? 'billboard-scroll animate-[billboard-scroll_15s_linear_infinite]' : 'justify-center'
              }`}
              ref={textRef}
            >
              <p className="px-2 leading-tight inline-flex">
                {footerText}
              </p>
              {/* Duplicate content for seamless looping */}
              {shouldScroll && (
                <p className="px-2 leading-tight inline-flex" aria-hidden="true">
                  {footerText}
                </p>
              )}
            </div>
          </div>
        )}
      </footer>
      
      {/* Billboard scrolling animation styles */}
      <style jsx global>{`
        @keyframes billboard-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .billboard-scroll:hover {
          animation-play-state: paused !important;
        }
      `}</style>
    </>
  );
}