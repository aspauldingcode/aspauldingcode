'use client';

import React from 'react';
import { motion, useMotionValue, useTransform, PanInfo, useAnimation } from 'framer-motion';
import { CardData, GitHubRepoData } from './types';
import CardContent from './CardContent'; // We will build this next

interface SwipeableCardProps {
    card: CardData;
    index: number; // 0 = active, 1 = next, 2 = peek
    onSwipe: (direction: 'left' | 'right') => void;
    // Pass-through props for CardContent
    onViewProject?: (card: CardData) => void;
    githubData?: Record<string, GitHubRepoData>;
    inputDisabled?: boolean;
}

export default function SwipeableCard({ card, index, onSwipe, onViewProject, githubData, inputDisabled = false }: SwipeableCardProps) {
    const controls = useAnimation();
    const x = useMotionValue(0);

    // Rotation based on local x
    const rotate = useTransform(x, [-200, 200], [-15, 15]);

    // Overlay opacity for "Like" / "Pass"
    const likeOpacity = useTransform(x, [20, 100], [0, 1]);
    const passOpacity = useTransform(x, [-20, -100], [0, 1]);

    // Transition settings
    const springTransition = { type: 'spring' as const, damping: 25, stiffness: 300 };

    const handleDragEnd = async (_: unknown, info: PanInfo) => {
        const threshold = 120;
        const velocity = info.velocity.x;

        if (info.offset.x > threshold || velocity > 500) {
            await controls.start({
                x: 600,
                rotate: 20,
                opacity: 0,
                transition: { duration: 0.2, ease: "easeOut" }
            });
            onSwipe('right');
        } else if (info.offset.x < -threshold || velocity < -500) {
            await controls.start({
                x: -600,
                rotate: -20,
                opacity: 0,
                transition: { duration: 0.2, ease: "easeOut" }
            });
            onSwipe('left');
        } else {
            // Rubber band back to center
            await controls.start({ x: 0, transition: springTransition });
        }
    };

    // Only the top card (index 0) is draggable, and only if input is not disabled
    const isDraggable = index === 0 && !inputDisabled;

    return (
        <motion.div
            drag={isDraggable ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            animate={controls}
            initial={index === 0 ? { x: 0, opacity: 1, scale: 1, y: 0 } : { scale: 1 - (index * 0.05), y: index * 15, opacity: 1 - (index * 0.1) }}
            style={{
                x,
                rotate: isDraggable ? rotate : 0,
                scale: 1 - (index * 0.05),
                y: index * 15,
                zIndex: 100 - index,
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: 0,
                touchAction: 'none',
                opacity: 1 - (index * 0.1),
            }}
            onDragEnd={handleDragEnd}
            className="absolute w-full h-full cursor-grab active:cursor-grabbing"
        >
            {/* Swipe Indicators */}
            {isDraggable && (
                <>
                    <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 z-50 pointer-events-none">
                        <div className="border-4 border-base0B text-base0B text-3xl font-bold px-4 rounded transform -rotate-12 bg-base00/40 backdrop-blur-sm">
                            LIKE
                        </div>
                    </motion.div>
                    <motion.div style={{ opacity: passOpacity }} className="absolute top-8 right-8 z-50 pointer-events-none">
                        <div className="border-4 border-base08 text-base08 text-3xl font-bold px-4 rounded transform rotate-12 bg-base00/40 backdrop-blur-sm">
                            PASS
                        </div>
                    </motion.div>
                </>
            )}

            {/* Actual Card Visuals */}
            <div className="w-full h-full pointer-events-auto">
                <CardContent card={card} onViewProject={onViewProject} githubData={githubData} inputDisabled={inputDisabled} />
            </div>
        </motion.div>
    );
}
