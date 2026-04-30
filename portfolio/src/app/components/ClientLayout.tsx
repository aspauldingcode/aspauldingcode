'use client';

import { usePathname } from 'next/navigation';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import GlobalShortcuts from './GlobalShortcuts';
import PageTransition from './PageTransition';
import ThemeToggle from './ThemeToggle';
import Footer from './Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

function ThemeWipe() {
  const { theme, mounted } = useTheme();
  const [showWipe, setShowWipe] = useState(false);
  const [prevTheme, setPrevTheme] = useState(theme);

  useEffect(() => {
    if (mounted && theme !== prevTheme) {
      setShowWipe(true);
      setPrevTheme(theme);
      const timer = setTimeout(() => setShowWipe(false), 800);
      return () => clearTimeout(timer);
    }
  }, [theme, prevTheme, mounted]);

  return (
    <AnimatePresence>
      {showWipe && (
        <div className="fixed inset-0 z-[300] pointer-events-none overflow-hidden">
          {/* Main Wipe - Parallelogram */}
          <motion.div
            initial={{ x: '-120%', skewX: -25 }}
            animate={{ x: '120%', skewX: -25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-0 w-[150%] bg-base09 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
          >
             {/* Halftone Texture on Wipe */}
             <div className="absolute inset-0 halftone-bg opacity-20" />
          </motion.div>
          
          {/* Secondary Wipe - Red Accent */}
          <motion.div
            initial={{ x: '-130%', skewX: -25 }}
            animate={{ x: '130%', skewX: -25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            className="absolute inset-y-0 w-[150%] bg-base08 opacity-80"
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
    // Cleanup on unmount or path change (already handled by else, but good safety)
    return () => {
      document.body.classList.remove('homepage-lock');
      document.documentElement.classList.remove('homepage-lock');
    };
  }, [pathname]);

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