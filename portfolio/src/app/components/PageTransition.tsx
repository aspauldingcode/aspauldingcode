'use client';

import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.33, 1, 0.68, 1]
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: [0.32, 0, 0.67, 0]
    }
  }
};

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      className="w-full min-h-screen"
    >
      {children}
    </motion.div>
  );
} 