import { describe, expect, it } from 'vitest';
import { parseVideoLink } from '@/modules/tutorials/video-link';
describe('tutorial video links', () => {
  it.each([
    'https://youtu.be/M7lc1UVf-VE',
    'https://www.youtube.com/embed/M7lc1UVf-VE?si=FmNDSFsWTcgmAk4D',
    'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtube.com/shorts/M7lc1UVf-VE',
    'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=1',
  ])('normalizes YouTube links without autoplay: %s', (url) => {
    expect(parseVideoLink(url)).toEqual({
      embed: true,
      url: 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=0&rel=0',
    });
  });
  it('preserves unlisted Vimeo privacy hashes', () => {
    const result = parseVideoLink('https://vimeo.com/123456/abc123');
    expect(result).toEqual({
      embed: true,
      url: 'https://player.vimeo.com/video/123456?h=abc123&autoplay=0',
    });
    expect(parseVideoLink(result.url)).toEqual(result);
  });
  it('accepts direct media links including signed URLs', () => {
    expect(parseVideoLink('https://cdn.example/video.mp4?token=abc').embed).toBe(false);
  });
  it.each([
    'javascript:alert(1)',
    'http://youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtube.com.evil.example/watch?v=M7lc1UVf-VE',
    'https://user:secret@youtube.com/watch?v=M7lc1UVf-VE',
    'https://example.com/page',
    'https://youtube.com/watch?v=invalid',
    'https://vimeo.com/channels/staffpicks',
    'https://youtube.com:8443/watch?v=M7lc1UVf-VE',
  ])('rejects unsafe or unsupported URL %s', (url) => {
    expect(() => parseVideoLink(url)).toThrow();
  });
});
