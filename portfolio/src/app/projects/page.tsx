"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";
import { motion, AnimatePresence } from 'framer-motion';
import { projects } from './projectData';
import PageTransition from '../components/PageTransition';

// Hook to detect touch device
const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const detectTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
      );
    };

    detectTouch();
    window.addEventListener('resize', detectTouch);
    return () => window.removeEventListener('resize', detectTouch);
  }, []);

  return isTouch;
};

const floatingCards = (hoveredId: number | null, isButtonHovered: boolean, projectId: number, isTouch: boolean) => ({
  y: isTouch ? 0 : (hoveredId === projectId ? 0 : [0, -8, 0]),
  rotateX: isTouch ? 0 : (hoveredId === projectId ? 0 : [-1, 0, 1, 0]),
  rotateY: isTouch ? 0 : (hoveredId === projectId ? 0 : [0, 1, 0, -1]),
  rotateZ: isTouch ? 0 : (hoveredId === projectId ? 0 : [-0.5, 0, 0.5, 0]),
  boxShadow: hoveredId === projectId 
    ? isButtonHovered 
      ? "0 0 15px rgba(211,54,130,0.4), 0 0 15px #b48ead" 
      : "0 0 15px rgba(131,165,242,0.4), 0 0 15px #81a2be"
    : "none",
  transition: { 
    duration: hoveredId === projectId ? 0.15 : 8,
    repeat: isTouch ? 0 : (hoveredId === projectId ? 0 : Infinity),
    repeatType: hoveredId === projectId ? undefined : "mirror" as const,
    ease: "easeInOut"
  },
  transformPerspective: 1000
});

export default function Projects() {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const isTouch = useIsTouchDevice();

  const settings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: false,
    lazyLoad: 'ondemand' as const,
    cssEase: "linear",
    fade: true,
    initialSlide: 0,
    waitForAnimate: false
  };

  // Initialize sliders and ensure autoplay starts
  useEffect(() => {
    const timer = setTimeout(() => {
      const sliders = document.querySelectorAll('.slick-slider');
      sliders.forEach((slider) => {
        const slickInstance = slider as { slick?: { slickGoTo: (n: number) => void; slickPlay: () => void } };
        if (slickInstance.slick) {
          slickInstance.slick.slickGoTo(0);
          slickInstance.slick.slickPlay();
        }
      });
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  // Preload first image of each project
  useEffect(() => {
    projects.forEach((project) => {
      if (project.images?.[0]) {
        const img = document.createElement('img');
        img.src = project.images[0];
      }
    });
  }, []);

  const handleBack = () => {
    setIsLeaving(true);
    router.push('/');
  };

  const handleProjectClick = (link?: string) => {
    if (link) {
      setHoveredCard(null);
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <PageTransition>
      <motion.div 
        key="projects-content"
        className="min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 bg-base00"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBack}
          className="fixed top-4 left-4 z-50 p-3 rounded-lg bg-base01 hover:bg-base02 transition-all duration-300 shadow-lg"
          aria-label="Back to home"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 text-base05"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </motion.button>

        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="text-4xl sm:text-6xl font-bold text-base05 mb-8"
        >
          My Projects
        </motion.h1>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-8 w-full max-w-[1920px] mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AnimatePresence mode="sync">
            {!isLeaving && (
              projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ 
                    opacity: 0,
                    y: 50,
                    transition: { 
                      duration: 0.15,
                      delay: index * 0.05 
                    }
                  }}
                  className="min-w-[280px]"
                >
                  <motion.div
                    animate={floatingCards(hoveredCard, isButtonHovered, project.id, isTouch)}
                    className={`bg-base01 rounded-lg shadow-lg overflow-hidden relative group transition-all duration-150
                      ${isTouch ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default hover:rotate-[0.5deg]'}`}
                    onMouseEnter={() => !isTouch && setHoveredCard(project.id)}
                    onMouseLeave={() => !isTouch && setHoveredCard(null)}
                    onClick={() => {
                      // Handle click for touch devices only
                      if (isTouch && project.link) {
                        handleProjectClick(project.link);
                      }
                    }}
                  >
                    <div className="relative">
                      <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-base00/30 to-transparent z-10"></div>
                      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-base00/30 to-transparent z-10"></div>
                      {/* Mobile tap indicator */}
                      <div className={`absolute inset-0 bg-base0D/10 opacity-0 transition-opacity duration-150 z-20 
                        ${isTouch ? 'active:opacity-100' : 'hidden'}`}
                      ></div>
                      <div className="h-64 relative">
                        <Slider {...settings}>
                          {project.images?.map((image, imageIndex) => (
                            <div key={imageIndex} className="h-full relative">
                              <Image
                                src={image} 
                                alt={`${project.title} slide ${imageIndex + 1}`} 
                                fill
                                className="object-cover object-center"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                priority={imageIndex < 3}
                              />
                            </div>
                          ))}
                        </Slider>
                      </div>
                    </div>
                    <div className="p-4 relative">
                      {/* Desktop-only overlay and button */}
                      <div className={!isTouch ? 'block' : 'hidden'}>
                        <motion.div
                          className="absolute inset-0 bg-base0D/80 backdrop-blur-[2px] z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center"
                          initial={false}
                          animate={{ 
                            opacity: hoveredCard === project.id ? 1 : 0,
                            transition: { duration: 0.15 }
                          }}
                        >
                          <motion.button
                            className="bg-base0D hover:bg-base0E text-base00 px-6 py-3 rounded-lg shadow-xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] flex items-center space-x-2 transition-colors duration-150 z-30"
                            initial={{ scale: 0.8, opacity: 0 }}
                            whileHover={{ 
                              scale: 1.1,
                              transition: { duration: 0.15 }
                            }}
                            animate={{ 
                              scale: hoveredCard === project.id ? 1 : 0.8, 
                              opacity: hoveredCard === project.id ? 1 : 0,
                              transition: { duration: 0.15 }
                            }}
                            onClick={() => handleProjectClick(project.link)}
                            onMouseEnter={() => setIsButtonHovered(true)}
                            onMouseLeave={() => setIsButtonHovered(false)}
                          >
                            <span className="font-semibold">GO</span>
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
                                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                              />
                            </svg>
                          </motion.button>
                        </motion.div>
                      </div>
                      <h2 className="text-xl font-semibold text-base05 mt-2">{project.title}</h2>
                      <div className="text-base04 mt-2">
                        {project.description}
                      </div>
                      {/* Mobile-only indicator */}
                      <div className={`flex items-center mt-3 text-base0D ${isTouch ? 'block' : 'hidden'}`}>
                        <span className="text-sm">Tap to view</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-4 h-4 ml-1"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
