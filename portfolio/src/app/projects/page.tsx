"use client";

import React, { useState } from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";
import { motion, AnimatePresence } from 'framer-motion';
import { projects } from './projectData';

export default function Projects() {
  const [expandedDescriptions, setExpandedDescriptions] = useState<{[key: number]: boolean}>({});

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  const toggleDescription = (projectId: number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 bg-gradient-to-b from-gray-100 to-gray-300"
    >
      <motion.h1 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-4xl sm:text-6xl font-bold text-gray-800 mb-8"
      >
        My Projects
      </motion.h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {projects.map((project, index) => (
          <motion.div 
            key={project.id} 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden"
          >
            <div className="relative">
              <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-gray-900/30 to-transparent z-10"></div>
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-gray-900/30 to-transparent z-10"></div>
              <div className="h-64 relative z-0">
                <Slider {...settings}>
                  {(project.images || [project.image]).map((image, index) => (
                    <div key={index} className="h-64">
                      <img 
                        src={image} 
                        alt={`${project.title} slide ${index + 1}`} 
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                  ))}
                </Slider>
              </div>
            </div>
            <div className="p-4 pt-6">
              <h2 className="text-xl font-semibold text-gray-800">{project.title}</h2>
              <AnimatePresence mode="wait">
                {expandedDescriptions[project.id] ? (
                  <motion.div
                    key="expanded"
                    className="text-gray-600 mt-2"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    style={{ overflow: 'hidden' }}
                  >
                    {project.description}
                    <button 
                      onClick={() => toggleDescription(project.id)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      Read less
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="collapsed"
                    className="text-gray-600 mt-2"
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
                        className="ml-1 text-blue-600 hover:text-blue-800"
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
                  className="inline-flex items-center mt-2 text-blue-600 hover:text-blue-800"
                >
                  Visit Site
                  <img src="/globe.svg" alt="External link" className="w-4 h-4 ml-1" />
                </motion.a>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
