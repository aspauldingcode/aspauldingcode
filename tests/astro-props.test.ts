import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { reviveAstroProps } from '@/lib/astroProps';

const root = path.resolve(__dirname, '..');

describe('Astro island props', () => {
  it('revives nested objects and arrays', () => {
    const props = reviveAstroProps(
      '{"catalog":[1,[[0,{"id":[0,"1"],"title":[0,"BladeWalker"],"starred":[0,true]}]]]}'
    );
    expect(props.catalog).toEqual([{ id: '1', title: 'BladeWalker', starred: true }]);
  });
});

describe('ModernOrange player', () => {
  it('keeps the simple TIDAL GUI and nerd transport', () => {
    const player = readFileSync(path.join(root, 'src/components/BandPlayer.tsx'), 'utf8');
    expect(player).toContain('Listen (TIDAL preview)');
    expect(player).toContain('className="nf"');
    expect(player).toContain('󰅁');
    expect(player).toContain('󰅂');
    expect(player).toContain('󰏤');
    expect(player).toContain('󰐊');
    expect(player).toContain('󰓎');
    expect(player).toContain('player-seek');
    expect(player).toContain('player-tracks');
    expect(player).not.toMatch(/clipBoth|halftone|Persona/);
  });
});
