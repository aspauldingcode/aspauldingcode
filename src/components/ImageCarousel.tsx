'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';

type ImgSize = { w: number; h: number };

const FALLBACK: ImgSize = { w: 4, h: 3 };
const EPS = 0.02;

/** Fixed landscape stage for the whole gallery. Never portrait. */
function stageAspect(sizes: ImgSize[]): ImgSize {
  const list = sizes.length > 0 ? sizes : [FALLBACK];
  if (list.some((s) => s.h > s.w)) return FALLBACK;

  if (list.length === 1) {
    const s = list[0]!;
    return s.h > s.w ? FALLBACK : { w: s.w, h: s.h };
  }

  const ratios = list.map((s) => s.w / s.h);
  const lo = Math.min(...ratios);
  const hi = Math.max(...ratios);
  if (hi - lo > EPS || lo < 1) return FALLBACK;

  const s = list[0]!;
  return { w: s.w, h: s.h };
}

/**
 * Scroll-snap carousel. One fixed landscape stage; images contain inside.
 * Prev / index / next row; buttons and keys jump; finger swipe stays native.
 */
export default function ImageCarousel({
  images,
  alt,
  alts,
  sizes,
}: {
  images: string[];
  /** Fallback base name when `alts[i]` is missing. */
  alt: string;
  /** Per-image descriptive alt text (SEO). */
  alts?: string[];
  sizes: ImgSize[];
}) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const lockRef = useRef(false);

  const count = images.length;
  const multi = count > 1;
  const aspect = useMemo(() => stageAspect(sizes), [sizes]);

  const jump = useCallback(
    (next: number) => {
      const track = trackRef.current;
      if (!track || !multi) return;
      const w = track.clientWidth;
      if (w <= 0) return;
      const i = ((next % count) + count) % count;
      lockRef.current = true;
      indexRef.current = i;
      setIndex(i);

      const prevSnap = track.style.scrollSnapType;
      track.style.scrollSnapType = 'none';
      track.scrollLeft = i * w;
      requestAnimationFrame(() => {
        track.style.scrollSnapType = prevSnap;
        lockRef.current = false;
      });
    },
    [multi, count]
  );

  useEffect(() => {
    if (!multi) return;
    const track = trackRef.current;
    if (!track) return;

    const syncFromScroll = () => {
      if (lockRef.current) return;
      const w = track.clientWidth;
      if (w <= 0) return;
      const i = Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / w)));
      if (i === indexRef.current) return;
      indexRef.current = i;
      setIndex(i);
    };

    const onScrollEnd = () => syncFromScroll();
    track.addEventListener('scrollend', onScrollEnd);

    let settle = 0;
    const hasScrollEnd = 'onscrollend' in window;
    const onScroll = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(syncFromScroll, 80);
    };
    if (!hasScrollEnd) {
      track.addEventListener('scroll', onScroll, { passive: true });
    }

    const snap = () => {
      if (lockRef.current) return;
      const w = track.clientWidth;
      if (w <= 0) return;
      lockRef.current = true;
      track.scrollLeft = indexRef.current * w;
      requestAnimationFrame(() => {
        lockRef.current = false;
      });
    };
    const ro = new ResizeObserver(snap);
    ro.observe(track);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        jump(indexRef.current - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        jump(indexRef.current + 1);
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      track.removeEventListener('scrollend', onScrollEnd);
      track.removeEventListener('scroll', onScroll);
      window.clearTimeout(settle);
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
    };
  }, [multi, count, jump]);

  if (!count) return null;

  const frameStyle = {
    '--aw': aspect.w,
    '--ah': aspect.h,
  } as CSSProperties;

  return (
    <div className="carousel-block">
      <div className="carousel">
        <div className="carousel-frame" style={frameStyle}>
          <div
            ref={trackRef}
            className="carousel-track"
            tabIndex={multi ? 0 : undefined}
            role="region"
            aria-roledescription={multi ? 'carousel' : undefined}
            aria-label={alt}
          >
            {images.map((src, i) => {
              const dims = sizes[i] ?? FALLBACK;
              return (
                <div
                  key={`${src}-${i}`}
                  className="carousel-slide"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                  aria-hidden={multi && i !== index ? true : undefined}
                >
                  <Image
                    src={src}
                    alt={
                      alts?.[i]?.trim() ||
                      (count > 1 ? `${alt} (${i + 1} of ${count})` : alt)
                    }
                    width={dims.w}
                    height={dims.h}
                    sizes="(max-width: 640px) 100vw, 40rem"
                    quality={75}
                    className="carousel-img"
                    priority={i === 0}
                    draggable={false}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {multi ? (
        <nav className="ctrl-row center" aria-label="Gallery controls">
          <button
            type="button"
            className="ctrl"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              jump(indexRef.current - 1);
            }}
            aria-label="Previous image"
          >
            <span className="nf" aria-hidden>
              󰅁
            </span>
          </button>
          <p className="ctrl-meta" aria-live="polite">
            {index + 1} / {count}
          </p>
          <button
            type="button"
            className="ctrl"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              jump(indexRef.current + 1);
            }}
            aria-label="Next image"
          >
            <span className="nf" aria-hidden>
              󰅂
            </span>
          </button>
        </nav>
      ) : null}
    </div>
  );
}
