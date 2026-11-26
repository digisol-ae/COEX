import { it, expect } from 'vitest';
import { websiteSchema, websiteLink } from '@/components/landing/website-schema';
import { GROUPS, navigationItemAllowed, visibleGroups } from '@/components/navigation/navigation';
it('hides website editing from ordinary permission holders', () => {
  const item = GROUPS.flatMap((g) => g.items).find((i) => i.href === '/setup/website-content')!;
  expect(navigationItemAllowed(item, [], 'platform_admin')).toBe(true);
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
