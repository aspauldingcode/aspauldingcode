'use client';

import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function Footer() {
  const { mounted } = useTheme();
  const currentYear = new Date().getFullYear();
  const copyrightYears = currentYear > 2024 ? `2024-${currentYear}` : '2024';

  if (!mounted) return null;

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="fixed bottom-0 left-0 w-full py-2 text-center text-base04 text-xs bg-base00/80 backdrop-blur-sm z-10"
    >
      <p>
        © {copyrightYears} Alex Spaulding{' • '}
        Proudly written with{' '}
        <a 
          href="https://nextjs.org" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-base0D hover:text-base0C transition-colors"
        >
          Next.js
        </a>
        {' '}and open source at{' '}
        <a 
          href="https://github.com/aspauldingcode/aspauldingcode" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-base0D hover:text-base0C transition-colors"
        >
          @aspauldingcode
        </a>
      </p>
    </motion.footer>
  );
} 