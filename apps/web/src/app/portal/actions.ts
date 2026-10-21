'use server';
import { verifyCaptcha } from '@/lib/captcha';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { asUser, requireUser } from '@/lib/session';
import { raisePortalTicket, replyFromPortal } from '@/modules/portal/service';
import type { IncomingFile } from '@/modules/tickets/services/attachment.service';
export interface PortalState {
  error?: string;
  saved?: boolean;
  warning?: string;
}
async function actor() {
  const user = await requireUser();
  if (user.role !== 'client_contact') redirect('/dashboard');
  return user;
}
async function filesFrom(form: FormData): Promise<IncomingFile[]> {
  const files = form
    .getAll('files')
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (
    files.length > 10 ||
    files.some((f) => f.size > 3 * 1024 * 1024) ||
    files.reduce((sum, f) => sum + f.size, 0) > 10 * 1024 * 1024
  )
    throw new Error('Use up to 10 attachments, 3 MB per file and 10 MB total.');
  return Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      body: Buffer.from(await file.arrayBuffer()),
    })),
  );
}
export async function raiseAction(_previous: PortalState, form: FormData): Promise<PortalState> {
  const user = await actor();
  let result;
  try {
    await verifyCaptcha(form, 'portal_ticket');
    const files = await filesFrom(form);
    result = await asUser(user, () =>
      raisePortalTicket({
        subject: String(form.get('subject') ?? ''),
        body: String(form.get('body') ?? ''),
        files,
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not raise ticket.' };
  }
  revalidatePath('/portal');
  revalidatePath('/support/tickets');
  redirect(`/portal/tickets/${result.id}${result.attachmentFailed ? '?attachment=failed' : ''}`);
}
export async function replyAction(_previous: PortalState, form: FormData): Promise<PortalState> {
  const user = await actor();
  const id = String(form.get('ticketId') ?? '');
  try {
    await verifyCaptcha(form, 'portal_reply');
    const files = await filesFrom(form);
    const result = await asUser(user, () =>
      replyFromPortal(id, String(form.get('body') ?? ''), files),
    );
    revalidatePath(`/portal/tickets/${id}`);
    revalidatePath('/portal');
    revalidatePath(`/support/tickets/${id}`);
    revalidatePath('/support/tickets');
    return {
      saved: true,
      ...(result.attachmentFailed
        ? {
            warning:
              'Your reply was saved, but attachments could not be added. Please attach them to a new reply.',
          }
        : {}),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not send reply.' };
  }
}
