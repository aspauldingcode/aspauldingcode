'use client';

import { ThemeProvider } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { AnimatePresence } from 'framer-motion';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AnimatePresence mode="wait">
        <ThemeToggle />
        {children}
      </AnimatePresence>
    </ThemeProvider>
  );
} 