import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import {
  createOrganisation,
  updateOrganisation,
} from '@/modules/crm/services/organisation.service';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { ActivityModel } from '@coex/shared/crm/models/activity.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { sendRenewalRemindersForTenant } from '@/modules/crm/services/contract-reminder.service';
import { createContact, listContacts } from '@/modules/crm/services/contact.service';
import { createProduct } from '@/modules/crm/services/product.service';
import {
  archiveContract,
  prepareContractEmail,
  sendContractEmail,
  contractNoticeFor,
  setPeriodInvoiced,
  createContract,
  listContracts,
  renewContract,
  setContractStatus,
  updateContract,
  type ContractInput,
} from '@/modules/crm/services/contract.service';
import { todayKey } from '@coex/shared/crm/contract-status';

const contextOne = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
const contextTwo = { ...contextOne, tenantId: new Types.ObjectId() };

const inOne = <T>(work: () => Promise<T>) => runWithContext(contextOne, work);

/** A day offset from today, as the YYYY-MM-DD the contract stores. */
function dayKey(offsetDays: number): string {
  const day = new Date(`${todayKey()}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offsetDays);
  return day.toISOString().slice(0, 10);
}

async function input(overrides: Partial<ContractInput> = {}): Promise<ContractInput> {
  const organisationId =
    overrides.organisationId ??
    (await createOrganisation({ name: 'Dental Studio', kind: 'client' }));

  return {
    organisationId,
    title: 'Annual maintenance',
    type: 'amc',
    startDate: dayKey(-100),
    endDate: dayKey(265),
    billingFrequency: 'quarterly',
    value: '1,250.50',
    currency: 'usd',
    ...overrides,
  };
}

beforeAll(async () => {
  await connectForTests('contracts');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('contracts', () => {
  it('stores money as minor units and numbers contracts in sequence', async () => {
    await inOne(async () => {
      await createContract(await input());
      await createContract(await input({ title: 'Second' }));
    });

    const found = await inOne(() => listContracts());
    expect(found.map((contract) => contract.number).sort()).toEqual(['C-1', 'C-2']);
    expect(found[0]?.valueMinorUnits).toBe(125050);
    expect(found[0]?.currency).toBe('USD');
    expect(found[0]?.storedStatus).toBe('draft');
  });

  it('rejects an end date before the start date and an unknown customer', async () => {
    await expect(
      inOne(async () => createContract(await input({ startDate: dayKey(5), endDate: dayKey(1) }))),
    ).rejects.toThrow('before the start date');

    await expect(
      inOne(async () =>
        createContract(await input({ organisationId: new Types.ObjectId().toString() })),
      ),
    ).rejects.toThrow('customer was not found');
  });

  it('requires hours when support time is counted', async () => {
    await expect(
      inOne(async () => createContract(await input({ supportHoursEnabled: true }))),
    ).rejects.toThrow('support hours');
  });

  it('links covered products and refuses one that does not exist', async () => {
    const productId = await inOne(() =>
      createProduct({ name: 'AMC Support', code: 'amc', kind: 'support' }),
    );

    await inOne(async () => createContract(await input({ productIds: [productId] })));
    expect((await inOne(() => listContracts()))[0]?.productIds).toEqual([productId]);

    await expect(
      inOne(async () =>
        createContract(await input({ productIds: [new Types.ObjectId().toString()] })),
      ),
    ).rejects.toThrow('products was not found');
  });

  it('derives expiring and expired from the end date, using the customer warning window', async () => {
    const organisationId = await inOne(() =>
      createOrganisation({ name: 'Careful Clinic', kind: 'client' }),
    );

    await inOne(async () => {
      for (const [title, endDate] of [
        ['Far', dayKey(200)],
        ['Soon', dayKey(10)],
        ['Gone', dayKey(-1)],
      ] as const) {
        const id = await createContract(await input({ organisationId, title, endDate }));
        await setContractStatus(id, 'active');
      }
    });

    const statuses = async () =>
      Object.fromEntries(
        (await inOne(() => listContracts())).map((contract) => [contract.title, contract.status]),
      );

    expect(await statuses()).toEqual({ Far: 'active', Soon: 'expiring', Gone: 'expired' });

    await inOne(() =>
      updateOrganisation(organisationId, {
        name: 'Careful Clinic',
        kind: 'client',
        expiryWarningDays: 365,
      }),
    );

    expect((await statuses()).Far).toBe('expiring');
  });

  it('archives rather than deletes, and keeps each tenant separate', async () => {
    const id = await inOne(async () => createContract(await input()));

    expect(await runWithContext(contextTwo, () => listContracts())).toEqual([]);

    await inOne(() => archiveContract(id));
    expect(await inOne(() => listContracts())).toEqual([]);
  });

  it('updates the terms of a contract', async () => {
    const id = await inOne(async () => createContract(await input()));

    await inOne(async () => updateContract(id, await input({ title: 'Renamed' })));
    expect((await inOne(() => listContracts()))[0]?.title).toBe('Renamed');
  });
});

describe('renewals', () => {
  it('creates a draft for the next term and retires the old contract when it is activated', async () => {
    const oldId = await inOne(async () => {
      const id = await createContract(
        await input({ startDate: '2026-01-01', endDate: '2026-12-31' }),
      );
      await setContractStatus(id, 'active');
      return id;
    });

    const renewalId = await inOne(() => renewContract(oldId));

    let found = await inOne(() => listContracts());
    const draft = found.find((contract) => contract.id === renewalId);
    expect(draft).toMatchObject({
      storedStatus: 'draft',
      startDate: '2027-01-01',
      endDate: '2027-12-31',
      renewedFromId: oldId,
    });
    expect(found.find((contract) => contract.id === oldId)?.storedStatus).toBe('active');

    await expect(inOne(() => renewContract(oldId))).rejects.toThrow('already been renewed');

    await inOne(() => setContractStatus(renewalId, 'active'));
    found = await inOne(() => listContracts());
    expect(found.find((contract) => contract.id === oldId)?.storedStatus).toBe('renewed');
  });

  it('only renews an active contract', async () => {
    const id = await inOne(async () => createContract(await input()));
    await expect(inOne(() => renewContract(id))).rejects.toThrow('active contract');
  });
});

describe('renewal reminders', () => {
  it('queues one email to the customer owner per threshold and never repeats it', async () => {
    const ownerId = new Types.ObjectId();
    await UserModel.create({
      _id: ownerId,
      tenantId: contextOne.tenantId,
      name: 'Account Owner',
      email: 'owner@example.com',
      role: 'manager',
      status: 'active',
    });

    // Mail is only queued when the tenant has sending turned on.
    await EmailSettingsModel.create({
      tenantId: contextOne.tenantId,
      outbound: {
        enabled: true,
        host: 'smtp.example.com',
        username: 'helpdesk@example.com',
        fromName: 'Support',
        fromAddress: 'helpdesk@example.com',
      },
    });

    await inOne(async () => {
      const organisationId = await createOrganisation({ name: 'Owned Clinic', kind: 'client' });
      await OrganisationModel.updateOne({ _id: organisationId }, { $set: { ownerId } });
      const id = await createContract(await input({ organisationId, endDate: dayKey(25) }));
      await setContractStatus(id, 'active');
    });

    const run = () => sendRenewalRemindersForTenant(contextOne.tenantId);

    expect(await run()).toBe(1);
    expect(await run()).toBe(0);

    const queued = await EmailOutboxModel.find({ tenantId: contextOne.tenantId });
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ kind: 'contract_renewal', to: 'owner@example.com' });
    expect(queued[0]?.subject).toContain('ends in 25 days');
  });
});

describe('contract notice on tickets', () => {
  it('stays silent while covered, warns near the end, and tells agents when there is no contract', async () => {
    const organisationId = await inOne(() =>
      createOrganisation({ name: 'Notice Clinic', kind: 'client' }),
    );

    expect(await inOne(() => contractNoticeFor(organisationId))).toMatchObject({ state: 'none' });

    const contractId = await inOne(async () => {
      const id = await createContract(await input({ organisationId, endDate: dayKey(200) }));
      await setContractStatus(id, 'active');
      return id;
    });
    expect(await inOne(() => contractNoticeFor(organisationId))).toBeNull();

    await inOne(async () =>
      updateContract(contractId, await input({ organisationId, endDate: dayKey(10) })),
    );
    const expiring = await inOne(() => contractNoticeFor(organisationId));
    expect(expiring?.state).toBe('expiring');
    expect(expiring?.customerText).toContain('ends on');

    await inOne(async () =>
      updateContract(contractId, await input({ organisationId, endDate: dayKey(-2) })),
    );
    expect((await inOne(() => contractNoticeFor(organisationId)))?.customerText).toContain(
      'ended on',
    );
  });

  it('never warns about a prospect', async () => {
    const organisationId = await inOne(() =>
      createOrganisation({ name: 'Maybe Clinic', kind: 'prospect' }),
    );
    expect(await inOne(() => contractNoticeFor(organisationId))).toBeNull();
  });
});

describe('invoiced ticks', () => {
  it('records and clears a billing period', async () => {
    const id = await inOne(async () => createContract(await input()));

    await inOne(() => setPeriodInvoiced(id, 1, true));
    expect((await inOne(() => listContracts()))[0]?.invoicedPeriods).toEqual([1]);

    await inOne(() => setPeriodInvoiced(id, 1, false));
    expect((await inOne(() => listContracts()))[0]?.invoicedPeriods).toEqual([]);
  });
});

describe('emailing contract contacts', () => {
  async function sendingOn() {
    await EmailSettingsModel.create({
      tenantId: contextOne.tenantId,
      outbound: {
        enabled: true,
        host: 'smtp.example.com',
        username: 'helpdesk@example.com',
        fromName: 'Support',
        fromAddress: 'helpdesk@example.com',
      },
    });
  }

  async function contractWithContacts(emails: (string | undefined)[]) {
    const organisationId = await inOne(() =>
      createOrganisation({ name: 'Mail Clinic', kind: 'client' }),
    );
    for (const [index, email] of emails.entries()) {
      await inOne(() => createContact({ organisationId, name: `Person ${index + 1}`, email }));
    }
    const people = await inOne(() => listContacts(organisationId));
    const id = await inOne(async () =>
      createContract(
        await input({
          organisationId,
          contactIds: people.map((person) => person.id),
          endDate: dayKey(20),
        }),
      ),
    );
    await inOne(() => setContractStatus(id, 'active'));
    return { id, organisationId };
  }

  it('queues one personal email per contact from the contracts sender and logs it', async () => {
    await sendingOn();
    const { id, organisationId } = await contractWithContacts([
      'one@example.com',
      'two@example.com',
    ]);

    const result = await inOne(() =>
      sendContractEmail(id, {
        subject: 'Renew {contract_number}',
        body: 'Dear {contact}, {contract_title} ends on {end_date}.',
      }),
    );
    expect(result.queued).toBe(2);

    const queued = await EmailOutboxModel.find({ tenantId: contextOne.tenantId }).sort({ to: 1 });
    expect(queued.map((row) => row.to)).toEqual(['one@example.com', 'two@example.com']);
    expect(queued[0]).toMatchObject({ kind: 'contract_email' });
    expect(queued[0]?.text).toContain('Dear Person 1,');
    expect(queued[1]?.text).toContain('Dear Person 2,');
    expect(queued[0]?.subject).toMatch(/^Renew C-\d+$/);

    const sender = await import('@/modules/core/services/email.service');
    expect(sender.senderRoleFor('contract_email')).toBe('contracts');

    const timeline = await ActivityModel.find({ organisationId });
    expect(timeline.map((entry) => entry.kind)).toEqual(['email', 'email']);
  });

  it('skips a contact without an address and says so', async () => {
    await sendingOn();
    const { id } = await contractWithContacts(['one@example.com', undefined]);

    const result = await inOne(() => sendContractEmail(id, { subject: 'Hi', body: 'Hello' }));
    expect(result).toEqual({ queued: 1, skipped: ['Person 2'] });
  });

  it('refuses when nobody is chosen, nobody has an address, or sending is off', async () => {
    const none = await inOne(async () => createContract(await input()));
    await sendingOn();
    await expect(inOne(() => sendContractEmail(none, { subject: 'a', body: 'b' }))).rejects.toThrow(
      'Choose who to email',
    );

    const noAddress = await contractWithContacts([undefined]);
    await expect(
      inOne(() => sendContractEmail(noAddress.id, { subject: 'a', body: 'b' })),
    ).rejects.toThrow('has an email address');
  });

  it('refuses when sending email is turned off', async () => {
    const { id } = await contractWithContacts(['one@example.com']);
    await expect(inOne(() => sendContractEmail(id, { subject: 'a', body: 'b' }))).rejects.toThrow(
      'turned off',
    );
  });

  it('offers the template that fits and refuses contacts from another customer', async () => {
    await sendingOn();
    const { id } = await contractWithContacts(['one@example.com']);

    const draft = await inOne(() => prepareContractEmail(id));
    expect(draft.defaultTemplate).toBe('renewal');
    expect(draft.templates.renewal.subject).toContain('{end_date}');
    expect(draft.recipients).toHaveLength(1);

    const stranger = await inOne(() => createOrganisation({ name: 'Other', kind: 'client' }));
    await inOne(() =>
      createContact({ organisationId: stranger, name: 'Outsider', email: 'o@x.com' }),
    );
    const outsider = (await inOne(() => listContacts(stranger)))[0]!;
    await expect(
      inOne(async () => createContract(await input({ contactIds: [outsider.id] }))),
    ).rejects.toThrow('Contract contacts must be');
  });
});
