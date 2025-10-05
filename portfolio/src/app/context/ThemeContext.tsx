'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const storedTheme = localStorage.getItem('theme') as Theme;
    if (storedTheme === 'light' || storedTheme === 'dark') {
      // Apply theme immediately to prevent flash
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
      return storedTheme;
    }
    // Apply default theme immediately
    document.documentElement.classList.add('dark');
    return 'dark';
  }
  return 'dark'; // Default for SSR
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set mounted immediately and only once
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only update DOM if theme actually changed and we're mounted
    if (mounted) {
      const isDark = theme === 'dark';
      const currentlyDark = document.documentElement.classList.contains('dark');
      if (isDark !== currentlyDark) {
        document.documentElement.classList.toggle('dark', isDark);
      }
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}