"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import ContactForm from './components/ContactForm';
import ResumeViewer from './components/ResumeViewer';
import { emailConfig } from '@/config/email';
import { projects } from './projects/projectData';
import { useSession } from './context/SessionContext';
import { useBreakpoints } from '@/hooks/useBreakpoints';

export default function Home() {
  const router = useRouter();

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const { resumeBase64 } = useSession();

  // Get breakpoint state for smooth Framer Motion transitions
  const bp = useBreakpoints();

  // Quick, smooth spring transition for responsive animations
  const springTransition = { type: "spring" as const, damping: 40, stiffness: 400 };

  // Calculate responsive values based on current viewport
  const responsiveStyles = useMemo(() => {
    // Use the full breakpoint state - will recompute when isMounted changes
    const { height, width, isH452, isH400, isH350, isH320, isH280, isH500, isH550, isH600, isTall600, isTall650, isTall, isSm, isMd, isLg, isXl, isWideShort, isMounted } = bp;

    // Container padding
    let containerPadding = { x: 32, y: 32 }; // default px-8 py-8
    if (isH280) containerPadding = { x: 16, y: 4 };
    else if (isH320) containerPadding = { x: 16, y: 4 };
    else if (isH350) containerPadding = { x: 16, y: 6 };
    else if (isH400) containerPadding = { x: 16, y: 8 };
    else if (isH452) containerPadding = { x: 16, y: 8 };
    else if (isH500) containerPadding = { x: 16, y: 8 };
    else if (isH550) containerPadding = { x: 16, y: 12 };
    else if (isH600) containerPadding = { x: 16, y: 16 };

    // Profile section margin bottom (used for divider spacing)
    let profileMarginBottom = isSm ? 32 : 24; // mb-6 sm:mb-8
    if (isH280) profileMarginBottom = 8;
    else if (isH320) profileMarginBottom = 8;
    else if (isH350) profileMarginBottom = 10;
    else if (isH400) profileMarginBottom = 12;
    else if (isH452) profileMarginBottom = 14;
    else if (isH500) profileMarginBottom = 16;
    else if (isH550) profileMarginBottom = 18;
    else if (isH600) profileMarginBottom = 20;

    // Use horizontal layout when height is constrained (h-452 breakpoint)
    const useHorizontalLayout = isH452;

    // Profile image size (width x height for portrait, size for square) - capped at reasonable max
    let portraitSize = { w: 112, h: 144 }; // w-28 h-36
    let squareSize = 96; // w-24 h-24

    if (isTall) {
      portraitSize = { w: 176, h: 224 }; // capped max
      squareSize = 160;
    } else if (isTall650) {
      portraitSize = { w: 160, h: 208 };
      squareSize = 144;
    } else if (isXl) {
      portraitSize = { w: 152, h: 192 };
      squareSize = 136;
    } else if (isLg) {
      portraitSize = { w: 144, h: 176 };
      squareSize = 128;
    } else if (isMd) {
      portraitSize = { w: 128, h: 160 };
      squareSize = 112;
    } else if (isSm) {
      portraitSize = { w: 112, h: 144 };
      squareSize = 96;
    }

    // Apply height constraints
    if (isH280) {
      portraitSize = { w: 64, h: 96 };
      squareSize = 56;
    } else if (isH320) {
      portraitSize = { w: 72, h: 108 };
      squareSize = 64;
    } else if (isH350) {
      portraitSize = { w: 80, h: 120 };
      squareSize = 72;
    } else if (isH400) {
      portraitSize = { w: 88, h: 128 };
      squareSize = 72;
    } else if (isH452) {
      portraitSize = { w: 96, h: 144 };
      squareSize = 72;
    } else if (isH500) {
      portraitSize = { w: 112, h: 160 };
      squareSize = 88;
    } else if (isH550) {
      portraitSize = { w: 128, h: 176 };
      squareSize = 96;
    } else if (isH600) {
      portraitSize = { w: 144, h: 192 };
      squareSize = 112;
    }

    // Show portrait image when tall enough
    const showPortrait = isTall600;

    // Title font size (in rem) - capped at 2rem max
    let titleSize = 1.25; // text-xl
    if (isH280) titleSize = 0.75;
    else if (isH320) titleSize = 0.75;
    else if (isH350) titleSize = 0.875;
    else if (isH400) titleSize = 0.875;
    else if (isH452) titleSize = 1;
    else if (isH500) titleSize = 1;
    else if (isH550) titleSize = 1.125;
    else if (isH600) titleSize = 1.25;
    else if (isXl) titleSize = 2; // capped max
    else if (isLg) titleSize = 1.875;
    else if (isMd) titleSize = 1.5;
    else if (isSm) titleSize = 1.25;

    // Description font size (in rem) - capped at 1rem max
    let descSize = 0.75; // text-xs
    if (isH280 || isH320 || isH350 || isH400 || isH452 || isH500 || isH550) descSize = 0.75;
    else if (isH600) descSize = 0.75;
    else if (isLg) descSize = 1; // capped max
    else if (isMd) descSize = 0.9375;
    else if (isSm) descSize = 0.875;

    // Button gap - ensure proper spacing between buttons
    let buttonGap = isSm ? 56 : 24; // gap-6 sm:gap-14
    if (isH280) buttonGap = 16;
    else if (isH320) buttonGap = 16;
    else if (isH350) buttonGap = 20;
    else if (isH400) buttonGap = 24;
    else if (isH452) buttonGap = 28;
    else if (isH500) buttonGap = 32;
    else if (isH550) buttonGap = 36;
    else if (isH600) buttonGap = 40;
    else if (isWideShort) buttonGap = 32;

    // Buttons use horizontal layout on sm+ or h-452
    const buttonsHorizontal = isSm || isH452;

    // Button padding and size - capped for large screens
    let buttonPadding = { x: 24, y: 12 }; // px-6 py-3
    let buttonFontSize = 0.875; // text-sm
    if (isH280) { buttonPadding = { x: 16, y: 4 }; buttonFontSize = 0.75; }
    else if (isH320) { buttonPadding = { x: 16, y: 4 }; buttonFontSize = 0.75; }
    else if (isH350) { buttonPadding = { x: 16, y: 6 }; buttonFontSize = 0.75; }
    else if (isH400) { buttonPadding = { x: 16, y: 6 }; buttonFontSize = 0.75; }
    else if (isH452) { buttonPadding = { x: 16, y: 6 }; buttonFontSize = 0.75; }
    else if (isH500) { buttonPadding = { x: 18, y: 8 }; buttonFontSize = 0.75; }
    else if (isH550) { buttonPadding = { x: 18, y: 8 }; buttonFontSize = 0.75; }
    else if (isH600) { buttonPadding = { x: 20, y: 10 }; buttonFontSize = 0.875; }
    else if (isWideShort) { buttonPadding = { x: 20, y: 10 }; buttonFontSize = 0.875; }
    else if (isMd) { buttonPadding = { x: 24, y: 12 }; buttonFontSize = 1; } // capped max
    else if (isSm) { buttonPadding = { x: 22, y: 10 }; buttonFontSize = 0.9375; }

    // Button icon size - capped at 18px max
    let iconSize = 16; // w-4 h-4
    if (isH280 || isH320 || isH350) iconSize = 10;
    else if (isH400 || isH452) iconSize = 12;
    else if (isH500 || isH550 || isH600) iconSize = 12;
    else if (isMd) iconSize = 18; // capped max
    else if (isSm) iconSize = 16;

    return {
      containerPadding,
      profileMarginBottom,
      useHorizontalLayout,
      portraitSize,
      squareSize,
      showPortrait,
      titleSize,
      descSize,
      buttonGap,
      buttonsHorizontal,
      buttonPadding,
      buttonFontSize,
      iconSize,
      hasKeyboard: bp.hasKeyboard,
    };
  }, [bp]); // bp object changes when isMounted changes, triggering recompute


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

  const handleContactClick = () => setIsContactOpen(true);
  const handleResumeClick = () => setIsResumeOpen(true);
  const handleProjectsClick = () => router.push('/projects');

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
  }, [router]);

  // Don't render responsive content until we have real client dimensions
  // This prevents flash of incorrectly-sized elements during hydration
  if (!bp.isMounted) {
    return (
      <main className="fixed inset-0 min-h-[100dvh] min-h-[100svh] flex flex-col items-center justify-center bg-base00 overflow-hidden touch-none pb-8 sm:pb-10" />
    );
  }

  return (
    <main
      className="fixed inset-0 min-h-[100dvh] min-h-[100svh] flex flex-col items-center justify-center bg-base00 overflow-hidden touch-none pb-8 sm:pb-10"
    >
      <LayoutGroup>
        <motion.div
          layout
          initial={false}
          animate={{
            paddingLeft: responsiveStyles.containerPadding.x,
            paddingRight: responsiveStyles.containerPadding.x,
            paddingTop: responsiveStyles.containerPadding.y,
            paddingBottom: responsiveStyles.containerPadding.y,
          }}
          transition={springTransition}
          className="flex flex-col items-center justify-center h-full w-full max-w-4xl max-h-full mx-auto overflow-auto"
        >
          {/* Profile and Title Section */}
          <motion.div
            layout
            initial={false}
            animate={{ marginBottom: responsiveStyles.profileMarginBottom }}
            transition={springTransition}
            className="flex-shrink-0 w-full max-w-2xl mx-auto flex flex-col items-center"
          >
            {/* Profile row/column layout - uses float for text wrap in horizontal mode */}
            <motion.div
              layout
              initial={false}
              transition={springTransition}
              className={responsiveStyles.useHorizontalLayout ? "block w-fit" : "flex flex-col items-center w-fit"}
            >
              {/* Profile Image Container */}
              <motion.div
                layout
                initial={false}
                animate={{
                  marginBottom: responsiveStyles.useHorizontalLayout ? 0 : 8,
                  marginRight: responsiveStyles.useHorizontalLayout ? 16 : 0,
                }}
                transition={springTransition}
                className="flex-shrink-0"
                style={{
                  float: responsiveStyles.useHorizontalLayout ? 'left' : 'none',
                  shapeOutside: responsiveStyles.useHorizontalLayout ? 'margin-box' : 'none',
                }}
              >
                {/* Single morphing image container - transitions between portrait and square */}
                <motion.div
                  layoutId="profile-image"
                  initial={false}
                  animate={{
                    width: responsiveStyles.showPortrait ? responsiveStyles.portraitSize.w : responsiveStyles.squareSize,
                    height: responsiveStyles.showPortrait ? responsiveStyles.portraitSize.h : responsiveStyles.squareSize,
                    borderRadius: responsiveStyles.showPortrait ? 16 : 9999,
                  }}
                  transition={springTransition}
                  className="border-4 border-base02 overflow-hidden"
                >
                  <Image
                    src={responsiveStyles.showPortrait ? "/profile_regular.jpg" : "/profile_square.jpg"}
                    alt="Profile picture"
                    width={responsiveStyles.showPortrait ? 220 : 150}
                    height={responsiveStyles.showPortrait ? 293 : 150}
                    className="object-cover w-full h-full"
                    priority
                  />
                </motion.div>
              </motion.div>

              {/* Title and Description */}
              <motion.div
                layout
                transition={springTransition}
                style={{ textAlign: responsiveStyles.useHorizontalLayout ? 'left' : 'center' }}
              >
                <motion.h1
                  initial={false}
                  animate={{ fontSize: `${responsiveStyles.titleSize}rem` }}
                  transition={springTransition}
                  className="font-bold text-base05 mb-1"
                >
                  Alex Spaulding
                </motion.h1>
                <motion.p
                  initial={false}
                  animate={{ fontSize: `${responsiveStyles.descSize}rem` }}
                  transition={springTransition}
                  className="text-base04 max-w-md"
                  style={{ paddingLeft: responsiveStyles.useHorizontalLayout ? 0 : 8, paddingRight: responsiveStyles.useHorizontalLayout ? 0 : 8 }}
                >
                  Computer Science student at Eastern Washington University currently exploring macOS reverse engineering and UI design tweaks.
                </motion.p>
              </motion.div>

              {/* Clear float */}
              {responsiveStyles.useHorizontalLayout && <div style={{ clear: 'both' }} />}
            </motion.div>
          </motion.div>

          {/* Divider between profile and buttons */}
          <motion.div
            initial={false}
            animate={{
              marginTop: responsiveStyles.profileMarginBottom * 0.25,
              marginBottom: responsiveStyles.profileMarginBottom * 2,
            }}
            transition={springTransition}
            className="w-full max-w-md mx-auto"
          >
            <div className="h-px bg-gradient-to-r from-transparent via-base03 to-transparent" />
          </motion.div>

          {/* Buttons Section - Bootstrap-like responsive grid */}
          <motion.div
            layout
            transition={springTransition}
            className="flex-shrink-0 w-full max-w-2xl mx-auto"
          >
            {/* Grid container - adapts based on viewport constraints */}
            <motion.div
              layout
              initial={false}
              animate={{
                flexDirection: responsiveStyles.buttonsHorizontal ? 'row' : 'column',
              }}
              transition={springTransition}
              className="flex justify-center items-center"
              style={{ gap: responsiveStyles.buttonGap }}
            >

              {/* Projects Button */}
              <motion.div
                className="transform rotate-0 sm:-rotate-1 hover:-rotate-1 sm:hover:rotate-0 active:rotate-0 transition-transform duration-300 flex flex-col items-center gap-1"
                style={{ width: responsiveStyles.buttonsHorizontal ? 'auto' : '100%' }}
              >
                <motion.button
                  onTap={handleProjectsClick}
                  initial={false}
                  animate={{
                    paddingLeft: responsiveStyles.buttonPadding.x,
                    paddingRight: responsiveStyles.buttonPadding.x,
                    paddingTop: responsiveStyles.buttonPadding.y,
                    paddingBottom: responsiveStyles.buttonPadding.y,
                    fontSize: `${responsiveStyles.buttonFontSize}rem`,
                  }}
                  transition={springTransition}
                  className="inline-flex w-full justify-center rounded-lg shadow-lg items-center bg-base0D hover:bg-base0C hover:scale-105 active:scale-95 transition-all duration-300 text-base00 space-x-2 touch-manipulation"
                >
                  <span>Projects</span>
                  <motion.svg
                    initial={false}
                    animate={{ width: responsiveStyles.iconSize, height: responsiveStyles.iconSize }}
                    transition={springTransition}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="flex-shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </motion.svg>
                </motion.button>
                {responsiveStyles.hasKeyboard && (
                  <span className="text-[10px] font-mono opacity-50 text-base04 hidden sm:block">(p)</span>
                )}
              </motion.div>

              {/* Resume Button */}
              <motion.div
                className="transform rotate-0 sm:rotate-0.5 hover:rotate-0.5 sm:hover:rotate-0 active:rotate-0 transition-transform duration-300 flex flex-col items-center gap-1"
                style={{ width: responsiveStyles.buttonsHorizontal ? 'auto' : '100%' }}
              >
                <motion.button
                  onTap={handleResumeClick}
                  initial={false}
                  animate={{
                    paddingLeft: responsiveStyles.buttonPadding.x,
                    paddingRight: responsiveStyles.buttonPadding.x,
                    paddingTop: responsiveStyles.buttonPadding.y,
                    paddingBottom: responsiveStyles.buttonPadding.y,
                    fontSize: `${responsiveStyles.buttonFontSize}rem`,
                  }}
                  transition={springTransition}
                  className="inline-flex w-full justify-center rounded-lg shadow-lg items-center bg-base0B hover:bg-base0A hover:scale-105 active:scale-95 transition-all duration-300 text-base00 space-x-2 touch-manipulation"
                >
                  <span>Resume</span>
                  <motion.svg
                    initial={false}
                    animate={{ width: responsiveStyles.iconSize, height: responsiveStyles.iconSize }}
                    transition={springTransition}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="flex-shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </motion.svg>
                </motion.button>
                {responsiveStyles.hasKeyboard && (
                  <span className="text-[10px] font-mono opacity-50 text-base04 hidden sm:block">(r)</span>
                )}
              </motion.div>

              {/* Contact Button */}
              <motion.div
                className="transform rotate-0 sm:rotate-1 hover:rotate-1 sm:hover:rotate-0 active:rotate-0 transition-transform duration-300 flex flex-col items-center gap-1"
                style={{ width: responsiveStyles.buttonsHorizontal ? 'auto' : '100%' }}
              >
                <motion.button
                  onTap={handleContactClick}
                  initial={false}
                  animate={{
                    paddingLeft: responsiveStyles.buttonPadding.x,
                    paddingRight: responsiveStyles.buttonPadding.x,
                    paddingTop: responsiveStyles.buttonPadding.y,
                    paddingBottom: responsiveStyles.buttonPadding.y,
                    fontSize: `${responsiveStyles.buttonFontSize}rem`,
                  }}
                  transition={springTransition}
                  className="inline-flex w-full justify-center rounded-lg shadow-lg items-center bg-base0E hover:bg-base0F hover:scale-105 active:scale-95 transition-all duration-300 text-base00 space-x-2 touch-manipulation"
                >
                  <span>Contact</span>
                  <motion.svg
                    initial={false}
                    animate={{ width: responsiveStyles.iconSize, height: responsiveStyles.iconSize }}
                    transition={springTransition}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="flex-shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </motion.svg>
                </motion.button>
                {responsiveStyles.hasKeyboard && (
                  <span className="text-[10px] font-mono opacity-50 text-base04 hidden sm:block">(c)</span>
                )}
              </motion.div>
            </motion.div>
          </motion.div>

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
        </motion.div>
      </LayoutGroup>

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
