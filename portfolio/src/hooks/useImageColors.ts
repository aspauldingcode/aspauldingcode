import { useState, useEffect } from 'react';
import { extractColors } from 'extract-colors';

export const useImageColors = (imageUrl: string | undefined) => {
    const [colors, setColors] = useState<string[]>([]);

    // Cache for extracted colors to avoid re-processing the same image
    const [colorCache, setColorCache] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (!imageUrl) {
            setColors([]);
            return;
        }

        // Check cache first
        if (colorCache[imageUrl]) {
            setColors(colorCache[imageUrl]);
            return;
        }

        let isMounted = true;

        const fetchColors = async () => {
            try {
                // crossOrigin is needed if images are on a different domain, but local is fine.
                // extracted-colors handles loading the image internally if we pass a src string?
                // Actually extractColors expects a src string (url) or element.
                // For cross-origin images, might need proxy, but these are local as checked.

                const extracted = await extractColors(imageUrl, {
                    crossOrigin: 'anonymous',
                    pixels: 64000,
                    distance: 0.2,
                    splitPower: 10,
                });

                if (isMounted) {
                    // Sort by area (dominance) or maybe just take them as is. 
                    // Let's sort by luminance or something if needed, but extract-colors usually returns ordered by area.
                    // We just want the hex values.
                    const hexColors = extracted.map(c => c.hex);

                    setColors(hexColors);
                    setColorCache(prev => ({ ...prev, [imageUrl]: hexColors }));
                }
            } catch (error) {
                console.error("Failed to extract colors:", error);
                // Fallback or keep previous?
                if (isMounted) setColors([]);
            }
        };

        fetchColors();

        return () => {
            isMounted = false;
        };
    }, [imageUrl, colorCache]);

    return colors;
};
