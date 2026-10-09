'use server';

import { asUser, requirePermission } from '@/lib/session';
import { todayKey } from '@/modules/crm/contract-status';
import { parseActivityParams } from '@/modules/time/activity-filter';
import { emailActivityReport } from '@/modules/time/services/activity-share.service';

export interface ShareState {
  error?: string;
  sent?: string;
}

/** Emails the report for the filters on screen, as a PDF, to the addresses typed. */
export async function shareActivityAction(
  _previous: ShareState,
  formData: FormData,
): Promise<ShareState> {
  const actor = await requirePermission('timesheet.read.all');

  const params: Record<string, string[]> = {};
  const query = new URLSearchParams(String(formData.get('filters') ?? ''));
  for (const [key, value] of query) (params[key] ??= []).push(value);
  const filter = parseActivityParams(params, todayKey());

  const recipients = String(formData.get('to') ?? '')
    .split(/[\s,;]+/)
    .filter(Boolean);

  try {
    const count = await asUser(actor, () =>
      emailActivityReport(filter, recipients, String(formData.get('note') ?? '')),
    );
    return {
      sent: `Queued for ${count} ${count === 1 ? 'person' : 'people'}. It goes out within a minute.`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not send the report.' };
  }
}
