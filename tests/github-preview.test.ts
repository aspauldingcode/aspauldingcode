import { describe, expect, it } from 'vitest';
import {
  isOwnGitHubProfile,
  ownGitHubLogin,
  parseGitHubLogin,
  parseGitHubPinsFromHtml,
  parseGitHubStatusFromHtml,
  pinsFromResume,
} from '@/lib/profileCard';

const PIN_HTML = `
<div class="js-pinned-items-reorder-container">
  <div class="pinned-item-list-item-content">
    <a href="/aspauldingcode/apple-sharpener" class="Link mr-1 text-bold wb-break-word">
      <span class="repo">apple-sharpener</span>
    </a>
    <p class="pinned-item-desc">square macos windows</p>
    <span class="repo-language-color" style="background-color: #438eff"></span>
    <span itemprop="programmingLanguage">Objective-C</span>
    <a href="/aspauldingcode/apple-sharpener/stargazers" class="pinned-item-meta">
      <svg aria-label="stars"></svg>
      304
    </a>
  </div>
  <div class="pinned-item-list-item-content">
    <a href="/Wawona/Wawona" class="Link mr-1 text-bold wb-break-word">
      <span class="owner text-normal">Wawona/</span>
      <span class="repo">Wawona</span>
    </a>
    <p class="pinned-item-desc">Native Wayland compositor</p>
    <span class="repo-language-color" style="background-color: #dea584"></span>
    <span itemprop="programmingLanguage">Rust</span>
    <a href="/Wawona/Wawona/stargazers" class="pinned-item-meta">
      <svg aria-label="stars"></svg>
      12
    </a>
  </div>
</div>
`;

const STATUS_HTML = `
<div class="user-status-emoji-container"><div>👋</div></div>
<div class="user-status-message-wrapper">
  <div>Looking for summer internships!</div>
</div>
`;

describe('GitHub preview card', () => {
  it('recognizes the site owner profile', () => {
    expect(ownGitHubLogin()).toBe('aspauldingcode');
    expect(parseGitHubLogin('https://github.com/aspauldingcode')).toBe(
      'aspauldingcode'
    );
    expect(isOwnGitHubProfile('https://github.com/aspauldingcode')).toBe(true);
    expect(isOwnGitHubProfile('https://github.com/octocat')).toBe(false);
  });

  it('reads the public GitHub status from profile HTML', () => {
    expect(parseGitHubStatusFromHtml(STATUS_HTML)).toBe(
      '👋 Looking for summer internships!'
    );
  });

  it('parses pinned repositories from profile HTML', () => {
    const pins = parseGitHubPinsFromHtml(PIN_HTML);
    expect(pins).toHaveLength(2);
    expect(pins[0]).toMatchObject({
      name: 'apple-sharpener',
      href: 'https://github.com/aspauldingcode/apple-sharpener',
      language: 'Objective-C',
      languageColor: '#438eff',
      stars: 304,
    });
    expect(pins[1]).toMatchObject({
      name: 'Wawona/Wawona',
      href: 'https://github.com/Wawona/Wawona',
      language: 'Rust',
      stars: 12,
    });
  });

  it('falls back to resume projects when pins are missing', () => {
    const pins = pinsFromResume();
    expect(pins.map((pin) => pin.name)).toEqual(
      expect.arrayContaining(['Wawona', 'apple-sharpener', 'Whisperer'])
    );
    expect(pins.every((pin) => pin.href.startsWith('https://'))).toBe(true);
  });
});
