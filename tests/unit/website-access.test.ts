import { it, expect } from 'vitest';
import { websiteSchema, websiteLink } from '@/components/landing/website-schema';
import { GROUPS, navigationItemAllowed, visibleGroups } from '@/components/navigation/navigation';
it('hides website editing from ordinary permission holders', () => {
  const item = GROUPS.flatMap((g) => g.items).find((i) => i.href === '/website-manager')!;
  expect(navigationItemAllowed(item, [], 'platform_admin')).toBe(true);
  expect(
    GROUPS.find((group) => group.id === 'setup')!.items.some((item) =>
      item.href.includes('website'),
    ),
  ).toBe(false);
  for (const role of ['admin', 'manager', 'agent', undefined]) {
    expect(navigationItemAllowed(item, [], role)).toBe(false);
    expect(visibleGroups([], role).flatMap((g) => g.items)).not.toContainEqual(item);
  }
});
it('rejects executable links and unknown media', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,test',
    '//evil.test',
    'http://evil.test',
  ])
    expect(websiteLink.safeParse(value).success).toBe(false);
  expect(
    websiteSchema.safeParse({
      texts: {},
      images: { x: '/api/tasks/private' },
      faq: [],
      seo: { title: 'Test', description: '', image: '' },
    }).success,
  ).toBe(false);
});

import config from '../../apps/web/next.config';
import { hasLocalMatch } from 'next/dist/shared/lib/match-local-pattern';
it('prevents the image optimizer from caching protected website media', () => {
  const patterns = config.images!.localPatterns;
  expect(hasLocalMatch(patterns, '/website/figma/17a2a.png')).toBe(true);
  for (const path of [
    '/api/website-media/11111111-1111-1111-1111-111111111111',
    '/website/../api/website-media/11111111-1111-1111-1111-111111111111',
  ])
    expect(hasLocalMatch(patterns, path)).toBe(false);
});
