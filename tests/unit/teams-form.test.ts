import { describe, expect, it } from 'vitest';
import {
  defaultAssignee,
  formChoices,
  type TeamsFormData,
} from '@/modules/integrations/teams/form-model';
import { taskFieldsSchema } from '@/modules/integrations/teams/teams-protocol';
import { parseDateTimeInput } from '@coex/shared/tasks/dates';

const data: TeamsFormData = {
  appId: 'bot',
  actorId: 'me',
  title: 'Task',
  description: 'Message',
  spaces: [
    { id: 'open', name: 'Open', memberIds: [] },
    { id: 'private', name: 'Private', memberIds: ['other'] },
  ],
  folders: [
    { id: 'mine', name: 'Mine', spaceId: 'open', memberIds: ['me'] },
    { id: 'theirs', name: 'Theirs', spaceId: 'private', memberIds: ['other'] },
  ],
  people: [
    { id: 'me', name: 'Creator' },
    { id: 'other', name: 'Other agent' },
  ],
};

describe('Single-screen Teams form', () => {
  it('filters folders by chosen space and defaults to the creator', () => {
    expect(formChoices(data, 'open', '').folders.map((f) => f.id)).toEqual(['mine']);
    expect(defaultAssignee(data, 'open', '')).toBe('me');
  });
  it('shows only eligible assignees and never forces the creator into a private destination', () => {
    expect(formChoices(data, 'open', 'mine').people.map((p) => p.id)).toEqual(['me']);
    expect(formChoices(data, 'private', '').people.map((p) => p.id)).toEqual(['other']);
    expect(defaultAssignee(data, 'private', '')).toBe('');
    expect(formChoices(data, 'unknown', '').people).toEqual([]);
  });
  it('accepts separate space/folder selectors and an explicit unassigned choice', () => {
    const parsed = taskFieldsSchema.parse({
      draft: 'token',
      title: 'Task',
      spaceId: 'a'.repeat(24),
      folderId: 'b'.repeat(24),
      assignee: '',
      dueDate: '2026-10-22',
      dueTime: '09:30',
    });
    expect(parsed.destination).toBe('a'.repeat(24) + ':' + 'b'.repeat(24));
    expect(parsed.assignee).toBe('');
    expect(parseDateTimeInput(`${parsed.dueDate}T${parsed.dueTime}`)?.toISOString()).toBe(
      '2026-10-22T05:30:00.000Z',
    );
  });
  it('rejects times without dates and invalid time values', () => {
    const input = { draft: 'token', title: 'Task', spaceId: 'a'.repeat(24) };
    expect(taskFieldsSchema.safeParse({ ...input, dueTime: '09:30' }).success).toBe(false);
    expect(
      taskFieldsSchema.safeParse({ ...input, dueDate: '2026-10-22', dueTime: '24:00' }).success,
    ).toBe(false);
    expect(
      taskFieldsSchema.safeParse({ ...input, dueDate: '2026-02-30', dueTime: '12:00' }).success,
    ).toBe(false);
  });
});
