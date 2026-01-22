'use client';

import React from 'react';
import { motion, useMotionValue, useTransform, PanInfo, useAnimation } from 'framer-motion';
import { CardData, GitHubRepoData } from './types';
import CardContent from './CardContent';
import { useTheme } from '../../app/context/ThemeContext';

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
    const { effectiveTheme } = useTheme();
    const dimmedColor = effectiveTheme === 'dark' ? '#282828' : '#585853'; // base01 vs base05/03
    const green = '#a1b56c'; // base0B
    const red = '#ab4642'; // base08
    const x = useMotionValue(0);

    // Rotation based on local x
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);
    const cardOpacity = useTransform(x, [-300, -200, 0, 200, 300], [0, 1, 1, 1, 0]);

    // Indicators opacity and colors - make them appear sooner (60px instead of 100px)
    const indicatorOpacity = useTransform(x, [-60, -20, 0, 20, 60], [1, 0, 0, 0, 1]);
    const likeColor = useTransform(x, [0, 40], [dimmedColor, green]);
    const passColor = useTransform(x, [-40, 0], [red, dimmedColor]);
    const likeBorderColor = useTransform(x, [0, 40], [dimmedColor, green]);
    const passBorderColor = useTransform(x, [-40, 0], [red, dimmedColor]);

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
            initial={index === 0 ? { x: 0, opacity: 1, scale: 1, y: 0 } : { scale: 1 - (index * 0.05), y: index * 40, opacity: 1 - (index * 0.1) }}
            style={{
                x,
                rotate: isDraggable ? rotate : 0,
                scale: isDraggable ? scale : (1 - (index * 0.05)),
                y: index * 40,
                zIndex: 100 - index,
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: 0,
                touchAction: 'none',
                opacity: isDraggable ? cardOpacity : (1 - (index * 0.1)),
            }}
            onDragEnd={handleDragEnd}
            className="absolute w-full h-full cursor-grab active:cursor-grabbing"
        >
            {/* Swipe Indicators */}
            {isDraggable && (
                <motion.div style={{ opacity: indicatorOpacity }} className="absolute inset-0 z-50 pointer-events-none">
                    <motion.div
                        className="absolute top-8 left-8 border-4 px-4 py-1 rounded text-3xl font-bold transform -rotate-12 bg-base00/40 backdrop-blur-sm"
                        style={{ color: likeColor, borderColor: likeBorderColor }}
                    >
                        LIKE
                    </motion.div>
                    <motion.div
                        className="absolute top-8 right-8 border-4 px-4 py-1 rounded text-3xl font-bold transform rotate-12 bg-base00/40 backdrop-blur-sm"
                        style={{ color: passColor, borderColor: passBorderColor }}
                    >
                        PASS
                    </motion.div>
                </motion.div>
            )}

            {/* Actual Card Visuals */}
            <div className="relative w-full h-full pointer-events-auto rounded-2xl overflow-hidden">
                <CardContent card={card} onViewProject={onViewProject} githubData={githubData} inputDisabled={inputDisabled} />

                {/* Dimming Overlay - Always dark (black) to darken card in both light/dark modes */}
                <motion.div
                    style={{ opacity: useTransform(x, [-150, 0, 150], [0.5, 0, 0.5]) }}
                    className="absolute inset-0 bg-black pointer-events-none z-30"
                />

                {/* Edge Glow Overlays - Soft gradients instead of borders */}
                {/* Like (Green) - Right Edge Glow */}
                <motion.div
                    style={{ opacity: useTransform(x, [0, 200], [0, 0.5]) }}
                    className="absolute inset-0 bg-gradient-to-r from-base0B via-transparent to-transparent pointer-events-none z-40"
                />
                {/* Pass (Red) - Left Edge Glow */}
                <motion.div
                    style={{ opacity: useTransform(x, [0, -200], [0, 0.5]) }}
                    className="absolute inset-0 bg-gradient-to-l from-base08 via-transparent to-transparent pointer-events-none z-40"
                />
            </div>
        </motion.div>
    );
}
