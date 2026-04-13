'use client';

import { motion } from 'framer-motion';

export default function PageTransition({
  children,
  reduced = false,
}: {
  children: React.ReactNode;
  reduced?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0.15 : 0.22,
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