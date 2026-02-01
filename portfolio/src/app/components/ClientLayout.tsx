'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import GlobalShortcuts from './GlobalShortcuts';
import PageTransition from './PageTransition';
import ThemeToggle from './ThemeToggle';
import Footer from './Footer';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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
      <GlobalShortcuts />
      <PageTransition key={pathname}>
        {children}
      </PageTransition>
      <ThemeToggle />
      <Footer />
    </ThemeProvider>
  );
}