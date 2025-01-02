"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import PageTransition from './components/PageTransition';
import ContactForm from './components/ContactForm';
import { emailConfig } from '@/config/email';

export default function Home() {
  const [isContactOpen, setIsContactOpen] = useState(false);

  const handleContactClick = () => {
    setIsContactOpen(true);
    // Smooth scroll to bottom of page
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col items-center justify-center p-8 sm:p-24 bg-base00">
        <div className="relative">
          <Image
            src="/profile.png"
            alt="Profile picture"
            width={200}
            height={200}
            className="rounded-full border-4 border-base02"
            priority
          />
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold text-base05 mt-8 text-center">
          Alex Spaulding
        </h1>
        <p className="text-xl text-base04 mt-4 max-w-2xl text-center">
          With a strong foundation in programming and data analysis, I&apos;m eager to contribute to innovative ML projects.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link href="/projects">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-base0D text-base00 rounded-lg hover:bg-base0C transition-colors"
            >
              View Projects
            </motion.button>
          </Link>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleContactClick}
            className="px-8 py-3 bg-base03 text-base05 rounded-lg hover:bg-base04 transition-colors"
          >
            Contact Me
          </motion.button>
        </div>

        <ContactForm 
          isOpen={isContactOpen} 
          onClose={() => setIsContactOpen(false)} 
          emailConfig={emailConfig}
        />
      </main>
    </PageTransition>
  );
}
