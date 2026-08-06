'use client';

import { useState, useEffect } from 'react';

type NetworkType = 'slow-2g' | '2g' | '3g' | '4g';

export function useNetworkStatus() {
    const [effectiveType, setEffectiveType] = useState<NetworkType | 'unknown'>('unknown');
    const [saveData, setSaveData] = useState<boolean>(false);

    useEffect(() => {
        // Check if navigator.connection is available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

        if (!connection) {
            setEffectiveType('4g'); // Assume fast if API not supported
            return;
        }

        const updateConnectionStatus = () => {
            setEffectiveType(connection.effectiveType);
            setSaveData(connection.saveData);
        };

        updateConnectionStatus();

        connection.addEventListener('change', updateConnectionStatus);

        return () => {
            connection.removeEventListener('change', updateConnectionStatus);
        };
    }, []);

    const isLowEnd = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g' || saveData;

    return { effectiveType, saveData, isLowEnd };
}
