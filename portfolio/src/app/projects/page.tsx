"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";
import { motion, AnimatePresence } from 'framer-motion';
import { projects } from './projectData';
import PageTransition from '../components/PageTransition';

export default function Projects() {
  const router = useRouter();
  const [expandedDescriptions, setExpandedDescriptions] = useState<{[key: number]: boolean}>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Reset loading state when component mounts
    setIsLoading(true);
    setLoadedImages(0);
  }, []);

  const handleImageLoad = () => {
    setLoadedImages(prev => {
      const newCount = prev + 1;
      if (newCount === projects.length) {
        setIsLoading(false);
      }
      return newCount;
    });
  };

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    lazyLoad: 'progressive' as const,
  };

  useEffect(() => {
    // Start autoplay after images are loaded
    if (!isLoading) {
      const sliders = document.querySelectorAll('.slick-slider');
      sliders.forEach((slider) => {
        // @ts-ignore - slick methods exist at runtime
        slider.slick?.slickPlay();
      });
    }
  }, [isLoading]);

  // Preload first image of each project
  useEffect(() => {
    projects.forEach((project) => {
      if (project.images?.[0]) {
        const img = document.createElement('img');
        img.src = project.images[0];
        img.onload = handleImageLoad;
      }
    });
  }, []);

  const handleBack = async () => {
    setIsLeaving(true);
    router.push('/');
  };

  const toggleDescription = (projectId: number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
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
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AnimatePresence mode="sync">
            {!isLoading && !isLeaving && (
              projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ 
                    opacity: 0, 
                    y: 50,
                    transition: { 
                      duration: 0.3,
                      delay: index * 0.1 
                    }
                  }}
                  className="bg-base01 rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="relative">
                    <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-base00/30 to-transparent z-10"></div>
                    <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-base00/30 to-transparent z-10"></div>
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
                              onLoad={handleImageLoad}
                            />
                          </div>
                        ))}
                      </Slider>
                    </div>
                  </div>
                  <div className="p-4">
                    <h2 className="text-xl font-semibold text-base05">{project.title}</h2>
                    <div className="text-base04 mt-2">
                      {expandedDescriptions[project.id] ? (
                        <div>
                          {project.description}
                          <button 
                            onClick={() => toggleDescription(project.id)}
                            className="ml-1 text-base0D hover:text-base0C transition-colors"
                          >
                            Read less
                          </button>
                        </div>
                      ) : (
                        <div>
                          {project.description.slice(0, 150) + '...'}
                          {project.description.length > 150 && (
                            <button 
                              onClick={() => toggleDescription(project.id)}
                              className="ml-1 text-base0D hover:text-base0C transition-colors"
                            >
                              Read more
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {project.link && (
                      <a 
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-2 text-base0D hover:text-base0C transition-colors"
                      >
                        Visit Site
                        <Image 
                          src="/globe.svg" 
                          alt="External link" 
                          width={16} 
                          height={16} 
                          className="ml-1" 
                        />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
