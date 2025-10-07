import { useState, useEffect, RefObject, useCallback } from 'react';

interface BlurStyles {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  filter: string;
  position: 'relative';
  overflow: 'hidden';
}

// Helper function to get CSS variable value
function getCSSVariable(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Helper function to detect current theme
function getCurrentTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

// Helper function to extract colors from base16 theme
function getBase16Colors() {
  const theme = getCurrentTheme();
  return {
    base00: getCSSVariable('--base00'),
    base01: getCSSVariable('--base01'),
    base02: getCSSVariable('--base02'),
    base03: getCSSVariable('--base03'),
    base04: getCSSVariable('--base04'),
    base05: getCSSVariable('--base05'),
    base06: getCSSVariable('--base06'),
    base07: getCSSVariable('--base07'),
    base08: getCSSVariable('--base08'),
    base09: getCSSVariable('--base09'),
    base0A: getCSSVariable('--base0A'),
    base0B: getCSSVariable('--base0B'),
    base0C: getCSSVariable('--base0C'),
    base0D: getCSSVariable('--base0D'),
    base0E: getCSSVariable('--base0E'),
    base0F: getCSSVariable('--base0F'),
    theme
  };
}

export function useRealBlur(elementRef: RefObject<HTMLDivElement | null>): BlurStyles {
  const [blurStyles, setBlurStyles] = useState<BlurStyles>({
    backgroundImage: 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    filter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden'
  });

  const captureBackground = useCallback(async () => {
    if (!elementRef.current) return;

    const element = elementRef.current;
    const parentCard = element.closest('[data-card-container]') as HTMLElement;
    
    if (!parentCard) return;

    try {
      // Get the position of the parent card relative to the viewport
      // Note: parentRect calculated but not used in current implementation
      // const parentRect = parentCard.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // Create a canvas to capture what's behind the parent card
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Set canvas size to match the element size
      canvas.width = elementRect.width;
      canvas.height = elementRect.height;

      // Calculate the area behind the parent card
      // Note: These values are calculated but not used in current implementation
      // const x = parentRect.left;
      // const y = parentRect.top;
      // const width = parentRect.width;
      // const height = parentRect.height;

      // Temporarily hide the parent card to capture what's behind it
      const originalVisibility = parentCard.style.visibility;
      const originalPointerEvents = parentCard.style.pointerEvents;
      
      parentCard.style.visibility = 'hidden';
      parentCard.style.pointerEvents = 'none';

      // Wait a frame for the visibility change to take effect
      await new Promise(resolve => requestAnimationFrame(resolve));

      try {
        // Use html2canvas-like approach to capture the background
        // Note: These values are calculated but not used in current implementation
        // const bodyRect = document.body.getBoundingClientRect();
        // const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        // const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        // Get the computed background of the body or container behind the card
        const bodyStyle = window.getComputedStyle(document.body);
        const backgroundColor = bodyStyle.backgroundColor;
        // Note: backgroundImage is calculated but not used in current implementation
        // const backgroundImage = bodyStyle.backgroundImage;

        // Fill canvas with background color
        if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Create a data URL from the canvas
        const dataUrl = canvas.toDataURL('image/png');
        
        setBlurStyles({
          backgroundImage: `url(${dataUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(10px) brightness(1.1) saturate(1.2)',
          position: 'relative',
          overflow: 'hidden'
        });

      } catch (error) {
        console.warn('Failed to capture background, using fallback:', error);
        // Fallback to a simple gradient with blur
        setBlurStyles({
          backgroundImage: 'linear-gradient(135deg, rgb(45, 45, 45) 0%, rgb(52, 50, 48) 50%, rgb(38, 38, 38) 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(8px) brightness(1.1)',
          position: 'relative',
          overflow: 'hidden'
        });
      }

      // Restore the parent card visibility
      parentCard.style.visibility = originalVisibility;
      parentCard.style.pointerEvents = originalPointerEvents;

    } catch (error) {
      console.warn('Failed to capture background:', error);
      // Fallback styles
      setBlurStyles({
        backgroundImage: 'linear-gradient(135deg, rgb(45, 45, 45) 0%, rgb(52, 50, 48) 50%, rgb(38, 38, 38) 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'blur(8px) brightness(1.1)',
        position: 'relative',
        overflow: 'hidden'
      });
    }
  }, [elementRef]);

  useEffect(() => {
    if (!elementRef.current) return;

    // Initial capture
    captureBackground();

    // Update on resize and scroll
    const handleUpdate = () => {
      requestAnimationFrame(captureBackground);
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    // Also update when the card stack changes
    const observer = new MutationObserver(handleUpdate);
    const cardStack = elementRef.current.closest('.card-stack-container');
    if (cardStack) {
      observer.observe(cardStack, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      observer.disconnect();
    };
  }, [elementRef, captureBackground]);

  return blurStyles;
}

// Advanced backdrop blur that adapts to background content and base16 themes
export function useBackdropBlur(elementRef: RefObject<HTMLDivElement | null>) {
  const [adaptiveStyles, setAdaptiveStyles] = useState({
    backdropFilter: 'blur(35px) brightness(1.4) saturate(2.5) contrast(1.3)',
    WebkitBackdropFilter: 'blur(35px) brightness(1.4) saturate(2.5) contrast(1.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    position: 'relative' as const,
    overflow: 'hidden' as const
  });

  const analyzeBackground = useCallback(async () => {
    if (!elementRef.current) return;

    const element = elementRef.current;
    const parentCard = element.closest('[data-card-container]') as HTMLElement;
    
    if (!parentCard) return;

    try {
      // Get base16 colors for current theme
      const base16 = getBase16Colors();
      const isDark = base16.theme === 'dark';
      
      // Get the area behind the parent card
      const parentRect = parentCard.getBoundingClientRect();
      
      // Sample the background by temporarily hiding the card
      const originalVisibility = parentCard.style.visibility;
      const originalOpacity = parentCard.style.opacity;
      parentCard.style.visibility = 'hidden';
      parentCard.style.opacity = '0';
      
      // Wait for visibility change
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Sample multiple points behind the card to get color information
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = parentRect.width;
        canvas.height = parentRect.height;
        
        // Try to capture what's behind using html2canvas-like approach
        try {
          // Get computed styles of elements behind the card
          const bodyStyle = window.getComputedStyle(document.body);
          const backgroundColor = bodyStyle.backgroundColor;
          // Note: backgroundImage is calculated but not used in current implementation
          // const backgroundImage = bodyStyle.backgroundImage;
          
          // Enhanced color analysis with toned down light mode
           let brightness = isDark ? 1.6 : 0.9;
           let saturation = isDark ? 3.0 : 1.4;
           let contrast = isDark ? 1.4 : 1.0;
           let blurAmount = 35; // Increased base blur
           const backgroundOpacity = isDark ? 0.02 : 0.08;
          
          // Parse background colors and enhance vibrancy
          if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
            const rgbMatch = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
              const r = parseInt(rgbMatch[1]);
              const g = parseInt(rgbMatch[2]);
              const b = parseInt(rgbMatch[3]);
              
              // Calculate color temperature and vibrancy
              const perceivedBrightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
              const colorfulness = Math.sqrt((r - g) ** 2 + (g - b) ** 2 + (b - r) ** 2) / 255;
              
              // Adjust based on background characteristics
               if (isDark) {
                 // Dark theme adjustments - slightly more conservative for better base00 blending
                 brightness = 1.3 + (perceivedBrightness * 0.5); // Reduced from 1.4 + 0.6
                 saturation = 2.6 + (colorfulness * 1.3); // Reduced from 2.8 + 1.5
                 blurAmount = 38 + (perceivedBrightness * 12); // Reduced from 40 + 15
                 contrast = 1.25 + (colorfulness * 0.35); // Reduced from 1.3 + 0.4
               } else {
                 // Light theme adjustments - lighter for better base00 blending
                 brightness = 0.95; // Increased from 0.85 for lighter appearance
                 saturation = 1.1; // Reduced from 1.3 for more neutral tones
                 blurAmount = 28; // Keep blur amount consistent
                 contrast = 1.0; // Increased from 0.95 for better text contrast
               }
               
               // Enhance vibrancy uniformly but cap for better base00 blending
               if (isDark) {
                 saturation = Math.min(saturation * 1.2, 3.5); // Reduced multiplier and cap
                 brightness = Math.min(brightness * 1.05, 1.8); // Reduced multiplier and cap
               }
               // Light mode values are already set above - no need to override them again
            }
          }
          
          // Sample base16 accent colors to blend into the blur
          const accentColors = [base16.base08, base16.base09, base16.base0A, base16.base0B, base16.base0C, base16.base0D, base16.base0E];
          const randomAccent = accentColors[Math.floor(Math.random() * accentColors.length)];
          
          // Create a subtle color tint based on theme colors
          let tintColor = 'rgba(255, 255, 255, 0.03)';
          if (randomAccent) {
            const accentMatch = randomAccent.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (accentMatch) {
              const ar = parseInt(accentMatch[1]);
              const ag = parseInt(accentMatch[2]);
              const ab = parseInt(accentMatch[3]);
              tintColor = `rgba(${ar}, ${ag}, ${ab}, ${backgroundOpacity})`;
            }
          }
          
          setAdaptiveStyles({
            backdropFilter: `blur(${blurAmount}px) brightness(${brightness}) saturate(${saturation}) contrast(${contrast}) hue-rotate(${Math.random() * 10 - 5}deg)`,
            WebkitBackdropFilter: `blur(${blurAmount}px) brightness(${brightness}) saturate(${saturation}) contrast(${contrast}) hue-rotate(${Math.random() * 10 - 5}deg)`,
            backgroundColor: tintColor,
            position: 'relative' as const,
            overflow: 'hidden' as const
          });
          
        } catch (canvasError) {
           console.warn('Canvas sampling failed, using theme-based fallback:', canvasError);
           
           // Fallback with enhanced theme-based settings
           const brightness = isDark ? 1.4 : 0.95; // Slightly reduced for dark mode
           const saturation = isDark ? 2.8 : 1.1; // Slightly reduced for dark mode
           const contrast = isDark ? 1.3 : 1.0; // Slightly reduced for dark mode
           const blurAmount = isDark ? 38 : 28; // Slightly reduced for dark mode
           
           setAdaptiveStyles({
             backdropFilter: `blur(${blurAmount}px) brightness(${brightness}) saturate(${saturation}) contrast(${contrast})`,
             WebkitBackdropFilter: `blur(${blurAmount}px) brightness(${brightness}) saturate(${saturation}) contrast(${contrast})`,
             backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.04)',
             position: 'relative' as const,
             overflow: 'hidden' as const
           });
         }
      }
      
      // Restore card visibility
      parentCard.style.visibility = originalVisibility;
      parentCard.style.opacity = originalOpacity;
      
    } catch (error) {
      console.warn('Failed to analyze background:', error);
      
      // Enhanced fallback based on current theme
       const base16 = getBase16Colors();
       const isDark = base16.theme === 'dark';
       
       setAdaptiveStyles({
         backdropFilter: `blur(${isDark ? 40 : 25}px) brightness(${isDark ? 1.6 : 0.9}) saturate(${isDark ? 3.0 : 1.3}) contrast(${isDark ? 1.3 : 1.0})`,
         WebkitBackdropFilter: `blur(${isDark ? 40 : 25}px) brightness(${isDark ? 1.6 : 0.9}) saturate(${isDark ? 3.0 : 1.3}) contrast(${isDark ? 1.3 : 1.0})`,
         backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.08)',
         position: 'relative' as const,
         overflow: 'hidden' as const
       });
    }
  }, [elementRef]);

  useEffect(() => {
    if (!elementRef.current) return;

    // Initial analysis
    analyzeBackground();

    // Update on scroll and resize for dynamic adaptation
    const handleUpdate = () => {
      requestAnimationFrame(analyzeBackground);
    };

    // Listen for theme changes
    const handleThemeChange = () => {
      setTimeout(analyzeBackground, 100); // Small delay to ensure CSS variables are updated
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    
    // Listen for theme changes via mutation observer on document element
    const themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          handleThemeChange();
        }
      });
    });
    
    themeObserver.observe(document.documentElement, { attributes: true });

    // Also update when cards change
    const cardObserver = new MutationObserver(handleUpdate);
    const cardStack = elementRef.current.closest('.card-stack-container');
    if (cardStack) {
      cardObserver.observe(cardStack, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      themeObserver.disconnect();
      cardObserver.disconnect();
    };
  }, [elementRef, analyzeBackground]);

  return adaptiveStyles;
}

// Legacy hook for compatibility
export function useAdvancedOpaqueBlur(elementRef: RefObject<HTMLDivElement | null>) {
  return useRealBlur(elementRef);
}

// Basic fallback hook
export function useOpaqueBlur() {
  return {
    background: 'linear-gradient(135deg, rgba(45, 45, 45, 0.8) 0%, rgba(52, 50, 48, 0.8) 50%, rgba(38, 38, 38, 0.8) 100%), rgba(24, 24, 24, 0.15)',
    position: 'relative' as const,
    overflow: 'hidden' as const
  };
}