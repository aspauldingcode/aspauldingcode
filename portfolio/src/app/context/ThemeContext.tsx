'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
  effectiveTheme: 'light' | 'dark'; // The actual theme being applied (resolved from auto)
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getBrowserPreference(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function getInitialTheme(): Theme {
  // Always return 'auto' for SSR to prevent hydration mismatch
  return 'auto';
}

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return 'dark';
  
  let effectiveTheme: 'light' | 'dark';
  
  if (theme === 'auto') {
    effectiveTheme = getBrowserPreference();
  } else {
    effectiveTheme = theme;
  }
  
  document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
  return effectiveTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    setMounted(true);
    
    // Get stored theme after mounting to avoid hydration mismatch
    const storedTheme = localStorage.getItem('theme') as Theme;
    const actualTheme = (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'auto') 
      ? storedTheme 
      : 'auto';
    
    setTheme(actualTheme);
    
    // Apply initial theme
    const initial = applyTheme(actualTheme);
    setEffectiveTheme(initial);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const updateEffectiveTheme = () => {
      const effective = applyTheme(theme);
      setEffectiveTheme(effective);
    };

    updateEffectiveTheme();

    // Listen for browser preference changes when in auto mode
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const effective = applyTheme(theme);
        setEffectiveTheme(effective);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const themeOrder: Theme[] = ['light', 'dark', 'auto'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted, effectiveTheme }}>
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