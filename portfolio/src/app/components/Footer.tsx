'use client';

import { useTheme } from '../context/ThemeContext';
import { useEffect, useRef, useState } from 'react';

export default function Footer() {
  const { mounted } = useTheme();
  const currentYear = new Date().getFullYear();
  const copyrightYears =
    currentYear > 2024 ? `2024-${currentYear}` : '2024';

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!mounted) return;

    const checkOverflow = () => {
      if (!containerRef.current || !measureRef.current) return;

      // Use double requestAnimationFrame to ensure DOM has fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!containerRef.current || !measureRef.current) return;

          const containerWidth = containerRef.current.clientWidth;
          // Measure using hidden element that's always in unwrapped state
          const textWidth = measureRef.current.scrollWidth;
          
          // Scroll if text can't fit on a single line (not enough width to read it all)
          const needsScroll = textWidth > containerWidth;
          
          // Only update state if it actually changed to prevent unnecessary re-renders
          setShouldScroll(prev => prev !== needsScroll ? needsScroll : prev);
        });
      });
    };

    // Check immediately after a brief delay to ensure refs are set
    const initialTimeout = setTimeout(checkOverflow, 0);
    
    // Watch for window resize
    window.addEventListener('resize', checkOverflow);
    
    // Use ResizeObserver to watch for container size changes
    let resizeObserver: ResizeObserver | null = null;
    const setupObserver = () => {
      if (containerRef.current && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(checkOverflow);
        resizeObserver.observe(containerRef.current);
      }
    };
    
    // Setup observer after a brief delay to ensure ref is available
    const observerTimeout = setTimeout(setupObserver, 0);
    
    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(observerTimeout);
      window.removeEventListener('resize', checkOverflow);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [mounted, copyrightYears]);

  /* ------------------------------------------------------------
   * JavaScript-based continuous scroll animation
   * This prevents the visible snap when CSS animation loops
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!shouldScroll || !textRef.current || !measureRef.current) {
      // Stop animation and reset when scrolling is disabled
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (textRef.current) {
        textRef.current.style.transform = '';
      }
      scrollPositionRef.current = 0;
      return;
    }

    const el = textRef.current;
    const scrollSpeed = 30; // pixels per second
    let lastTime = performance.now();
    let resetWidth = 0;

    // Measure the width of first copy + separator for seamless reset
    const measureResetWidth = () => {
      if (!el.firstElementChild) {
        // Fallback: use half of total width (since we have 2 copies)
        return el.scrollWidth / 2;
      }
      // Measure first <p> + separator
      const firstChild = el.firstElementChild as HTMLElement;
      const separator = firstChild.nextElementSibling as HTMLElement;
      return firstChild.offsetWidth + (separator?.offsetWidth || 0);
    };

    const animate = (currentTime: number) => {
      if (!textRef.current || isPausedRef.current) {
        lastTime = currentTime;
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Measure width on first frame and periodically
      if (resetWidth === 0 || Math.abs(currentTime - lastTime) > 1000) {
        resetWidth = measureResetWidth();
      }

      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Update scroll position
      scrollPositionRef.current -= scrollSpeed * deltaTime;

      // When we've scrolled exactly one copy width, reset seamlessly
      // This happens when scrollPosition reaches -resetWidth
      if (resetWidth > 0 && scrollPositionRef.current <= -resetWidth) {
        scrollPositionRef.current += resetWidth;
      }

      // Apply transform
      el.style.transform = `translateX(${scrollPositionRef.current}px)`;
      el.style.willChange = 'transform';

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    scrollPositionRef.current = 0;
    isPausedRef.current = false;
    lastTime = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [shouldScroll]);


  /* ------------------------------------------------------------
   * Pause / resume (freeze transform)
   * ------------------------------------------------------------ */
  const pauseScroll = () => {
    if (!shouldScroll) return;
    isPausedRef.current = true;
  };

  const resumeScroll = () => {
    if (!shouldScroll) return;
    isPausedRef.current = false;
  };

  /* ------------------------------------------------------------
   * Footer content
   * ------------------------------------------------------------ */
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
        open source on{' '}
        <a
          href="https://github.com/aspauldingcode/aspauldingcode"
          target="_blank"
          rel="noopener noreferrer"
          className="text-base0D hover:text-base0C transition-colors"
        >
          GitHub
        </a>
      </span>

      <span className="whitespace-pre"> • </span>

      <span className="whitespace-pre">
        Deployed with{' '}
        <a
          href="https://vercel.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-base0D hover:text-base0C transition-colors"
        >
          Vercel
        </a>
      </span>

      <span className="whitespace-pre"> • </span>

      <span className="whitespace-pre">
        Hosted with{' '}
        <a
          href="https://hostinger.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-base0D hover:text-base0C transition-colors"
        >
          Hostinger
        </a>
      </span>

      <span className="whitespace-pre"> • </span>

      <span className="whitespace-pre">
        Connect on{' '}
        <a
          href="https://www.linkedin.com/in/aspauldingcode/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-base0D hover:text-base0C transition-colors"
        >
          LinkedIn
        </a>
      </span>

      <span className="whitespace-pre"> • </span>

      <span className="whitespace-pre">
        Follow me on{' '}
        <a
          href="https://x.com/aspauldingcode"
          target="_blank"
          rel="noopener noreferrer"
          className="text-base0D hover:text-base0C transition-colors"
        >
          X
          </a>
        </span>
    </>
  );

  /* ------------------------------------------------------------
   * Render
   * ------------------------------------------------------------ */
  return (
    <>
      <footer
        className="fixed bottom-0 left-0 w-full py-1 sm:py-2 text-center text-base04 text-[10px] xs:text-xs sm:text-xs bg-base00/80 backdrop-blur-sm z-10 border-t border-base02 transition-opacity duration-300 overflow-hidden"
        style={{
          opacity: mounted ? 1 : 0,
          transform: 'translate3d(0,0,0)',
          WebkitTransform: 'translate3d(0,0,0)',
        }}
      >
        {mounted && (
          <>
            {/* Hidden measurement element - always unwrapped for accurate width measurement */}
            <div
              ref={measureRef}
              className="absolute top-0 left-0 opacity-0 pointer-events-none flex whitespace-nowrap"
              aria-hidden="true"
              style={{ visibility: 'hidden', position: 'absolute' }}
            >
              <p className="px-2 leading-tight inline-flex">{footerText}</p>
            </div>
            <div
              ref={containerRef}
              className="relative w-full h-5 overflow-hidden"
              onMouseEnter={pauseScroll}
              onMouseLeave={resumeScroll}
              onTouchStart={pauseScroll}
              onTouchEnd={resumeScroll}
            >
              <div
                ref={textRef}
                className={`flex ${shouldScroll
                  ? 'whitespace-nowrap billboard-scroll'
                  : 'justify-center flex-wrap'
                  }`}
              >
                <p className="px-2 leading-tight inline-flex">{footerText}</p>

                {shouldScroll && (
                  <>
                    <span className="whitespace-pre inline-flex" aria-label="Loop to start">{'→ '}</span>
                    <p
                      className="pl-0 pr-2 leading-tight inline-flex"
                      aria-hidden="true"
                    >
                      {footerText}
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </footer>

      <style jsx global>{`
        .billboard-scroll {
          will-change: transform;
          user-select: none;
        }
      `}</style>
    </>
  );
}
