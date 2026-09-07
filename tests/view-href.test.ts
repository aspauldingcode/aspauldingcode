import { describe, expect, it } from 'vitest';
import { localPathForHref, parseViewTarget, viewHref, viewQueryFromHref } from '@/lib/viewHref';
import {
  shouldInterceptViewClick,
  shouldInterceptWorkClick,
  workSlugFromHref,
} from '@/lib/workRoute';

const localOrigin = 'http://127.0.0.1:4321';

describe('local project and site URLs', () => {
  it('rewrites this site and mapped project hosts to same-origin paths', () => {
    expect(localPathForHref('https://aspauldingcode.com/work/wawona')).toBe('/work/wawona');
    expect(localPathForHref('https://www.aspauldingcode.com/whisperer/privacy')).toBe(
      '/whisperer/privacy'
    );
    expect(localPathForHref('https://wawona.io')).toBe('/work/wawona');
    expect(localPathForHref('https://www.wawona.io/')).toBe('/work/wawona');
    expect(localPathForHref('http://127.0.0.1:4321/work/apple-sharpener', localOrigin)).toBe(
      '/work/apple-sharpener'
    );
    expect(localPathForHref('/work/whisperer')).toBe('/work/whisperer');
    expect(localPathForHref('https://github.com/Wawona/Wawona')).toBeNull();
  });

  it('keeps first-party clicks on this origin instead of /view or production', () => {
    expect(viewHref('https://www.aspauldingcode.com/work/wawona')).toBe('/work/wawona');
    expect(viewHref('https://wawona.io')).toBe('/work/wawona');
    expect(viewHref('/whisperer/terms')).toBe('/whisperer/terms');
    expect(viewHref('https://github.com/aspauldingcode')).toBe(
      '/view?u=https%3A%2F%2Fgithub.com%2Faspauldingcode'
    );
    expect(viewHref('https://open.spotify.com/artist/1E32wLOibjqY9busMJu8qD')).toMatch(
      /^\/view\?u=/
    );
  });

  it('does not build a /view iframe target for local or first-party URLs', () => {
    expect(parseViewTarget('https://wawona.io')).toBeNull();
    expect(parseViewTarget('https://aspauldingcode.com/work/wawona')).toBeNull();
    expect(parseViewTarget('/work/wawona')).toBeNull();
    expect(parseViewTarget('http://127.0.0.1:4321/work/wawona')).toBeNull();
    expect(parseViewTarget('https://github.com/aspauldingcode')?.embeddable).toBe(false);
    expect(
      parseViewTarget('https://open.spotify.com/artist/1E32wLOibjqY9busMJu8qD')?.embeddable
    ).toBe(true);
  });

  it('intercepts production and /view project URLs while previewing locally', () => {
    expect(workSlugFromHref('https://www.aspauldingcode.com/work/wawona', localOrigin)).toBe(
      'wawona'
    );
    expect(workSlugFromHref('https://wawona.io', localOrigin)).toBe('wawona');
    expect(
      workSlugFromHref('/view?u=https%3A%2F%2Fwawona.io', localOrigin)
    ).toBe('wawona');
    expect(workSlugFromHref('https://evil.example/work/wawona', localOrigin)).toBeNull();

    const click = {
      defaultPrevented: false,
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      targetBlank: false,
      download: false,
      origin: 'https://www.aspauldingcode.com',
      pageOrigin: localOrigin,
      pathname: '/work/wawona',
      href: 'https://www.aspauldingcode.com/work/wawona',
    };
    expect(shouldInterceptWorkClick(click)).toBe(true);
    expect(
      shouldInterceptWorkClick({
        ...click,
        origin: 'https://evil.example',
        href: 'https://evil.example/work/wawona',
        pathname: '/work/wawona',
      })
    ).toBe(false);
  });

  it('keeps EWU and other third-party /view clicks in-document', () => {
    expect(viewHref('https://www.ewu.edu/')).toBe('/view?u=https%3A%2F%2Fwww.ewu.edu%2F');
    expect(viewQueryFromHref('/view?u=https%3A%2F%2Fwww.ewu.edu%2F', localOrigin)).toBe(
      'https://www.ewu.edu/'
    );
    expect(viewQueryFromHref('/view?u=https%3A%2F%2Fwawona.io', localOrigin)).toBeNull();
    expect(workSlugFromHref('/view?u=https%3A%2F%2Fwww.ewu.edu%2F', localOrigin)).toBeNull();
    expect(
      shouldInterceptViewClick({
        defaultPrevented: false,
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        targetBlank: false,
        download: false,
        origin: localOrigin,
        pageOrigin: localOrigin,
        pathname: '/view',
        href: `${localOrigin}/view?u=https%3A%2F%2Fwww.ewu.edu%2F`,
      })
    ).toBe(true);
    expect(
      shouldInterceptViewClick({
        defaultPrevented: false,
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        targetBlank: false,
        download: false,
        origin: localOrigin,
        pageOrigin: localOrigin,
        pathname: '/view',
        href: `${localOrigin}/view?u=https%3A%2F%2Fwawona.io`,
      })
    ).toBe(false);
  });
});
