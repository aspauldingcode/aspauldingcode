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
              className="px-6 py-3 bg-base0D hover:bg-base0E text-base00 rounded-lg shadow-lg transition-colors duration-300 flex items-center space-x-2"
            >
              <span>View Projects</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </motion.button>
          </Link>
          <motion.button
            onClick={() => window.open('/resume_alex_spaulding.pdf', '_blank')}
            className="px-6 py-3 bg-base0D hover:bg-base0E text-base00 rounded-lg shadow-lg transition-colors duration-300 flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Resume</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          </motion.button>
          <motion.button
            onClick={handleContactClick}
            className="px-6 py-3 bg-base0D hover:bg-base0E text-base00 rounded-lg shadow-lg transition-colors duration-300 flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Contact</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
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
