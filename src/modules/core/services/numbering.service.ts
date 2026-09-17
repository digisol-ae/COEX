import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { NumberSeriesModel } from '../models/number-series.model';
import { TenantModel } from '../models/tenant.model';

/**
 * Hands out the next number in a series.
 *
 * findOneAndUpdate with $inc and upsert is atomic in MongoDB, so two people creating a task at the
 * same moment cannot receive the same number. Reading then writing would be a race.
 */

export type Series = 'task' | 'ticket';

export async function nextNumber(series: Series): Promise<string> {
  await connectToDatabase();

  const { tenantId } = getContext();

  const counter = await NumberSeriesModel.findOneAndUpdate(
    { tenantId, series },
    { $inc: { nextValue: 1 } },
    { new: false, upsert: true, setDefaultsOnInsert: true },
  );

  const value = counter?.nextValue ?? 1;
  const tenant = await TenantModel.findOne({ _id: tenantId });

  const prefix =
    series === 'task'
      ? (tenant?.numbering?.taskPrefix ?? 'T')
      : (tenant?.numbering?.ticketPrefix ?? 'S');

  return `${prefix}-${value}`;
}
