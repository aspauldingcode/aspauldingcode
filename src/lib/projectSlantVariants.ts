import type { CSSProperties } from 'react';

/** Slanted shell + optional top highlight rail (angled clip, no text). */
export type ProjectSlantVariant = {
  shadowFar: string;
  shadowNear: string;
  main: string;
  /** Thin top accent — steepness varies by project id (Persona-style slash). */
  highlightRail: string;
};

export const PROJECT_SLANT_VARIANTS: ProjectSlantVariant[] = [
  {
    shadowFar: 'polygon(0% 7.25%, 100% 0%, 100% 100%, 0% 100%)',
    shadowNear: 'polygon(0.35% 6.4%, 100% 0.1%, 100% 100%, 0% 99.65%)',
    main: 'polygon(0% 6%, 100% 0%, 100% 100%, 0% 100%)',
    highlightRail: 'polygon(0 0, 100% 0, 100% 100%, 0 88%)',
  },
  {
    shadowFar: 'polygon(0% 4.5%, 100% 0%, 100% 100%, 0% 100%)',
    shadowNear: 'polygon(0.32% 3.85%, 100% 0.14%, 100% 100%, 0% 99.68%)',
    main: 'polygon(0% 3.25%, 100% 0%, 100% 100%, 0% 100%)',
    highlightRail: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)',
  },
  {
    shadowFar: 'polygon(0% 0%, 100% 6%, 100% 100%, 0% 100%)',
    shadowNear: 'polygon(0.12% 0.08%, 100% 5.25%, 100% 100%, 0% 99.62%)',
    main: 'polygon(0% 0%, 100% 4.75%, 100% 100%, 0% 100%)',
    highlightRail: 'polygon(0 0, 100% 0, 100% 100%, 0 90%)',
  },
  {
    shadowFar: 'polygon(0% 5.5%, 100% 0%, 100% 100%, 0% 100%)',
    shadowNear: 'polygon(0.38% 4.75%, 100% 0.16%, 100% 100%, 0% 99.62%)',
    main: 'polygon(0% 4.2%, 100% 0%, 100% 100%, 0% 100%)',
    highlightRail: 'polygon(0 0, 100% 0, 100% 95%, 0 100%)',
  },
  {
    shadowFar: 'polygon(0% 8%, 100% 0%, 100% 100%, 0% 100%)',
    shadowNear: 'polygon(0.42% 7.1%, 100% 0.08%, 100% 100%, 0% 99.58%)',
    main: 'polygon(0% 6.75%, 100% 0%, 100% 100%, 0% 100%)',
    highlightRail: 'polygon(0 0, 100% 0, 100% 93%, 0 100%)',
  },
];

export function projectSlantForId(id: number): ProjectSlantVariant {
  const n = PROJECT_SLANT_VARIANTS.length;
  return PROJECT_SLANT_VARIANTS[((id % n) + n) % n];
}

export function clipBoth(path: string): CSSProperties {
  return { clipPath: path, WebkitClipPath: path };
}
