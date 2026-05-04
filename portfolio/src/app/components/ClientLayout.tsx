'use client';

import { usePathname } from 'next/navigation';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import GlobalShortcuts from './GlobalShortcuts';
import PageTransition from './PageTransition';
import ThemeToggle from './ThemeToggle';
import Footer from './Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

function ThemeWipe() {
  const { effectiveTheme, mounted } = useTheme();
  const [showWipe, setShowWipe] = useState(false);
  const [wipeVersion, setWipeVersion] = useState(0);
  const [wipeDirection, setWipeDirection] = useState<'left' | 'right' | 'up' | 'down'>('left');
  const prevEffectiveThemeRef = useRef<'light' | 'dark' | null>(null);
  const prevDirectionRef = useRef<'left' | 'right' | 'up' | 'down'>('left');
  const WIPE_DURATION_MS = 1300;

  const pickNextDirection = () => {
    const options: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'right', 'up', 'down'];
    const prev = prevDirectionRef.current;
    const nextPool = options.filter((option) => option !== prev);
    const next = nextPool[Math.floor(Math.random() * nextPool.length)] ?? 'left';
    prevDirectionRef.current = next;
    return next;
  };

  const getWipeMotion = (direction: 'left' | 'right' | 'up' | 'down') => {
    switch (direction) {
      case 'right':
        return {
          initial: { x: '140%', y: '0%', skewX: 25, skewY: 0 },
          animate: { x: '-140%', y: '0%', skewX: 25, skewY: 0 },
        };
      case 'up':
        return {
          initial: { x: '0%', y: '140%', skewX: 0, skewY: 12 },
          animate: { x: '0%', y: '-140%', skewX: 0, skewY: 12 },
        };
      case 'down':
        return {
          initial: { x: '0%', y: '-140%', skewX: 0, skewY: -12 },
          animate: { x: '0%', y: '140%', skewX: 0, skewY: -12 },
        };
      default:
        return {
          initial: { x: '-140%', y: '0%', skewX: -25, skewY: 0 },
          animate: { x: '140%', y: '0%', skewX: -25, skewY: 0 },
        };
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (!prevEffectiveThemeRef.current) {
      prevEffectiveThemeRef.current = effectiveTheme;
      return;
    }
    const runWipe = prevEffectiveThemeRef.current !== effectiveTheme;
    prevEffectiveThemeRef.current = effectiveTheme;
    if (!runWipe) return;

    // Force fresh mount each run so wipe can replay consistently.
    setShowWipe(false);
    let frameId = requestAnimationFrame(() => {
      setWipeDirection(pickNextDirection());
      setWipeVersion((version) => version + 1);
      setShowWipe(true);
    });
    const timer = setTimeout(() => setShowWipe(false), WIPE_DURATION_MS);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
  }, [effectiveTheme, mounted]);

  const motionConfig = getWipeMotion(wipeDirection);

  return (
    <AnimatePresence>
      {showWipe && (
        <div key={`theme-wipe-${wipeVersion}`} className="fixed inset-0 z-[1200] pointer-events-none overflow-hidden">
          {/* Main Wipe - Parallelogram */}
          <motion.div
            initial={motionConfig.initial}
            animate={motionConfig.animate}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -inset-1/3 w-[166%] h-[166%] bg-base09 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
          >
             {/* Halftone Texture on Wipe */}
             <div className="absolute inset-0 halftone-bg opacity-20" />
          </motion.div>
          
          {/* Secondary Wipe - Red Accent */}
          <motion.div
            initial={motionConfig.initial}
            animate={motionConfig.animate}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
            className="absolute -inset-1/3 w-[166%] h-[166%] bg-base08 opacity-80"
          />
        </div>
      )}
    </AnimatePresence>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reducedTransition = pathname === '/projects';

  useEffect(() => {
    if (pathname === '/') {
      document.body.classList.add('homepage-lock');
      document.documentElement.classList.add('homepage-lock');
    } else {
      document.body.classList.remove('homepage-lock');
      document.documentElement.classList.remove('homepage-lock');
    }
    return () => {
      document.body.classList.remove('homepage-lock');
      document.documentElement.classList.remove('homepage-lock');
    };
  }, [pathname]);

  // WebKit clip-path rotation fix:
  // After a device rotation, iOS Safari leaves polygon clip-path masks stale.
  // We add `clip-path-refresh` to :root, which triggers a 1ms CSS animation
  // on every clipped element, forcing the compositor to re-evaluate all polygons
  // with the new viewport dimensions. The class is removed after the animation
  // completes (~50ms), restoring normal rendering.
  useEffect(() => {
    let removeTimer: ReturnType<typeof setTimeout>;
    const refreshClipPaths = () => {
      // Wait for the browser to finish its rotation layout pass (~300ms),
      // then trigger the repaint animation.
      setTimeout(() => {
        const root = document.documentElement;
        root.classList.add('clip-path-refresh');
        removeTimer = setTimeout(() => root.classList.remove('clip-path-refresh'), 50);
      }, 350);
    };
    window.addEventListener('orientationchange', refreshClipPaths);
    try { screen.orientation.addEventListener('change', refreshClipPaths); } catch { /* older Safari */ }
    return () => {
      clearTimeout(removeTimer);
      window.removeEventListener('orientationchange', refreshClipPaths);
      try { screen.orientation.removeEventListener('change', refreshClipPaths); } catch { /* older Safari */ }
    };
  }, []);

  return (
    <ThemeProvider>
      <ThemeWipe />
      <GlobalShortcuts />
      <PageTransition key={pathname} reduced={reducedTransition}>
        {children}
      </PageTransition>
      <ThemeToggle />
      <Footer />
    </ThemeProvider>
  );
}