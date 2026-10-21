import { expect, it } from 'vitest';
import { isRailActive } from '@/components/navigation/rail-active';
it.each([
  ['/support/metrics', '/support/tickets', 'support', true],
  ['/support/tickets/123', '/support/tickets', 'support', true],
  ['/opportunities/123', '/customers', 'crm', true],
  ['/products', '/customers', 'crm', true],
  ['/time/activity', '/time', 'time', true],
  ['/setup/fields', '/setup', 'setup', true],
  ['/personal', '/tasks', 'tasks', true],
  ['/tasks/123', '/tasks', 'tasks', true],
  ['/spaces/123', '/spaces', 'tasks', true],
  ['/spaces/123', '/tasks', 'tasks', false],
  ['/tasks/123', '/spaces', 'tasks', false],
  ['/customers-extra', '/customers', 'crm', false],
  ['/leads', '/support/tickets', 'support', false],
])('matches %s to %s', (pathname, href, group, expected) => {
  expect(isRailActive(pathname as string, href as string, group as string)).toBe(expected);
});
