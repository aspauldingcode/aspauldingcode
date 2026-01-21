'use client';

import { motion } from 'framer-motion';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1]
      }}
      style={{
        transform: 'translateZ(0)', // Force hardware acceleration
        willChange: 'opacity, transform'
      }}
      className="w-full min-h-screen"
    >
      {children}
    </motion.div>
  );
}