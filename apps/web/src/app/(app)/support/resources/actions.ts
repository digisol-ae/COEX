'use server';
import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  createResourceShare,
  revokeResourceShare,
  ticketShareTarget,
} from '@/modules/resources/service';
export interface ResourceActionState {
  error?: string;
  saved?: boolean;
  shareId?: string;
}
export async function shareResourcesAction(
  _previous: ResourceActionState,
  form: FormData,
): Promise<ResourceActionState> {
  const actor = await requirePermission('resource.share');
  try {
    const shareId = await asUser(actor, async () => {
      const ticketId = String(form.get('ticketId') ?? '') || undefined;
      const target = ticketId
        ? await ticketShareTarget(ticketId, actor)
        : {
            organisationId: String(form.get('organisationId') ?? ''),
            email: String(form.get('recipientEmail') ?? ''),
          };
      return createResourceShare(
        {
          resourceIds: form.getAll('resourceIds').map(String),
          ...target,
          recipientEmail: target.email,
          title: String(form.get('title') ?? ''),
          message: String(form.get('message') ?? ''),
          hours: Number(form.get('hours') ?? 72),
          ticketId,
          requestKey: String(form.get('requestKey') ?? ''),
        },
        actor,
      );
    });
    revalidatePath('/support/resources');
    const ticketId = String(form.get('ticketId') ?? '');
    if (ticketId) revalidatePath(`/support/tickets/${ticketId}`);
    return { saved: true, shareId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not share resources.' };
  }
}
export async function revokeShareAction(
  _previous: ResourceActionState,
  form: FormData,
): Promise<ResourceActionState> {
  const actor = await requirePermission('resource.share');
  try {
    await asUser(actor, () => revokeResourceShare(String(form.get('id') ?? '')));
    revalidatePath('/support/resources');
    return { saved: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not revoke access.' };
  }
}
