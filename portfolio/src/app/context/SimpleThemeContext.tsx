'use client';

import React, { createContext, useContext, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to get browser preference
function getBrowserPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Helper function to get initial theme
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'auto';
  return 'auto'; // Always use auto mode to prevent hydration issues
}

// Helper function to apply theme
function applyTheme(theme: Theme): 'light' | 'dark' {
  const effectiveTheme = theme === 'auto' ? getBrowserPreference() : theme;
  
  if (typeof window !== 'undefined') {
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    document.documentElement.style.colorScheme = effectiveTheme;
  }
  
  return effectiveTheme;
}

export function SimpleThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  // Simplified theme handling without useEffect
  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    const effective = applyTheme(newTheme);
    setEffectiveTheme(effective);
  };

  // Set mounted state and apply initial theme
  if (!mounted) {
    setMounted(true);
    const effective = applyTheme(theme);
    setEffectiveTheme(effective);
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme: handleSetTheme,
      effectiveTheme,
      mounted
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useSimpleTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useSimpleTheme must be used within a SimpleThemeProvider');
  }
  return context;
}