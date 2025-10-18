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
  const [theme, setTheme] = useState<Theme>('auto'); // Always start with 'auto' for hydration safety
  const [mounted, setMounted] = useState(false);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    setMounted(true);
    
    // Load theme from localStorage on mount (client-side only)
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setTheme(savedTheme);
        const effective = applyTheme(savedTheme);
        setEffectiveTheme(effective);
      } else {
        // Default to auto if no saved theme
        setTheme('auto');
        const effective = applyTheme('auto');
        setEffectiveTheme(effective);
      }
    }
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
      
      // Use both addEventListener and addListener for better Safari compatibility
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
      }
      
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange);
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(handleChange);
        }
      };
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const themeOrder: Theme[] = ['light', 'dark', 'auto'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    
    setTheme(nextTheme);
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', nextTheme);
    }
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