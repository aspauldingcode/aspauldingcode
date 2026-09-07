import { describe, expect, it } from 'vitest';
import { hireBarPin } from '@/lib/hireMeRuntime';

const wrap = { left: 120, width: 640 };

describe('hire bar pin', () => {
  it('keeps the overlay header on the centered wrap, not 100vw', () => {
    expect(hireBarPin(wrap, { left: 0, width: 1280 }, true)).toEqual({
      left: '120px',
      width: '640px',
    });
    expect(hireBarPin(wrap, { left: 0, width: 1280 }, false)).toEqual({
      left: '120px',
      width: '640px',
    });
  });

  it('uses the home column only when the wrap is missing and this is not the overlay', () => {
    expect(hireBarPin(null, { left: 16, width: 600 }, false)).toEqual({
      left: '16px',
      width: '600px',
    });
    expect(hireBarPin(null, { left: 16, width: 600 }, true)).toEqual({
      left: '0px',
      width: '100%',
    });
  });
});
