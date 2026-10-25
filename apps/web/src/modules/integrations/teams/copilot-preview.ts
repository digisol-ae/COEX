import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { taskFieldsSchema } from './teams-protocol';
import { formChoices, type TeamsFormData } from './form-model';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
export const copilotFields = z.strictObject({
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(2000).default(''),
  spaceId: objectId,
  folderId: z.union([objectId, z.literal('')]).default(''),
  assigneeIds: z.array(objectId).min(1).max(50).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueDate: z.string().default(''),
  dueTime: z.string().default(''),
});

export function normalizeCopilotPreview(raw: unknown, data: TeamsFormData) {
  const input = copilotFields.parse(raw);
  taskFieldsSchema.parse({ ...input, draft: 'copilot' });
  const space = data.spaces.find((s) => s.id === input.spaceId);
  const folder = data.folders.find((f) => f.id === input.folderId && f.spaceId === input.spaceId);
  if (!space || (input.folderId && !folder))
    throw new Error('Choose an available space and folder.');
  const ids = [...new Set(input.assigneeIds ?? [data.actorId])];
  if (ids.some((id) => id !== data.actorId) && !data.canAssignOthers)
    throw new Error('You may only assign tasks to yourself.');
  const people = formChoices(data, input.spaceId, input.folderId).people;
  if (ids.some((id) => !people.some((person) => person.id === id)))
    throw new Error('Choose assignees who can access this destination.');
  return {
    fields: { ...input, assigneeIds: ids },
    summary: {
      title: input.title,
      description: input.description,
      space: space.name,
      folder: folder?.name ?? 'No folder',
      assignees: ids.map((id) => people.find((person) => person.id === id)!.name),
      priority: input.priority,
      dueDate: input.dueDate || 'No due date',
      dueTime: input.dueDate ? input.dueTime || '00:00' : '',
    },
  };
}

export async function signCopilotPreview(
  fields: z.infer<typeof copilotFields>,
  actorId: string,
  tenantId: string,
  secret: Uint8Array,
) {
  return new SignJWT({ fields, tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('worktello-copilot-preview')
    .setAudience('worktello-copilot-create')
    .setSubject(actorId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secret);
}

export async function readCopilotPreview(
  token: string,
  actorId: string,
  tenantId: string,
  secret: Uint8Array,
) {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'worktello-copilot-preview',
    audience: 'worktello-copilot-create',
    subject: actorId,
    requiredClaims: ['exp', 'iat', 'jti', 'sub'],
  });
  if (payload.tenantId !== tenantId) throw new Error('Preview is unavailable.');
  return { fields: copilotFields.parse(payload.fields), requestId: z.uuid().parse(payload.jti) };
}
