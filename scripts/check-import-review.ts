/** Runs only against a disposable, local Docker database; never shared or live data. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import mongoose from 'mongoose';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { connectToDatabase } from '../apps/web/src/lib/db';
import { hashPassword } from '../apps/web/src/lib/password';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { ImportLockModel } from '../apps/web/src/modules/data-transfer/import-lock.model';
import {
  transfer,
  exportRecords,
  type TransferDecisions,
} from '../apps/web/src/modules/data-transfer/service';
import { createOrganisation } from '../apps/web/src/modules/crm/services/organisation.service';
import { createContact } from '../apps/web/src/modules/crm/services/contact.service';
import { parseCsv, toCsv } from '../apps/web/src/modules/data-transfer/csv';
import { templateCsv, examples } from '../apps/web/src/modules/data-transfer/templates';
import { ENTITIES, validateRow } from '../apps/web/src/modules/data-transfer/spec';

async function main() {
  const uri = new URL(process.env.MONGODB_URI ?? '');
  assert(
    existsSync('/.dockerenv') &&
      uri.hostname === 'mongo' &&
      uri.pathname.startsWith('/coex_test_import_'),
    'Disposable Docker database required',
  );
  await connectToDatabase();
  await ImportLockModel.init();
  const tenant = await TenantModel.create({
    name: 'QA Import Review',
    slug: 'qa-import-' + Date.now(),
  });
  const actor = await UserModel.create({
    tenantId: tenant._id,
    name: 'QA Import Administrator',
    email: 'import-qa@example.test',
    role: 'platform_admin',
    passwordHash: await hashPassword('QA-Import-Only-2026!'),
  });
  const context = { tenantId: tenant._id, userId: actor._id, isPlatformAdmin: true };
  await runWithContext(context, async () => {
    for (const entity of ENTITIES) {
      const template = parseCsv(templateCsv(entity));
      assert.equal(template.length, 2);
      template.forEach((row) => assert.throws(() => validateRow(entity, row), /example rows/));
      examples[entity].forEach((row) => validateRow(entity, row));
    }
    console.log('PASS all seven templates: two valid examples and sample-row import blocking');
    const customer = await createOrganisation({
      name: 'QA Existing Branch',
      kind: 'client',
      email: 'shared@example.test',
      phone: 'KEEP-PHONE',
      notes: 'KEEP-NOTES',
    });
    const csv = toCsv(
      ['name', 'email', 'phone', 'notes'],
      [{ name: 'QA Other Branch', email: 'shared@example.test', phone: '', notes: '' }],
    );
    const unresolved = await transfer('customers', csv);
    assert(!unresolved.proof);
    assert.equal(unresolved.rows[0].matches?.[0].id, customer);
    assert.equal(unresolved.rows[0].matches?.[0].reason, 'same email');
    assert.equal(await OrganisationModel.countDocuments({ tenantId: tenant._id }), 1);
    const skip: TransferDecisions = { '1': { action: 'skip' } };
    const skipPreview = await transfer('customers', csv, undefined, skip);
    assert(skipPreview.proof);
    const skipped = await transfer('customers', csv, skipPreview.proof, skip);
    assert.equal(skipped.rows[0].status, 'skipped');
    const create: TransferDecisions = { '1': { action: 'create' } };
    await assert.rejects(() => transfer('customers', csv, skipPreview.proof, create), /changed/);
    const separatePreview = await transfer('customers', csv, undefined, create);
    const separate = await transfer('customers', csv, separatePreview.proof, create);
    assert.equal(separate.rows[0].status, 'created');
    assert.equal(
      await OrganisationModel.countDocuments({
        tenantId: tenant._id,
        email: 'shared@example.test',
      }),
      2,
    );
    console.log(
      'PASS shared email review, explicit skip/separate creation, no preview writes, decision tamper rejection',
    );
    const update: TransferDecisions = { '1': { action: 'update', targetId: customer } };
    const updatePreview = await transfer('customers', csv, undefined, update);
    const updated = await transfer('customers', csv, updatePreview.proof, update);
    assert.equal(updated.rows[0].status, 'updated');
    assert.equal((await OrganisationModel.findById(customer))?.phone, 'KEEP-PHONE');
    assert.equal((await OrganisationModel.findById(customer))?.notes, 'KEEP-NOTES');
    const stale = await transfer('customers', csv, undefined, update);
    await OrganisationModel.updateOne({ _id: customer }, { $set: { phone: 'CHANGED' } });
    await assert.rejects(() => transfer('customers', csv, stale.proof, update), /changed/);
    console.log('PASS selected update preserves blanks; stale existing values invalidate proof');
    const otherTenant = new mongoose.Types.ObjectId();
    const foreign = await OrganisationModel.create({
      tenantId: otherTenant,
      name: 'QA Foreign',
      email: 'shared@example.test',
      kind: 'client',
    });
    const isolation = await transfer('customers', csv);
    assert(!isolation.rows[0].matches?.some((m) => m.id === String(foreign._id)));
    const badTarget = await transfer('customers', csv, undefined, {
      '1': { action: 'update', targetId: String(foreign._id) },
    });
    assert(!badTarget.proof);
    assert.equal(badTarget.rows[0].status, 'invalid');
    const repeated = toCsv(
      ['name', 'email'],
      [
        { name: 'QA Repeated', email: 'one@example.test' },
        { name: 'QA Repeated', email: 'two@example.test' },
      ],
    );
    const repeatPreview = await transfer('customers', repeated);
    assert(!repeatPreview.proof);
    assert.equal(repeatPreview.rows[1].matches?.[0].record, 1);
    const repeatDecision: TransferDecisions = { '2': { action: 'create' } };
    const repeatReviewed = await transfer('customers', repeated, undefined, repeatDecision);
    const repeatResult = await transfer(
      'customers',
      repeated,
      repeatReviewed.proof,
      repeatDecision,
    );
    assert.equal(repeatResult.rows.filter((r) => r.status === 'created').length, 2);
    console.log(
      'PASS tenant isolation, foreign update rejection, same-name/different-email file matches and explicit separate creation',
    );
    const org = await createOrganisation({ name: 'QA Contact Clinic', kind: 'client' });
    const otherOrg = await createOrganisation({ name: 'QA Contact Other Clinic', kind: 'client' });
    const contact = await createContact({
      organisationId: org,
      name: 'QA Person',
      email: 'person@example.test',
      mobile: '0501234567',
      title: 'KEEP-TITLE',
      isPrimary: true,
    });
    await createContact({
      organisationId: otherOrg,
      name: 'QA Person',
      email: 'person@example.test',
      mobile: '0501234567',
    });
    const contactCsv = toCsv(
      ['customer', 'name', 'email', 'mobile', 'country', 'title', 'isPrimary'],
      [
        {
          customer: 'QA Contact Clinic',
          name: 'QA Person Updated',
          email: 'person@example.test',
          mobile: '+971501234567',
          country: 'AE',
          title: '',
          isPrimary: '',
        },
      ],
    );
    const contactPreview = await transfer('contacts', contactCsv);
    assert(!contactPreview.proof);
    assert.equal(contactPreview.rows[0].matches?.length, 1);
    assert.match(contactPreview.rows[0].matches![0].reason, /same email and same mobile/);
    const contactDecision: TransferDecisions = { '1': { action: 'update', targetId: contact } };
    const contactReview = await transfer('contacts', contactCsv, undefined, contactDecision);
    const contactUpdate = await transfer(
      'contacts',
      contactCsv,
      contactReview.proof,
      contactDecision,
    );
    assert.equal(contactUpdate.rows[0].status, 'updated');
    assert.equal((await ContactModel.findById(contact))?.title, 'KEEP-TITLE');
    assert.equal((await ContactModel.findById(contact))?.isPrimary, true);
    const contactExport = parseCsv(await exportRecords('contacts'));
    assert(
      contactExport.some(
        (r) => r.customer === 'QA Contact Clinic' && r.name === 'QA Person Updated',
      ),
    );
    const ambiguous = await transfer(
      'contacts',
      toCsv(['customer', 'name'], [{ customer: 'QA Other Branch', name: 'QA Ambiguous' }]),
    );
    assert(!ambiguous.proof);
    assert.equal(ambiguous.rows[0].status, 'invalid');
    const byId = await transfer(
      'contacts',
      toCsv(['customerId', 'name'], [{ customerId: customer, name: 'QA By Customer ID' }]),
    );
    assert(byId.proof);
    assert.equal(byId.rows[0].status, 'ready');
    const foreignParent = await transfer(
      'contacts',
      toCsv(
        ['customerId', 'name'],
        [{ customerId: String(foreign._id), name: 'QA Foreign Parent' }],
      ),
    );
    assert(!foreignParent.proof);
    assert.equal(foreignParent.rows[0].status, 'invalid');
    const primaryCsv = toCsv(
      ['customer', 'name', 'email', 'isPrimary'],
      [
        {
          customer: 'QA Contact Clinic',
          name: 'QA New Primary',
          email: 'primary@example.test',
          isPrimary: 'true',
        },
      ],
    );
    const primaryPreview = await transfer('contacts', primaryCsv);
    const primary = await transfer('contacts', primaryCsv, primaryPreview.proof);
    assert.equal(primary.rows[0].status, 'created');
    assert.equal((await ContactModel.findById(contact))?.isPrimary, false);
    await ContactModel.updateOne({ _id: contact }, { $set: { userId: actor._id } });
    const portalCsv = toCsv(
      ['customer', 'name', 'email'],
      [{ customer: 'QA Contact Clinic', name: 'QA Person Updated', email: 'changed@example.test' }],
    );
    const portalReview = await transfer('contacts', portalCsv, undefined, contactDecision);
    const portalResult = await transfer('contacts', portalCsv, portalReview.proof, contactDecision);
    assert.equal(portalResult.rows[0].status, 'failed');
    assert.match(portalResult.rows[0].message, /portal login/);
    console.log(
      'PASS contact customer scoping, normalized mobile match, update, export, ambiguous customer rejection, primary demotion, portal-login protection',
    );
    const movingParent = await createOrganisation({ name: 'QA Moving Parent', kind: 'client' });
    const movingCsv = toCsv(
      ['customer', 'name'],
      [{ customer: 'QA Moving Parent', name: 'QA Destination Bound' }],
    );
    const movingPreview = await transfer('contacts', movingCsv);
    await OrganisationModel.updateOne(
      { _id: movingParent },
      { $set: { name: 'QA Renamed Parent' } },
    );
    await createOrganisation({ name: 'QA Moving Parent', kind: 'client' });
    await assert.rejects(() => transfer('contacts', movingCsv, movingPreview.proof), /changed/);
    console.log('PASS preview binds resolved parent IDs even when a name is reused');
    // Leave one explicit match for the isolated browser QA.
    await createOrganisation({
      name: 'QA Browser Existing',
      kind: 'client',
      email: 'browser@example.test',
    });
  });
  console.log('PASS import review integration; isolated browser login: import-qa@example.test');
  await mongoose.disconnect();
}
main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
