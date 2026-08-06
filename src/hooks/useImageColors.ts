import { useState, useEffect, useRef } from 'react';
import { extractColors } from 'extract-colors';

const colorCache = new Map<string, string[]>();
const pendingExtractions = new Map<string, Promise<string[]>>();

async function extractColorsFromUrl(imageUrl: string): Promise<string[]> {
    if (colorCache.has(imageUrl)) return colorCache.get(imageUrl)!;

    if (pendingExtractions.has(imageUrl)) return pendingExtractions.get(imageUrl)!;

    const promise = extractColors(imageUrl, {
        crossOrigin: 'anonymous',
        pixels: 10000,
        distance: 0.22,
    }).then(results => {
        const hexColors = results.map(c => c.hex);
        colorCache.set(imageUrl, hexColors);
        pendingExtractions.delete(imageUrl);
        return hexColors;
    }).catch(error => {
        console.error("Failed to extract colors:", error);
        pendingExtractions.delete(imageUrl);
        return [] as string[];
    });

    pendingExtractions.set(imageUrl, promise);
    return promise;
}

export function prefetchImageColors(imageUrls: string[]) {
    imageUrls.forEach(url => extractColorsFromUrl(url));
}

export const useImageColors = (imageUrl: string | undefined) => {
    const [colors, setColors] = useState<string[]>(() =>
        imageUrl && colorCache.has(imageUrl) ? colorCache.get(imageUrl)! : []
    );
    const urlRef = useRef(imageUrl);

    useEffect(() => {
        urlRef.current = imageUrl;
        if (!imageUrl) { setColors([]); return; }

        if (colorCache.has(imageUrl)) {
            setColors(colorCache.get(imageUrl)!);
            return;
        }

        extractColorsFromUrl(imageUrl).then(hexColors => {
            if (urlRef.current === imageUrl) setColors(hexColors);
        });
    }, [imageUrl]);

    return colors;
};
