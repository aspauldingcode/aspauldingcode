'use client';

import Hls from 'hls.js';
import {
  useMemo,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type RefObject,
} from 'react';
import { clipBoth, projectSlantForId } from '@/lib/projectSlantVariants';

interface TidalTrack {
  id: string;
  title: string;
  streamUrl: string | null;
  coverUrl: string | null;
  releaseTitle: string | null;
  releaseType: 'ALBUM' | 'EP' | 'SINGLE' | 'UNKNOWN';
  starred?: boolean;
  trackPresentation: 'FULL' | 'PREVIEW' | 'UNKNOWN';
  previewReason?: string;
  loadState: 'pending' | 'ready' | 'unavailable';
}

interface TidalPlayerProps {
  trackTitles: { id: string; title: string; starred?: boolean; tidalUrl?: string }[];
  artist: string;
  layout?: 'modal' | 'sheet';
  containerRef?: RefObject<HTMLDivElement | null>;
}

const CROSSFADE_MS = 3500;
const INTRO_FADE_IN_MS = 1400;
const PROGRESS_INTERVAL_MS = 250;
const MAX_RESUME_AGE_MS = 1000 * 60 * 60 * 6; // 6h
const AUTOPLAY_ENTER_RATIO = 0.12;
const AUTOPLAY_EXIT_RATIO = 0.03;

type ResumeSnapshot = {
  trackId: string | null;
  currentTime: number;
  updatedAt: number;
};

const resumeSnapshot: ResumeSnapshot = {
  trackId: null,
  currentTime: 0,
  updatedAt: 0,
};

type PlaybackPhase =
  | 'loading'
  | 'ready'
  | 'starting'
  | 'playing'
  | 'paused'
  | 'crossfading'
  | 'error';

type PlaybackState = {
  phase: PlaybackPhase;
  tracks: TidalTrack[];
  currentIndex: number;
  nextIndex: number | null;
  progress: number;
  currentTime: number;
  duration: number;
  errorMessage: string | null;
};

type PlaybackAction =
  | { type: 'LOAD_START' }
  | { type: 'HYDRATE_TRACKS'; tracks: TidalTrack[] }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'PLAY_REQUESTED'; index: number }
  | { type: 'PLAY_STARTED'; index: number }
  | { type: 'PLAY_FAILED'; message?: string }
  | { type: 'PAUSED' }
  | { type: 'CROSSFADE_STARTED'; nextIndex: number }
  | { type: 'CROSSFADE_FINISHED'; nextIndex: number }
  | { type: 'PROGRESS_UPDATED'; currentTime: number; duration: number }
  | { type: 'SELECT_TRACK'; index: number };

function getNextPlayableIndexFromTracks(tracks: TidalTrack[], from: number) {
  if (!tracks.length) return -1;
  for (let i = 1; i <= tracks.length; i += 1) {
    const idx = (from + i) % tracks.length;
    if (tracks[idx]?.streamUrl && tracks[idx]?.loadState === 'ready') return idx;
  }
  return -1;
}

function getFirstPlayableIndex(tracks: TidalTrack[]) {
  return tracks.findIndex((track) => !!track.streamUrl && track.loadState === 'ready');
}

function sanitizePlayableIndex(tracks: TidalTrack[], index: number) {
  if (tracks[index]?.streamUrl && tracks[index]?.loadState === 'ready') return index;
  return getFirstPlayableIndex(tracks);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function createInitialState(trackTitles: TidalPlayerProps['trackTitles']): PlaybackState {
  const placeholderTracks: TidalTrack[] = trackTitles.map((track) => ({
    id: track.id,
    title: track.title,
    streamUrl: null,
    coverUrl: null,
    releaseTitle: null,
    releaseType: 'UNKNOWN',
    starred: track.starred,
    trackPresentation: 'UNKNOWN',
    previewReason: undefined,
    loadState: 'pending',
  }));
  const resumeIndex =
    resumeSnapshot.trackId
      ? placeholderTracks.findIndex((track) => track.id === resumeSnapshot.trackId)
      : -1;
  return {
    phase: 'ready',
    tracks: placeholderTracks,
    currentIndex: resumeIndex >= 0 ? resumeIndex : 0,
    nextIndex: null,
    progress: 0,
    currentTime: 0,
    duration: 0,
    errorMessage: null,
  };
}

function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        errorMessage: null,
      };
    case 'HYDRATE_TRACKS': {
      const byId = new Map(action.tracks.map((track) => [track.id, track]));
      const tracks = state.tracks.map((track) => byId.get(track.id) ?? track);
      const hasPlayable = getFirstPlayableIndex(tracks) >= 0;
      const currentIndex =
        tracks[state.currentIndex] ? state.currentIndex : 0;
      return {
        ...state,
        tracks,
        phase: state.phase === 'error' && hasPlayable ? 'ready' : state.phase,
        currentIndex,
        nextIndex: getNextPlayableIndexFromTracks(tracks, currentIndex),
      };
    }
    case 'LOAD_ERROR':
      return {
        ...state,
        phase: 'error',
        errorMessage: action.message,
      };
    case 'PLAY_REQUESTED': {
      const index = sanitizePlayableIndex(state.tracks, action.index);
      if (index < 0) return state;
      return {
        ...state,
        phase: 'starting',
        currentIndex: index,
        nextIndex: getNextPlayableIndexFromTracks(state.tracks, index),
        errorMessage: null,
      };
    }
    case 'SELECT_TRACK': {
      if (action.index < 0 || action.index >= state.tracks.length) return state;
      return {
        ...state,
        currentIndex: action.index,
        nextIndex: getNextPlayableIndexFromTracks(state.tracks, action.index),
        progress: 0,
        currentTime: 0,
        duration: 0,
      };
    }
    case 'PLAY_STARTED': {
      const index = sanitizePlayableIndex(state.tracks, action.index);
      if (index < 0) return state;
      return {
        ...state,
        phase: 'playing',
        currentIndex: index,
        nextIndex: getNextPlayableIndexFromTracks(state.tracks, index),
        errorMessage: null,
      };
    }
    case 'PLAY_FAILED':
      return {
        ...state,
        phase: 'paused',
        errorMessage: action.message ?? null,
      };
    case 'PAUSED':
      if (state.phase === 'loading' || state.phase === 'error') return state;
      return {
        ...state,
        phase: 'paused',
      };
    case 'CROSSFADE_STARTED': {
      const nextIndex = sanitizePlayableIndex(state.tracks, action.nextIndex);
      if (nextIndex < 0) return state;
      return {
        ...state,
        phase: 'crossfading',
        nextIndex,
      };
    }
    case 'CROSSFADE_FINISHED': {
      const nextIndex = sanitizePlayableIndex(state.tracks, action.nextIndex);
      if (nextIndex < 0) return state;
      return {
        ...state,
        phase: 'playing',
        currentIndex: nextIndex,
        nextIndex: getNextPlayableIndexFromTracks(state.tracks, nextIndex),
        progress: 0,
        currentTime: 0,
        duration: 0,
      };
    }
    case 'PROGRESS_UPDATED': {
      const duration = Number.isFinite(action.duration) && action.duration > 0 ? action.duration : 0;
      const currentTime = Number.isFinite(action.currentTime) && action.currentTime > 0 ? action.currentTime : 0;
      return {
        ...state,
        duration,
        currentTime,
        progress: duration > 0 ? clamp01(currentTime / duration) : 0,
      };
    }
    default:
      return state;
  }
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getEffectiveDuration(audio: HTMLAudioElement) {
  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
  if (duration > 0) return duration;
  const seekableEnd =
    audio.seekable && audio.seekable.length > 0
      ? audio.seekable.end(audio.seekable.length - 1)
      : 0;
  if (Number.isFinite(seekableEnd) && seekableEnd > 0) return seekableEnd;
  return 30;
}

function formatReleaseLabel(track: TidalTrack | null) {
  if (!track?.releaseTitle) return null;
  const suffix =
    track.releaseType === 'EP' || track.releaseType === 'ALBUM' || track.releaseType === 'SINGLE'
      ? track.releaseType
      : 'RELEASE';
  return `${track.releaseTitle} (${suffix})`;
}

export default function TidalPlayer({
  trackTitles,
  artist,
  layout = 'modal',
  containerRef,
}: TidalPlayerProps) {
  const [state, dispatch] = useReducer(playbackReducer, trackTitles, createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const hlsARef = useRef<Hls | null>(null);
  const hlsBRef = useRef<Hls | null>(null);
  const gainARef = useRef<GainNode | null>(null);
  const gainBRef = useRef<GainNode | null>(null);
  const activeDeckRef = useRef<'A' | 'B'>('A');
  const crossfadingRef = useRef(false);
  const isVisibleRef = useRef(false);
  const hasAutoplayStartedRef = useRef(false);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nearEndTriggeredRef = useRef<string | null>(null);
  const transitionSeqRef = useRef(0);
  const isComponentAliveRef = useRef(true);
  const hasAppliedInitialResumeRef = useRef(false);
  /** Tracks Blob URLs created from inline manifests so we can revoke them on unmount. */
  const blobUrlsRef = useRef<string[]>([]);

  const activeAudio = useCallback(
    () => (activeDeckRef.current === 'A' ? audioARef.current : audioBRef.current),
    []
  );
  const standbyAudio = useCallback(
    () => (activeDeckRef.current === 'A' ? audioBRef.current : audioARef.current),
    []
  );
  const activeGain = useCallback(
    () => (activeDeckRef.current === 'A' ? gainARef.current : gainBRef.current),
    []
  );
  const standbyGain = useCallback(
    () => (activeDeckRef.current === 'A' ? gainBRef.current : gainARef.current),
    []
  );
  const activeHlsRef = useCallback(
    () => (activeDeckRef.current === 'A' ? hlsARef : hlsBRef),
    []
  );
  const standbyHlsRef = useCallback(
    () => (activeDeckRef.current === 'A' ? hlsBRef : hlsARef),
    []
  );

  const persistResumeSnapshot = useCallback((trackId: string | null, currentTime: number) => {
    if (!trackId) return;
    if (!Number.isFinite(currentTime) || currentTime < 0) return;
    resumeSnapshot.trackId = trackId;
    resumeSnapshot.currentTime = currentTime;
    resumeSnapshot.updatedAt = Date.now();
  }, []);

  const getFreshResumeTimeForTrack = useCallback((trackId: string | null) => {
    if (!trackId) return 0;
    if (resumeSnapshot.trackId !== trackId) return 0;
    if (!resumeSnapshot.updatedAt) return 0;
    if (Date.now() - resumeSnapshot.updatedAt > MAX_RESUME_AGE_MS) return 0;
    return Math.max(0, resumeSnapshot.currentTime);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const normalizeFetchedTrack = (
      baseTrack: TidalPlayerProps['trackTitles'][number],
      stream: any
    ): TidalTrack => {
      let streamUrl: string | null = null;
      if (typeof stream?.uri === 'string' && stream.uri.length > 0) {
        streamUrl = stream.uri;
      } else if (typeof stream?.manifest === 'string' && stream.manifest.length > 0) {
        // Build a same-origin Blob URL from the server-rewritten HLS manifest text.
        try {
          const blob = new Blob([stream.manifest], { type: 'application/vnd.apple.mpegurl' });
          streamUrl = URL.createObjectURL(blob);
          blobUrlsRef.current.push(streamUrl);
        } catch {
          streamUrl = null;
        }
      }
      return {
        id: baseTrack.id,
        title: baseTrack.title,
        streamUrl,
        coverUrl: typeof stream?.coverUrl === 'string' ? stream.coverUrl : null,
        releaseTitle: typeof stream?.releaseTitle === 'string' ? stream.releaseTitle : null,
        releaseType:
          stream?.releaseType === 'ALBUM' ||
          stream?.releaseType === 'EP' ||
          stream?.releaseType === 'SINGLE'
            ? stream.releaseType
            : 'UNKNOWN',
        starred: baseTrack.starred,
        trackPresentation:
          stream?.trackPresentation === 'FULL' || stream?.trackPresentation === 'PREVIEW'
            ? stream.trackPresentation
            : 'UNKNOWN',
        previewReason: typeof stream?.previewReason === 'string' ? stream.previewReason : undefined,
        loadState: streamUrl ? 'ready' : 'unavailable',
      };
    };

    async function hydrateTracks(idsToLoad: string[]) {
      if (!idsToLoad.length) return;
      const res = await fetch(`/api/tidal-tracks?ids=${encodeURIComponent(idsToLoad.join(','))}`).catch(() => null);
      if (!res || !res.ok) {
        if (!cancelled) {
          dispatch({
            type: 'HYDRATE_TRACKS',
            tracks: trackTitles
              .filter((track) => idsToLoad.includes(track.id))
              .map((track) => ({
                id: track.id,
                title: track.title,
                streamUrl: null,
                coverUrl: null,
                releaseTitle: null,
                releaseType: 'UNKNOWN',
                starred: track.starred,
                trackPresentation: 'UNKNOWN',
                previewReason: 'LOAD_FAILED',
                loadState: 'unavailable',
              })),
          });
        }
        return;
      }

      const data = await res.json();
      const streamMap = new Map((data?.tracks ?? []).map((track: any) => [track.id, track]));
      const hydrated = trackTitles
        .filter((track) => idsToLoad.includes(track.id))
        .map((track) => normalizeFetchedTrack(track, streamMap.get(track.id)));

      if (!cancelled) {
        dispatch({ type: 'HYDRATE_TRACKS', tracks: hydrated });
      }
    }

    dispatch({ type: 'LOAD_START' });
    const [firstTrack, ...rest] = trackTitles;
    void hydrateTracks(firstTrack ? [firstTrack.id] : []).then(() => {
      if (!cancelled) {
        void hydrateTracks(rest.map((track) => track.id));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [trackTitles]);

  useEffect(() => {
    const ctx = new AudioContext();
    const a = new Audio();
    const b = new Audio();
    a.preload = 'auto';
    b.preload = 'auto';

    const gainA = ctx.createGain();
    const gainB = ctx.createGain();
    gainA.gain.value = 1;
    gainB.gain.value = 0;

    ctx.createMediaElementSource(a).connect(gainA).connect(ctx.destination);
    ctx.createMediaElementSource(b).connect(gainB).connect(ctx.destination);

    audioCtxRef.current = ctx;
    audioARef.current = a;
    audioBRef.current = b;
    gainARef.current = gainA;
    gainBRef.current = gainB;

    // Unlock the AudioContext on the first user gesture anywhere on the page.
    // Browsers suspend AudioContext until a user interaction; the modal-open click
    // often doesn't reach the context in time, so we listen broadly.
    const unlockCtx = () => {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => undefined);
      }
      document.removeEventListener('click', unlockCtx, true);
      document.removeEventListener('touchstart', unlockCtx, true);
      document.removeEventListener('keydown', unlockCtx, true);
    };
    document.addEventListener('click', unlockCtx, true);
    document.addEventListener('touchstart', unlockCtx, true);
    document.addEventListener('keydown', unlockCtx, true);

    return () => {
      document.removeEventListener('click', unlockCtx, true);
      document.removeEventListener('touchstart', unlockCtx, true);
      document.removeEventListener('keydown', unlockCtx, true);
      isComponentAliveRef.current = false;
      transitionSeqRef.current += 1;
      const latestState = stateRef.current;
      const active = activeDeckRef.current === 'A' ? a : b;
      const activeTrackId = latestState.tracks[latestState.currentIndex]?.id ?? null;
      persistResumeSnapshot(activeTrackId, active.currentTime || latestState.currentTime);
      progressTimerRef.current && clearInterval(progressTimerRef.current);
      hlsARef.current?.destroy();
      hlsBRef.current?.destroy();
      a.pause();
      b.pause();
      a.removeAttribute('src');
      b.removeAttribute('src');
      a.load();
      b.load();
      void ctx.close();
      // Revoke any Blob URLs we created for inline manifests.
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };
  }, [persistResumeSnapshot]);

  const getNextPlayableIndex = useCallback(
    (from: number) => {
      return getNextPlayableIndexFromTracks(state.tracks, from);
    },
    [state.tracks]
  );

  const attachStream = useCallback(async (audio: HTMLAudioElement, hlsRef: MutableRefObject<Hls | null>, streamUrl: string) => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    // Blob URLs created from inline manifests must always use HLS.js (they are
    // virtual origins and Safari's native HLS won't resolve relative segments).
    const isBlobUrl = streamUrl.startsWith('blob:');
    if (!isBlobUrl && audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = streamUrl;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // Allow the browser to buffer the full short preview before playing.
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
      });
      // Surface HLS.js fatal errors so we don't silently stall.
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          console.error('[HLS.js] fatal error:', data.type, data.details, data);
        }
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(audio);
      hlsRef.current = hls;
    } else {
      audio.src = streamUrl;
    }

    await new Promise<void>((resolve) => {
      const onReady = () => {
        audio.removeEventListener('canplay', onReady);
        resolve();
      };
      audio.addEventListener('canplay', onReady, { once: true });
      setTimeout(() => {
        audio.removeEventListener('canplay', onReady);
        resolve();
      }, 4000); // extended timeout for slow preview segments
    });
  }, []);

  const rampGain = useCallback((node: GainNode, from: number, to: number, durationMs: number) => {
    const ctx = node.context;
    const now = ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(from, now);
    node.gain.linearRampToValueAtTime(to, now + durationMs / 1000);
  }, []);

  const beginTransition = useCallback(() => {
    transitionSeqRef.current += 1;
    return transitionSeqRef.current;
  }, []);

  const isTransitionStale = useCallback((transitionId: number) => {
    return transitionId !== transitionSeqRef.current;
  }, []);

  const startProgressTicker: (currentIndex: number) => void = useCallback((currentIndex: number) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      const audio = activeAudio();
      if (!audio) return;
      const d = getEffectiveDuration(audio);
      const t = audio.currentTime || 0;
      dispatch({ type: 'PROGRESS_UPDATED', currentTime: t, duration: d });
      const currentTrackId = state.tracks[currentIndex]?.id ?? null;
      persistResumeSnapshot(currentTrackId, t);

      const isPlaying = state.phase === 'playing' || state.phase === 'crossfading';
      if (!crossfadingRef.current && isPlaying && d > 0 && d - t <= CROSSFADE_MS / 1000) {
        const edgeKey = `${activeDeckRef.current}:${currentIndex}`;
        if (nearEndTriggeredRef.current === edgeKey) return;
        nearEndTriggeredRef.current = edgeKey;
        const next = getNextPlayableIndex(currentIndex);
        if (next >= 0) {
          const transitionId = beginTransition();
          void crossfadeTo(next, transitionId);
        }
      }
    }, PROGRESS_INTERVAL_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beginTransition, getNextPlayableIndex, persistResumeSnapshot, state.phase, state.tracks]);

  const stopProgressTicker = useCallback(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
  }, []);

  const playTrackOnActiveDeck: (index: number, fadeInMs: number, transitionId: number, startAtSeconds?: number) => Promise<boolean> = useCallback(async (index: number, fadeInMs: number, transitionId: number, startAtSeconds = 0) => {
    const track = state.tracks[index];
    const audio = activeAudio();
    const standby = standbyAudio();
    const gain = activeGain();
    const hlsRef = activeHlsRef();
    const ctx = audioCtxRef.current;
    if (!track || !audio || !gain || !ctx) return false;
    if (!track.streamUrl || track.loadState !== 'ready') {
      dispatch({ type: 'PLAY_FAILED', message: 'Track stream is still loading.' });
      return false;
    }
    if (!isComponentAliveRef.current) return false;
    dispatch({ type: 'PLAY_REQUESTED', index });

    standby?.pause();
    if (standby) standby.currentTime = 0;

    // Try to resume the AudioContext; may be a no-op if a user-gesture has not
    // yet occurred, but the document-level click listener will unlock it shortly.
    if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);
    await attachStream(audio, hlsRef, track.streamUrl);
    if (isTransitionStale(transitionId)) {
      audio.pause();
      return false;
    }
    if (startAtSeconds > 0) {
      try {
        audio.currentTime = Math.max(0, startAtSeconds);
      } catch {
        // Ignore seek failures, fallback to 0.
      }
    }
    gain.gain.value = 0;
    let started = await audio
      .play()
      .then(() => true)
      .catch(() => false);
    if (!started) {
      // HLS can be slow to become playable on first focus/autoplay.
      await new Promise<void>((resolve) => {
        const onReady = () => {
          audio.removeEventListener('canplay', onReady);
          audio.removeEventListener('loadedmetadata', onReady);
          resolve();
        };
        audio.addEventListener('canplay', onReady, { once: true });
        audio.addEventListener('loadedmetadata', onReady, { once: true });
        setTimeout(() => {
          audio.removeEventListener('canplay', onReady);
          audio.removeEventListener('loadedmetadata', onReady);
          resolve();
        }, 2500);
      });
      started = await audio
        .play()
        .then(() => true)
        .catch(() => false);
    }
    if (isTransitionStale(transitionId)) {
      audio.pause();
      return false;
    }
    if (!started || audio.paused) {
      dispatch({ type: 'PLAY_FAILED', message: 'Unable to start playback yet.' });
      return false;
    }
    rampGain(gain, 0, 1, fadeInMs);
    nearEndTriggeredRef.current = null;
    dispatch({ type: 'PLAY_STARTED', index });
    startProgressTicker(index);
    return true;
  }, [state.tracks, activeAudio, standbyAudio, activeGain, activeHlsRef, attachStream, isTransitionStale, rampGain, startProgressTicker]);

  const crossfadeTo: (index: number, transitionId: number) => Promise<void> = useCallback(async (index: number, transitionId: number) => {
    if (crossfadingRef.current) return;
    const nextTrack = state.tracks[index];
    const aAudio = activeAudio();
    const sAudio = standbyAudio();
    const aGain = activeGain();
    const sGain = standbyGain();
    const sHls = standbyHlsRef();
    const ctx = audioCtxRef.current;

    if (!nextTrack || !nextTrack.streamUrl || nextTrack.loadState !== 'ready' || !aAudio || !sAudio || !aGain || !sGain || !ctx) return;
    if (!isComponentAliveRef.current || !isVisibleRef.current) return;
    crossfadingRef.current = true;
    dispatch({ type: 'CROSSFADE_STARTED', nextIndex: index });
    if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);

    await attachStream(sAudio, sHls, nextTrack.streamUrl);
    if (isTransitionStale(transitionId)) {
      sAudio.pause();
      crossfadingRef.current = false;
      return;
    }
    sGain.gain.value = 0;
    await sAudio.play().catch(() => undefined);
    if (isTransitionStale(transitionId)) {
      sAudio.pause();
      crossfadingRef.current = false;
      return;
    }

    rampGain(aGain, aGain.gain.value, 0, CROSSFADE_MS);
    rampGain(sGain, 0, 1, CROSSFADE_MS);

    await new Promise((resolve) => setTimeout(resolve, CROSSFADE_MS));
    if (isTransitionStale(transitionId)) {
      sAudio.pause();
      crossfadingRef.current = false;
      return;
    }
    aAudio.pause();
    aAudio.currentTime = 0;
    activeDeckRef.current = activeDeckRef.current === 'A' ? 'B' : 'A';
    nearEndTriggeredRef.current = null;
    dispatch({ type: 'CROSSFADE_FINISHED', nextIndex: index });
    startProgressTicker(index);
    crossfadingRef.current = false;
  }, [state.tracks, activeAudio, standbyAudio, activeGain, standbyGain, standbyHlsRef, attachStream, isTransitionStale, rampGain, startProgressTicker]);

  const playOrCrossfadeTo: (index: number) => Promise<void> = useCallback(async (index: number) => {
    if (!state.tracks[index]) return;
    if (!state.tracks[index]?.streamUrl || state.tracks[index]?.loadState !== 'ready') {
      dispatch({ type: 'PLAY_FAILED', message: 'Track is still loading stream data.' });
      return;
    }
    const transitionId = beginTransition();
    const isPlaying = state.phase === 'playing' || state.phase === 'crossfading';
    if (isPlaying && !crossfadingRef.current) {
      await crossfadeTo(index, transitionId);
    } else {
      const started = await playTrackOnActiveDeck(index, INTRO_FADE_IN_MS, transitionId, 0);
      if (!started) {
        dispatch({ type: 'PLAY_FAILED', message: 'Playback start was interrupted. Try tapping track again.' });
      }
    }
  }, [state.tracks, state.phase, beginTransition, crossfadeTo, playTrackOnActiveDeck]);

  const isTrackPlayable = useCallback(
    (index: number) => {
      const track = state.tracks[index];
      return !!track?.streamUrl && track.loadState === 'ready';
    },
    [state.tracks]
  );

  const applyVisibilityState: (nextVisible: boolean) => Promise<void> = useCallback(async (nextVisible: boolean) => {
    const wasVisible = isVisibleRef.current;
    isVisibleRef.current = nextVisible;

    if (nextVisible) {
      if (!hasAutoplayStartedRef.current) {
        hasAutoplayStartedRef.current = true;
        const fallbackIndex = getFirstPlayableIndex(state.tracks);
        const targetIndex = isTrackPlayable(state.currentIndex) ? state.currentIndex : fallbackIndex;
        if (targetIndex >= 0) {
          if (targetIndex !== state.currentIndex) {
            dispatch({ type: 'SELECT_TRACK', index: targetIndex });
          }
          const currentTrackId = state.tracks[targetIndex]?.id ?? null;
          const resumeTime = hasAppliedInitialResumeRef.current
            ? 0
            : getFreshResumeTimeForTrack(currentTrackId);
          hasAppliedInitialResumeRef.current = true;
          const started = await playTrackOnActiveDeck(
            targetIndex,
            INTRO_FADE_IN_MS,
            beginTransition(),
            resumeTime
          );
          if (!started) {
            hasAutoplayStartedRef.current = false;
            dispatch({ type: 'PLAY_FAILED', message: 'Autoplay did not start. Tap a track to retry.' });
          }
        } else {
          hasAutoplayStartedRef.current = false;
          dispatch({ type: 'PLAY_FAILED', message: 'Tracks are still loading. Autoplay will retry.' });
        }
      } else if (state.phase !== 'playing' && state.phase !== 'crossfading') {
        const audio = activeAudio();
        const ctx = audioCtxRef.current;
        if (!isTrackPlayable(state.currentIndex)) {
          const firstPlayable = getFirstPlayableIndex(state.tracks);
          if (firstPlayable >= 0) {
            if (firstPlayable !== state.currentIndex) {
              dispatch({ type: 'SELECT_TRACK', index: firstPlayable });
            }
            const started = await playTrackOnActiveDeck(
              firstPlayable,
              INTRO_FADE_IN_MS,
              beginTransition(),
              0
            );
            if (!started) {
              dispatch({ type: 'PLAY_FAILED', message: 'Playback is blocked until media is ready.' });
            }
          } else {
            dispatch({ type: 'PLAY_FAILED', message: 'Tracks are still loading. Autoplay will retry.' });
          }
        } else {
          dispatch({ type: 'PLAY_REQUESTED', index: state.currentIndex });
          if (ctx?.state === 'suspended') await ctx.resume();
          const resumed = await audio
            ?.play()
            .then(() => true)
            .catch(() => false);
          if (resumed && audio && !audio.paused) {
            dispatch({ type: 'PLAY_STARTED', index: state.currentIndex });
            startProgressTicker(state.currentIndex);
          } else {
            dispatch({ type: 'PLAY_FAILED', message: 'Playback is blocked until media is ready.' });
            stopProgressTicker();
          }
        }
      }
      return;
    }

    if (wasVisible) {
      beginTransition();
      const activeTrackId = state.tracks[state.currentIndex]?.id ?? null;
      persistResumeSnapshot(activeTrackId, activeAudio()?.currentTime ?? state.currentTime);
      activeAudio()?.pause();
      standbyAudio()?.pause();
      dispatch({ type: 'PAUSED' });
      stopProgressTicker();
    }
  }, [state.tracks, state.currentIndex, state.currentTime, state.phase, getFreshResumeTimeForTrack, isTrackPlayable, playTrackOnActiveDeck, beginTransition, activeAudio, standbyAudio, persistResumeSnapshot, startProgressTicker, stopProgressTicker]);

  useEffect(() => {
    const observerTarget = containerRef?.current;
    if (!observerTarget) return;
    const scrollRoot =
      observerTarget.closest('.modal-scrollable-content, .projects-scroll') ??
      null;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        const isPageVisible = document.visibilityState === 'visible';
        const ratio = entry.intersectionRatio ?? 0;
        const shouldEnter =
          entry.isIntersecting && ratio >= AUTOPLAY_ENTER_RATIO && isPageVisible;
        const shouldStayVisible =
          isVisibleRef.current && entry.isIntersecting && ratio >= AUTOPLAY_EXIT_RATIO && isPageVisible;
        await applyVisibilityState(shouldEnter || shouldStayVisible);
      },
      {
        root: scrollRoot,
        threshold: [AUTOPLAY_EXIT_RATIO, AUTOPLAY_ENTER_RATIO],
        // Give modal/sheet scroll containers a little breathing room.
        rootMargin: '0px 0px -6% 0px',
      }
    );

    const checkFallbackVisibility = () => {
      const isPageVisible = document.visibilityState === 'visible';
      if (!isPageVisible) {
        void applyVisibilityState(false);
        return;
      }
      const targetRect = observerTarget.getBoundingClientRect();
      const rootRect = scrollRoot?.getBoundingClientRect();
      const viewportTop = rootRect?.top ?? 0;
      const viewportBottom = rootRect?.bottom ?? window.innerHeight;
      const viewportHeight = Math.max(1, viewportBottom - viewportTop);
      const overlap = Math.max(
        0,
        Math.min(targetRect.bottom, viewportBottom) - Math.max(targetRect.top, viewportTop)
      );
      const ratio = overlap / Math.max(1, Math.min(targetRect.height, viewportHeight));
      const nextVisible = isVisibleRef.current
        ? ratio >= AUTOPLAY_EXIT_RATIO
        : ratio >= AUTOPLAY_ENTER_RATIO;
      void applyVisibilityState(nextVisible);
    };

    observer.observe(observerTarget);
    scrollRoot?.addEventListener('scroll', checkFallbackVisibility, { passive: true });
    window.addEventListener('resize', checkFallbackVisibility);
    checkFallbackVisibility();
    return () => {
      observer.disconnect();
      scrollRoot?.removeEventListener('scroll', checkFallbackVisibility);
      window.removeEventListener('resize', checkFallbackVisibility);
    };
  }, [containerRef, applyVisibilityState]);

  useEffect(() => {
    if (!isVisibleRef.current) return;
    if (hasAutoplayStartedRef.current) return;
    if (state.phase === 'playing' || state.phase === 'crossfading' || state.phase === 'starting') return;
    const firstPlayable = getFirstPlayableIndex(state.tracks);
    if (firstPlayable < 0) return;
    void applyVisibilityState(true);
  }, [state.tracks, state.phase, applyVisibilityState]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const isPageVisible = document.visibilityState === 'visible';
      if (!isPageVisible) {
        isVisibleRef.current = false;
        beginTransition();
        const activeTrackId = state.tracks[state.currentIndex]?.id ?? null;
        persistResumeSnapshot(activeTrackId, activeAudio()?.currentTime ?? state.currentTime);
        activeAudio()?.pause();
        standbyAudio()?.pause();
        dispatch({ type: 'PAUSED' });
        stopProgressTicker();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [beginTransition, activeAudio, persistResumeSnapshot, standbyAudio, state.currentIndex, state.currentTime, state.tracks, stopProgressTicker]);

  useEffect(() => {
    const audio = activeAudio();
    if (!audio) return;
    const onEnded = () => {
      const next = getNextPlayableIndex(state.currentIndex);
      if (next >= 0 && isVisibleRef.current) {
        void playOrCrossfadeTo(next);
      } else {
        dispatch({ type: 'PAUSED' });
      }
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [activeAudio, state.currentIndex, getNextPlayableIndex, playOrCrossfadeTo]);

  const selectedTrack = useMemo(
    () => state.tracks[state.currentIndex] ?? null,
    [state.tracks, state.currentIndex]
  );
  const selectedReleaseLabel = useMemo(() => formatReleaseLabel(selectedTrack), [selectedTrack]);
  const isCrossfading = state.phase === 'crossfading';
  const isPlaying = state.phase === 'playing' || state.phase === 'crossfading';
  const isStarting = state.phase === 'starting';
  const pendingCount = useMemo(
    () => state.tracks.filter((track) => track.loadState === 'pending').length,
    [state.tracks]
  );
  const canPlaySelected = !!selectedTrack?.streamUrl && selectedTrack?.loadState === 'ready';
  const themeAccentPool = ['var(--base0B)', 'var(--base0A)', 'var(--base0D)', 'var(--base08)'];
  const eraColor = themeAccentPool[Math.abs(state.currentIndex) % themeAccentPool.length];
  const styleSeed = selectedTrack ? Number.parseInt(selectedTrack.id, 10) || selectedTrack.title.length : 0;
  const slant = projectSlantForId(styleSeed);
  if (!state.tracks.length) {
    return (
      <div className="flex items-center justify-center h-[352px] rounded-xl bg-base01 border border-base02 text-base04 text-xs px-4 text-center">
        No tracks configured.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative overflow-hidden border border-base03/60 bg-base01 min-h-[220px] sm:min-h-[240px] ${canPlaySelected ? 'cursor-pointer' : ''}`}
        style={clipBoth(slant.main)}
        onClick={() => {
          if (!canPlaySelected) return;
          if (isPlaying || isStarting) return;
          void playOrCrossfadeTo(state.currentIndex);
        }}
      >
        <div
          className="absolute inset-0 translate-x-2 translate-y-2 opacity-45 pointer-events-none"
          style={clipBoth(slant.shadowNear)}
          aria-hidden
        >
          <div className="absolute inset-0" style={{ backgroundColor: eraColor }} />
        </div>
        <div
          className="absolute inset-x-0 top-0 h-3 z-[2]"
          style={{
            ...clipBoth(slant.highlightRail),
            background: `linear-gradient(100deg, ${eraColor} 0%, color-mix(in srgb, ${eraColor} 70%, #ffffff) 45%, ${eraColor} 100%)`,
          }}
        />
        <div
          className="absolute -inset-1 opacity-30 pointer-events-none"
          style={{
            background: `linear-gradient(125deg, ${eraColor} 0%, transparent 55%)`,
          }}
        />
        <div className="absolute inset-0 halftone-bg opacity-[0.18] mix-blend-overlay pointer-events-none" />
        {selectedTrack ? (
          <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-between gap-3">
            <div className="grid grid-cols-[1fr_auto] items-start gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-base07 font-black text-sm sm:text-base uppercase italic tracking-tight truncate">
                  {selectedTrack.title}
                </p>
                <p className="text-base05 text-[11px] sm:text-xs mt-1 tracking-widest uppercase">{artist}</p>
                {selectedReleaseLabel && (
                  <p className="text-base04 text-[10px] mt-1 tracking-wider uppercase truncate">
                    {selectedReleaseLabel}
                  </p>
                )}
                <div className="mt-2 inline-flex items-center text-[9px] font-black uppercase tracking-widest bg-base0B/20 text-base0B border border-base0B/35 px-2 py-1">
                  Preview Only
                </div>
              </div>
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 self-start">
                <div className="absolute inset-0 translate-x-1.5 translate-y-1.5" style={{ backgroundColor: eraColor }} />
                <div className="relative w-full h-full overflow-hidden border-2 border-base05 bg-base00">
                  {selectedTrack.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedTrack.coverUrl}
                      alt={`${selectedTrack.title} cover`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-base04 uppercase tracking-widest">
                      No Art
                    </div>
                  )}
                  <div className="absolute inset-0 halftone-bg opacity-25 mix-blend-overlay pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-1.5 bg-base02 overflow-hidden border border-base03/50">
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    backgroundColor: eraColor,
                    width: `${Math.max(0, Math.min(100, state.progress * 100))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-base04">
                <span>{formatTime(state.currentTime)}</span>
                <span>{formatTime(state.duration)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-base04">
                <span>{isCrossfading ? 'Crossfading...' : isPlaying ? 'Playing' : isStarting ? 'Starting...' : 'Paused'}</span>
                <span>{pendingCount > 0 ? `Loading ${pendingCount}` : 'Loop On'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-base04 text-xs text-center px-4">
            Select an available track from the list.
          </div>
        )}
      </div>

      <div className="relative">
        <div
          className="absolute inset-0 translate-x-1.5 translate-y-1.5 opacity-60 pointer-events-none"
          style={clipBoth(slant.shadowFar)}
          aria-hidden
        >
          <div className="absolute inset-0" style={{ backgroundColor: eraColor }} />
        </div>
        <div
          className={`relative bg-base01 border border-base03/50 overflow-hidden ${
            layout === 'sheet' ? 'max-h-[300px]' : 'max-h-[260px]'
          }`}
          style={clipBoth(slant.main)}
        >
          <div className="absolute inset-x-0 top-0 h-2.5" style={{ ...clipBoth(slant.highlightRail), backgroundColor: eraColor }} />
          <div className="absolute inset-0 halftone-bg opacity-[0.12] pointer-events-none" />
          <div className="space-y-1.5 overflow-y-auto pr-1 pt-4 px-2.5 pb-2 max-h-[inherit]">
            {trackTitles.map(({ title, starred }, index) => {
              const isSelected = index === state.currentIndex;
              const trackState = state.tracks[index];
              const isAvailable = trackState?.loadState === 'ready' && !!trackState?.streamUrl;
              const isPending = trackState?.loadState === 'pending';
              return (
                <button
                  key={title}
                  onClick={() => {
                    if (!isAvailable) return;
                    dispatch({ type: 'SELECT_TRACK', index });
                    void playOrCrossfadeTo(index);
                  }}
                  disabled={!isAvailable}
                  className={`w-full flex items-center justify-between p-2.5 text-left border transition-all duration-150 ${
                    isSelected
                      ? 'bg-base00 border-base0B/80 text-base07 font-black'
                      : isAvailable
                        ? 'bg-base02/30 hover:bg-base02/65 border-base03/40 text-base05 hover:text-base07'
                        : isPending
                          ? 'bg-base02/20 border-base03/30 text-base04'
                          : 'opacity-35 cursor-not-allowed bg-base02/10 border-base03/20 text-base04'
                  }`}
                  style={{ clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0 100%)' }}
                >
                  <div className="flex items-center min-w-0 gap-2.5">
                    <span
                      className="w-1.5 h-6 shrink-0"
                      style={{ backgroundColor: isSelected ? eraColor : 'var(--base03)' }}
                      aria-hidden
                    />
                    <span className={`font-mono text-xs ${isSelected ? 'text-base0B' : 'text-base04'}`}>
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="truncate text-sm tracking-wide">{title}</span>
                  </div>
                  <div className="flex items-center shrink-0 ml-2 gap-1.5">
                    {starred && <span className={`text-sm ${isSelected ? 'text-base0B' : 'text-base0A animate-pulse'}`}>★</span>}
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? (isSelected ? 'bg-base0B' : 'bg-base0D') : isPending ? 'bg-base09/70 animate-pulse' : 'bg-base04/30'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
