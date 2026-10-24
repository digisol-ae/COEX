import { describe, expect, it } from 'vitest';
import {
  taskShareMessage,
  taskTeamsSource,
  teamsMessageLink,
} from '@coex/shared/tasks/teams-sharing';
const link = 'https://teams.microsoft.com/l/message/19%3Achat/123?context=%7B%7D';
describe('Teams task navigation and sharing', () => {
  it('accepts official message/chat links and rejects executable, lookalike and unrelated links', () => {
    expect(teamsMessageLink(link)).toBe(link);
    expect(
      teamsMessageLink('https://teams.cloud.microsoft/l/chat/19%3Achat/conversations'),
    ).toBeTruthy();
    for (const url of [
      'javascript:alert(1)',
      'http://teams.microsoft.com/l/message/a/b',
      'https://teams.microsoft.com.evil.test/l/message/a/b',
      'https://user:pass@teams.microsoft.com/l/message/a/b',
      'https://teams.microsoft.com:8443/l/message/a/b',
      'https://teams.microsoft.com/redirect?url=https://evil.test',
    ])
      expect(teamsMessageLink(url)).toBeNull();
  });
  it('preserves structured provenance when description changes and supports labelled legacy links only', () => {
    expect(taskTeamsSource(link, 'Edited description')).toBe(link);
    expect(taskTeamsSource(null, `Message text\n\nOriginal Teams message: ${link}`)).toBe(link);
    expect(taskTeamsSource(null, `An unrelated link: ${link}`)).toBeNull();
    expect(taskTeamsSource(null, 'Original Teams message: https://evil.test/')).toBeNull();
    expect(taskTeamsSource(null, null)).toBeNull();
  });
  it('shares only the visible task summary and never description, comments or attachments', () => {
    const task = {
      number: 'DGS-T-1',
      title: 'Review onboarding',
      status: 'To do',
      description: 'Private message',
      comments: ['Internal note'],
      attachments: ['secret.pdf'],
    };
    expect(taskShareMessage(task)).toBe('DGS-T-1 · Review onboarding\nStatus: To do');
  });
});
