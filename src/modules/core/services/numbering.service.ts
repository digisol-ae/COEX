import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { NumberSeriesModel } from '../models/number-series.model';
import { TenantModel } from '../models/tenant.model';

/**
 * Hands out the next number in a series.
 *
 * findOneAndUpdate with $inc and upsert is atomic in MongoDB, so two people creating a task at the
 * same moment cannot receive the same number. Reading then writing would be a race.
 *
 * returnDocument 'after' is what makes this correct: the counter is incremented first and the new
 * value is the number handed out, so the first call returns 1 and no call can return a value that
 * another call has already used. An earlier version read the document before the increment and
 * fell back to 1 when the upsert returned nothing, which handed the same number to the first two
 * tasks. The absence of a returned document is now an error rather than a quiet default.
 */

export type Series = 'task' | 'ticket' | 'contract';

export async function nextNumber(series: Series): Promise<string> {
  await connectToDatabase();

  const { tenantId } = getContext();

  const counter = await NumberSeriesModel.findOneAndUpdate(
    { tenantId, series },
    { $inc: { nextValue: 1 } },
    { upsert: true, returnDocument: 'after' },
  );

  if (!counter?.nextValue) {
    throw new Error(`The ${series} number counter did not return a value.`);
  }

  const tenant = await TenantModel.findOne({ _id: tenantId });

  const prefixes: Record<Series, string> = {
    task: tenant?.numbering?.taskPrefix ?? 'T',
    ticket: tenant?.numbering?.ticketPrefix ?? 'S',
    contract: tenant?.numbering?.contractPrefix ?? 'C',
  };
  const prefix = prefixes[series];

  return `${prefix}-${counter.nextValue}`;
}
