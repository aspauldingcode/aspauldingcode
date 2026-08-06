'use client';

import { useEffect, useRef } from 'react';

/**
 * One document at a time. Assigns src in an effect and blanks it on cleanup
 * so leaving /view (or switching u=) actually tears down the framed site
 * (network, media, timers) instead of leaving a zombie iframe document.
 */
export default function EmbedFrame({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.src = src;

    return () => {
      try {
        el.src = 'about:blank';
        el.removeAttribute('src');
      } catch {
        /* ignore */
      }
    };
  }, [src]);

  return (
    <iframe
      ref={ref}
      className="embed-frame"
      title={title}
      src="about:blank"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
}
