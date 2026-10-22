import {
  createRemoteJWKSet,
  jwtVerify,
  SignJWT,
  type JWTVerifyGetKey,
  type JSONWebKeySet,
} from 'jose';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export const activitySchema = z.object({
  type: z.literal('invoke'),
  name: z.enum(['composeExtension/fetchTask', 'composeExtension/submitAction']),
  channelId: z.literal('msteams'),
  serviceUrl: z.url(),
  from: z.object({ aadObjectId: z.uuid() }),
  channelData: z.object({ tenant: z.object({ id: z.uuid() }) }),
  value: z.object({
    commandId: z.literal('createCoexTask'),
    messagePayload: z
      .object({
        body: z.object({ content: z.string().max(20000), contentType: z.string() }),
        linkToMessage: z.string().optional(),
      })
      .optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type TeamsActivity = z.infer<typeof activitySchema>;

const remoteKeys = createRemoteJWKSet(
  new URL('https://login.botframework.com/v1/.well-known/keys'),
);

/** No emulator/unsigned mode. Keys and channel endorsements come only from Microsoft. */
export async function verifyConnector(
  authorization: string | null,
  activity: TeamsActivity,
  appId: string,
  keys: JWTVerifyGetKey & { jwks: () => JSONWebKeySet | undefined } = remoteKeys,
) {
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) throw new Error('Unauthorized');
  await jwtVerify(
    match[1],
    async (header, token) => {
      const key = await keys(header, token);
      const jwks = keys.jwks() as { keys: { kid?: string; endorsements?: string[] }[] } | undefined;
      const endorsed = jwks?.keys.find((candidate) => candidate.kid === header.kid);
      if (!endorsed?.endorsements?.includes('msteams')) throw new Error('Unauthorized');
      return key;
    },
    {
      algorithms: ['RS256'],
      issuer: 'https://api.botframework.com',
      audience: appId,
      requiredClaims: ['exp', 'nbf', 'serviceurl'],
      clockTolerance: 60,
    },
  ).then(({ payload }) => {
    if (payload.serviceurl !== activity.serviceUrl) throw new Error('Unauthorized');
  });
}

export function sourceMessage(activity: TeamsActivity) {
  const message = activity.value.messagePayload;
  if (!message) throw new Error('Choose a Teams message first.');
  let text = message.body.content;
  if (message.body.contentType === 'html') {
    text = text
      .replace(/<br\s*\/?\s*>|<\/p>|<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');
  }
  const url = new URL(message.linkToMessage ?? '');
  if (
    url.protocol !== 'https:' ||
    !['teams.microsoft.com', 'teams.cloud.microsoft'].includes(url.hostname)
  )
    throw new Error('The original Teams message link is missing or invalid.');
  return { text: text.trim().slice(0, 12000), url: url.href };
}

const draftSchema = z.object({
  sub: z.string(),
  jti: z.uuid(),
  tenant: z.string(),
  text: z.string().max(12000),
  url: z.url(),
});
export async function signDraft(
  input: { sub: string; tenant: string; text: string; url: string },
  secret: Uint8Array,
) {
  return new SignJWT(input)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('coex-teams')
    .setAudience('coex-teams-task')
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}
export async function readDraft(
  token: string,
  actorId: string,
  tenantId: string,
  secret: Uint8Array,
) {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'coex-teams',
    audience: 'coex-teams-task',
    requiredClaims: ['exp', 'iat', 'jti'],
  });
  const draft = draftSchema.parse(payload);
  if (draft.sub !== actorId || draft.tenant !== tenantId) throw new Error('Invalid draft owner');
  return draft;
}

export const taskFieldsSchema = z
  .object({
    draft: z.string().min(1).max(24000),
    title: z.string().trim().min(1).max(250),
    description: z.string().trim().max(12000).default(''),
    destination: z
      .string()
      .regex(/^[a-f\d]{24}(?::[a-f\d]{24})?$/i)
      .optional(),
    spaceId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
    folderId: z.union([z.literal(''), z.string().regex(/^[a-f\d]{24}$/i)]).default(''),
    assignee: z.union([z.literal(''), z.string().regex(/^[a-f\d]{24}$/i)]).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    dueTime: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^$/)
      .default(''),
    dueDate: z
      .string()
      .default('')
      .refine(
        (value) =>
          !value ||
          (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(Date.parse(value)) &&
            new Date(value).toISOString().slice(0, 10) === value),
      ),
  })
  .refine((value) => Boolean(value.spaceId || value.destination), { message: 'Choose a space.' })
  .refine((value) => !value.dueTime || Boolean(value.dueDate), {
    message: 'Choose a date with the time.',
  })
  .transform((value) => ({
    ...value,
    destination: value.spaceId
      ? value.spaceId + (value.folderId ? ':' + value.folderId : '')
      : value.destination!,
  }));

export function messageResponse(text: string) {
  return { task: { type: 'message', value: text } };
}
