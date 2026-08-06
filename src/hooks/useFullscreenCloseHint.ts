'use client';

import { useEffect, useState } from 'react';

function detectFullscreen(): boolean {
  if (typeof document === 'undefined') return false;

  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };

  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

export function useFullscreenCloseHint() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(detectFullscreen());
    sync();

    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync as EventListener);
    document.addEventListener('mozfullscreenchange', sync as EventListener);
    document.addEventListener('MSFullscreenChange', sync as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync as EventListener);
      document.removeEventListener('mozfullscreenchange', sync as EventListener);
      document.removeEventListener('MSFullscreenChange', sync as EventListener);
    };
  }, []);

  return {
    isFullscreen,
    closeHintKey: isFullscreen ? '`' : 'ESC',
    closeHintKeyHuman: isFullscreen ? '`' : 'Esc',
  };
}
