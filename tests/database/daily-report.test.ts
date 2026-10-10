import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { UserModel } from '@/modules/core/models/user.model';
import { EmailSettingsModel } from '@/modules/core/models/email-settings.model';
import { EmailOutboxModel } from '@/modules/core/models/email-outbox.model';
import { TimeEntryModel } from '@/modules/time/models/time-entry.model';
import { sendDailyReportForTenant } from '@/modules/time/services/daily-report.service';

const tenantId = new Types.ObjectId();
const busy = new Types.ObjectId();
const idle = new Types.ObjectId();
const manager = new Types.ObjectId();

// Friday 9 Oct 2026, 10:00 in the Gulf: the report is for Thursday 8 Oct.
const fridayMorning = new Date('2026-10-09T06:00:00Z');

beforeAll(async () => {
  await connectForTests('daily_report');
});
afterAll(async () => {
  await disconnectFromTests();
});

async function seed(enabled = true) {
  await TenantModel.create({ _id: tenantId, name: 'DigiSol', slug: 'digisol' });
  await UserModel.create([
    {
      _id: busy,
      tenantId,
      name: 'Fatima Noor',
      email: 'fatima@example.com',
      role: 'agent',
      passwordHash: 'x',
      status: 'active',
    },
    {
      _id: idle,
      tenantId,
      name: 'Omar Ali',
      email: 'omar@example.com',
      role: 'agent',
      passwordHash: 'x',
      status: 'active',
    },
    {
      _id: manager,
      tenantId,
      name: 'Boss',
      email: 'boss@example.com',
      role: 'manager',
      passwordHash: 'x',
      status: 'active',
    },
  ]);
  await EmailSettingsModel.create({
    tenantId,
    outbound: { enabled: true, host: 'smtp.example.com', fromAddress: 'helpdesk@example.com' },
    dailyReport: {
      enabled,
      minimumHours: 6,
      summaryRecipients: ['ali@digisol.ae', 'umbreen@digisol.ae'],
    },
  });
  await TimeEntryModel.create({
    tenantId,
    userId: busy,
    taskId: new Types.ObjectId(),
    workDate: new Date('2026-10-08T00:00:00+04:00'),
    minutes: 420,
  });
}

beforeEach(async () => {
  await clearDatabase();
});

describe('daily performance email', () => {
  it('thanks the busy agent, encourages the idle one, and sends one combined summary', async () => {
    await seed();

    const queued = await sendDailyReportForTenant(tenantId, fridayMorning);
    expect(queued).toBe(4);

    const rows = await EmailOutboxModel.find({ kind: 'daily_report' });
    const to = (address: string) => rows.find((row) => row.to === address);

    expect(to('fatima@example.com')?.text).toContain('Thank you');
    expect(to('omar@example.com')?.text).toContain('could not see any time');
    expect(to('boss@example.com')).toBeUndefined();
    expect(to('ali@digisol.ae')?.subject).toContain('Team time summary');
    expect(to('umbreen@digisol.ae')?.text).toContain('Fatima Noor: 7h');
  });

  it('reports a day only once', async () => {
    await seed();
    await sendDailyReportForTenant(tenantId, fridayMorning);
    expect(await sendDailyReportForTenant(tenantId, fridayMorning)).toBe(0);
  });

  it('waits until nine, stays off until enabled, and skips the morning after a day off', async () => {
    await seed(false);
    expect(await sendDailyReportForTenant(tenantId, fridayMorning)).toBe(0);

    await EmailSettingsModel.updateOne({ tenantId }, { $set: { 'dailyReport.enabled': true } });
    expect(await sendDailyReportForTenant(tenantId, new Date('2026-10-09T04:30:00Z'))).toBe(0);

    // Sunday morning reports on Saturday, which is not a working day.
    expect(await sendDailyReportForTenant(tenantId, new Date('2026-10-11T06:00:00Z'))).toBe(0);
  });
});
