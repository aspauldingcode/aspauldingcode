// import { RefObject } from 'react';

interface BlurStyles {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  filter: string;
  position: 'relative';
  overflow: 'hidden';
}

interface BackdropStyles {
  backdropFilter: string;
  WebkitBackdropFilter: string;
  backgroundColor: string;
  position: 'relative';
  overflow: 'hidden';
}

// Helper function to detect current theme
function getCurrentTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

// Simple blur hook with theme-aware fallback
export function useRealBlur(/*_elementRef: RefObject<HTMLDivElement | null>*/): BlurStyles {
  const isDark = getCurrentTheme() === 'dark';
  
  return {
    backgroundImage: isDark 
      ? 'linear-gradient(135deg, rgb(45, 45, 45) 0%, rgb(52, 50, 48) 50%, rgb(38, 38, 38) 100%)'
      : 'linear-gradient(135deg, rgb(245, 242, 227) 0%, rgb(213, 210, 195) 50%, rgb(181, 178, 163) 100%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    filter: isDark ? 'blur(8px) brightness(1.1)' : 'blur(6px) brightness(0.95)',
    position: 'relative',
    overflow: 'hidden'
  };
}

// Backdrop blur with theme awareness
export function useBackdropBlur(/*_elementRef: RefObject<HTMLDivElement | null>*/): BackdropStyles {
  const isDark = getCurrentTheme() === 'dark';
  
  return {
    backdropFilter: isDark 
      ? 'blur(35px) brightness(1.4) saturate(2.5) contrast(1.3)'
      : 'blur(25px) brightness(0.9) saturate(1.3) contrast(1.0)',
    WebkitBackdropFilter: isDark 
      ? 'blur(35px) brightness(1.4) saturate(2.5) contrast(1.3)'
      : 'blur(25px) brightness(0.9) saturate(1.3) contrast(1.0)',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.08)',
    position: 'relative',
    overflow: 'hidden'
  };
}

// Legacy hook for compatibility
export function useAdvancedOpaqueBlur(/*elementRef: RefObject<HTMLDivElement | null>*/): BlurStyles {
  return useRealBlur(/*elementRef*/);
}

// Basic fallback hook
export function useOpaqueBlur() {
  const isDark = getCurrentTheme() === 'dark';
  
  return {
    background: isDark
      ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.8) 0%, rgba(52, 50, 48, 0.8) 50%, rgba(38, 38, 38, 0.8) 100%), rgba(24, 24, 24, 0.15)'
      : 'linear-gradient(135deg, rgba(245, 242, 227, 0.8) 0%, rgba(213, 210, 195, 0.8) 50%, rgba(181, 178, 163, 0.8) 100%), rgba(254, 251, 236, 0.15)',
    position: 'relative' as const,
    overflow: 'hidden' as const
  };
}