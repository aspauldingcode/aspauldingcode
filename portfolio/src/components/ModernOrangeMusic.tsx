'use client';

import { useRef } from 'react';
import TidalPlayer from './TidalPlayer';

// Platform Links Data
export const DISCOGRAPHY_LINKS = [
  {
    name: 'Spotify',
    url: 'https://open.spotify.com/artist/1E32wLOibjqY9busMJu8qD?si=2UVrS6bbSBuMuObpqmQ2Jg',
    color: '#1DB954',
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.377-1.454-5.37-1.783-8.894-.982-.336.076-.67-.135-.746-.472-.076-.336.135-.67.472-.746 3.847-.879 7.144-.492 9.818 1.144.294.18.385.563.207.849zm1.226-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.076-1.183-.412.125-.845-.108-.97-.52-.125-.412.108-.845.52-.97 3.666-1.112 8.243-.568 11.34 1.338.367.226.488.707.26 1.075zm.106-2.836C14.492 8.76 8.723 8.57 5.377 9.587c-.528.16-1.083-.14-1.243-.668-.16-.527.14-1.082.668-1.242 3.84-1.166 10.222-.943 14.28 1.467.475.282.63.896.348 1.37-.282.476-.897.63-1.37.348z"/>
      </svg>
    )
  },
  {
    name: 'Apple Music',
    url: 'https://music.apple.com/us/artist/modernorange/1653675874',
    color: '#FC3C44',
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M21 3v12.51c0 1.93-1.57 3.49-3.5 3.49S14 17.44 14 15.51s1.57-3.5 3.5-3.5c.35 0 .69.06 1 .15V7.08L9 9.17v8.34c0 1.93-1.57 3.49-3.5 3.49S2 19.44 2 17.51 3.57 14 5.5 14c.35 0 .69.06 1 .15V5.83l14-2.83H21z"/>
      </svg>
    )
  },
  {
    name: 'Amazon Music',
    url: 'https://music.amazon.com.au/artists/B0BLV3PCSN/modernorange?marketplaceId=A39IBJ37TRP1C6&musicTerritory=AU&ref=dm_sh_Ps9AsyMTNS6Txv0BbpU724WSY',
    color: '#00A8E1',
    icon: (className: string) => (
      <svg viewBox="0 0 30 22" className={className} fill="currentColor">
        {/* Lowercase 'music' in custom bold Amazon Ember rounded font */}
        {/* Letter m */}
        <path d="M 5.0 12 V 6 h 1 v 0.8 C 6.3 6.2, 6.8 6, 7.5 6 c 0.8 0, 1.2 0.3, 1.5 0.8 C 9.3 6.2, 9.8 6, 10.5 6 c 0.8 0, 1.5 0.5, 1.5 1.5 V 12 H 11.0 V 8.5 c 0 -0.5, -0.2 -0.7, -0.7 -0.7 s -0.7 0.2, -0.7 0.7 V 12 H 8.5 V 8.5 c 0 -0.5, -0.2 -0.7, -0.7 -0.7 s -0.7 0.2, -0.7 0.7 V 12 H 5.0 Z"/>
        {/* Letter u */}
        <path d="M 15.0 12 v -0.8 c -0.3 0.5, -0.8 0.8, -1.5 0.8 c -0.8 0, -1.5 -0.5, -1.5 -1.5 V 6 h 1.0 v 4.5 c 0 0.5, 0.2 0.7, 0.7 0.7 s 0.7 -0.2, 0.7 -0.7 V 6 h 1.0 v 6 Z"/>
        {/* Letter s */}
        <path d="M 19.0 7.5 C 19.0 6.5, 18.3 6.0, 17.5 6.0 C 16.5 6.0, 16.0 6.5, 16.0 7.5 C 16.0 8.5, 17.0 8.8, 17.5 9.0 C 18.5 9.2, 19.0 9.5, 19.0 10.5 C 19.0 11.5, 18.3 12.0, 17.5 12.0 C 16.5 12.0, 16.0 11.5, 16.0 10.5 h 1.0 C 17.0 11.0, 17.3 11.0, 17.5 11.0 C 17.7 11.0, 18.0 11.0, 18.0 10.5 C 18.0 10.0, 17.5 9.8, 17.0 9.6 C 16.3 9.4, 16.0 9.0, 16.0 8.0 C 16.0 7.0, 16.7 6.5, 17.5 6.5 C 18.3 6.5, 18.5 7.0, 18.5 7.5 Z"/>
        {/* Letter i */}
        <path d="M 20.0 12 V 6 h 1.0 v 6 Z M 20.0 4.5 h 1.0 V 3.3 h -1.0 Z"/>
        {/* Letter c */}
        <path d="M 25.0 6 A 3 3 0 0 0 25.0 12 V 11 A 2 2 0 0 1 25.0 7 Z"/>
        {/* Underline smile arrow */}
        <path d="M 2.5 14 c 3.5 2.5, 8.5 3.5, 13.5 3.5 c 4.0 0, 7.0 -1, 9.0 -3.5 c 0.3 -0.2, 0.5 0.1, 0.4 0.5 c -3.0 3.5 -7.0 5 -10.5 5 c -5.0 0 -9.5 -1.5 -13.5 -4.5 c -0.3 -0.2, 0 -0.7, 0.6 -0.5 z"/>
        {/* Smile arrowhead */}
        <path d="M 27.8 11.5 C 25.5 12.0, 23.0 13.0, 21.0 14.2 L 25.0 13.8 L 25.5 16.0 C 26.3 14.8, 27.2 13.5, 27.8 11.5 Z"/>
      </svg>
    )
  },
  {
    name: 'Deezer',
    url: 'https://link.deezer.com/s/33k4I6F3LDbP4oE5qjqg1',
    color: '#A238FF',
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <ellipse cx="5.0" cy="9.75" rx="0.9" ry="2.75" />
        <ellipse cx="7.5" cy="10.25" rx="1.0" ry="5.25" />
        <ellipse cx="9.0" cy="10.75" rx="1.1" ry="6.75" />
        <ellipse cx="10.5" cy="12.75" rx="1.15" ry="6.75" />
        <ellipse cx="12.0" cy="15.0" rx="1.2" ry="6.5" />
        <ellipse cx="13.5" cy="12.75" rx="1.15" ry="6.75" />
        <ellipse cx="15.0" cy="10.75" rx="1.15" ry="6.75" />
        <ellipse cx="16.5" cy="10.25" rx="1.1" ry="5.25" />
        <ellipse cx="19.0" cy="9.75" rx="0.9" ry="2.75" />
      </svg>
    )
  },
  {
    name: 'Pandora',
    url: 'https://www.pandora.com/artist/modernorange/ARh6hK9pXmhZpKg?part=ug-desktop&corr=160825567942302994',
    color: '#002C74',
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" className={className}>
        <defs>
          <clipPath id="modernorange-pandora-clip">
            <path d="M4 3h8.5c4.5 0 7.5 3 7.5 6.5S17 16 12.5 16H10v5H4Z" />
          </clipPath>
        </defs>
        <g clipPath="url(#modernorange-pandora-clip)">
          <rect width="24" height="24" fill="#00A3FF" />
          <path d="M-5 5 C 5 5, 12 8, 20 12 C 22 13, 24 14, 25 15 L 25 25 L -5 25 Z" fill="#E5003A" />
          <path d="M-5 8 C 4 8, 10 11, 17 15 C 19 16, 21 17, 22 18 L 22 25 L -5 25 Z" fill="#FF5E3A" />
          <path d="M-5 11 C 3 11, 8 14, 14 18 C 16 19, 18 20, 19 21 L 19 25 L -5 25 Z" fill="#B000C1" />
          <path d="M-5 15 C 2 15, 6 18, 10 21 C 12 22, 13 23, 14 24 L 14 25 L -5 25 Z" fill="#00C2FF" />
          <path d="M-5 19 C 0 19, 3 21, 6 23 C 7 24, 8 25, 9 25 L -5 25 Z" fill="#002C74" />
        </g>
      </svg>
    )
  },
  {
    name: 'Tidal',
    url: 'https://tidal.com/artist/53689256/u',
    color: '#00D2FF',
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M5 5L8.5 8.5L5 12L1.5 8.5z M12 5L15.5 8.5L12 12L8.5 8.5z M19 5L22.5 8.5L19 12L15.5 8.5z M12 12L15.5 15.5L12 19L8.5 15.5z"/>
      </svg>
    )
  },
  {
    name: 'iHeartRadio',
    url: 'https://www.iheart.com/artist/modernorange-39132965?app=listen',
    color: '#C61B29',
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path 
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z M10.5 21.35V13.5a1.5 1.5 0 013 0v7.85z M12 8a1.2 1.2 0 100 2.4A1.2 1.2 0 0012 8z M7.7 7.2a2.7 2.7 0 000 4 0.3 0.3 0 000.5-0.3 2.1 2.1 0 010-3.4 0.3 0.3 0 00-0.5-0.3z M6.34 6.0a4.5 4.5 0 000 6.4 0.3 0.3 0 000.56-0.3 3.9 3.9 0 010-5.8 0.3 0.3 0 00-0.56-0.3z M16.3 7.2a0.3 0.3 0 00-0.5 0.3 2.1 2.1 0 010 3.4 0.3 0.3 0 000.5 0.3 2.7 2.7 0 000-4z M17.66 6.0a0.3 0.3 0 00-0.56 0.3 3.9 3.9 0 010 5.8 0.3 0.3 0 000.56 0.3 4.5 4.5 0 000-6.4z" 
        />
      </svg>
    )
  }
];

// Recommended Songs List
export const RECOMMENDED_SONGS = [
  { id: "414437123", title: "BladeWalker", starred: true, tidalUrl: "https://tidal.com/track/414437123/u" },
  { id: "414338312", title: "Donuts", tidalUrl: "https://tidal.com/track/414338312/u" },
  { id: "414338313", title: "Dream", tidalUrl: "https://tidal.com/track/414338313/u" },
  { id: "414338316", title: "I Wonder Though", tidalUrl: "https://tidal.com/track/414338316/u" },
  { id: "414338315", title: "Get Real", tidalUrl: "https://tidal.com/track/414338315/u" },
  { id: "414271124", title: "Studies", tidalUrl: "https://tidal.com/track/414271124/u" },
  { id: "414271123", title: "So Entitled", tidalUrl: "https://tidal.com/track/414271123/u" },
  { id: "414350692", title: "Hills", tidalUrl: "https://tidal.com/track/414350692/u" },
  { id: "414350687", title: "Slow Down Bro", tidalUrl: "https://tidal.com/track/414350687/u" },
  { id: "414350688", title: "Speeding Ticket", tidalUrl: "https://tidal.com/track/414350688/u" },
  { id: "414350700", title: "Machine", tidalUrl: "https://tidal.com/track/414350700/u" }
];

interface ModernOrangeMusicProps {
  layout?: 'modal' | 'sheet';
}

export default function ModernOrangeMusic({ layout = 'modal' }: ModernOrangeMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconClassName = 'w-4 h-4 transition-transform duration-200 group-hover:scale-110';

  return (
    <div className="space-y-6 mt-6 border-t border-base02 pt-6">
      {/* Streaming Discography Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-base04">
          Stream Our Discography
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {DISCOGRAPHY_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2.5 px-3.5 py-2 min-h-9 bg-base01 border text-[11px] font-black uppercase tracking-wider transition-all duration-200 text-base04 border-base03/60 hover:text-base07 hover:border-base05/70 hover:bg-base02/45"
              style={{ clipPath: 'polygon(0 0, 100% 0, 97% 100%, 0 100%)' }}
            >
              <span className="absolute inset-0 halftone-bg opacity-[0.08] pointer-events-none" />
              <span className="relative z-[1] w-5 h-5 shrink-0 grid place-items-center border border-current/40 bg-base00/35 stream-icon-mono">
                {link.icon(iconClassName)}
              </span>
              <span className="relative z-[1]">{link.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* TIDAL-powered recommended player */}
      <div className="space-y-3" ref={containerRef}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-base04">
            Recommended Highlights
          </h3>
          <span className="text-[10px] bg-base08/20 text-base08 font-black uppercase tracking-widest px-2 py-0.5 border border-base08/30 rounded-sm">
            Interactive Player
          </span>
        </div>
        <TidalPlayer
          trackTitles={RECOMMENDED_SONGS}
          artist="ModernOrange"
          layout={layout}
          containerRef={containerRef}
        />
      </div>
    </div>
  );
}


