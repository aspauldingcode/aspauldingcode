'use client';

import { usePathname } from 'next/navigation';
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