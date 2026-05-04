'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, PanInfo, useMotionValue, useDragControls } from 'framer-motion';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { Document, Page, pdfjs } from 'react-pdf';
import { useFullscreenCloseHint } from '@/hooks/useFullscreenCloseHint';
import { useTheme } from '../context/ThemeContext';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ResumeViewerProps {
    onCheckClose: () => void;
    cachedResume: string | null;
}

/** 1 = fit-width in the scroll port (shown as 100%). Zoom in only; no shrinking below fit. */
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP_BUTTON = 0.15;
const WHEEL_ZOOM_SENSITIVITY = 0.009;
/** After ctrl/meta wheel stops, commit one PDF re-raster (matches pinch “release”). */
const WHEEL_PINCH_COMMIT_MS = 200;

/** Base touch-action when not in a 2-finger pinch — both axes so zoomed PDF can pan on all engines. */
const SCROLL_TOUCH_ACTION = 'pan-x pan-y';

function clampZoom(z: number): number {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

/** CSS `zoom` on the PDF layer grows layout from the top-left; keep the viewport point under (clientX, clientY) stable. */
function syncScrollForLayerZoom(
    el: HTMLElement,
    clientX: number,
    clientY: number,
    zOld: number,
    zNew: number,
) {
    if (Math.abs(zNew - zOld) < 1e-7 || zOld <= 0) return;
    const r = el.getBoundingClientRect();
    const mx = clientX - r.left;
    const my = clientY - r.top;
    el.scrollLeft = (el.scrollLeft + mx) * (zNew / zOld) - mx;
    el.scrollTop = (el.scrollTop + my) * (zNew / zOld) - my;
}

/** After layer pinch commits, map scroll through measured extents so the focal point survives zoom clear + PDF re-layout. */
function applyLayerHandoffScroll(
    el: HTMLElement,
    p: {
        scrollLeft: number;
        scrollTop: number;
        focalX: number;
        focalY: number;
        scrollWidthBefore: number;
        scrollHeightBefore: number;
    },
) {
    if (!el.isConnected) return;
    const maxL = Math.max(0, el.scrollWidth - el.clientWidth);
    const maxT = Math.max(0, el.scrollHeight - el.clientHeight);
    const swOld = p.scrollWidthBefore;
    const shOld = p.scrollHeightBefore;
    const kx = el.scrollWidth / swOld;
    const ky = el.scrollHeight / shOld;
    const contentX = p.scrollLeft + p.focalX;
    const contentY = p.scrollTop + p.focalY;
    el.scrollLeft = Math.min(maxL, Math.max(0, contentX * kx - p.focalX));
    el.scrollTop = Math.min(maxT, Math.max(0, contentY * ky - p.focalY));
}

type ZoomFocalPending =
    | {
          mode: 'intrinsic';
          prevZoom: number;
          focalX: number;
          focalY: number;
          scrollLeftBeforeCommit: number;
          scrollTopBeforeCommit: number;
      }
    | {
          /**
           * Pinch/wheel used CSS `zoom` while intrinsic zoom stayed at `prevIntrinsicZoom`.
           * Scroll values are in the zoomed layout; map through real scroll extents so PDF re-raster
           * (floors, padding, async height) does not drift the focal point.
           */
          mode: 'layerHandoff';
          scrollLeft: number;
          scrollTop: number;
          focalX: number;
          focalY: number;
          scrollWidthBefore: number;
          scrollHeightBefore: number;
      };

export default function ResumeViewer({ onCheckClose, cachedResume }: ResumeViewerProps) {
    const HINT_PADDING = 12;
    const EXPAND_HINT_HALF_WIDTH = 74;
    const bp = useBreakpoints();
    const { toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    const pdfUrl = '/resume_alex_spaulding.pdf';
    const [numPages, setNumPages] = useState<number>(0);
    /** Count of <Page> onRenderSuccess for current raster batch; hides canvases until all paint (avoids white pdf.js clear flash). */
    const [resumePagesPainted, setResumePagesPainted] = useState(0);
    const numPagesRef = useRef(0);
    numPagesRef.current = numPages;
    /** Scroll-port “fit width” in px at 100% zoom — multiplied by `zoom` for react-pdf `width` so each zoom level re-rasters from vectors. */
    const [fitBaseWidth, setFitBaseWidth] = useState(880);
    /** Zoom factor (1 = fit-width). Drives PDF canvas width = fitBaseWidth × zoom (not CSS scale). */
    const [zoom, setZoom] = useState(1);
    const [pdfDevicePixelRatio, setPdfDevicePixelRatio] = useState(1);
    const zoomRef = useRef(1);
    /** After commit, scroll so this viewport point stays over the same PDF content (pinch midpoint, cursor, etc.). */
    const zoomFocalPendingRef = useRef<ZoomFocalPending | null>(null);
    const gesturePinchActiveRef = useRef(false);
    const lastGestureScaleRef = useRef(1);
    const lastGestureFocalRef = useRef<{ focalX: number; focalY: number } | null>(null);

    const pinchStartDistRef = useRef<number | null>(null);
    const pinchStartZoomRef = useRef(1.0);
    /** Last pinch ratio (finger distance / start distance) for commit on release */
    const lastPinchRatioRef = useRef(1);
    /** Last pinch midpoint in scroll-container coordinates (for focal commit) */
    const lastPinchFocalRef = useRef<{ focalX: number; focalY: number } | null>(null);
    /** Previous `layer.style.zoom` during pinch — used to keep pinch center stable (zoom scales layout from top-left otherwise). */
    const pinchPrevLayerZoomRef = useRef(1);
    /** Previous pinch midpoint (viewport/client coords) for two-finger pan */
    const lastPinchMidClientRef = useRef<{ x: number; y: number } | null>(null);
    /** Ctrl/meta wheel: accumulate scale on PDF layer; commit after quiet period (no PDF re-raster per wheel tick). */
    const wheelPinchBaseZoomRef = useRef(1);
    const wheelPinchLayerScaleRef = useRef(1);
    const wheelPinchPrevLayerScaleRef = useRef(1);
    const wheelPinchCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Last ctrl/meta wheel pointer position in scroll-container coords — for scroll preservation on commit. */
    const lastCtrlWheelFocalRef = useRef<{ focalX: number; focalY: number } | null>(null);
    const pdfPinchVisualRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const expandButtonRef = useRef<HTMLButtonElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const closeHintTooltipRef = useRef<HTMLSpanElement | null>(null);
    const [isExpandHintVisible, setIsExpandHintVisible] = useState(false);
    const [isCloseHintVisible, setIsCloseHintVisible] = useState(false);
    const [expandHintPosition, setExpandHintPosition] = useState({ x: 0, y: 0 });
    const [closeHintPosition, setCloseHintPosition] = useState({ x: 0, y: 0 });
    const { closeHintKey } = useFullscreenCloseHint();
    const dragY = useMotionValue(0);
    const dragControls = useDragControls(); // Add drag controls
    const isHeaderDraggingRef = useRef(false);
    const cancelDragRef = useRef(false);

    const resumeFile = useMemo(() => {
        if (!cachedResume) return `${pdfUrl}#view=FitH`;
        if (cachedResume.startsWith('data:')) return cachedResume;
        return `data:application/pdf;base64,${cachedResume}`;
    }, [cachedResume, pdfUrl]);

    const handleOpenNewTab = () => {
        // Use the static URL for external opening to ensure browser native features work best
        window.open(pdfUrl, '_blank');
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = 'alex_spaulding_resume.pdf';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        if (cancelDragRef.current) {
            cancelDragRef.current = false;
            dragY.set(0);
            return;
        }
        if (info.offset.y > 100 || info.velocity.y > 500) {
            onCheckClose();
        }
    };

    const beginHeaderDrag = (event: any) => {
      isHeaderDraggingRef.current = true;
      cancelDragRef.current = false;
      dragControls.start(event);
    };

    const handlePdfLoadSuccess = ({ numPages: pages }: { numPages: number }) => {
      setNumPages(pages);
    };

    const pageRenderWidth = Math.max(180, Math.floor(fitBaseWidth * zoom));

    useLayoutEffect(() => {
        setResumePagesPainted(0);
    }, [pageRenderWidth, numPages]);

    useEffect(() => {
        if (numPages === 0 || resumePagesPainted >= numPages) return;
        const t = window.setTimeout(() => {
            setResumePagesPainted(numPagesRef.current);
        }, 3500);
        return () => window.clearTimeout(t);
    }, [numPages, resumePagesPainted, pageRenderWidth]);

    const onResumePageRenderSuccess = useCallback(() => {
        setResumePagesPainted((c) => {
            const cap = numPagesRef.current;
            if (cap === 0 || c >= cap) return c;
            return c + 1;
        });
    }, []);

    /** Placeholder height ≈ US Letter (11/8.5) × width so redraw doesn’t collapse to a thin strip. */
    const pageLoadingMinHeight = useMemo(
        () => Math.max(200, Math.floor(pageRenderWidth * (11 / 8.5))),
        [pageRenderWidth],
    );

    const commitZoomWithFocal = useCallback(
        (
            nextZoom: number,
            focal: { focalX: number; focalY: number },
            prevZoomForFocal?: number,
            options?: { fromLayerPinch?: boolean },
        ) => {
            const layer = pdfPinchVisualRef.current;
            const el = scrollContainerRef.current;
            const prev = prevZoomForFocal ?? zoomRef.current;
            const clamped = clampZoom(nextZoom);
            if (Math.abs(clamped - prev) < 1e-6) return;
            const scrollSnap = el
                ? { sl: el.scrollLeft, st: el.scrollTop }
                : { sl: 0, st: 0 };
            const extentSnap = el
                ? { sw: el.scrollWidth, sh: el.scrollHeight }
                : { sw: 1, sh: 1 };
            if (layer) layer.style.zoom = '';
            if (options?.fromLayerPinch) {
                zoomFocalPendingRef.current = {
                    mode: 'layerHandoff',
                    scrollLeft: scrollSnap.sl,
                    scrollTop: scrollSnap.st,
                    focalX: focal.focalX,
                    focalY: focal.focalY,
                    scrollWidthBefore: Math.max(1, extentSnap.sw),
                    scrollHeightBefore: Math.max(1, extentSnap.sh),
                };
            } else {
                zoomFocalPendingRef.current = {
                    mode: 'intrinsic',
                    prevZoom: prev,
                    focalX: focal.focalX,
                    focalY: focal.focalY,
                    scrollLeftBeforeCommit: scrollSnap.sl,
                    scrollTopBeforeCommit: scrollSnap.st,
                };
            }
            setZoom(clamped);
        },
        [],
    );

    const clearPdfPinchVisual = useCallback(() => {
      const layer = pdfPinchVisualRef.current;
      if (layer) {
        layer.style.zoom = '';
      }
    }, []);

    const getEffectiveZoomWithWheelLayer = useCallback(() => {
      if (wheelPinchLayerScaleRef.current !== 1) {
        return clampZoom(wheelPinchBaseZoomRef.current * wheelPinchLayerScaleRef.current);
      }
      return zoomRef.current;
    }, []);

    const abortWheelPinchSession = useCallback(() => {
      if (wheelPinchCommitTimerRef.current) {
        clearTimeout(wheelPinchCommitTimerRef.current);
        wheelPinchCommitTimerRef.current = null;
      }
      const layer = pdfPinchVisualRef.current;
      if (layer && wheelPinchLayerScaleRef.current !== 1) {
        layer.style.zoom = '';
      }
      wheelPinchLayerScaleRef.current = 1;
      wheelPinchPrevLayerScaleRef.current = 1;
    }, []);

    const zoomIn = useCallback(() => {
      clearPdfPinchVisual();
      const el = scrollContainerRef.current;
      const prev = getEffectiveZoomWithWheelLayer();
      abortWheelPinchSession();
      zoomRef.current = prev;
      const next = clampZoom(prev + ZOOM_STEP_BUTTON);
      if (!el) {
        setZoom(next);
        return;
      }
      commitZoomWithFocal(next, { focalX: el.clientWidth / 2, focalY: el.clientHeight / 2 });
    }, [abortWheelPinchSession, clearPdfPinchVisual, commitZoomWithFocal, getEffectiveZoomWithWheelLayer]);

    const zoomOut = useCallback(() => {
      clearPdfPinchVisual();
      const el = scrollContainerRef.current;
      const prev = getEffectiveZoomWithWheelLayer();
      abortWheelPinchSession();
      zoomRef.current = prev;
      const next = clampZoom(prev - ZOOM_STEP_BUTTON);
      if (!el) {
        setZoom(next);
        return;
      }
      commitZoomWithFocal(next, { focalX: el.clientWidth / 2, focalY: el.clientHeight / 2 });
    }, [abortWheelPinchSession, clearPdfPinchVisual, commitZoomWithFocal, getEffectiveZoomWithWheelLayer]);

    const zoomReset = useCallback(() => {
      clearPdfPinchVisual();
      abortWheelPinchSession();
      zoomFocalPendingRef.current = null;
      setZoom(1);
    }, [abortWheelPinchSession, clearPdfPinchVisual]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            e.stopPropagation();

            const key = e.key.toLowerCase();
            if (key === 'escape' || e.key === '`' || e.code === 'Backquote') {
                onCheckClose();
            }
            if (key === 'd') {
                handleDownload();
            }
            if (key === 'f') {
                handleOpenNewTab();
            }
            if (key === 't') {
                e.preventDefault();
                toggleTheme();
            }
            if ((e.key === '+' || e.key === '=') && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                zoomIn();
            }
            if ((e.key === '-' || e.key === '_') && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                zoomOut();
            }
            if (key === '0' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                zoomReset();
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [onCheckClose, toggleTheme, zoomIn, zoomOut, zoomReset]);

    const updateExpandHintPosition = useCallback(() => {
      const button = expandButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const anchorX = rect.left + rect.width / 2;
      setExpandHintPosition({
        x: Math.min(
          window.innerWidth - HINT_PADDING - EXPAND_HINT_HALF_WIDTH,
          Math.max(HINT_PADDING + EXPAND_HINT_HALF_WIDTH, anchorX),
        ),
        y: Math.max(HINT_PADDING, rect.top - 10),
      });
    }, [HINT_PADDING, EXPAND_HINT_HALF_WIDTH]);

    const updateCloseHintPosition = useCallback(() => {
      const button = closeButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const anchorX = rect.left + rect.width / 2;
      const tooltipRect = closeHintTooltipRef.current?.getBoundingClientRect();
      const hintHalfWidth = Math.max(56, (tooltipRect?.width ?? 168) / 2);
      const hintHeight = Math.max(20, tooltipRect?.height ?? 28);
      const minX = HINT_PADDING + hintHalfWidth;
      const maxX = window.innerWidth - HINT_PADDING - hintHalfWidth;
      const minY = HINT_PADDING + hintHeight;
      const maxY = window.innerHeight - HINT_PADDING;
      setCloseHintPosition({
        x: maxX < minX ? window.innerWidth / 2 : Math.min(maxX, Math.max(minX, anchorX)),
        y: maxY < minY ? Math.max(HINT_PADDING, rect.top - 10) : Math.min(maxY, Math.max(minY, rect.top - 10)),
      });
    }, [HINT_PADDING]);

    const showCloseHint = useCallback(() => {
      setIsCloseHintVisible(true);
      requestAnimationFrame(() => {
        updateCloseHintPosition();
      });
    }, [updateCloseHintPosition]);

    useEffect(() => {
      if ((!isExpandHintVisible && !isCloseHintVisible) || !bp.hasKeyboard) return;
      if (isExpandHintVisible) updateExpandHintPosition();
      if (isCloseHintVisible) updateCloseHintPosition();
      const rafId = requestAnimationFrame(() => {
        if (isCloseHintVisible) updateCloseHintPosition();
      });
      window.addEventListener('resize', updateExpandHintPosition);
      window.addEventListener('scroll', updateExpandHintPosition, true);
      window.addEventListener('resize', updateCloseHintPosition);
      window.addEventListener('scroll', updateCloseHintPosition, true);
      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', updateExpandHintPosition);
        window.removeEventListener('scroll', updateExpandHintPosition, true);
        window.removeEventListener('resize', updateCloseHintPosition);
        window.removeEventListener('scroll', updateCloseHintPosition, true);
      };
    }, [isExpandHintVisible, isCloseHintVisible, bp.hasKeyboard, updateExpandHintPosition, updateCloseHintPosition]);

    useLayoutEffect(() => {
      if (!mounted) return;
      const container = scrollContainerRef.current;
      if (!container) return;

      const updateFitBase = () => {
        const horizontalPad = bp.isSm ? 48 : 20;
        const base = Math.max(180, Math.min(1180, Math.floor(container.clientWidth - horizontalPad)));
        setFitBaseWidth(base);
      };

      updateFitBase();
      const ro = new ResizeObserver(() => updateFitBase());
      ro.observe(container);
      window.addEventListener('resize', updateFitBase);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', updateFitBase);
      };
    }, [mounted, bp.isSm]);

    useLayoutEffect(() => {
      if (!mounted) return;
      const cap = () => Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.5);
      setPdfDevicePixelRatio(cap());
      const onResize = () => setPdfDevicePixelRatio(cap());
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, [mounted]);

    useEffect(() => {
      const resetDragging = () => {
        isHeaderDraggingRef.current = false;
      };
      const handleWindowMouseOut = (event: MouseEvent) => {
        if (!isHeaderDraggingRef.current) return;
        if (event.relatedTarget !== null) return;
        cancelDragRef.current = true;
        isHeaderDraggingRef.current = false;
        dragY.stop();
        dragY.set(0);
      };
      window.addEventListener('mouseup', resetDragging);
      window.addEventListener('mouseout', handleWindowMouseOut);
      return () => {
        window.removeEventListener('mouseup', resetDragging);
        window.removeEventListener('mouseout', handleWindowMouseOut);
      };
    }, [dragY]);

    // Pinch: two fingers — during gesture use CSS `zoom` on the PDF layer (no react-pdf width churn);
    // on release, clear visual zoom and commit one `setZoom` so PDF re-rasters once.
    // - Init pinch on touchmove when a 2nd finger lands (Safari often never sends touchstart with 2 touches).
    useEffect(() => {
      if (!mounted) return;
      const el = scrollContainerRef.current;
      if (!el) return;

      const dist = (t: TouchList) =>
        Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

      /** If ctrl-wheel left a pending visual layer, commit before touch pinch (same as timer). */
      const flushPendingWheelLayer = (): number => {
        if (wheelPinchCommitTimerRef.current) {
          clearTimeout(wheelPinchCommitTimerRef.current);
          wheelPinchCommitTimerRef.current = null;
        }
        const layer = pdfPinchVisualRef.current;
        const base = wheelPinchBaseZoomRef.current;
        const s = wheelPinchLayerScaleRef.current;
        if (s === 1) return zoomRef.current;
        const nextZ = clampZoom(base * s);
        if (layer) layer.style.zoom = '';
        wheelPinchLayerScaleRef.current = 1;
        wheelPinchPrevLayerScaleRef.current = 1;
        const prevZ = zoomRef.current;
        if (Math.abs(nextZ - prevZ) > 1e-4) {
          setZoom(nextZ);
        }
        zoomRef.current = nextZ;
        return nextZ;
      };

      const beginPinch = (e: TouchEvent) => {
        const z0 = flushPendingWheelLayer();
        el.style.touchAction = 'none';
        pinchStartDistRef.current = dist(e.touches);
        pinchStartZoomRef.current = z0;
        lastPinchRatioRef.current = 1;
        pinchPrevLayerZoomRef.current = 1;
        const t = e.touches;
        lastPinchMidClientRef.current = {
          x: (t[0].clientX + t[1].clientX) / 2,
          y: (t[0].clientY + t[1].clientY) / 2,
        };
        const layer = pdfPinchVisualRef.current;
        if (layer) layer.style.zoom = '1';
      };

      const onStart = (e: TouchEvent) => {
        if (e.touches.length !== 2) return;
        e.preventDefault();
        beginPinch(e);
      };

      const onMove = (e: TouchEvent) => {
        if (e.touches.length !== 2) return;
        e.preventDefault();
        if (pinchStartDistRef.current === null) {
          beginPinch(e);
          return;
        }
        const t = e.touches;
        const midX = (t[0].clientX + t[1].clientX) / 2;
        const midY = (t[0].clientY + t[1].clientY) / 2;

        // Two-finger pan (native scroll while zoomed)
        const prevMid = lastPinchMidClientRef.current;
        if (prevMid) {
          el.scrollLeft -= midX - prevMid.x;
          el.scrollTop -= midY - prevMid.y;
        }
        lastPinchMidClientRef.current = { x: midX, y: midY };

        const rawScale = dist(e.touches) / pinchStartDistRef.current;
        lastPinchRatioRef.current = rawScale;
        const r = el.getBoundingClientRect();
        lastPinchFocalRef.current = { focalX: midX - r.left, focalY: midY - r.top };

        const zOld = pinchPrevLayerZoomRef.current;
        const zNew = rawScale;
        syncScrollForLayerZoom(el, midX, midY, zOld, zNew);
        pinchPrevLayerZoomRef.current = zNew;

        const layer = pdfPinchVisualRef.current;
        if (layer) layer.style.zoom = String(zNew);
      };

      const onEnd = (e: TouchEvent) => {
        if (e.touches.length >= 2) return;
        const hadPinch = pinchStartDistRef.current !== null;
        if (hadPinch) {
          e.preventDefault();
        }
        el.style.touchAction = SCROLL_TOUCH_ACTION;
        const layer = pdfPinchVisualRef.current;
        if (hadPinch) {
          const startZ = pinchStartZoomRef.current;
          const ratio = lastPinchRatioRef.current;
          const nextZ = clampZoom(startZ * ratio);
          pinchPrevLayerZoomRef.current = 1;
          lastPinchMidClientRef.current = null;
          const focal = lastPinchFocalRef.current;
          const center = { focalX: el.clientWidth / 2, focalY: el.clientHeight / 2 };
          if (Math.abs(nextZ - startZ) > 1e-4) {
            commitZoomWithFocal(nextZ, focal ?? center, startZ, { fromLayerPinch: true });
          } else if (layer) {
            layer.style.zoom = '';
          }
        } else if (layer) {
          layer.style.zoom = '';
        }
        pinchStartDistRef.current = null;
        lastPinchFocalRef.current = null;
      };

      el.addEventListener('touchstart', onStart, { passive: false, capture: true });
      el.addEventListener('touchmove', onMove, { passive: false, capture: true });
      el.addEventListener('touchend', onEnd, { passive: false, capture: true });
      el.addEventListener('touchcancel', onEnd, { passive: false, capture: true });

      return () => {
        el.style.touchAction = SCROLL_TOUCH_ACTION;
        const vis = pdfPinchVisualRef.current;
        if (vis) vis.style.zoom = '';
        el.removeEventListener('touchstart', onStart, { capture: true });
        el.removeEventListener('touchmove', onMove, { capture: true });
        el.removeEventListener('touchend', onEnd, { capture: true });
        el.removeEventListener('touchcancel', onEnd, { capture: true });
      };
    }, [mounted, numPages, commitZoomWithFocal]);

    // Ctrl/meta + wheel (trackpad) and Safari gesture* on fine pointers only — avoids fighting touch pinch on iOS.
    useEffect(() => {
      if (!mounted) return;
      const el = scrollContainerRef.current;
      if (!el) return;

      const coarsePointer =
        typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

      const scheduleWheelPinchCommit = () => {
        if (wheelPinchCommitTimerRef.current) {
          clearTimeout(wheelPinchCommitTimerRef.current);
        }
        wheelPinchCommitTimerRef.current = setTimeout(() => {
          wheelPinchCommitTimerRef.current = null;
          const scrollEl = scrollContainerRef.current;
          const base = wheelPinchBaseZoomRef.current;
          const s = wheelPinchLayerScaleRef.current;
          const nextZ = clampZoom(base * s);
          wheelPinchLayerScaleRef.current = 1;
          wheelPinchPrevLayerScaleRef.current = 1;
          const f = lastCtrlWheelFocalRef.current;
          const center = scrollEl
            ? { focalX: scrollEl.clientWidth / 2, focalY: scrollEl.clientHeight / 2 }
            : { focalX: 0, focalY: 0 };
          if (Math.abs(nextZ - base) > 1e-4) {
            commitZoomWithFocal(nextZ, f ?? center, base, { fromLayerPinch: true });
          } else {
            const layer = pdfPinchVisualRef.current;
            if (layer) layer.style.zoom = '';
          }
        }, WHEEL_PINCH_COMMIT_MS);
      };

      const onWheel = (e: WheelEvent) => {
        if (gesturePinchActiveRef.current) return;
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        e.stopPropagation();
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 16;
        else if (e.deltaMode === 2) delta *= el.clientHeight || 480;
        const factor = Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY);

        if (wheelPinchLayerScaleRef.current === 1 && wheelPinchPrevLayerScaleRef.current === 1) {
          wheelPinchBaseZoomRef.current = zoomRef.current;
          const layer = pdfPinchVisualRef.current;
          if (layer) layer.style.zoom = '1';
        }

        const base = wheelPinchBaseZoomRef.current;
        const targetProduct = clampZoom(base * wheelPinchLayerScaleRef.current * factor);
        const zNew = targetProduct / base;
        if (Math.abs(zNew - wheelPinchLayerScaleRef.current) < 1e-7) {
          scheduleWheelPinchCommit();
          return;
        }

        const zOld = wheelPinchPrevLayerScaleRef.current;
        syncScrollForLayerZoom(el, e.clientX, e.clientY, zOld, zNew);
        wheelPinchLayerScaleRef.current = zNew;
        wheelPinchPrevLayerScaleRef.current = zNew;
        {
          const r = el.getBoundingClientRect();
          lastCtrlWheelFocalRef.current = { focalX: e.clientX - r.left, focalY: e.clientY - r.top };
        }

        const layer = pdfPinchVisualRef.current;
        if (layer) layer.style.zoom = String(zNew);
        scheduleWheelPinchCommit();
      };

      el.addEventListener('wheel', onWheel, { passive: false, capture: true });

      const hasSafariGesture = typeof window !== 'undefined' && 'ongesturestart' in window;
      const gesturePinch = { startZoom: 1 };

      const onGestureStart = (ev: Event) => {
        (ev as { preventDefault?: () => void }).preventDefault?.();
        if (wheelPinchCommitTimerRef.current) {
          clearTimeout(wheelPinchCommitTimerRef.current);
          wheelPinchCommitTimerRef.current = null;
        }
        const wLayer = pdfPinchVisualRef.current;
        const wb = wheelPinchBaseZoomRef.current;
        const ws = wheelPinchLayerScaleRef.current;
        let zStart = zoomRef.current;
        if (ws !== 1) {
          const nz = clampZoom(wb * ws);
          if (wLayer) wLayer.style.zoom = '';
          wheelPinchLayerScaleRef.current = 1;
          wheelPinchPrevLayerScaleRef.current = 1;
          if (Math.abs(nz - zoomRef.current) > 1e-4) {
            setZoom(nz);
          }
          zoomRef.current = nz;
          zStart = nz;
        }
        gesturePinchActiveRef.current = true;
        gesturePinch.startZoom = zStart;
        lastGestureScaleRef.current = 1;
        pinchPrevLayerZoomRef.current = 1;
        lastGestureFocalRef.current = null;
        const layer = pdfPinchVisualRef.current;
        if (layer) layer.style.zoom = '1';
      };
      const onGestureChange = (ev: Event) => {
        (ev as { preventDefault?: () => void }).preventDefault?.();
        const scale = (ev as unknown as { scale?: number }).scale ?? 1;
        lastGestureScaleRef.current = scale;
        const ge = ev as unknown as { clientX?: number; clientY?: number };
        const r = el.getBoundingClientRect();
        const cx = typeof ge.clientX === 'number' ? ge.clientX : r.left + r.width / 2;
        const cy = typeof ge.clientY === 'number' ? ge.clientY : r.top + r.height / 2;
        lastGestureFocalRef.current = { focalX: cx - r.left, focalY: cy - r.top };

        const zOld = pinchPrevLayerZoomRef.current;
        const zNew = scale;
        syncScrollForLayerZoom(el, cx, cy, zOld, zNew);
        pinchPrevLayerZoomRef.current = zNew;

        const layer = pdfPinchVisualRef.current;
        if (layer) layer.style.zoom = String(scale);
      };
      const onGestureEnd = (ev: Event) => {
        (ev as { preventDefault?: () => void }).preventDefault?.();
        gesturePinchActiveRef.current = false;
        const startZ = gesturePinch.startZoom;
        const scale = lastGestureScaleRef.current;
        const nextZ = clampZoom(startZ * scale);
        pinchPrevLayerZoomRef.current = 1;
        const focal = lastGestureFocalRef.current;
        const center = { focalX: el.clientWidth / 2, focalY: el.clientHeight / 2 };
        lastGestureFocalRef.current = null;
        if (Math.abs(nextZ - startZ) > 1e-4) {
          commitZoomWithFocal(nextZ, focal ?? center, startZ, { fromLayerPinch: true });
        } else {
          const layer = pdfPinchVisualRef.current;
          if (layer) layer.style.zoom = '';
        }
      };

      if (hasSafariGesture && !coarsePointer) {
        el.addEventListener('gesturestart', onGestureStart as EventListener, { passive: false });
        el.addEventListener('gesturechange', onGestureChange as EventListener, { passive: false });
        el.addEventListener('gestureend', onGestureEnd as EventListener, { passive: false });
      }

      return () => {
        if (wheelPinchCommitTimerRef.current) {
          clearTimeout(wheelPinchCommitTimerRef.current);
          wheelPinchCommitTimerRef.current = null;
        }
        el.removeEventListener('wheel', onWheel, { capture: true });
        if (hasSafariGesture && !coarsePointer) {
          el.removeEventListener('gesturestart', onGestureStart as EventListener);
          el.removeEventListener('gesturechange', onGestureChange as EventListener);
          el.removeEventListener('gestureend', onGestureEnd as EventListener);
        }
      };
    }, [mounted, numPages, commitZoomWithFocal]);

  useLayoutEffect(() => {
    if (!mounted) return;
    const el = scrollContainerRef.current;
    if (!el) return;

    const pending = zoomFocalPendingRef.current;
    let cancelLayerFollow: (() => void) | undefined;
    if (pending) {
      const p = pending;
      zoomFocalPendingRef.current = null;

      const clampScroll = () => {
        if (!el.isConnected) return;
        const maxL = Math.max(0, el.scrollWidth - el.clientWidth);
        const maxT = Math.max(0, el.scrollHeight - el.clientHeight);
        if (p.mode === 'layerHandoff') {
          applyLayerHandoffScroll(el, p);
        } else {
          const ratio = zoom / p.prevZoom;
          if (Math.abs(ratio - 1) > 1e-6) {
            const { focalX, focalY, scrollLeftBeforeCommit, scrollTopBeforeCommit } = p;
            const contentX = scrollLeftBeforeCommit + focalX;
            const contentY = scrollTopBeforeCommit + focalY;
            el.scrollLeft = Math.min(maxL, Math.max(0, contentX * ratio - focalX));
            el.scrollTop = Math.min(maxT, Math.max(0, contentY * ratio - focalY));
          }
        }
      };

      clampScroll();

      if (p.mode === 'layerHandoff') {
        const anchor = {
          scrollLeft: p.scrollLeft,
          scrollTop: p.scrollTop,
          focalX: p.focalX,
          focalY: p.focalY,
          scrollWidthBefore: p.scrollWidthBefore,
          scrollHeightBefore: p.scrollHeightBefore,
        };
        const layer = pdfPinchVisualRef.current;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const ro =
          layer && typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = window.setTimeout(() => {
                  debounceTimer = null;
                  applyLayerHandoffScroll(el, anchor);
                }, 90);
              })
            : null;
        ro?.observe(layer);
        const hardStop = window.setTimeout(() => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = null;
          ro?.disconnect();
        }, 900);
        cancelLayerFollow = () => {
          window.clearTimeout(hardStop);
          if (debounceTimer) clearTimeout(debounceTimer);
          ro?.disconnect();
        };
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(clampScroll);
        });
      }
    }

    zoomRef.current = zoom;

    if (zoom <= ZOOM_MIN + 0.001) {
      el.scrollLeft = 0;
    }

    return () => {
      cancelLayerFollow?.();
    };
  }, [mounted, zoom, pageRenderWidth]);

  if (!mounted) return null;

  const zoomPercent = Math.round(zoom * 100);
  /** At 100% the PDF is fit-width — no horizontal overflow; avoid pointless x-scroll / trackpad sideways pan. */
  const canPanHorizontal = zoom > ZOOM_MIN + 0.001;
  const resumePdfCanvasPending = numPages > 0 && resumePagesPainted < numPages;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center p-0 sm:p-4 md:p-8 pointer-events-none" style={{ paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)' }}>
      {/* Backdrop Container - Match Contact Modal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 z-0 pointer-events-auto overflow-hidden"
        onClick={onCheckClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        <div className="absolute inset-0 halftone-bg opacity-30 pointer-events-none" />
      </motion.div>

      <motion.div
        initial={{ y: 1000, rotate: -3, scale: 0.95 }}
        animate={{ y: 0, rotate: 0, scale: 1 }}
        exit={{ y: 1000, rotate: 3, scale: 0.95 }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        style={{ y: dragY }}
        onDragEnd={handleDragEnd}
        className="relative z-10 flex h-[95vh] w-full min-w-0 max-w-6xl flex-col pointer-events-auto sm:h-[90vh]"
      >
        {/* Dossier Folder Shadows */}
        <div 
          className="absolute inset-0 bg-base0D translate-x-3 translate-y-3 opacity-40"
          style={{ clipPath: 'polygon(0% 5%, 15% 0%, 85% 2%, 100% 7%, 98% 100%, 2% 98%)', WebkitClipPath: 'polygon(0% 5%, 15% 0%, 85% 2%, 100% 7%, 98% 100%, 2% 98%)' } as React.CSSProperties}
        />
        <div 
          className="absolute inset-0 bg-base00 translate-x-1.5 translate-y-1.5"
          style={{ clipPath: 'polygon(2% 7%, 18% 2%, 82% 0%, 98% 5%, 100% 98%, 0% 100%)', WebkitClipPath: 'polygon(2% 7%, 18% 2%, 82% 0%, 98% 5%, 100% 98%, 0% 100%)' } as React.CSSProperties}
        />

        {/* Main Content Area */}
        <div 
          className="relative flex min-h-0 min-w-0 flex-col h-full overflow-hidden bg-base01"
          style={{ clipPath: 'polygon(0% 5%, 20% 0%, 80% 2%, 100% 8%, 97% 97%, 3% 100%)', WebkitClipPath: 'polygon(0% 5%, 20% 0%, 80% 2%, 100% 8%, 97% 97%, 3% 100%)' } as React.CSSProperties}
        >
          {/* Header - Dossier Tab Style */}
          <div
            onPointerDown={beginHeaderDrag}
            className="w-full relative bg-base0D px-8 cursor-grab active:cursor-grabbing shrink-0 touch-none flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden border-b-2 border-base00"
            style={{ paddingTop: 'calc(1.5rem + var(--safe-top))', paddingBottom: '1.5rem' }}
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, var(--base00) 25%, transparent 25%, transparent 50%, var(--base00) 50%, var(--base00) 75%, transparent 75%, transparent)', backgroundSize: '5px 5px' }} />
            
            <div className="relative flex flex-col items-center sm:items-start">
              <div className="bg-base00 px-3 py-1 mb-2 -skew-x-12">
                <span className="text-[10px] font-black text-base0D uppercase tracking-[0.3em] skew-x-12 block">CONFIDANT DATA</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-base00 uppercase italic tracking-tighter leading-none">
                Alex&apos;s Dossier
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 max-w-full flex-wrap justify-center sm:justify-end">
              <div className="relative group z-[220]">
                <div className="p6-button-shadow" />
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                  className="p6-button px-3 sm:px-6 py-1.5 sm:py-2 bg-base00 text-base0D border-2 border-base0D flex items-center gap-1.5 sm:gap-2 group/btn"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 skew-x-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span className="text-[10px] sm:text-xs font-black uppercase italic skew-x-12">Download</span>
                </button>
              </div>

              <div className="relative group">
                <div className="p6-button-shadow" />
                <button
                  ref={expandButtonRef}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseEnter={() => {
                    if (!bp.hasFinePointer) return;
                    updateExpandHintPosition();
                    setIsExpandHintVisible(true);
                  }}
                  onMouseLeave={() => {
                    if (!bp.hasFinePointer) return;
                    setIsExpandHintVisible(false);
                  }}
                  onFocus={() => {
                    if (!bp.hasKeyboard) return;
                    updateExpandHintPosition();
                    setIsExpandHintVisible(true);
                  }}
                  onBlur={() => setIsExpandHintVisible(false)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenNewTab();
                  }}
                  className="p6-button p-1.5 sm:p-2 bg-base00 text-base0D border-2 border-base0D flex items-center justify-center"
                  aria-label="Open Resume in New Tab"
                  title="Expand Fullscreen (f)"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 skew-x-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H6.75A2.25 2.25 0 004.5 8.25v9A2.25 2.25 0 006.75 19.5h9A2.25 2.25 0 0018 17.25V10.5M12 12l7.5-7.5m0 0H15m4.5 0V9" />
                  </svg>
                </button>
                {bp.hasKeyboard && (
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[10px] font-sans text-base00/80 pointer-events-none">
                    (f)
                  </span>
                )}
              </div>

              <div className="relative group">
                <div className="p6-button-shadow" />
                <button
                  ref={closeButtonRef}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseEnter={() => {
                    if (!bp.hasFinePointer) return;
                    showCloseHint();
                  }}
                  onMouseLeave={() => {
                    if (!bp.hasFinePointer) return;
                    setIsCloseHintVisible(false);
                  }}
                  onFocus={() => {
                    if (!bp.hasKeyboard) return;
                    showCloseHint();
                  }}
                  onBlur={() => setIsCloseHintVisible(false)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCheckClose();
                  }}
                  className="p6-button p-1.5 sm:p-2 bg-base08 text-base00"
                  aria-label="Dismiss dossier panel"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 skew-x-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* PDF Viewer Area */}
          <div
            className={
              'flex-1 relative flex min-h-0 min-w-0 flex-col overflow-hidden resume-pdf-viewer select-none' +
              (resumePdfCanvasPending ? ' resume-pdf-canvas-pending' : '')
            }
            style={{ backgroundColor: 'var(--base00)' }}
          >
            <div
              ref={scrollContainerRef}
              id="resume-pdf-scroll"
              className={`relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-base00 ${canPanHorizontal ? 'overflow-x-auto' : 'overflow-x-hidden'}`}
              style={{
                touchAction: canPanHorizontal ? SCROLL_TOUCH_ACTION : 'pan-y',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorY: 'auto',
                overscrollBehaviorX: canPanHorizontal ? 'auto' : 'none',
                backgroundColor: 'var(--base00)',
              } as React.CSSProperties}
            >
              <div
                className="pointer-events-none absolute inset-0 z-0 bg-base00"
                style={{ backgroundColor: 'var(--base00)' }}
                aria-hidden
              />
              {/* w-max + min-w-full: scrollWidth matches rendered page width so native 2D scroll works */}
              <div
                ref={pdfPinchVisualRef}
                className="relative z-[1] mx-auto min-h-full w-max min-w-full origin-top-left space-y-5 bg-base00 px-3 py-6 select-none pb-16 sm:px-6 sm:pb-20"
              >
                <Document
                  file={resumeFile}
                  onLoadSuccess={handlePdfLoadSuccess}
                  className="min-h-[min(50vh,28rem)] !bg-base00"
                  loading={
                    <div className="min-h-[min(50vh,28rem)] w-full bg-base00 p-4 font-black uppercase italic tracking-wider text-base04">
                      Loading dossier pages...
                    </div>
                  }
                  error={
                    <div className="min-h-[min(50vh,28rem)] w-full bg-base00 p-4 font-black uppercase italic tracking-wider text-base08">
                      Failed to load dossier.
                    </div>
                  }
                >
                  {Array.from({ length: numPages }, (_, index) => (
                    <div key={`resume-page-${index + 1}`} className="resume-page-shell rounded-sm border-2 border-base02 bg-base00 shadow-[6px_6px_0px_var(--base08)] overflow-hidden">
                      {/* Omit canvasBackground: raster stays white so :root canvas filters match base16 paper/ink. */}
                      <Page
                        pageNumber={index + 1}
                        width={pageRenderWidth}
                        devicePixelRatio={pdfDevicePixelRatio}
                        renderTextLayer={false}
                        renderAnnotationLayer
                        className="mx-auto"
                        onRenderSuccess={onResumePageRenderSuccess}
                        onRenderError={onResumePageRenderSuccess}
                        loading={
                          <div
                            aria-hidden
                            className="w-full bg-base00"
                            style={{ minHeight: pageLoadingMinHeight }}
                          />
                        }
                      />
                    </div>
                  ))}
                </Document>
              </div>
            </div>

            {/* Zoom controls — inset from edges so dossier clip-path does not crop them */}
            <div
              className="pointer-events-none absolute z-40"
              style={{
                right: 'max(12px, calc(env(safe-area-inset-right, 0px) + 10px), 4%)',
                bottom: 'max(12px, calc(env(safe-area-inset-bottom, 0px) + 10px), 4%)',
              }}
            >
              <div className="pointer-events-auto flex items-center gap-0.5 rounded-sm border-2 border-base0D/50 bg-base01/95 p-0.5 shadow-[4px_4px_0_rgba(0,0,0,0.15),0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    zoomOut();
                  }}
                  disabled={zoomPercent <= Math.round(ZOOM_MIN * 100)}
                  className="p6-button px-2 py-1 sm:px-2.5 sm:py-1.5 bg-base00 text-base0D border border-base0D/80 text-sm font-black leading-none disabled:opacity-35"
                  aria-label="Zoom out"
                  title="Zoom out (keyboard −)"
                >
                  −
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    zoomReset();
                  }}
                  className="min-w-[2.85rem] px-1 py-1 text-[9px] sm:text-[10px] font-black tabular-nums text-base05 uppercase tracking-tighter text-center leading-tight"
                  aria-label={`Zoom ${zoomPercent} percent. Reset to 100 percent.`}
                  title="Reset zoom (0)"
                >
                  {zoomPercent}%
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    zoomIn();
                  }}
                  disabled={zoomPercent >= Math.round(ZOOM_MAX * 100)}
                  className="p6-button px-2 py-1 sm:px-2.5 sm:py-1.5 bg-base00 text-base0D border border-base0D/80 text-sm font-black leading-none disabled:opacity-35"
                  aria-label="Zoom in"
                  title="Zoom in (keyboard + or =)"
                >
                  +
                </button>
              </div>
            </div>
          </div> {/* end PDF Viewer Area */}

          {/* Footer Bar */}
          <div className="bg-base0D/10 flex items-center justify-center gap-4 flex-wrap border-t-2 border-base0D/20 px-2" style={{ minHeight: 'calc(3rem + var(--safe-bottom))', paddingBottom: 'var(--safe-bottom)' }}>
             <span className="text-[10px] font-black text-base04 tracking-[0.35em] uppercase italic tabular-nums">{zoomPercent}%</span>
             <span className="text-[10px] font-black text-base04 tracking-[0.5em] uppercase italic hidden sm:inline opacity-70">Ctrl+scroll to zoom</span>
             <span className="text-[10px] font-black text-base04 tracking-[0.5em] uppercase italic">RECORDS ARCHIVE V6.0</span>
          </div>
        </div>
      </motion.div>
      {bp.hasKeyboard && isExpandHintVisible && (
        <div
          className="fixed pointer-events-none z-[560]"
          style={{
            left: expandHintPosition.x,
            top: expandHintPosition.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span className="p6-tooltip">
            <span className="p6-tooltip-text">EXPAND [F]</span>
          </span>
        </div>
      )}
      {bp.hasKeyboard && isCloseHintVisible && (
        <div
          className="fixed pointer-events-none z-[560]"
          style={{
            left: closeHintPosition.x,
            top: closeHintPosition.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span ref={closeHintTooltipRef} className="p6-tooltip">
            <span className="p6-tooltip-text">DISMISS [{closeHintKey}]</span>
          </span>
        </div>
      )}
    </div>,
    document.body
  );
}
