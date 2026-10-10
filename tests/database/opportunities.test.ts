import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { UserModel } from '@/modules/core/models/user.model';
import { OrganisationModel } from '@/modules/crm/models/organisation.model';
import { ActivityModel } from '@/modules/crm/models/activity.model';
import { OpportunityModel } from '@/modules/crm/models/opportunity.model';
import { EmailOutboxModel } from '@/modules/core/models/email-outbox.model';
import { EmailSettingsModel } from '@/modules/core/models/email-settings.model';
import { sendOpportunityRemindersForTenant } from '@/modules/crm/services/opportunity-reminder.service';
import { getStaleDays, saveStaleDays } from '@/modules/crm/services/pipeline.service';
import { loadOpportunitySnapshot } from '@/modules/crm/services/opportunity.service';
import { createOrganisation } from '@/modules/crm/services/organisation.service';
import {
  addStage,
  listLostReasons,
  listStages,
  moveStage,
  removeStage,
  saveLostReasons,
  updateStage,
} from '@/modules/crm/services/pipeline.service';
import {
  archiveOpportunity,
  createOpportunity,
  getOpportunity,
  listOpportunities,
  moveOpportunity,
  updateOpportunity,
  type OpportunityInput,
} from '@/modules/crm/services/opportunity.service';

const tenantId = new Types.ObjectId();
const managerId = new Types.ObjectId();
const salesId = new Types.ObjectId();
const otherSalesId = new Types.ObjectId();

const as = (userId: Types.ObjectId, tenant = tenantId) => ({
  tenantId: tenant,
  userId,
  isPlatformAdmin: false,
});
const asManager = <T>(work: () => Promise<T>) => runWithContext(as(managerId), work);
const asSales = <T>(work: () => Promise<T>) => runWithContext(as(salesId), work);
const asOtherSales = <T>(work: () => Promise<T>) => runWithContext(as(otherSalesId), work);

async function input(overrides: Partial<OpportunityInput> = {}): Promise<OpportunityInput> {
  const organisationId =
    overrides.organisationId ??
    (await createOrganisation({ name: 'Dental Studio', kind: 'prospect' }));

  return {
    organisationId,
    title: 'R4+ rollout',
    oneOff: '10,000',
    recurring: '2,400.50',
    currency: 'usd',
    ...overrides,
  };
}

const stageNamed = async (name: string) =>
  (await asManager(() => listStages())).find((stage) => stage.name === name)!;

beforeAll(async () => {
  await connectForTests('opportunities');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create({ _id: tenantId, name: 'DigiSol', slug: 'digisol' });
  await UserModel.create([
    {
      _id: managerId,
      tenantId,
      name: 'Mina Manager',
      email: 'm@x.com',
      role: 'manager',
      status: 'active',
    },
    {
      _id: salesId,
      tenantId,
      name: 'Sam Sales',
      email: 's@x.com',
      role: 'agent',
      status: 'active',
      permissionGrants: ['opportunity.manage'],
    },
    {
      _id: otherSalesId,
      tenantId,
      name: 'Olu Sales',
      email: 'o@x.com',
      role: 'agent',
      status: 'active',
      permissionGrants: ['opportunity.manage'],
    },
  ]);
});

describe('pipeline', () => {
  it('creates the agreed stages on first use, in order', async () => {
    const stages = await asManager(() => listStages());
    expect(stages.map((stage) => stage.name)).toEqual([
      'Qualified',
      'Needs analysis',
      'Proposal sent',
      'Negotiation',
      'Won',
      'Lost',
    ]);
    expect(stages.map((stage) => stage.kind)).toEqual([
      'open',
      'open',
      'open',
      'open',
      'won',
      'lost',
    ]);
  });

  it('adds a stage before Won, refuses a duplicate name and refuses a person without pipeline.manage', async () => {
    await asManager(() => addStage({ name: 'Demo', probability: 50 }));
    const names = (await asManager(() => listStages())).map((stage) => stage.name);
    expect(names.slice(-3)).toEqual(['Demo', 'Won', 'Lost']);

    await expect(asManager(() => addStage({ name: 'demo', probability: 10 }))).rejects.toThrow(
      'already a stage',
    );
    await expect(asSales(() => addStage({ name: 'Mine', probability: 10 }))).rejects.toThrow(
      'may not change the pipeline',
    );
  });

  it('moves open stages, never removes Won or Lost, and guards a stage that is in use', async () => {
    const needs = await stageNamed('Needs analysis');
    await asManager(() => moveStage(needs.id, 'up'));
    expect((await asManager(() => listStages()))[0]?.name).toBe('Needs analysis');

    const won = await stageNamed('Won');
    await expect(asManager(() => removeStage(won.id))).rejects.toThrow('cannot be removed');

    const qualified = await stageNamed('Qualified');
    await asManager(async () => createOpportunity(await input({ stageId: qualified.id })));
    await expect(asManager(() => removeStage(qualified.id))).rejects.toThrow(
      'Move the opportunities',
    );
    await expect(
      asManager(() => updateStage(qualified.id, { name: 'Renamed', probability: 20 })),
    ).rejects.toThrow('before renaming');
    // The chance can still change while the stage is in use.
    await asManager(() => updateStage(qualified.id, { name: 'Qualified', probability: 25 }));
    expect((await stageNamed('Qualified')).probability).toBe(25);
  });

  it('keeps lost reasons as an editable list with at least one entry', async () => {
    expect(await asManager(() => listLostReasons())).toContain('No budget');
    await asManager(() => saveLostReasons(['Price', ' Price ', 'Chose a competitor']));
    expect(await asManager(() => listLostReasons())).toEqual(['Price', 'Chose a competitor']);
    await expect(asManager(() => saveLostReasons(['  ']))).rejects.toThrow('at least one');
  });
});

describe('opportunities', () => {
  it('numbers deals, stores two separate amounts as minor units and takes the chance from the stage', async () => {
    const id = await asManager(async () => createOpportunity(await input()));
    await asManager(async () => createOpportunity(await input({ title: 'Second' })));

    const found = (await asManager(() => listOpportunities())).find((item) => item.id === id)!;
    expect(found.number).toMatch(/^O-\d$/);
    expect(found.oneOffMinorUnits).toBe(1000000);
    expect(found.recurringMinorUnits).toBe(240050);
    expect(found.currency).toBe('USD');
    expect(found.stageName).toBe('Qualified');
    expect(found.probability).toBe(20);
    expect(found.status).toBe('open');
    expect(await asManager(() => listOpportunities())).toHaveLength(2);
  });

  it('defaults the owner to the customer owner, and refuses a bad customer, contact or date', async () => {
    const organisationId = await asManager(() =>
      createOrganisation({ name: 'Owned Clinic', kind: 'prospect' }),
    );
    await OrganisationModel.updateOne({ _id: organisationId }, { $set: { ownerId: salesId } });

    const id = await asManager(async () => createOpportunity(await input({ organisationId })));
    expect((await asManager(() => getOpportunity(id)))?.ownerId).toBe(String(salesId));

    await expect(
      asManager(async () =>
        createOpportunity(await input({ organisationId: String(new Types.ObjectId()) })),
      ),
    ).rejects.toThrow('customer was not found');
    await expect(
      asManager(async () =>
        createOpportunity(await input({ contactId: String(new Types.ObjectId()) })),
      ),
    ).rejects.toThrow('active contact');
    await expect(
      asManager(async () => createOpportunity(await input({ expectedCloseDate: '10/12/2026' }))),
    ).rejects.toThrow('calendar days');
  });

  it('shows a salesperson only their own deals and a manager all of them', async () => {
    await asSales(async () => createOpportunity(await input({ title: 'Mine' })));
    await asOtherSales(async () => createOpportunity(await input({ title: 'Theirs' })));

    expect((await asSales(() => listOpportunities())).map((item) => item.title)).toEqual(['Mine']);
    expect(await asManager(() => listOpportunities())).toHaveLength(2);

    const theirs = (await asManager(() => listOpportunities())).find(
      (item) => item.title === 'Theirs',
    )!;
    await expect(asSales(() => updateOpportunity(theirs.id, await_input()))).rejects.toThrow(
      'Opportunity not found',
    );
    expect(await asSales(() => getOpportunity(theirs.id))).toBeNull();
  });

  it('moves through stages, writes the timeline and audit, and wins a prospect into a client', async () => {
    const organisationId = await asManager(() =>
      createOrganisation({ name: 'Prospect Clinic', kind: 'prospect' }),
    );
    const id = await asManager(async () => createOpportunity(await input({ organisationId })));

    await asManager(async () => moveOpportunity(id, (await stageNamed('Proposal sent')).id));
    expect((await asManager(() => getOpportunity(id)))?.probability).toBe(60);

    await asManager(async () => moveOpportunity(id, (await stageNamed('Won')).id));
    const won = (await asManager(() => getOpportunity(id)))!;
    expect(won.status).toBe('won');
    expect(won.probability).toBe(100);
    expect(won.closedAt).not.toBeNull();
    expect((await OrganisationModel.findById(organisationId))?.kind).toBe('client');

    const timeline = await ActivityModel.find({ organisationId, kind: 'stage_changed' });
    expect(timeline.length).toBeGreaterThanOrEqual(3);
  });

  it('needs a listed reason to lose a deal and refuses to edit a closed one', async () => {
    const id = await asManager(async () => createOpportunity(await input()));
    const lost = await stageNamed('Lost');

    await expect(asManager(() => moveOpportunity(id, lost.id))).rejects.toThrow(
      'why the opportunity was lost',
    );
    await expect(
      asManager(() => moveOpportunity(id, lost.id, { lostReason: 'Boredom' })),
    ).rejects.toThrow('listed lost reasons');

    await asManager(() => moveOpportunity(id, lost.id, { lostReason: 'Price' }));
    const closed = (await asManager(() => getOpportunity(id)))!;
    expect(closed.status).toBe('lost');
    expect(closed.lostReason).toBe('Price');

    await expect(asManager(async () => updateOpportunity(id, await input()))).rejects.toThrow(
      'cannot be edited',
    );
  });

  it('lets only a pipeline manager reopen a closed deal, with a reason', async () => {
    const id = await asSales(async () => createOpportunity(await input()));
    const won = await stageNamed('Won');
    const qualified = await stageNamed('Qualified');
    await asSales(() => moveOpportunity(id, won.id));

    await expect(
      asSales(() => moveOpportunity(id, qualified.id, { reopenReason: 'x' })),
    ).rejects.toThrow('Only a manager');
    await expect(asManager(() => moveOpportunity(id, qualified.id))).rejects.toThrow('Say why');

    await asManager(() =>
      moveOpportunity(id, qualified.id, { reopenReason: 'Customer came back' }),
    );
    const reopened = (await asManager(() => getOpportunity(id)))!;
    expect(reopened.status).toBe('open');
    expect(reopened.closedAt).toBeNull();
    expect(reopened.lostReason).toBeNull();
  });

  it('refuses a person without opportunity.manage, archives without deleting, and isolates tenants', async () => {
    const readerId = new Types.ObjectId();
    await UserModel.create({
      _id: readerId,
      tenantId,
      name: 'Reader',
      email: 'r@x.com',
      role: 'agent',
      status: 'active',
    });
    await expect(
      runWithContext(as(readerId), async () => createOpportunity(await input())),
    ).rejects.toThrow('may not change opportunities');

    const id = await asManager(async () => createOpportunity(await input()));
    await asManager(() => archiveOpportunity(id));
    expect(await asManager(() => listOpportunities())).toHaveLength(0);

    await asManager(async () => createOpportunity(await input({ title: 'Ours' })));
    expect(
      await runWithContext(as(managerId, new Types.ObjectId()), () => listOpportunities()),
    ).toHaveLength(0);
  });
});

function await_input(): OpportunityInput {
  return { organisationId: String(new Types.ObjectId()), title: 'Taken' };
}

describe('next steps, reminders and the dashboard snapshot', () => {
  const sendingOn = () =>
    EmailSettingsModel.create({
      tenantId,
      outbound: {
        enabled: true,
        host: 'smtp.example.com',
        username: 'helpdesk@example.com',
        fromName: 'Support',
        fromAddress: 'helpdesk@example.com',
      },
    });

  it('writes the next step to the customer timeline when it is set or changed', async () => {
    const organisationId = await asManager(() =>
      createOrganisation({ name: 'Step Clinic', kind: 'prospect' }),
    );
    const id = await asManager(async () =>
      createOpportunity(
        await input({ organisationId, nextStep: 'Send proposal', nextStepDate: '2026-11-01' }),
      ),
    );
    await asManager(async () =>
      updateOpportunity(
        id,
        await input({ organisationId, nextStep: 'Call back', nextStepDate: '2026-11-05' }),
      ),
    );

    const steps = await ActivityModel.find({ organisationId, kind: 'next_step_set' });
    expect(steps.map((entry) => entry.summary).sort()).toEqual([
      'Next step on O-1: Call back (2026-11-05)',
      'Next step on O-1: Send proposal (2026-11-01)',
    ]);
  });

  it('emails the owner once when the next step date arrives, and never twice', async () => {
    await sendingOn();
    const id = await asSales(async () =>
      createOpportunity(await input({ nextStep: 'Send proposal', nextStepDate: '2026-12-01' })),
    );

    expect(await sendOpportunityRemindersForTenant(tenantId, '2026-11-30')).toBe(0);
    expect(await sendOpportunityRemindersForTenant(tenantId, '2026-12-01')).toBe(1);
    expect(await sendOpportunityRemindersForTenant(tenantId, '2026-12-01')).toBe(0);

    const mail = await EmailOutboxModel.find({ kind: 'next_step_due' });
    expect(mail).toHaveLength(1);
    expect(mail[0]?.to).toBe('s@x.com');
    expect(mail[0]?.subject).toContain('Next step due today');
    expect(id).toBeTruthy();
  });

  it('emails the owner once after the stale period, and again only after new activity', async () => {
    await sendingOn();
    const id = await asSales(async () => createOpportunity(await input()));
    const longAgo = new Date('2026-09-01T00:00:00Z');
    await OpportunityModel.updateOne({ _id: id }, { $set: { lastActivityAt: longAgo } });

    const now = new Date('2026-10-01T00:00:00Z');
    expect(await sendOpportunityRemindersForTenant(tenantId, '2026-10-01', now)).toBe(1);
    expect(await sendOpportunityRemindersForTenant(tenantId, '2026-10-02', now)).toBe(0);
    expect(await EmailOutboxModel.countDocuments({ kind: 'opportunity_stale' })).toBe(1);

    // Activity restarts the clock; another fourteen quiet days earn another reminder.
    await asSales(async () => updateOpportunity(id, await input({ title: 'Touched' })));
    const later = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    expect(await sendOpportunityRemindersForTenant(tenantId, '2026-11-01', later)).toBe(1);
    expect(await EmailOutboxModel.countDocuments({ kind: 'opportunity_stale' })).toBe(2);
  });

  it('does not remind about won or lost deals, and honours the configured days', async () => {
    await sendingOn();
    const id = await asManager(async () => createOpportunity(await input()));
    await asManager(async () => moveOpportunity(id, (await stageNamed('Won')).id));
    await OpportunityModel.updateOne(
      { _id: id },
      { $set: { lastActivityAt: new Date('2020-01-01') } },
    );
    expect(await sendOpportunityRemindersForTenant(tenantId, '2026-10-01')).toBe(0);

    await asManager(() => saveStaleDays(30));
    expect(await asManager(() => getStaleDays())).toBe(30);
    await expect(asManager(() => saveStaleDays(0))).rejects.toThrow('between 1 and 365');
    await expect(asSales(() => saveStaleDays(5))).rejects.toThrow('may not change the pipeline');
  });

  it('summarises my open deals by stage and counts the ones needing attention', async () => {
    const stage = await stageNamed('Proposal sent');
    await asSales(async () => createOpportunity(await input({ title: 'No step' })));
    await asSales(async () =>
      createOpportunity(
        await input({
          title: 'Late',
          stageId: stage.id,
          nextStep: 'Call',
          nextStepDate: '2020-01-01',
        }),
      ),
    );
    await asSales(async () =>
      createOpportunity(
        await input({ title: 'Fine', nextStep: 'Call', nextStepDate: '2999-01-01' }),
      ),
    );
    await asOtherSales(async () => createOpportunity(await input({ title: 'Not mine' })));

    const snapshot = await asSales(() => loadOpportunitySnapshot());
    expect(snapshot.openCount).toBe(3);
    expect(snapshot.withoutNextStep).toBe(1);
    expect(snapshot.overdueNextStep).toBe(1);
    expect(snapshot.byStage.find((row) => row.stageName === 'Proposal sent')?.count).toBe(1);
    expect(snapshot.byStage.find((row) => row.stageName === 'Qualified')?.count).toBe(2);
    expect(snapshot.totals[0]?.count).toBe(3);

    // A manager who can see every deal still gets only their own on the dashboard.
    expect((await asManager(() => loadOpportunitySnapshot())).openCount).toBe(0);
  });
});
