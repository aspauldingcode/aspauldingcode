'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { MusicTrack } from '@/content/types';
import type Hls from 'hls.js';

type Track = MusicTrack & {
  streamUrl: string | null;
  coverUrl: string | null;
  /** null = loading, true = playable, false = unavailable */
  ready: boolean | null;
};

type ApiTrack = {
  id?: string;
  uri?: string;
  manifest?: string;
  coverUrl?: string;
};

/**
 * Playback lifecycle. Seek position stays on <audio> (high-frequency).
 * Stale async work is ignored via genRef, not the machine.
 */
type Phase = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

type Playback = {
  phase: Phase;
  index: number;
  error: string;
};

type Ev =
  | { type: 'load'; index: number }
  | { type: 'playing' }
  | { type: 'paused' }
  | { type: 'stop' }
  | { type: 'fail'; error: string };

function reduce(state: Playback, event: Ev): Playback {
  switch (event.type) {
    case 'load':
      return { phase: 'loading', index: event.index, error: '' };
    case 'playing':
      return { ...state, phase: 'playing', error: '' };
    case 'paused':
      // Element pauses while we swap sources during loading.
      if (state.phase === 'loading') return state;
      return { ...state, phase: 'paused' };
    case 'stop':
      return { ...state, phase: 'paused', error: '' };
    case 'fail':
      return { ...state, phase: 'error', error: event.error };
    default:
      return state;
  }
}

function toTrack(base: MusicTrack, api?: ApiTrack): Track {
  // No API row yet → still loading, not permanently unavailable.
  if (!api) {
    return { ...base, streamUrl: null, coverUrl: null, ready: null };
  }

  let streamUrl: string | null = null;
  if (typeof api.uri === 'string' && api.uri) {
    streamUrl = api.uri;
  } else if (typeof api.manifest === 'string' && api.manifest) {
    try {
      streamUrl = URL.createObjectURL(
        new Blob([api.manifest], { type: 'application/vnd.apple.mpegurl' })
      );
    } catch {
      streamUrl = null;
    }
  }
  return {
    ...base,
    streamUrl,
    coverUrl: typeof api.coverUrl === 'string' ? api.coverUrl : null,
    // Explicit empty stream from TIDAL → n/a; otherwise playable.
    ready: Boolean(streamUrl),
  };
}

export default function BandPlayer({ catalog }: { catalog: MusicTrack[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const blobsRef = useRef<string[]>([]);
  const tracksRef = useRef<Track[]>([]);
  const indexRef = useRef(0);
  const genRef = useRef(0);
  const playRef = useRef<(i: number, quiet?: boolean) => Promise<void>>(async () => undefined);

  const [tracks, setTracks] = useState<Track[]>(() =>
    catalog.map((t) => ({ ...t, streamUrl: null, coverUrl: null, ready: null }))
  );
  const [playback, dispatch] = useReducer(reduce, {
    phase: 'idle' as Phase,
    index: 0,
    error: '',
  });
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    indexRef.current = playback.index;
  }, [playback.index]);

  useEffect(() => {
    let cancelled = false;
    const ids = catalog.map((t) => t.id);
    if (!ids.length) return;

    const load = async (idList: string[]) => {
      const res = await fetch(
        `/api/tidal-tracks?ids=${encodeURIComponent(idList.join(','))}`
      ).catch(() => null);
      if (!res?.ok || cancelled) return null;
      const data = (await res.json()) as { tracks?: ApiTrack[] };
      return new Map(
        (data.tracks ?? [])
          .filter((t): t is ApiTrack & { id: string } => typeof t.id === 'string')
          .map((t) => [t.id, t])
      );
    };

    void (async () => {
      const map = await load(ids);
      if (!map || cancelled) return;

      // Retry only tracks that came back without a stream.
      const missing = ids.filter((id) => {
        const row = map.get(id);
        return !row || (!(typeof row.uri === 'string' && row.uri) && !(typeof row.manifest === 'string' && row.manifest));
      });
      if (missing.length) {
        await new Promise((r) => setTimeout(r, 500));
        const retry = await load(missing);
        if (retry && !cancelled) {
          for (const [id, row] of retry) map.set(id, row);
        }
      }

      if (cancelled) return;
      setTracks(
        catalog.map((base) => {
          const track = toTrack(base, map.get(base.id));
          if (track.streamUrl?.startsWith('blob:')) blobsRef.current.push(track.streamUrl);
          return track;
        })
      );
    })();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      blobsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobsRef.current = [];
    };
  }, [catalog]);

  const attach = useCallback(async (url: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    const blob = url.startsWith('blob:');
    if (audio.canPlayType('application/vnd.apple.mpegurl') && !blob) {
      audio.src = url;
      return;
    }

    const { default: Hls } = await import('hls.js');
    if (!Hls.isSupported()) {
      audio.src = url;
      return;
    }

    const hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
    hlsRef.current = hls;
    await new Promise<void>((resolve, reject) => {
      hls.once(Hls.Events.MANIFEST_PARSED, () => resolve());
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data?.fatal) reject(new Error('hls'));
      });
      hls.loadSource(url);
      hls.attachMedia(audio);
    });
  }, []);

  const playAt = useCallback(
    async (i: number, quiet = false) => {
      const track = tracksRef.current[i];
      if (!track?.streamUrl || !track.ready) {
        if (!quiet) dispatch({ type: 'fail', error: 'Preview unavailable for this track.' });
        return;
      }

      const gen = ++genRef.current;
      dispatch({ type: 'load', index: i });
      setProgress(0);

      try {
        await attach(track.streamUrl);
        if (gen !== genRef.current) return;
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        await audio.play();
        if (gen === genRef.current) dispatch({ type: 'playing' });
      } catch {
        if (gen !== genRef.current) return;
        if (quiet) dispatch({ type: 'stop' });
        else dispatch({ type: 'fail', error: 'Could not start playback. Tap play again.' });
      }
    },
    [attach]
  );

  useEffect(() => {
    playRef.current = playAt;
  }, [playAt]);

  function step(dir: -1 | 1) {
    const list = tracksRef.current;
    let i = indexRef.current;
    for (let n = 0; n < list.length; n++) {
      i = (i + dir + list.length) % list.length;
      if (list[i]?.ready && list[i]?.streamUrl) {
        void playAt(i);
        return;
      }
    }
    dispatch({ type: 'fail', error: 'No playable tracks loaded yet.' });
  }

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playback.phase === 'playing') {
      audio.pause();
      return;
    }
    if (!audio.src || audio.ended || playback.phase === 'idle' || playback.phase === 'error') {
      await playAt(playback.index);
      return;
    }
    try {
      await audio.play();
    } catch {
      await playAt(playback.index);
    }
  }

  const current = tracks[playback.index];

  return (
    <div className="player">
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setProgress(a.currentTime || 0);
          setDuration(Number.isFinite(a.duration) ? a.duration : 0);
        }}
        onPlay={() => dispatch({ type: 'playing' })}
        onPause={() => dispatch({ type: 'paused' })}
        onEnded={() => {
          const list = tracksRef.current;
          const start = indexRef.current;
          for (let n = 1; n <= list.length; n++) {
            const i = (start + n) % list.length;
            if (list[i]?.ready && list[i]?.streamUrl) {
              void playRef.current(i, true);
              return;
            }
          }
          dispatch({ type: 'paused' });
        }}
      />

      <div className="player-head">
        <p className="player-label">Listen (TIDAL preview)</p>
        {current?.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.coverUrl} alt={`${current.title} album cover`} className="player-cover" width={48} height={48} />
        ) : null}
      </div>

      <div className="ctrl-row player-controls">
        <button type="button" className="ctrl" onClick={() => step(-1)} aria-label="Previous track">
          ‹
        </button>
        <button
          type="button"
          className="ctrl ctrl-wide"
          onClick={() => void toggle()}
          aria-label={playback.phase === 'playing' ? 'Pause' : 'Play'}
        >
          {playback.phase === 'playing' ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="ctrl" onClick={() => step(1)} aria-label="Next track">
          ›
        </button>
      </div>

      <p className="player-now">
        {current?.title ?? 'Loading…'}
        {current?.starred ? ' ★' : ''}
      </p>

      <input
        className="player-seek"
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(progress, duration || 0)}
        onChange={(e) => {
          const t = Number(e.target.value);
          const audio = audioRef.current;
          if (audio) audio.currentTime = t;
          setProgress(t);
        }}
        aria-label="Seek"
      />

      <ul className="player-tracks">
        {tracks.map((track, i) => (
          <li key={track.id}>
            <button
              type="button"
              className={i === playback.index ? 'active' : ''}
              disabled={track.ready === false}
              onClick={() => void playAt(i)}
            >
              {track.title}
              {track.starred ? ' ★' : ''}
              {track.ready === null ? ' …' : ''}
              {track.ready === false ? ' (n/a)' : ''}
            </button>
          </li>
        ))}
      </ul>

      {playback.error ? (
        <p className="err" role="alert">
          {playback.error}
        </p>
      ) : null}
    </div>
  );
}
