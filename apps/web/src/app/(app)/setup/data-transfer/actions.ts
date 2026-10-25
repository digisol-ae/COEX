'use server';
import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import { isEntity } from '@/modules/data-transfer/spec';
import {
  transfer,
  type TransferResult,
  type TransferDecisions,
} from '@/modules/data-transfer/service';
export async function transferAction(
  entity: string,
  csv: string,
  proof?: string,
  decisions: TransferDecisions = {},
): Promise<TransferResult> {
  const actor = await requirePermission('tenant.manage');
  if (!isEntity(entity)) return { rows: [], error: 'Choose a supported record type.' };
  try {
    const result = await asUser(actor, () => transfer(entity, csv, proof, decisions));
    if (result.committed)
      for (const path of [
        '/tasks',
        '/support/tickets',
        '/customers',
        '/leads',
        '/products',
        '/contracts',
        '/dashboard',
      ])
        revalidatePath(path);
    return result;
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : 'Could not process this file.',
    };
  }
}
