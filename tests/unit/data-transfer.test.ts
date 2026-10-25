import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '../../apps/web/src/modules/data-transfer/csv';
import { ENTITIES, validateRow } from '../../apps/web/src/modules/data-transfer/spec';
describe('CSV transfer files', () => {
  it('reads BOM, quoted commas, escaped quotes and multiline notes', () => {
    expect(
      parseCsv('\uFEFFname,notes\r\n"Example, Ltd","a ""quote""\nand a new line"\r\n'),
    ).toEqual([{ name: 'Example, Ltd', notes: 'a "quote"\nand a new line' }]);
  });
  it.each([
    'name,name\na,b',
    'name,\na,b',
    'name,email\na',
    'name\n"unclosed',
    'name\n"closed"bad',
    'name\nbad"quote',
  ])('rejects malformed CSV %s', (source) => expect(() => parseCsv(source)).toThrow());
  it('rejects oversized files and more than 500 records', () => {
    expect(() => parseCsv('name\n' + 'a'.repeat(2 * 1024 * 1024))).toThrow('2 MB');
    expect(() => parseCsv('name\n' + 'a\n'.repeat(501))).toThrow('500');
  });
  it('neutralizes spreadsheet formulas and retains quoted text', () => {
    const csv = toCsv(
      ['name', 'notes'],
      [
        { name: ' =HYPERLINK("x")', notes: 'a,b\nc' },
        { name: '@SUM(1)', notes: 'safe' },
      ],
    );
    expect(parseCsv(csv)).toEqual([
      { name: '\' =HYPERLINK("x")', notes: 'a,b\nc' },
      { name: "'@SUM(1)", notes: 'safe' },
    ]);
  });
  it('does not treat blank lines as records', () =>
    expect(parseCsv('name\r\n\r\nDemo\r\n')).toEqual([{ name: 'Demo' }]));
});
describe('import validation', () => {
  it('supplies defaults and rejects unexpected or tenant columns', () => {
    expect(validateRow('customers', { name: 'Demo', kind: '', _id: 'read-only' })).toMatchObject({
      kind: 'client',
      country: 'AE',
    });
    expect(() => validateRow('customers', { name: 'Demo', tenantId: 'other' })).toThrow(
      'Unknown columns',
    );
  });
  it('requires the ticket opening message and task destination', () => {
    expect(() => validateRow('tickets', { subject: 'Demo', queue: 'Support' })).toThrow('body');
    expect(() => validateRow('tasks', { title: 'Demo' })).toThrow('space');
  });
  it('rejects invalid enum, negative money, invalid calendar dates and reversed periods', () => {
    expect(() => validateRow('products', { name: 'Demo', code: 'D', kind: 'unknown' })).toThrow();
    expect(() => validateRow('products', { name: 'Demo', code: 'D', price: '-10' })).toThrow();
    expect(() =>
      validateRow('products', { name: 'Demo', code: 'D', price: '999999999999999999' }),
    ).toThrow();
    expect(() =>
      validateRow('contracts', {
        title: 'AMC',
        customer: 'Demo',
        startDate: '2026-02-30',
        endDate: '2026-12-31',
      }),
    ).toThrow();
    expect(() =>
      validateRow('contracts', {
        title: 'AMC',
        customer: 'Demo',
        startDate: '2026-10-23',
        endDate: '2026-01-01',
      }),
    ).toThrow();
  });
});

import { examples, templateCsv } from '../../apps/web/src/modules/data-transfer/templates';

describe('guided import templates', () => {
  it.each(ENTITIES)('%s includes two valid examples, blocked until removed', (entity) => {
    const rows = parseCsv(templateCsv(entity));
    expect(rows).toHaveLength(2);
    for (const row of rows)
      expect(() => validateRow(entity, row)).toThrow('Remove the example rows');
    for (const row of examples[entity]) expect(() => validateRow(entity, row)).not.toThrow();
  });
  it('requires a customer for contacts and explicit boolean strings', () => {
    expect(() => validateRow('contacts', { name: 'Person' })).toThrow('customer');
    expect(() =>
      validateRow('contacts', { name: 'Person', customer: 'Clinic', isPrimary: 'yes' }),
    ).toThrow('isPrimary');
  });
});

describe('contact import identifiers and phone validation', () => {
  it('accepts customerId for repeated customer names', () => {
    expect(
      validateRow('contacts', { customerId: '1234567890abcdef12345678', name: 'Person' }),
    ).toMatchObject({ customer: '', name: 'Person' });
  });
  it('rejects malformed IDs and unusable mobile numbers', () => {
    expect(() => validateRow('contacts', { customerId: 'other', name: 'Person' })).toThrow(
      'customerId',
    );
    expect(() =>
      validateRow('contacts', { customer: 'Clinic', name: 'Person', mobile: 'abc' }),
    ).toThrow('mobile');
    expect(() =>
      validateRow('contacts', {
        customer: 'Clinic',
        name: 'Person',
        mobile: '123456789',
        country: 'ZZ',
      }),
    ).toThrow('international mobile');
  });
});
