import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from './setup';
import { runWithContext } from '@/lib/tenant-context';
import { createOrganisation, listOrganisations } from '@/modules/crm/services/organisation.service';
import { createContact, listContacts } from '@/modules/crm/services/contact.service';
import { listTimeline, recordActivity } from '@/modules/crm/services/activity.service';
import { normaliseMobile, splitMobile } from '@/modules/crm/phone';
import {
  createProduct,
  fromMinorUnits,
  toMinorUnits,
} from '@/modules/crm/services/product.service';

const tenantOne = new Types.ObjectId();
const tenantTwo = new Types.ObjectId();

const contextOne = { tenantId: tenantOne, userId: new Types.ObjectId(), isPlatformAdmin: false };
const contextTwo = { tenantId: tenantTwo, userId: new Types.ObjectId(), isPlatformAdmin: false };

beforeAll(async () => {
  await connectForTests();
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('mobile normalisation', () => {
  it('converts the local UAE form to E.164, which is what XVERSE matches on', () => {
    expect(normaliseMobile('050 123 4567')).toBe('+971501234567');
    expect(normaliseMobile('0501234567')).toBe('+971501234567');
    expect(normaliseMobile('+971 50 123 4567')).toBe('+971501234567');
    expect(normaliseMobile('971501234567')).toBe('+971501234567');
  });

  it('uses the given country for numbers outside the United Arab Emirates', () => {
    expect(normaliseMobile('0300 1234567', 'PK')).toBe('+923001234567');
  });

  it('handles the 00 international prefix used across the Gulf', () => {
    expect(normaliseMobile('00971501234567')).toBe('+971501234567');
  });

  it('returns nothing for empty input rather than inventing a number', () => {
    expect(normaliseMobile('')).toBeNull();
    expect(normaliseMobile(null)).toBeNull();
  });

  it('splits a stored number back into country and local part for editing', () => {
    expect(splitMobile('+971501234567')).toEqual({ country: 'AE', local: '501234567' });
    expect(splitMobile('+923001234567')).toEqual({ country: 'PK', local: '3001234567' });
    expect(splitMobile(null)).toEqual({ country: 'AE', local: '' });
  });
});

describe('customer records', () => {
  it('keeps each tenant customers separate', async () => {
    await runWithContext(contextOne, () =>
      createOrganisation({ name: 'Dental Studio', kind: 'client' }),
    );

    await runWithContext(contextTwo, () =>
      createOrganisation({ name: 'Other Clinic', kind: 'client' }),
    );

    const forOne = await runWithContext(contextOne, () => listOrganisations());
    const forTwo = await runWithContext(contextTwo, () => listOrganisations());

    expect(forOne.map((item) => item.name)).toEqual(['Dental Studio']);
    expect(forTwo.map((item) => item.name)).toEqual(['Other Clinic']);
  });

  it('searches by name without treating the search text as a pattern', async () => {
    await runWithContext(contextOne, async () => {
      await createOrganisation({ name: 'A+B Medical (Ltd)', kind: 'client' });
      await createOrganisation({ name: 'Unrelated Clinic', kind: 'client' });
    });

    const found = await runWithContext(contextOne, () =>
      listOrganisations({ search: 'A+B Medical (' }),
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.name).toBe('A+B Medical (Ltd)');
  });

  it('stores contact mobiles in E.164 and counts them on the customer', async () => {
    const id = await runWithContext(contextOne, () =>
      createOrganisation({ name: 'Dental Studio', kind: 'client' }),
    );

    await runWithContext(contextOne, () =>
      createContact({ organisationId: id, name: 'Reception', mobile: '050 123 4567' }),
    );

    const contacts = await runWithContext(contextOne, () => listContacts(id));
    expect(contacts[0]?.mobile).toBe('+971501234567');

    const [summary] = await runWithContext(contextOne, () => listOrganisations());
    expect(summary?.contactCount).toBe(1);
  });

  it('keeps one primary contact per customer', async () => {
    const id = await runWithContext(contextOne, () =>
      createOrganisation({ name: 'Dental Studio', kind: 'client' }),
    );

    await runWithContext(contextOne, async () => {
      await createContact({ organisationId: id, name: 'First', isPrimary: true });
      await createContact({ organisationId: id, name: 'Second', isPrimary: true });
    });

    const contacts = await runWithContext(contextOne, () => listContacts(id));
    const primaries = contacts.filter((contact) => contact.isPrimary);

    expect(primaries).toHaveLength(1);
    expect(primaries[0]?.name).toBe('Second');
  });
});

describe('the single timeline', () => {
  it('returns entries newest first and never leaks across tenants', async () => {
    const id = await runWithContext(contextOne, () =>
      createOrganisation({ name: 'Dental Studio', kind: 'client' }),
    );

    await runWithContext(contextOne, async () => {
      await recordActivity({
        organisationId: id,
        kind: 'call',
        summary: 'Called about the renewal',
        occurredAt: new Date('2026-09-01T10:00:00Z'),
      });

      await recordActivity({
        organisationId: id,
        kind: 'ticket_opened',
        summary: 'Ticket DGS-S-1 opened',
        sourceModule: 'tickets',
        occurredAt: new Date('2026-09-02T10:00:00Z'),
      });
    });

    const timeline = await runWithContext(contextOne, () => listTimeline(id));

    expect(timeline).toHaveLength(2);
    expect(timeline[0]?.summary).toBe('Ticket DGS-S-1 opened');
    expect(timeline[0]?.sourceModule).toBe('tickets');

    const otherTenantView = await runWithContext(contextTwo, () => listTimeline(id));
    expect(otherTenantView).toHaveLength(0);
  });
});

describe('product prices', () => {
  it('stores money as integer minor units, so rounding never drifts', () => {
    expect(toMinorUnits('1499.00')).toBe(149900);
    expect(toMinorUnits('1,499.50')).toBe(149950);
    expect(toMinorUnits('0.1')).toBe(10);
    expect(toMinorUnits('')).toBeNull();
    expect(toMinorUnits(null)).toBeNull();
  });

  it('renders minor units back for display', () => {
    expect(fromMinorUnits(149900)).toBe('1499.00');
    expect(fromMinorUnits(null)).toBe('');
  });

  it('refuses a duplicate product code within a tenant but allows it across tenants', async () => {
    await runWithContext(contextOne, () =>
      createProduct({ name: 'R4+ Practice Management', code: 'r4plus', kind: 'software' }),
    );

    await expect(
      runWithContext(contextOne, () =>
        createProduct({ name: 'Another', code: 'R4PLUS', kind: 'software' }),
      ),
    ).rejects.toThrow(/already in use/);

    await expect(
      runWithContext(contextTwo, () =>
        createProduct({ name: 'Their product', code: 'R4PLUS', kind: 'software' }),
      ),
    ).resolves.not.toThrow();
  });
});
