"use client";

import React, { useState } from 'react';
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
  const [isLeaving, setIsLeaving] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{[key: number]: boolean}>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
  };

  const handleBack = async () => {
    setIsLeaving(true);
    // Wait for animation to complete before navigating
    await new Promise(resolve => setTimeout(resolve, 600));
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
      <AnimatePresence mode="wait">
        {!isLeaving ? (
          <motion.div 
            key="projects-content"
            className="min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 bg-base00"
            exit={{ opacity: 0 }}
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
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
              transition={{ delay: 0.2, duration: 0.5 }}
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
              {projects.map((project, index) => (
                <motion.div 
                  key={project.id} 
                  className="project-card-wrapper"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    transition: {
                      delay: index * 0.1
                    }
                  }}
                  exit={{ 
                    opacity: 0,
                    y: 50,
                    transition: {
                      duration: 0.4,
                      delay: index * 0.05
                    }
                  }}
                >
                  <motion.div 
                    layoutId={`project-${project.id}`}
                    animate={{ 
                      scale: selectedId === project.id ? 1.1 : 1,
                      zIndex: selectedId === project.id ? 20 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                    onHoverStart={() => setSelectedId(project.id)}
                    onHoverEnd={() => setSelectedId(null)}
                    className="project-card bg-base01 rounded-lg shadow-lg overflow-hidden"
                    style={{
                      width: selectedId === project.id ? '150%' : '100%',
                      transformOrigin: 'center center',
                      position: 'absolute',
                      left: selectedId === project.id ? '-25%' : '0',
                    }}
                  >
                    <div className="relative">
                      <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-base00/30 to-transparent z-10"></div>
                      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-base00/30 to-transparent z-10"></div>
                      <motion.div 
                        className="image-container relative z-0"
                        animate={{
                          height: selectedId === project.id ? 400 : 256
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <Slider {...settings}>
                          {project.images.map((image, index) => (
                            <div key={index} className="h-full relative">
                              <Image 
                                src={image} 
                                alt={`${project.title} slide ${index + 1}`} 
                                fill
                                className="object-cover object-center"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            </div>
                          ))}
                        </Slider>
                      </motion.div>
                    </div>
                    <div className="p-4 pt-6">
                      <h2 className="text-xl font-semibold text-base05">{project.title}</h2>
                      <AnimatePresence mode="wait">
                        {expandedDescriptions[project.id] ? (
                          <motion.div
                            key="expanded"
                            className="text-base04 mt-2"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 100, damping: 15 }}
                            style={{ overflow: 'hidden' }}
                          >
                            {project.description}
                            <button 
                              onClick={() => toggleDescription(project.id)}
                              className="ml-1 text-base0D hover:text-base0C transition-colors"
                            >
                              Read less
                            </button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="collapsed"
                            className="text-base04 mt-2"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 100, damping: 15 }}
                            style={{ overflow: 'hidden' }}
                          >
                            {project.description.slice(0, 150) + '...'}
                            {project.description.length > 150 && (
                              <button 
                                onClick={() => toggleDescription(project.id)}
                                className="ml-1 text-base0D hover:text-base0C transition-colors"
                              >
                                Read more
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {project.link && (
                        <motion.a 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
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
                        </motion.a>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </PageTransition>
  );
}
