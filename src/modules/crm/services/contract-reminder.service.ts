import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import { alertStaff, appBaseUrl } from '@/modules/core/services/email.service';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { ContractModel } from '@coex/shared/crm/models/contract.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { daysBetween, reminderDue, todayKey } from '@coex/shared/crm/contract-status';

/**
 * Renewal reminders, sent by the email worker.
 *
 * It runs on a timer and may run twice in a row or after the worker was down, so everything is
 * safe to repeat: each reminder is claimed with an atomic update before anything is sent, and a
 * reminder that was claimed is never sent again. A failed send is therefore lost rather than
 * repeated, which is the right way round for a reminder that comes again at the next threshold and
 * is visible on the contracts page regardless.
 */

/** The organisation's owner, or every tenant administrator when the customer has no owner. */
async function recipientsFor(
  tenantId: Types.ObjectId,
  ownerId: Types.ObjectId | null | undefined,
): Promise<Types.ObjectId[]> {
  if (ownerId) return [ownerId];

  const administrators = await UserModel.find({
    tenantId,
    role: 'tenant_admin',
    status: 'active',
    deletedAt: null,
  }).select('_id');

  return administrators.map((user) => user._id);
}

export async function sendRenewalRemindersForTenant(
  tenantId: Types.ObjectId,
  today = todayKey(),
): Promise<number> {
  // There is no signed in person; a fresh id means nobody is skipped as "the person acting".
  return runWithContext(
    { tenantId, userId: new Types.ObjectId(), isPlatformAdmin: false },
    async () => {
      const due = await ContractModel.find({ tenantId, status: 'active', deletedAt: null });
      let sent = 0;

      for (const contract of due) {
        const daysLeft = daysBetween(today, contract.endDate);
        if (daysLeft < 0) continue;

        const decision = reminderDue(
          daysLeft,
          contract.renewalReminderDays ?? [],
          contract.remindersSent ?? [],
        );
        if (!decision.send) continue;

        const claimed = await ContractModel.findOneAndUpdate(
          { _id: contract._id, remindersSent: { $nin: decision.markSent } },
          { $addToSet: { remindersSent: { $each: decision.markSent } } },
          { returnDocument: 'after' },
        );
        if (!claimed) continue;

        const organisation = await OrganisationModel.findOne({
          _id: contract.organisationId,
          tenantId,
        });

        const subject = `Contract ${contract.number} ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
        const lines = [
          `${contract.title} for ${organisation?.name ?? 'a customer'} (${contract.number}) ends on ${contract.endDate}.`,
          '',
          'Open Contracts and choose Renew to prepare the next term.',
          `${appBaseUrl()}/contracts`,
        ];

        for (const userId of await recipientsFor(tenantId, organisation?.ownerId)) {
          await alertStaff('contract_renewal', userId, subject, lines);
        }
        sent += 1;
      }

      return sent;
    },
  );
}

export async function sendDueRenewalReminders(): Promise<number> {
  await connectToDatabase();

  let total = 0;
  for (const tenant of await TenantModel.find({}).select('_id')) {
    try {
      total += await sendRenewalRemindersForTenant(tenant._id);
    } catch (error) {
      console.error(
        `Renewal reminders failed for tenant ${tenant._id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return total;
}
