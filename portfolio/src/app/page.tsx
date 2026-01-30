"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import ContactForm from './components/ContactForm';
import ResumeViewer from './components/ResumeViewer';
import { emailConfig } from '@/config/email';
import { projects } from './projects/projectData';
import { useSession } from './context/SessionContext';

export default function Home() {
  const router = useRouter();

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const { resumeBase64 } = useSession();

  // Project Images Pre-loading
  useEffect(() => {
    // Delay pre-loading to prioritize initial landing page performance
    const timer = setTimeout(() => {
      console.log('Starting background pre-loading of project images...');

      // Pre-load project images
      projects.forEach(project => {
        project.images.forEach(imageUrl => {
          const img = new window.Image();
          img.src = imageUrl;
        });
      });

      // Pre-fetch GitHub stars to ensure sorted order is ready
      const repos = projects.filter(p => p.githubRepo).map(p => p.githubRepo!);
      if (repos.length > 0) {
        console.log('Pre-fetching GitHub stars...');
        fetch(`/api/github-stars?repos=${encodeURIComponent(repos.join(','))}`).catch(err => {
          console.error('Failed to pre-fetch GitHub stars:', err);
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const [isPending, setIsPending] = useState(false);

  // Centralized, robust handler for all home page actions
  const handleAction = (action: () => void) => {
    if (isPending) return;
    setIsPending(true);

    // Consistent delay to allow button animations into the 'pressed' state
    setTimeout(() => {
      action();

      // Cooldown to prevent accidental double-taps on the same button
      setTimeout(() => setIsPending(false), 400);
    }, 200);
  };

  const handleContactClick = () => handleAction(() => setIsContactOpen(true));
  const handleResumeClick = () => handleAction(() => setIsResumeOpen(true));
  const handleProjectsClick = () => handleAction(() => router.push('/projects'));

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea is focused or modifiers are used
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'p') handleProjectsClick();
      if (key === 'r') handleResumeClick();
      if (key === 'c') handleContactClick();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, isPending]); // Added isPending to dependencies for safety

  return (
    <main className="fixed inset-0 min-h-[100dvh] min-h-[100svh] flex flex-col items-center justify-center bg-base00 overflow-hidden touch-none">
      <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-8
                h-600:py-4
                h-550:py-3
                h-500:py-2
                h-452:py-2
                h-400:py-2
                h-350:py-1.5
                h-320:py-1
                h-280:py-1">
        {/* Profile and Title Section - Responsive layout based on actual viewport overflow */}
        <div className="flex-shrink-0 mb-4 sm:mb-6 w-full max-w-2xl
            h-600:mb-3 h-600:sm:mb-4
            h-550:mb-2 h-550:sm:mb-3
            h-500:mb-2 h-500:sm:mb-3
            h-452:mb-2 h-452:sm:mb-2
            h-400:mb-1 h-400:sm:mb-2
            h-350:mb-1 h-350:sm:mb-1
            h-320:mb-1 h-320:sm:mb-1
            h-280:mb-1">
          {/* Use flex-row layout only when content would actually overflow viewport */}
          <div className="flex items-center 
            flex-col 
            h-452:flex-row h-452:justify-start h-452:gap-6
            wide-short:items-center wide-short:gap-4">
            {/* Profile Image - Enhanced Flexbox scaling with upstream logic */}
            <div className="flex-shrink-0 mb-2 h-452:mb-0
                h-600:mb-2
                h-550:mb-1
                h-500:mb-1
                h-400:mb-1
                h-350:mb-1
                h-320:mb-1
                h-280:mb-1
                mb-4 sm:mb-6 md:mb-8 lg:mb-10 xl:mb-12
                h-600:mb-2 h-600:sm:mb-3 h-600:md:mb-4
                h-550:mb-2 h-550:sm:mb-2 h-550:md:mb-3
                h-500:mb-2 h-500:sm:mb-2 h-500:md:mb-2
                h-452:mb-1.5 h-452:sm:mb-2 h-452:md:mb-2
                h-400:mb-1.5 h-400:sm:mb-1.5 h-400:md:mb-2
                h-350:mb-1 h-350:sm:mb-1 h-350:md:mb-1.5
                h-320:mb-1 h-320:sm:mb-1 h-320:md:mb-1
                h-280:mb-1 h-280:sm:mb-1 h-280:md:mb-1
                wide-short:mb-3 wide-short:sm:mb-4">
              <div className="relative flex justify-center items-center min-h-0 min-w-0">
                {/* Large portrait image - shown with ample vertical space */}
                <Image
                  src="/profile_regular.jpg"
                  alt="Profile picture"
                  width={220}
                  height={293}
                  className="rounded-2xl border-4 border-base02 object-cover flex-shrink-0
                    w-28 h-36 sm:w-32 sm:h-40 md:w-40 md:h-52 lg:w-44 lg:h-56 xl:w-48 xl:h-64
                    tall-650:w-56 tall-650:h-72
                    tall:w-60 tall:h-80
                    h-600:w-40 h-600:h-52 h-600:lg:w-36 h-600:lg:h-48
                    h-550:w-36 h-550:h-48 h-550:lg:w-32 h-550:lg:h-44
                    h-500:w-32 h-500:h-44 h-500:lg:w-28 h-500:lg:h-40
                    h-452:w-28 h-452:h-40 h-452:lg:w-24 h-452:lg:h-36
                    h-400:w-24 h-400:h-36 h-400:lg:w-24 h-400:lg:h-36
                    h-350:w-24 h-350:h-36 h-350:lg:w-24 h-350:lg:h-36
                    h-320:w-24 h-320:h-36 h-320:lg:w-24 h-320:lg:h-36
                    h-280:w-24 h-280:h-36 h-280:lg:w-24 h-280:lg:h-36
                    hidden tall-600:block
                    max-w-full max-h-full"
                  priority
                />
                {/* Square image - shown when vertical space is limited */}
                <Image
                  src="/profile_square.jpg"
                  alt="Profile picture"
                  width={150}
                  height={150}
                  className="rounded-full border-4 border-base02 flex-shrink-0
                    w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 xl:w-48 xl:h-48
                    tall-650:w-52 tall-650:h-52
                    tall:w-56 tall:h-56
                    h-600:w-32 h-600:h-32 h-600:lg:w-36 h-600:lg:h-36
                    h-550:w-28 h-550:h-28 h-550:lg:w-32 h-550:lg:h-32
                    h-500:w-24 h-500:h-24 h-500:lg:w-28 h-500:lg:h-28
                    h-452:w-20 h-452:h-20 h-452:lg:w-24 h-452:lg:h-24
                    h-400:w-20 h-400:h-20 h-400:lg:w-20 h-400:lg:h-20
                    h-350:w-20 h-350:h-20 h-350:lg:w-20 h-350:lg:h-20
                    h-320:w-20 h-320:h-20 h-320:lg:w-20 h-320:lg:h-20
                    h-280:w-20 h-280:h-20 h-280:lg:w-20 h-280:lg:h-20
                    h-452:w-20 h-452:h-20 h-452:sm:w-24 h-452:sm:h-24
                    block tall-600:hidden
                    max-w-full max-h-full object-cover"
                  priority
                />
              </div>
            </div>

            {/* Title and Description */}
            <div className="flex-grow text-center h-452:text-left">
              <h1 className="font-bold text-base05 
                text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl
                h-600:text-xl h-600:sm:text-2xl h-600:md:text-3xl
                h-550:text-lg h-550:sm:text-xl h-550:md:text-2xl
                h-500:text-base h-500:sm:text-lg h-500:md:text-xl
                h-452:text-base h-452:sm:text-lg h-452:md:text-xl
                h-400:text-sm h-400:sm:text-base h-400:md:text-lg
                h-350:text-sm h-350:sm:text-base h-350:md:text-base
                h-320:text-xs h-320:sm:text-sm h-320:md:text-base
                h-280:text-xs h-280:sm:text-sm h-280:md:text-base
                mb-1 sm:mb-2 md:mb-4 h-452:mb-1 h-280:mb-1">
                Alex Spaulding
              </h1>
              <p className="text-base04 
                text-xs sm:text-sm md:text-lg lg:text-xl
                h-600:text-xs h-600:sm:text-sm h-600:md:text-base
                h-550:text-xs h-550:sm:text-xs h-550:md:text-sm
                h-500:text-xs h-500:sm:text-xs h-500:md:text-sm
                h-452:text-xs h-452:sm:text-xs h-452:md:text-sm
                h-400:text-xs h-400:sm:text-xs h-400:md:text-xs
                h-350:text-xs h-350:sm:text-xs h-350:md:text-xs
                h-320:text-xs h-320:sm:text-xs h-320:md:text-xs
                h-280:text-xs h-280:sm:text-xs h-280:md:text-xs
                max-w-xs sm:max-w-md md:max-w-2xl
                h-452:max-w-none h-280:max-w-none
                px-2 h-452:px-0 h-280:px-0">
                Computer Science student at Eastern Washington University currently exploring macOS reverse engineering and UI design tweaks.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons Section - Bootstrap-like responsive grid */}
        <div className="flex-shrink-0 w-full max-w-2xl mx-auto">
          {/* Grid container - adapts based on viewport constraints */}
          <div className="flex justify-evenly items-center 
            flex-col sm:flex-row
            h-452:flex-row
            wide-short:flex-row wide-short:items-center
            gap-6 sm:gap-10 md:gap-14 lg:gap-18 xl:gap-24
            h-600:gap-5 h-600:sm:gap-8 h-600:md:gap-10
            h-550:gap-4 h-550:sm:gap-7 h-550:md:gap-9
            h-500:gap-4 h-500:sm:gap-6 h-500:md:gap-8
            h-452:gap-3 h-452:sm:gap-5 h-452:md:gap-7
            h-400:gap-3 h-400:sm:gap-4 h-400:md:gap-6
            h-350:gap-2 h-350:sm:gap-3 h-350:md:gap-5
            h-320:gap-2 h-320:sm:gap-3 h-320:md:gap-4
            h-280:gap-2 h-280:sm:gap-2 h-280:md:gap-3
            wide-short:gap-4 wide-short:sm:gap-8 wide-short:md:gap-10
            h-280:gap-2 h-320:gap-2">

            {/* Projects Button */}
            <div className="transform rotate-0 sm:-rotate-1 hover:-rotate-1 sm:hover:rotate-0 active:rotate-0 transition-transform duration-300 
              w-full sm:w-auto sm:flex-1 sm:basis-0 sm:max-w-none
              h-452:flex-1 h-452:min-w-0 flex flex-col items-center gap-1">
              <motion.button
                onTap={handleProjectsClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex w-full justify-center rounded-lg shadow-lg items-center bg-base0D hover:bg-base0C transition-colors duration-300 text-base00 
                  px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 text-sm sm:text-base md:text-lg
                  h-600:px-3 h-600:py-2 h-600:text-xs
                  h-550:px-2 h-550:py-1.5 h-550:text-xs
                  h-500:px-2 h-500:py-1.5 h-500:text-xs
                  h-452:px-2 h-452:py-1 h-452:text-xs
                  h-400:px-2 h-400:py-1 h-400:text-xs
                  h-350:px-2 h-350:py-1 h-350:text-xs
                  h-320:px-2 h-320:py-1 h-320:text-xs
                  h-280:px-2 h-280:py-1 h-280:text-xs
                  wide-short:px-3 wide-short:py-2 wide-short:text-sm
                  space-x-2 h-280:space-x-1 h-320:space-x-1 h-452:space-x-1 wide-short:space-x-1
                  min-h-[40px] h-452:min-h-[36px] h-400:min-h-[32px] h-350:min-h-[28px] h-280:min-h-[24px]
                  touch-manipulation"
              >
                <span>Projects</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="flex-shrink-0 
                    w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6
                    h-600:w-3 h-600:h-3 h-600:sm:w-4 h-600:sm:h-4
                    h-550:w-3 h-550:h-3 h-550:sm:w-3 h-550:sm:h-3
                    h-500:w-3 h-500:h-3 h-500:sm:w-3 h-500:sm:h-3
                    h-452:w-3 h-452:h-3
                    h-400:w-2.5 h-400:h-2.5
                    h-350:w-2.5 h-350:h-2.5
                    h-320:w-2.5 h-320:h-2.5
                    h-280:w-2.5 h-280:h-2.5

                    wide-short:w-4 wide-short:h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </motion.button>
              <span className="text-[10px] font-mono opacity-50 text-base04 hidden sm:block">(p)</span>
            </div>

            {/* Resume Button */}
            <div className="transform rotate-0 sm:rotate-0.5 hover:rotate-0.5 sm:hover:rotate-0 active:rotate-0 transition-transform duration-300 
              w-full sm:w-auto sm:flex-1 sm:basis-0 sm:max-w-none
              h-452:flex-1 h-452:min-w-0 flex flex-col items-center gap-1">
              <motion.button
                onTap={handleResumeClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex w-full justify-center rounded-lg shadow-lg items-center bg-base0B hover:bg-base0A transition-colors duration-300 text-base00 
                  px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 text-sm sm:text-base md:text-lg
                  h-600:px-3 h-600:py-2 h-600:text-xs
                  h-550:px-2 h-550:py-1.5 h-550:text-xs
                  h-500:px-2 h-500:py-1.5 h-500:text-xs
                  h-452:px-2 h-452:py-1 h-452:text-xs
                  h-400:px-2 h-400:py-1 h-400:text-xs
                  h-350:px-2 h-350:py-1 h-350:text-xs
                  h-320:px-2 h-320:py-1 h-320:text-xs
                  h-280:px-2 h-280:py-1 h-280:text-xs
                  wide-short:px-3 wide-short:py-2 wide-short:text-sm
                  space-x-2 h-280:space-x-1 h-320:space-x-1 h-452:space-x-1 wide-short:space-x-1
                  min-h-[40px] h-452:min-h-[36px] h-400:min-h-[32px] h-350:min-h-[28px] h-280:min-h-[24px]
                  touch-manipulation"
              >
                <span>Resume</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="flex-shrink-0 
                    w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6
                    h-600:w-3 h-600:h-3
                    h-550:w-3 h-550:h-3
                    h-500:w-3 h-500:h-3
                    h-452:w-3 h-452:h-3
                    h-400:w-2.5 h-400:h-2.5
                    h-350:w-2.5 h-350:h-2.5
                    h-320:w-2.5 h-320:h-2.5
                    h-280:w-2.5 h-280:h-2.5

                    wide-short:w-4 wide-short:h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </motion.button>
              <span className="text-[10px] font-mono opacity-50 text-base04 hidden sm:block">(r)</span>
            </div>

            {/* Contact Button */}
            <div className="transform rotate-0 sm:rotate-1 hover:rotate-1 sm:hover:rotate-0 active:rotate-0 transition-transform duration-300 
              w-full sm:w-auto sm:flex-1 sm:basis-0 sm:max-w-none
              h-452:flex-1 h-452:min-w-0 flex flex-col items-center gap-1">
              <motion.button
                onTap={handleContactClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex w-full justify-center rounded-lg shadow-lg items-center bg-base0E hover:bg-base0F transition-colors duration-300 text-base00 
                  px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 text-sm sm:text-base md:text-lg
                  h-600:px-3 h-600:py-2 h-600:text-xs
                  h-550:px-2 h-550:py-1.5 h-550:text-xs
                  h-500:px-2 h-500:py-1.5 h-500:text-xs
                  h-452:px-2 h-452:py-1 h-452:text-xs
                  h-400:px-2 h-400:py-1 h-400:text-xs
                  h-350:px-2 h-350:py-1 h-350:text-xs
                  h-320:px-2 h-320:py-1 h-320:text-xs
                  h-280:px-2 h-280:py-1 h-280:text-xs
                  wide-short:px-3 wide-short:py-2 wide-short:text-sm
                  space-x-2 h-280:space-x-1 h-320:space-x-1 h-452:space-x-1 wide-short:space-x-1
                  min-h-[40px] h-452:min-h-[36px] h-400:min-h-[32px] h-350:min-h-[28px] h-280:min-h-[24px]
                  touch-manipulation"
              >
                <span>Contact</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="flex-shrink-0 
                    w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6
                    h-600:w-3 h-600:h-3
                    h-550:w-3 h-550:h-3
                    h-500:w-3 h-500:h-3
                    h-452:w-3 h-452:h-3
                    h-400:w-2.5 h-400:h-2.5
                    h-350:w-2.5 h-350:h-2.5
                    h-320:w-2.5 h-320:h-2.5
                    h-280:w-2.5 h-280:h-2.5
                    wide-short:w-4 wide-short:h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </motion.button>
              <span className="text-[10px] font-mono opacity-50 text-base04 hidden sm:block">(c)</span>
            </div>
          </div>
        </div>

        {/* Minimal spacer for very small screens - reduced when using horizontal layout */}
        <div className="flex-shrink-0 h-2 sm:h-4 md:h-6
            h-600:h-2 h-600:sm:h-3 h-600:md:h-4
            h-550:h-2 h-550:sm:h-2 h-550:md:h-3
            h-500:h-2 h-500:sm:h-2 h-500:md:h-2
            h-452:h-1.5 h-452:sm:h-2 h-452:md:h-2
            h-400:h-1.5 h-400:sm:h-1.5 h-400:md:h-2
            h-350:h-1 h-350:sm:h-1 h-350:md:h-1.5
            h-320:h-1 h-320:sm:h-1 h-320:md:h-1
            h-280:h-1 h-280:sm:h-1 h-280:md:h-1
            wide-short:h-3 wide-short:sm:h-4"></div>
      </div>

      <AnimatePresence>
        {isContactOpen && (
          <ContactForm
            key="contact-form"
            isOpen={isContactOpen}
            onClose={() => setIsContactOpen(false)}
            emailConfig={emailConfig}
          />
        )}
        {isResumeOpen && (
          <ResumeViewer
            key="resume-viewer"
            onCheckClose={() => setIsResumeOpen(false)}
            cachedResume={resumeBase64}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
