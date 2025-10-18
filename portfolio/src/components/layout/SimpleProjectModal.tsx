'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Project } from '../../app/projects/projectData';
import { GitHubRepoData } from '../../lib/github';
import ProjectModalSlider from '../ui/ProjectModalSlider';
import ProjectModalContent from '../ui/ProjectModalContent';

interface SimpleProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onLike?: (project: Project) => void;
  onPass?: (project: Project) => void;
  onSwipe?: (direction: 'left' | 'right') => void;
  githubData?: Record<string, GitHubRepoData>;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
}

export default function SimpleProjectModal({
  project,
  onClose,
  onLike,
  onPass,
  onSwipe,
  githubData
}: SimpleProjectModalProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
  });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Handle drag start
  const handleStart = useCallback((clientX: number, clientY: number) => {
    setDragState({
      isDragging: true,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      deltaX: 0,
      deltaY: 0,
    });
    isDraggingRef.current = true;
  }, []);

  // Handle drag move
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState.isDragging) return;
    
    const deltaX = clientX - dragState.startX;
    const deltaY = clientY - dragState.startY;
    
    setDragState(prev => ({
      ...prev,
      currentX: clientX,
      currentY: clientY,
      deltaX,
      deltaY,
    }));
  }, [dragState.isDragging, dragState.startX, dragState.startY]);

  // Handle drag end
  const handleEnd = useCallback(() => {
    if (!dragState.isDragging) return;
    
    const { deltaX } = dragState;
    const threshold = 75; // Swipe threshold
    
    if (Math.abs(deltaX) > threshold && project) {
      const direction = deltaX > 0 ? 'right' : 'left';
      setSwipeDirection(direction);
      
      // Close modal after animation
      setTimeout(() => {
        onClose();
        
        if (onSwipe) {
          onSwipe(direction);
        }
        
        if (direction === 'right' && onLike) {
          onLike(project);
        } else if (direction === 'left' && onPass) {
          onPass(project);
        }
      }, 300);
    } else {
      // Reset drag state
      setDragState({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deltaX: 0,
        deltaY: 0,
      });
      isDraggingRef.current = false;
    }
  }, [dragState, project, onClose, onSwipe, onLike, onPass]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  if (!project) return null;

  // Calculate modal transform based on drag state
  const modalTransform = dragState.isDragging 
    ? `translate(${dragState.deltaX}px, ${dragState.deltaY}px) rotate(${dragState.deltaX * 0.1}deg)`
    : 'translate(0px, 0px) rotate(0deg)';

  // Calculate swipe indicator opacity
  const swipeProgress = Math.min(Math.abs(dragState.deltaX) / 100, 1);
  const isSwipingLeft = dragState.deltaX < 0;
  const isSwipingRight = dragState.deltaX > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div
        ref={modalRef}
        className="relative bg-base00 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-base02"
        style={{
          transform: modalTransform,
          transition: dragState.isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe indicators */}
        {dragState.isDragging && swipeProgress > 0.1 && (
          <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
            {isSwipingLeft && (
              <div 
                className="text-red-500 text-6xl font-bold opacity-0 transition-opacity duration-150"
                style={{ opacity: swipeProgress }}
              >
                ✕
              </div>
            )}
            {isSwipingRight && (
              <div 
                className="text-green-500 text-6xl font-bold opacity-0 transition-opacity duration-150"
                style={{ opacity: swipeProgress }}
              >
                ✓
              </div>
            )}
          </div>
        )}
        
        {/* Swipe direction overlay */}
        {swipeDirection && (
          <div 
            className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-200 ${
              swipeDirection === 'left' 
                ? 'bg-gradient-to-r from-red-500/40 via-red-400/25 to-transparent' 
                : 'bg-gradient-to-l from-green-500/40 via-green-400/25 to-transparent'
            } rounded-2xl`}
            style={{ opacity: 0.8 }}
          />
        )}
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 bg-base02 hover:bg-base03 rounded-full text-base04 transition-colors duration-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[90vh]">
          <ProjectModalSlider images={project.images} title={project.title} />
          <ProjectModalContent project={project} githubData={githubData} />
        </div>
      </div>
    </div>
  );
}