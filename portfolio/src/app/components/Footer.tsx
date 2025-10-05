'use client';

import { useTheme } from '../context/ThemeContext';
import { useEffect, useRef } from 'react';

export default function Footer() {
  const { mounted } = useTheme();
  const footerRef = useRef<HTMLElement>(null);
  const currentYear = new Date().getFullYear();
  const copyrightYears = currentYear > 2024 ? `2024-${currentYear}` : '2024';

  useEffect(() => {
    if (mounted && footerRef.current) {
      // Remove any placeholder styles and show the real footer
      const placeholders = document.querySelectorAll('.footer-placeholder');
      placeholders.forEach(placeholder => placeholder.remove());
      
      footerRef.current.style.opacity = '1';
    }
  }, [mounted]);

  return (
    <footer
      ref={footerRef}
      className="fixed bottom-0 left-0 w-full py-1 sm:py-2 text-center text-base04 text-[10px] xs:text-xs sm:text-xs bg-base00/80 backdrop-blur-sm z-10 border-t border-base02 transition-opacity duration-300"
      style={{ zIndex: 10, opacity: 0 }} // Ensure footer stays below contact form (z-50)
    >
      {mounted && (
        <p className="px-2 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
          <span>© {copyrightYears} Alex Spaulding</span>
          <span> • </span>
          <span>
            Proudly written with{' '}
            <a 
              href="https://nextjs.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-base0D hover:text-base0C transition-colors"
            >
              Next.js
            </a>
          </span>
          <span> and </span>
          <span>
            open source at{' '}
            <a 
              href="https://github.com/aspauldingcode/aspauldingcode" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-base0D hover:text-base0C transition-colors"
            >
              GitHub
            </a>
          </span>
        </p>
      )}
    </footer>
  );
}