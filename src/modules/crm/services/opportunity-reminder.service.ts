import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import { alertStaff, appBaseUrl } from '@/modules/core/services/email.service';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { OpportunityModel } from '../models/opportunity.model';
import { OrganisationModel } from '../models/organisation.model';
import { DEFAULT_STALE_DAYS, isStale } from '../opportunity-rules';
import { todayKey } from '../contract-status';

/**
 * Opportunity reminders, sent by the email worker beside the contract renewals.
 *
 * Two reminders go to the opportunity's owner: when its next step date arrives, and when an open
 * deal has had no activity for the tenant's number of days (14 by default). Like renewals, each is
 * claimed with an atomic update before anything is sent, so a repeated or late pass never sends
 * twice; a send that failed after being claimed is lost rather than repeated.
 */

export async function sendOpportunityRemindersForTenant(
  tenantId: Types.ObjectId,
  today = todayKey(),
  now = new Date(),
): Promise<number> {
  const tenant = await TenantModel.findOne({ _id: tenantId }).select('opportunityStaleDays');
  const staleDays = tenant?.opportunityStaleDays ?? DEFAULT_STALE_DAYS;

  // No signed in person; a fresh id means nobody is skipped as "the person acting".
  return runWithContext(
    { tenantId, userId: new Types.ObjectId(), isPlatformAdmin: false },
    async () => {
      let sent = 0;
      const open = await OpportunityModel.find({ tenantId, status: 'open', deletedAt: null });

      for (const deal of open) {
        const organisation = await OrganisationModel.findOne({
          _id: deal.organisationId,
          tenantId,
        }).select('name');
        const customer = organisation?.name ?? 'a customer';
        const link = `${appBaseUrl()}/opportunities/${deal._id}`;

        if (deal.nextStepDate === today && deal.nextStepRemindedFor !== today) {
          const claimed = await OpportunityModel.findOneAndUpdate(
            { _id: deal._id, nextStepRemindedFor: { $ne: today } },
            { $set: { nextStepRemindedFor: today } },
          );
          if (claimed) {
            await alertStaff(
              'next_step_due',
              deal.ownerId,
              `Next step due today: ${deal.title}`,
              [
                `The next step on ${deal.number} "${deal.title}" for ${customer} is due today.`,
                deal.nextStep ? `Next step: ${deal.nextStep}` : '',
                link,
              ].filter(Boolean),
            );
            sent += 1;
          }
        }

        const lastActivityAt = deal.lastActivityAt ?? deal.createdAt;
        const alreadyReminded =
          deal.staleRemindedAt && deal.staleRemindedAt.getTime() >= lastActivityAt.getTime();

        if (!alreadyReminded && isStale(lastActivityAt, now, staleDays)) {
          const claimed = await OpportunityModel.findOneAndUpdate(
            {
              _id: deal._id,
              $or: [{ staleRemindedAt: null }, { staleRemindedAt: { $lt: lastActivityAt } }],
            },
            { $set: { staleRemindedAt: now } },
          );
          if (claimed) {
            await alertStaff(
              'opportunity_stale',
              deal.ownerId,
              `No activity for ${staleDays} days: ${deal.title}`,
              [
                `${deal.number} "${deal.title}" for ${customer} has had no activity for ${staleDays} days.`,
                'Move it forward, set a next step, or mark it lost.',
                link,
              ],
            );
            sent += 1;
          }
        }
      }

      return sent;
    },
  );
}

export async function sendDueOpportunityReminders(): Promise<number> {
  await connectToDatabase();

  let total = 0;
  for (const tenant of await TenantModel.find({}).select('_id')) {
    try {
      total += await sendOpportunityRemindersForTenant(tenant._id);
    } catch (error) {
      console.error(
        `Opportunity reminders failed for tenant ${tenant._id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return total;
}
