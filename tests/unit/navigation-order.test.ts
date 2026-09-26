import { describe, expect, it } from 'vitest';
import { GROUPS, orderGroups } from '@/components/navigation/navigation';

const ids = (groups: { id: string }[]) => groups.map((group) => group.id);

describe('a person’s menu order', () => {
  it('keeps the standard order when the person has not chosen one', () => {
    expect(ids(orderGroups(GROUPS, []))).toEqual(ids(GROUPS));
  });

  it('puts the chosen groups first, in the chosen order', () => {
    const ordered = ids(orderGroups(GROUPS, ['support', 'crm']));
    expect(ordered.slice(0, 2)).toEqual(['support', 'crm']);
    expect(ordered).toHaveLength(GROUPS.length);
  });

  it('still shows a group added after the order was saved, in its standard place', () => {
    const ordered = ids(orderGroups(GROUPS, ['setup', 'support', 'crm', 'tasks']));
    expect(ordered).toEqual(['setup', 'support', 'crm', 'tasks', 'security']);
  });

  it('ignores ids that no longer exist', () => {
    expect(ids(orderGroups(GROUPS, ['gone', 'crm']))[0]).toBe('crm');
  });
});
