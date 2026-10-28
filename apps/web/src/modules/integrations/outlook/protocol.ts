import { z } from 'zod';
const id = z.string().regex(/^[a-f\d]{24}$/i);
export const outlookTaskSchema = z.object({
  messageId: z.string().trim().min(1).max(2000),
  mailbox: z.email().max(320),
  title: z.string().trim().min(1).max(300),
  body: z.string().max(30000),
  sender: z.string().max(500),
  sentAt: z.string().max(100),
  spaceId: id,
  folderId: id.nullable().default(null),
  organisationId: id.nullable().default(null),
  assigneeIds: z.array(id).max(50).default([]),
  dueDate: z.union([z.iso.date(), z.literal('')]).default(''),
  attachments: z
    .array(
      z.object({
        fileName: z.string().trim().min(1).max(255),
        contentType: z.string().max(150),
        base64: z.string().max(4194304),
      }),
    )
    .max(10)
    .default([]),
});
export type OutlookTaskInput = z.infer<typeof outlookTaskSchema>;
export function emailDescription(
  input: Pick<OutlookTaskInput, 'body' | 'sender' | 'sentAt' | 'messageId'>,
) {
  return `${input.body}\n\nSource: Outlook email\nFrom: ${input.sender}\nSent: ${input.sentAt}\nMessage ID: ${input.messageId}`;
}
