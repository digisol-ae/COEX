import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import {
  createFieldDefinition,
  keyFromLabel,
  listFieldDefinitions,
  readCustomFieldValues,
  setFieldStatus,
  type FieldDefinitionSummary,
} from '@/modules/crm/services/field-definition.service';

const context = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
const otherTenant = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};

beforeAll(async () => {
  await connectForTests('fields');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('field keys', () => {
  it('makes a stable key from a label', () => {
    expect(keyFromLabel('Licence number')).toBe('licence_number');
    expect(keyFromLabel('  DHA / MOH Ref!  ')).toBe('dha_moh_ref');
  });
});

describe('field definitions', () => {
  it('refuses a duplicate field on the same record type, per tenant', async () => {
    await runWithContext(context, () =>
      createFieldDefinition({ entityType: 'organisation', label: 'Licence number', type: 'text' }),
    );

    await expect(
      runWithContext(context, () =>
        createFieldDefinition({
          entityType: 'organisation',
          label: 'licence   number',
          type: 'text',
        }),
      ),
    ).rejects.toThrow(/already exists/);

    // The same field name on a different record type is a different field.
    await expect(
      runWithContext(context, () =>
        createFieldDefinition({ entityType: 'ticket', label: 'Licence number', type: 'text' }),
      ),
    ).resolves.not.toThrow();

    // And another tenant is free to define its own.
    await expect(
      runWithContext(otherTenant, () =>
        createFieldDefinition({
          entityType: 'organisation',
          label: 'Licence number',
          type: 'text',
        }),
      ),
    ).resolves.not.toThrow();
  });

  it('requires options on a choice field', async () => {
    await expect(
      runWithContext(context, () =>
        createFieldDefinition({ entityType: 'organisation', label: 'Segment', type: 'select' }),
      ),
    ).rejects.toThrow(/at least one option/);
  });

  it('hides a field without removing it, so stored values survive', async () => {
    await runWithContext(context, () =>
      createFieldDefinition({ entityType: 'organisation', label: 'Segment', type: 'text' }),
    );

    const [field] = await runWithContext(context, () => listFieldDefinitions('organisation'));
    await runWithContext(context, () => setFieldStatus(field.id, 'hidden'));

    const visible = await runWithContext(context, () => listFieldDefinitions('organisation'));
    const all = await runWithContext(context, () => listFieldDefinitions('organisation', true));

    expect(visible).toHaveLength(0);
    expect(all).toHaveLength(1);
    expect(all[0]?.status).toBe('hidden');
  });
});

describe('reading submitted values', () => {
  const fields: FieldDefinitionSummary[] = [
    {
      id: '1',
      entityType: 'organisation',
      key: 'licence_number',
      label: 'Licence number',
      type: 'text',
      options: [],
      required: true,
      helpText: null,
      sortOrder: 0,
      status: 'active',
    },
    {
      id: '2',
      entityType: 'organisation',
      key: 'seats',
      label: 'Seats',
      type: 'number',
      options: [],
      required: false,
      helpText: null,
      sortOrder: 1,
      status: 'active',
    },
    {
      id: '3',
      entityType: 'organisation',
      key: 'segment',
      label: 'Segment',
      type: 'select',
      options: ['Dental', 'Polyclinic'],
      required: false,
      helpText: null,
      sortOrder: 2,
      status: 'active',
    },
    {
      id: '4',
      entityType: 'organisation',
      key: 'vip',
      label: 'VIP',
      type: 'checkbox',
      options: [],
      required: false,
      helpText: null,
      sortOrder: 3,
      status: 'active',
    },
  ];

  function formOf(entries: Record<string, string>): FormData {
    const formData = new FormData();
    for (const [key, value] of Object.entries(entries)) formData.set(key, value);
    return formData;
  }

  it('reads and converts each type', () => {
    const values = readCustomFieldValues(
      fields,
      formOf({
        custom_licence_number: 'DHA-1234',
        custom_seats: '12',
        custom_segment: 'Dental',
        custom_vip: 'on',
      }),
    );

    expect(values).toEqual({
      licence_number: 'DHA-1234',
      seats: 12,
      segment: 'Dental',
      vip: true,
    });
  });

  it('enforces required fields', () => {
    expect(() => readCustomFieldValues(fields, formOf({ custom_seats: '3' }))).toThrow(
      /Licence number is required/,
    );
  });

  it('rejects a number that is not a number and a choice outside the list', () => {
    expect(() =>
      readCustomFieldValues(
        fields,
        formOf({ custom_licence_number: 'DHA-1', custom_seats: 'twelve' }),
      ),
    ).toThrow(/Seats must be a number/);

    expect(() =>
      readCustomFieldValues(
        fields,
        formOf({ custom_licence_number: 'DHA-1', custom_segment: 'Veterinary' }),
      ),
    ).toThrow(/Segment must be one of/);
  });

  it('treats an unticked checkbox as false rather than missing', () => {
    const values = readCustomFieldValues(fields, formOf({ custom_licence_number: 'DHA-1' }));

    expect(values.vip).toBe(false);
    expect(values.seats).toBeNull();
  });
});
