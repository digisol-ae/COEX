import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import {
  normalizeCopilotPreview,
  readCopilotPreview,
  signCopilotPreview,
} from '@/modules/integrations/teams/copilot-preview';
const actorId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const other = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const spaceId = 'cccccccccccccccccccccccc';
const folderId = 'dddddddddddddddddddddddd';
const data = {
  appId: 'app',
  actorId,
  title: '',
  description: '',
  canAssignOthers: false,
  spaces: [{ id: spaceId, name: 'Space', memberIds: [] as string[] }],
  folders: [{ id: folderId, name: 'Folder', spaceId, memberIds: [actorId] }],
  people: [
    { id: actorId, name: 'Creator' },
    { id: other, name: 'Other' },
  ],
};
const raw = { title: 'Check server', spaceId };
const secret = new TextEncoder().encode('test-only-secret'.repeat(4));
describe('Copilot task preview boundary', () => {
  it('defaults assignment to creator and reports exact choices without writing a task', () => {
    const result = normalizeCopilotPreview(raw, data);
    expect(result.fields.assigneeIds).toEqual([actorId]);
    expect(result.summary).toMatchObject({
      space: 'Space',
      folder: 'No folder',
      assignees: ['Creator'],
      dueDate: 'No due date',
    });
  });
  it('does not let an ordinary agent assign another person', () => {
    expect(() => normalizeCopilotPreview({ ...raw, assigneeIds: [other] }, data)).toThrow(
      'yourself',
    );
  });
  it('checks folder membership even with assignment permission', () => {
    expect(() =>
      normalizeCopilotPreview(
        { ...raw, folderId, assigneeIds: [other] },
        { ...data, canAssignOthers: true },
      ),
    ).toThrow('access');
  });
  it.each([
    { ...raw, spaceId: other },
    { ...raw, folderId: other },
    { ...raw, dueDate: '2026-02-30' },
    { ...raw, dueTime: '15:00' },
    { ...raw, dueDate: '2026-10-25', dueTime: '25:00' },
    { ...raw, assigneeIds: [] },
    { ...raw, source: 'trusted' },
  ])('rejects unavailable or malformed details %j', (input) => {
    expect(() => normalizeCopilotPreview(input, data)).toThrow();
  });
  it('preserves office date/time exactly, and deduplicates permitted assignees', () => {
    const result = normalizeCopilotPreview(
      { ...raw, dueDate: '2026-10-26', dueTime: '15:00', assigneeIds: [actorId, actorId] },
      data,
    );
    expect(result.summary).toMatchObject({ dueDate: '2026-10-26', dueTime: '15:00' });
    expect(result.fields.assigneeIds).toEqual([actorId]);
  });
  it('binds a signed preview to actor, tenant, data and a stable retry receipt', async () => {
    const fields = normalizeCopilotPreview(raw, data).fields;
    const token = await signCopilotPreview(fields, actorId, 'tenant', secret);
    const first = await readCopilotPreview(token, actorId, 'tenant', secret);
    expect(first.fields).toEqual(fields);
    expect(await readCopilotPreview(token, actorId, 'tenant', secret)).toEqual(first);
    await expect(readCopilotPreview(token, other, 'tenant', secret)).rejects.toThrow();
    await expect(readCopilotPreview(token, actorId, 'another', secret)).rejects.toThrow();
    const [header, body, signature] = token.split('.');
    const changed = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(body, 'base64url').toString()),
        fields: { ...fields, title: 'Changed' },
      }),
    ).toString('base64url');
    await expect(
      readCopilotPreview(`${header}.${changed}.${signature}`, actorId, 'tenant', secret),
    ).rejects.toThrow();
  });
  it('rejects expired previews', async () => {
    const token = await new SignJWT({ tenantId: 'tenant', fields: raw })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(actorId)
      .setIssuer('worktello-copilot-preview')
      .setAudience('worktello-copilot-create')
      .setJti('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
      .setIssuedAt(1)
      .setExpirationTime(2)
      .sign(secret);
    await expect(readCopilotPreview(token, actorId, 'tenant', secret)).rejects.toThrow();
  });
});
