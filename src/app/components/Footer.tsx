'use client';

import { useTheme } from '../context/ThemeContext';
import { useEffect, useRef, useState } from 'react';
import { useBreakpoints } from '@/hooks/useBreakpoints';

export default function Footer() {
  const { mounted } = useTheme();
  const bp = useBreakpoints();
  const shortViewport = bp.isMounted && bp.isH550;
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

      <span className="whitespace-pre"> • </span>

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
        className="fixed bottom-0 left-0 w-full z-[150] transition-opacity duration-300"
        style={{
          opacity: mounted ? 1 : 0,
        }}
      >
        {/* Persona Decorative Slant */}
        <div
          className={
            shortViewport
              ? 'absolute inset-0 bg-base00 border-t-2 border-base09 -skew-y-1 shadow-[0_-6px_12px_rgba(0,0,0,0.45)] overflow-hidden'
              : 'absolute inset-0 bg-base00 border-t-4 border-base09 -skew-y-1 shadow-[0_-8px_16px_rgba(0,0,0,0.5)] overflow-hidden'
          }
        >
          <div className="absolute inset-0 halftone-bg opacity-10" />
        </div>
        <div
          className={
            shortViewport
              ? 'absolute inset-x-0 bottom-0 h-[calc(0.45rem+var(--safe-bottom))] bg-base00'
              : 'absolute inset-x-0 bottom-0 h-[calc(0.75rem+var(--safe-bottom))] bg-base00'
          }
        />

        <div
          className={
            shortViewport
              ? 'relative pt-1.5 pb-[calc(0.4rem+var(--safe-bottom))] px-3 overflow-hidden'
              : 'relative pt-3 pb-[calc(0.75rem+var(--safe-bottom))] px-4 overflow-hidden'
          }
        >
          {mounted && (
            <>
              {/* Hidden measurement element */}
              <div
                ref={measureRef}
                className="absolute top-0 left-0 opacity-0 pointer-events-none flex whitespace-nowrap"
                aria-hidden="true"
                style={{ visibility: 'hidden', position: 'absolute' }}
              >
                <div
                  className={
                    shortViewport
                      ? 'px-4 flex items-center gap-4 text-[10px] font-black uppercase italic tracking-tighter'
                      : 'px-6 flex items-center gap-4 text-xs font-black uppercase italic tracking-tighter'
                  }
                >
                  {footerText}
                </div>
              </div>

              <div
                ref={containerRef}
                className={
                  shortViewport
                    ? 'relative w-full h-5 overflow-hidden flex items-center'
                    : 'relative w-full h-6 overflow-hidden flex items-center'
                }
                onMouseEnter={pauseScroll}
                onMouseLeave={resumeScroll}
                onTouchStart={pauseScroll}
                onTouchEnd={resumeScroll}
              >
                <div
                  ref={textRef}
                  className={`flex items-center gap-6 ${shouldScroll
                    ? 'whitespace-nowrap'
                    : 'justify-center w-full'
                    }`}
                >
                <div
                  className={
                    shortViewport
                      ? 'px-4 flex items-center gap-4 text-[10px] font-black uppercase italic tracking-tighter text-base05'
                      : 'px-6 flex items-center gap-6 text-xs font-black uppercase italic tracking-tighter text-base05'
                  }
                >
                  {footerText}
                </div>

                {shouldScroll && (
                  <>
                    <div className="text-base09 font-black skew-x-12 mx-4">{" >>> "}</div>
                    <div
                      className={
                        shortViewport
                          ? 'px-4 flex items-center gap-4 text-[10px] font-black uppercase italic tracking-tighter text-base05'
                          : 'px-6 flex items-center gap-6 text-xs font-black uppercase italic tracking-tighter text-base05'
                      }
                      aria-hidden="true"
                    >
                      {footerText}
                    </div>
                  </>
                )}
                </div>
              </div>
            </>
          )}
        </div>
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
