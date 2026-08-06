'use client';

import { useEffect, useRef } from 'react';

/**
 * One document at a time. Src is set on the element (Safari is unreliable when
 * starting from about:blank and assigning in an effect). Cleanup still blanks
 * the frame so leaving /view tears down network/media/timers.
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

    // Re-assert after mount: WebKit sometimes keeps a stale about:blank
    // document if the attribute was present before hydration.
    if (el.getAttribute('src') !== src) {
      el.src = src;
    }

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
      src={src}
      referrerPolicy="strict-origin-when-cross-origin"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
}
