'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
  effectiveTheme: 'light' | 'dark'; // The actual theme being applied (resolved from auto)
  setDimmed: (dimmed: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getBrowserPreference(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}



function applyTheme(theme: Theme, dimmed: boolean = false) {
  if (typeof window === 'undefined') return 'dark';

  let effectiveTheme: 'light' | 'dark';

  if (theme === 'auto') {
    effectiveTheme = getBrowserPreference();
  } else {
    effectiveTheme = theme;
  }

  const root = document.documentElement;
  root.classList.toggle('dark', effectiveTheme === 'dark');
  root.style.colorScheme = effectiveTheme;

  // Update CSS variables for cross-component synchronization
  root.style.setProperty('--current-theme', effectiveTheme);

  // Dynamically update theme-color meta tag for WebKit UI reload
  // If dimmed, we use a darker version of the theme color to match overlays
  let targetColor;
  if (dimmed) {
    targetColor = effectiveTheme === 'dark' ? '#000000' : '#7f7d76';
  } else {
    targetColor = effectiveTheme === 'dark' ? '#181818' : '#fefbec';
  }

  // Robust update: find or create a single theme-color tag and update it.
  // This avoids deleting nodes which Can break React's reconciliation.
  if (typeof document !== 'undefined') {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', targetColor);
  }

  return effectiveTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('auto'); // Always start with 'auto' for hydration safety
  const [mounted, setMounted] = useState(false);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');
  const [dimRequests, setDimRequests] = useState(0);

  useEffect(() => {
    setMounted(true);

    // Load theme from localStorage on mount (client-side only)
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      const isDimmed = dimRequests > 0;
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setTheme(savedTheme);
        const effective = applyTheme(savedTheme, isDimmed);
        setEffectiveTheme(effective);
      } else {
        // Default to auto if no saved theme
        setTheme('auto');
        const effective = applyTheme('auto', isDimmed);
        setEffectiveTheme(effective);
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const isDimmed = dimRequests > 0;
    const updateEffectiveTheme = () => {
      const effective = applyTheme(theme, isDimmed);
      setEffectiveTheme(effective);
    };

    updateEffectiveTheme();

    // Listen for browser preference changes when in auto mode
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const effective = applyTheme(theme, isDimmed);
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

  const setDimmed = (dimmed: boolean) => {
    setDimRequests(prev => Math.max(0, dimmed ? prev + 1 : prev - 1));
  };

  // Update theme whenever dimRequests changes
  useEffect(() => {
    if (mounted) {
      applyTheme(theme, dimRequests > 0);
    }
  }, [dimRequests, theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted, effectiveTheme, setDimmed }}>
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