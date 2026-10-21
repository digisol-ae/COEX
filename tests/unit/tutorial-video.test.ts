import { describe, expect, it } from 'vitest';
import { videoRange } from '@/modules/tutorials/video-rules';
describe('tutorial video seeking', () => {
  it('supports first chunk, open ended seeking, and suffix requests', () => {
    expect(videoRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 });
    expect(videoRange('bytes=50-', 100)).toEqual({ start: 50, end: 99 });
    expect(videoRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
    expect(videoRange('bytes=90-200', 100)).toEqual({ start: 90, end: 99 });
  });
  it.each([
    'bytes=100-',
    'bytes=50-10',
    'bytes=-0',
    'bytes=-',
    'bytes=0-1,4-5',
    'oops',
    'bytes=999999999999999999999-',
  ])('rejects invalid range %s', (range) => {
    expect(videoRange(range, 100)).toBeNull();
  });
});
