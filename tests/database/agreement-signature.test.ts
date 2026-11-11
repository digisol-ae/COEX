import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { createOrganisation } from '@/modules/crm/services/organisation.service';
import { createContact } from '@/modules/crm/services/contact.service';
import { createContract, getContract } from '@/modules/crm/services/contract.service';
import {
  generateAgreementDraft,
  saveAgreementDraft,
  getAgreementDraft,
} from '@/modules/crm/services/agreement.service';
import {
  requestAgreementSignature,
  publicSignatureRequest,
  signAgreement as completeSignature,
  requestSigningCode,
  verifySigningCode,
  hasSigningAccess,
  cancelAgreementSignature,
  signatureWorkspace,
  listSignatureHistory,
  staffSignedAgreement,
  emailSignedAgreement,
} from '@/modules/crm/services/agreement-signature.service';
import { AgreementSignatureModel } from '@coex/shared/crm/models/agreement-signature.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import {
  signedAgreementHtml,
  signedAgreementResponse,
  signingReceiptResponse,
} from '@/modules/crm/signed-agreement';
import sharp from 'sharp';
import { completionPayload, signingMac } from '@/modules/crm/signature-evidence';
import { openSecret } from '@/lib/secret-box';

const context = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
const other = { ...context, tenantId: new Types.ObjectId() };
const within = <T>(fn: () => Promise<T>) => runWithContext(context, fn);
beforeAll(() => {
  vi.stubEnv('AUTH_SECRET', 'isolated-signature-test-secret');
  return connectForTests('agreement_signature');
});
const access = new Map<string, Promise<string>>();
beforeEach(async () => {
  access.clear();
  await clearDatabase();
});
afterAll(async () => {
  await disconnectFromTests();
  vi.unstubAllEnvs();
});

async function fixture(reviewed = true) {
  await TenantModel.create({
    _id: context.tenantId,
    name: 'QA Provider',
    slug: 'signature-provider',
    branding: {
      primaryColor: '#123456',
      letterhead: {
        logoDataUrl: 'data:image/png;base64,aGVsbG8=',
        address: 'QA Office\nDubai',
        contact: 'qa@example.test',
        footer: 'QA registration 123',
      },
    },
  });
  const organisationId = await createOrganisation({ name: 'Signature QA', kind: 'client' });
  const contactId = await createContact({
    organisationId,
    name: 'Test Signer',
    email: 'signer@example.test',
  });
  const contractId = await createContract({
    organisationId,
    title: 'QA support',
    type: 'amc',
    startDate: '2026-11-01',
    endDate: '2027-10-31',
    billingFrequency: 'yearly',
    value: '250',
  });
  await generateAgreementDraft(contractId, 'builtin:it-basic', {}, 0);
  const draft = (await getAgreementDraft(contractId))!;
  await saveAgreementDraft(
    contractId,
    'Agreed terms\nأحكام\n<script>alert(1)</script>',
    reviewed,
    draft.revision,
  );
  await EmailSettingsModel.create({ tenantId: context.tenantId, outbound: { enabled: true } });
  return { contractId, contactId, revision: (await getAgreementDraft(contractId))!.revision };
}
async function send() {
  const f = await fixture();
  const id = await requestAgreementSignature(f.contractId, f.contactId, f.revision);
  const email = (await EmailOutboxModel.findOne({ tenantId: context.tenantId }))!;
  const token = email.text.match(/\/sign\/([A-Za-z0-9_-]{43})/)![1];
  return { ...f, id, token };
}
const acceptance = { name: 'Test Signer', consent: true, userAgent: 'QA browser' };

async function sampleSignature() {
  const png = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160"><path d="M20 100 Q80 10 120 100 T230 100 L350 70" fill="none" stroke="black" stroke-width="5"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

it('requires fresh verified mailbox access before accepting a signature', () =>
  within(async () => {
    const f = await send();
    await expect(completeSignature(f.token, acceptance)).rejects.toThrow('Verify your email');
    const accessToken = await verifiedAccess(f.token);
    expect(hasSigningAccess((await publicSignatureRequest(f.token))!, accessToken)).toBe(true);
    await AgreementSignatureModel.updateOne(
      { _id: f.id },
      { $set: { accessExpiresAt: new Date(0) } },
    );
    await expect(completeSignature(f.token, { ...acceptance, accessToken })).rejects.toThrow(
      'Verify your email',
    );
  }));

it('bounds code resends and incorrect verification attempts and never stores the code in plaintext', () =>
  within(async () => {
    const f = await send();
    await requestSigningCode(f.token);
    await expect(requestSigningCode(f.token)).rejects.toThrow('wait');
    const mail = (await EmailOutboxModel.findOne({ kind: 'password_reset' }))!;
    const code = mail.text.match(/code is (\d{6})/)![1];
    const request = (await publicSignatureRequest(f.token))!;
    expect(request.otpCodeHash).not.toBe(code);
    const wrong = code === '111111' ? '222222' : '111111';
    const attempts = await Promise.allSettled(
      Array.from({ length: 7 }, () => verifySigningCode(f.token, wrong)),
    );
    expect(attempts.every((a) => a.status === 'rejected')).toBe(true);
    expect((await publicSignatureRequest(f.token))!.otpAttempts).toBe(5);
    await expect(verifySigningCode(f.token, code)).rejects.toThrow('incorrect or expired');
  }));

it('expires verification codes and prevents successful code replay', () =>
  within(async () => {
    const f = await send();
    await requestSigningCode(f.token);
    const mail = (await EmailOutboxModel.findOne({ kind: 'password_reset' }))!;
    const code = mail.text.match(/code is (\d{6})/)![1];
    const verified = await verifySigningCode(f.token, code);
    expect(verified.accessToken).toHaveLength(43);
    await expect(verifySigningCode(f.token, code)).rejects.toThrow('incorrect or expired');
    await AgreementSignatureModel.updateOne({ _id: f.id }, { $set: { otpSentAt: new Date(0) } });
    await requestSigningCode(f.token);
    await AgreementSignatureModel.updateOne({ _id: f.id }, { $set: { otpExpiresAt: new Date(0) } });
    await expect(verifySigningCode(f.token, '123456')).rejects.toThrow('incorrect or expired');
  }));

it.each(['drawn', 'uploaded'] as const)(
  'stores %s signature images encrypted and binds them to the completion evidence',
  (method) =>
    within(async () => {
      const f = await send();
      const signed = await signAgreement(f.token, {
        ...acceptance,
        capture: { method, imageDataUrl: await sampleSignature() },
      });
      expect(signed.signatureMethod).toBe(method);
      expect(signed.signatureSealed).toMatch(/^v1:/);
      expect(signed.signatureSealed).not.toContain('data:image');
      expect(openSecret(signed.signatureSealed)).toMatch(/^data:image\/png;base64,/);
      expect(signed.completionMac).toHaveLength(64);
      expect(signed.signerVerifiedAt).toBeInstanceOf(Date);
      const html = signedAgreementHtml(signed);
      expect(html).toContain('alt="Customer signature"');
      expect(html).toContain(`Signing method: ${method}`);
      await AgreementSignatureModel.collection.updateOne(
        { _id: signed._id },
        { $set: { signedName: 'Altered signer' } },
      );
      expect(await publicSignatureRequest(f.token)).toBeNull();
      await expect(staffSignedAgreement(f.contractId, f.id)).rejects.toThrow(
        'could not be verified',
      );
    }),
);

it('rejects active content, corrupt and blank image uploads before signing', () =>
  within(async () => {
    const f = await send();
    const accessToken = await verifiedAccess(f.token);
    await expect(
      completeSignature(f.token, {
        ...acceptance,
        accessToken,
        capture: { method: 'uploaded', imageDataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' },
      }),
    ).rejects.toThrow('PNG');
    await expect(
      completeSignature(f.token, {
        ...acceptance,
        accessToken,
        capture: { method: 'uploaded', imageDataUrl: 'data:image/png;base64,aGVsbG8=' },
      }),
    ).rejects.toThrow('unreadable');
    const blank = await sharp({
      create: { width: 200, height: 100, channels: 4, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await expect(
      completeSignature(f.token, {
        ...acceptance,
        accessToken,
        capture: {
          method: 'drawn',
          imageDataUrl: `data:image/png;base64,${blank.toString('base64')}`,
        },
      }),
    ).rejects.toThrow('blank');
    expect((await publicSignatureRequest(f.token))!.status).toBe('pending');
  }));

it('keeps completion evidence valid when a signed copy is accessed after a new email verification', () =>
  within(async () => {
    const f = await send();
    const signed = await signAgreement(f.token, {
      ...acceptance,
      capture: { method: 'typed', style: 1 },
    });
    await AgreementSignatureModel.updateOne(
      { _id: f.id },
      { $set: { otpSentAt: new Date(0), accessExpiresAt: new Date(0) } },
    );
    await requestSigningCode(f.token);
    const email = (await EmailOutboxModel.findOne({ kind: 'password_reset' }).sort({
      createdAt: -1,
    }))!;
    await verifySigningCode(f.token, email.text.match(/code is (\d{6})/)![1]);
    const refreshed = (await publicSignatureRequest(f.token))!;
    expect(refreshed.signerVerifiedAt?.toISOString()).toBe(signed.signerVerifiedAt?.toISOString());
    expect(signedAgreementHtml(refreshed)).toContain('font-style:italic');
  }));

async function verifiedAccess(token: string) {
  if (!access.has(token))
    access.set(
      token,
      (async () => {
        await requestSigningCode(token);
        const email = (await EmailOutboxModel.findOne({ kind: 'password_reset' }).sort({
          createdAt: -1,
        }))!;
        const code = email.text.match(/code is (\d{6})/)![1];
        return (await verifySigningCode(token, code)).accessToken;
      })(),
    );
  return access.get(token)!;
}
async function signAgreement(token: string, input: Parameters<typeof completeSignature>[1]) {
  // Invalid name/consent and unavailable links must still be checked without an OTP side effect.
  if (!input.consent || input.name.trim().length < 2 || !(await publicSignatureRequest(token)))
    return completeSignature(token, input);
  return completeSignature(token, { ...input, accessToken: await verifiedAccess(token) });
}

it('freezes tenant letterhead with each document and includes it in signed exports', () =>
  within(async () => {
    const f = await send();
    const original = (await publicSignatureRequest(f.token))!;
    expect(original.letterhead?.name).toBe('QA Provider');
    expect(original.documentHash).toHaveLength(64);
    await TenantModel.updateOne(
      { _id: context.tenantId },
      {
        $set: {
          name: 'Renamed Provider',
          'branding.letterhead.address': 'New office',
          'branding.letterhead.logoDataUrl': 'data:image/png;base64,YWJj',
        },
      },
    );
    const signed = await signAgreement(f.token, acceptance);
    expect(signed.letterhead?.address).toBe('QA Office\nDubai');
    expect(signed.documentHash).toBe(original.documentHash);
    const html = signedAgreementHtml(signed);
    expect(html).toContain('QA Provider');
    expect(html).toContain('QA registration 123');
    expect(html).toContain(original.letterhead!.logoDataUrl);
    expect(html).not.toContain('Renamed Provider');
    expect(signedAgreementResponse(signed).headers.get('Content-Security-Policy')).toContain(
      'img-src data:',
    );
  }));

it('requires configured tenant letterhead before sending a new invitation', () =>
  within(async () => {
    const f = await fixture();
    await TenantModel.updateOne(
      { _id: context.tenantId },
      { $set: { 'branding.letterhead.logoDataUrl': '' } },
    );
    await expect(requestAgreementSignature(f.contractId, f.contactId, f.revision)).rejects.toThrow(
      'letterhead logo',
    );
    expect(await EmailOutboxModel.countDocuments()).toBe(0);
    expect((await signatureWorkspace(f.contractId)).letterheadError).toContain('letterhead');
  }));

it('tracks separate contract sends, timestamps and statuses without replacing prior signed revisions', () =>
  within(async () => {
    const f = await send();
    await AgreementSignatureModel.collection.updateOne(
      { _id: new Types.ObjectId(f.id) },
      { $set: { createdAt: new Date('2026-01-01T09:00:00Z') } },
    );
    await signAgreement(f.token, acceptance);
    await saveAgreementDraft(f.contractId, 'Second agreement revision', true, f.revision);
    const secondId = await requestAgreementSignature(f.contractId, f.contactId, f.revision + 1);
    const originalContract = (await getContract(f.contractId))!;
    const anotherContract = await createContract({
      organisationId: originalContract.organisationId,
      title: 'Another contract',
      type: 'amc',
      startDate: '2026-11-01',
      endDate: '2027-10-31',
      billingFrequency: 'yearly',
      value: '500',
    });
    await generateAgreementDraft(anotherContract, 'builtin:it-basic', {}, 0);
    const draft = (await getAgreementDraft(anotherContract))!;
    await saveAgreementDraft(anotherContract, 'Separate contract wording', true, draft.revision);
    await requestAgreementSignature(anotherContract, f.contactId, draft.revision + 1);
    const ledger = await listSignatureHistory();
    expect(ledger.total).toBe(3);
    expect(ledger.history.at(-1)?.id).toBe(f.id);
    expect(ledger.history.at(-1)?.createdAt).toBe('2026-01-01T09:00:00.000Z');
    expect((await listSignatureHistory({ status: 'signed' })).total).toBe(1);
    expect((await listSignatureHistory({ status: 'pending' })).total).toBe(2);
    expect((await signatureWorkspace(f.contractId)).total).toBe(2);
    expect((await staffSignedAgreement(f.contractId, f.id))?.body).not.toContain(
      'Second agreement',
    );
    await cancelAgreementSignature(f.contractId, secondId);
    expect(
      (await listSignatureHistory({ status: 'cancelled' })).history[0].cancelledAt,
    ).toBeTruthy();
    expect((await listSignatureHistory({ status: 'pending' })).total).toBe(1);
  }));

it('keeps older requests accessible beyond the first history page and isolates the tenant ledger', () =>
  within(async () => {
    const f = await send();
    await cancelAgreementSignature(f.contractId, f.id);
    const original = (await AgreementSignatureModel.findById(f.id))!.toObject();
    const fields = { ...original, _id: undefined, createdAt: undefined, updatedAt: undefined };
    await AgreementSignatureModel.insertMany(
      Array.from({ length: 22 }, (_, i) => ({
        ...fields,
        tokenHash: `older-request-${i}`,
        createdAt: new Date(2025, 0, i + 1),
      })),
    );
    const first = await listSignatureHistory({ page: 1 });
    const second = await listSignatureHistory({ page: 2 });
    expect(first.total).toBe(23);
    expect(first.history).toHaveLength(20);
    expect(second.history).toHaveLength(3);
    expect(second.history.some((r) => first.history.some((a) => a.id === r.id))).toBe(false);
    await TenantModel.create({ _id: other.tenantId, name: 'Other tenant', slug: 'other' });
    await runWithContext(other, async () => expect((await listSignatureHistory()).total).toBe(0));
  }));

it('queues a private invitation, signs a frozen revision once, and exports exact escaped Unicode wording', () =>
  within(async () => {
    const f = await send();
    const before = (await publicSignatureRequest(f.token))!;
    expect(before.tokenHash).not.toBe(f.token);
    expect(before.status).toBe('pending');
    await saveAgreementDraft(f.contractId, 'Later negotiated terms', true, f.revision);
    const signed = await signAgreement(f.token, acceptance);
    expect(signed.body).toBe(before.body);
    expect(signed.signedAt).toBeInstanceOf(Date);
    expect(signed.consentText).toContain('intend to sign');
    expect(signed.signerUserAgent).toBe('QA browser');
    expect((await getContract(f.contractId))!.status).toBe('draft');
    await expect(signAgreement(f.token, { ...acceptance, name: 'Replacement' })).rejects.toThrow(
      'already signed',
    );
    const html = signedAgreementHtml(signed);
    expect(html).toContain('أحكام');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain(signed.bodyHash);
    expect(html).not.toContain(f.token);
    expect(signedAgreementResponse(signed).headers.get('Cache-Control')).toBe('no-store');
    expect((await staffSignedAgreement(f.contractId, f.id))?.signedName).toBe(acceptance.name);
    const history = (await signatureWorkspace(f.contractId)).history[0];
    expect(history.deliveryStatus).toBe('pending');
    expect(history.status).toBe('signed');
  }));

it('rejects unreviewed and stale revisions before creating an invitation', () =>
  within(async () => {
    const f = await fixture(false);
    await expect(requestAgreementSignature(f.contractId, f.contactId, f.revision)).rejects.toThrow(
      'review',
    );
    await saveAgreementDraft(f.contractId, 'Reviewed wording', true, f.revision);
    await expect(requestAgreementSignature(f.contractId, f.contactId, f.revision)).rejects.toThrow(
      'review',
    );
    expect(await EmailOutboxModel.countDocuments()).toBe(0);
  }));

it('enforces tenant and customer boundaries for reads, signers, cancellation and downloads', () =>
  within(async () => {
    const f = await send();
    const differentCustomer = await createOrganisation({ name: 'Other customer', kind: 'client' });
    const wrongContact = await createContact({
      organisationId: differentCustomer,
      name: 'Wrong signer',
      email: 'wrong@example.test',
    });
    await expect(requestAgreementSignature(f.contractId, wrongContact, f.revision)).rejects.toThrow(
      'customer contact',
    );
    await runWithContext(other, async () => {
      await expect(signatureWorkspace(f.contractId)).rejects.toThrow('not found');
      await expect(
        requestAgreementSignature(f.contractId, f.contactId, f.revision),
      ).rejects.toThrow('not found');
      await expect(cancelAgreementSignature(f.contractId, f.id)).rejects.toThrow('no longer');
      expect(await staffSignedAgreement(f.contractId, f.id)).toBeNull();
    });
    expect((await publicSignatureRequest(f.token))!.status).toBe('pending');
  }));

it('invalidates cancelled and expired links, retaining their history', () =>
  within(async () => {
    const f = await send();
    await cancelAgreementSignature(f.contractId, f.id);
    expect(await publicSignatureRequest(f.token)).toBeNull();
    await expect(signAgreement(f.token, acceptance)).rejects.toThrow('unavailable');
    const next = await requestAgreementSignature(f.contractId, f.contactId, f.revision);
    await AgreementSignatureModel.updateOne({ _id: next }, { $set: { expiresAt: new Date(0) } });
    const email = (await EmailOutboxModel.findOne({
      messageId: `<agreement-signature-${next}@worktello.com>`,
    }))!;
    const token = email.text.match(/\/sign\/([A-Za-z0-9_-]{43})/)![1];
    expect(await publicSignatureRequest(token)).toBeNull();
    await expect(signAgreement(token, acceptance)).rejects.toThrow('unavailable');
    await requestAgreementSignature(f.contractId, f.contactId, f.revision);
    expect((await signatureWorkspace(f.contractId)).history.map((r) => r.status)).toContain(
      'expired',
    );
  }));

it('prevents duplicate invitations and concurrent signing overwrites', () =>
  within(async () => {
    const f = await fixture();
    const attempts = await Promise.allSettled(
      [1, 2].map(() => requestAgreementSignature(f.contractId, f.contactId, f.revision)),
    );
    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
    expect(await EmailOutboxModel.countDocuments()).toBe(1);
    const email = (await EmailOutboxModel.findOne())!;
    const token = email.text.match(/\/sign\/([A-Za-z0-9_-]{43})/)![1];
    const signed = await Promise.allSettled([1, 2].map(() => signAgreement(token, acceptance)));
    expect(signed.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
  }));

it('requires explicit consent and a full name and rejects malformed capabilities', () =>
  within(async () => {
    const f = await send();
    await expect(signAgreement(f.token, { ...acceptance, consent: false })).rejects.toThrow(
      'accept',
    );
    await expect(signAgreement(f.token, { ...acceptance, name: ' ' })).rejects.toThrow('full name');
    expect(await publicSignatureRequest('bad-token')).toBeNull();
    expect(await publicSignatureRequest('a'.repeat(43))).toBeNull();
    expect(await staffSignedAgreement(f.contractId, f.id)).toBeNull();
  }));

it('does not leave a usable invitation when outbound email is disabled', () =>
  within(async () => {
    const f = await fixture();
    await EmailSettingsModel.updateOne(
      { tenantId: context.tenantId },
      { $set: { 'outbound.enabled': false } },
    );
    await expect(requestAgreementSignature(f.contractId, f.contactId, f.revision)).rejects.toThrow(
      'disabled',
    );
    expect(await EmailOutboxModel.countDocuments()).toBe(0);
    expect(await AgreementSignatureModel.countDocuments({ status: 'pending' })).toBe(0);
  }));

it('blocks changed signed wording in staff downloads and flags its tracking record', () =>
  within(async () => {
    const f = await send();
    await signAgreement(f.token, acceptance);
    await AgreementSignatureModel.collection.updateOne(
      { _id: new Types.ObjectId(f.id) },
      { $set: { body: 'Altered wording' } },
    );
    expect(await publicSignatureRequest(f.token)).toBeNull();
    await expect(staffSignedAgreement(f.contractId, f.id)).rejects.toThrow('could not be verified');
    expect((await listSignatureHistory()).history[0].evidenceValid).toBe(false);
  }));

it('exports a versioned signing receipt with bound contract context and no access or image secrets', () =>
  within(async () => {
    const f = await send();
    const signed = await signAgreement(f.token, {
      ...acceptance,
      capture: { method: 'drawn', imageDataUrl: await sampleSignature() },
    });
    const response = signingReceiptResponse(signed);
    const text = await response.text();
    const receipt = JSON.parse(text);
    expect(receipt.evidenceVersion).toBe(3);
    expect(receipt.evidence.contractId).toBe(f.contractId);
    expect(receipt.evidence.customerName).toBe('Signature QA');
    expect(receipt.evidence.draftRevision).toBe(f.revision);
    expect(receipt.evidence.requestedAt).toBe(signed.createdAt.toISOString());
    expect(receipt.evidence.verifiedAt).toBe(signed.signerVerifiedAt!.toISOString());
    expect(receipt.authentication.algorithm).toBe('HMAC-SHA256');
    expect(receipt.authentication.code).toBe(signed.completionMac);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Disposition')).toContain('signing-receipt.json');
    for (const forbidden of [
      f.token,
      signed.accessTokenHash!,
      signed.signatureSealed!,
      'otpCodeHash',
      'signatureSealed',
      'data:image',
      'isolated-signature-test-secret',
    ])
      expect(text).not.toContain(forbidden);
  }));

it.each(['contractId', 'customerName', 'draftRevision'] as const)(
  'detects changes to signed contract association: %s',
  (field) =>
    within(async () => {
      const f = await send();
      await signAgreement(f.token, acceptance);
      const changed =
        field === 'contractId'
          ? new Types.ObjectId()
          : field === 'customerName'
            ? 'Different customer'
            : 999;
      await AgreementSignatureModel.collection.updateOne(
        { _id: new Types.ObjectId(f.id) },
        { $set: { [field]: changed } },
      );
      const record = (await AgreementSignatureModel.findById(f.id))!;
      expect(await publicSignatureRequest(f.token)).toBeNull();
      expect(() => signingReceiptResponse(record)).toThrow('could not be verified');
      expect((await listSignatureHistory()).history[0].evidenceValid).toBe(false);
    }),
);

it.each(['drawn', 'uploaded'] as const)(
  'does not replace a missing %s signature image with a typed signature',
  (method) =>
    within(async () => {
      const f = await send();
      await signAgreement(f.token, {
        ...acceptance,
        capture: { method, imageDataUrl: await sampleSignature() },
      });
      await AgreementSignatureModel.updateOne({ _id: f.id }, { $set: { signatureSealed: null } });
      const record = (await AgreementSignatureModel.findById(f.id))!;
      expect(await publicSignatureRequest(f.token)).toBeNull();
      expect(() => signedAgreementHtml(record)).toThrow('incomplete');
      expect(() => signingReceiptResponse(record)).toThrow('incomplete');
      expect((await listSignatureHistory()).history[0].evidenceValid).toBe(false);
    }),
);

it('preserves verification of historical version-two completion records', () =>
  within(async () => {
    const f = await send();
    // Simulate a request created by the preceding local signing implementation.
    await AgreementSignatureModel.collection.updateOne(
      { _id: new Types.ObjectId(f.id) },
      { $set: { securityVersion: 2 } },
    );
    const signed = await signAgreement(f.token, acceptance);
    expect(await publicSignatureRequest(f.token)).not.toBeNull();
    const receipt = await signingReceiptResponse(signed).json();
    expect(receipt.evidenceVersion).toBe(2);
    expect(receipt.evidence.contractId).toBeUndefined();
    expect(receipt.evidence.requestId).toBe(f.id);
  }));

it('queues both links only when staff sends the signed copy', () =>
  within(async () => {
    const f = await send();
    const invoiceLink = 'https://zohosecurepay.com/books/Payment/secure?invoice=sample';
    const draft = {
      invoiceLink,
      subject: 'Signed contract and invoice for your records',
      message: 'Hello,\n\nPlease save these copies.',
      signature: 'Regards,\nContracts & Billing',
      sender: 'contracts',
      cc: 'Billing@example.test, signer@example.test, billing@example.test',
    };
    await expect(emailSignedAgreement(f.contractId, f.id, draft)).rejects.toThrow(
      'Signed agreement unavailable',
    );
    const signed = await signAgreement(f.token, acceptance);
    const expiresAt = new Date(Date.now() - 1000);
    const completionMac = signingMac(completionPayload({ ...signed.toObject(), expiresAt }));
    await AgreementSignatureModel.collection.updateOne(
      { _id: signed._id },
      { $set: { expiresAt, completionMac, otpSentAt: null } },
    );
    expect(await publicSignatureRequest(f.token)).toBeNull();
    expect(await EmailOutboxModel.countDocuments({ subject: /^Signed contract and invoice/ })).toBe(
      0,
    );

    await expect(emailSignedAgreement(f.contractId, f.id, draft)).rejects.toThrow(
      'Choose a configured From address',
    );
    await EmailSettingsModel.updateOne(
      { tenantId: context.tenantId },
      { $set: { 'senders.contracts.fromAddress': 'contracts@example.test' } },
    );
    await expect(
      emailSignedAgreement(f.contractId, f.id, { ...draft, cc: 'invalid' }),
    ).rejects.toThrow('Invalid CC email address');
    await emailSignedAgreement(f.contractId, f.id, draft);
    const emails = await EmailOutboxModel.find({ subject: /^Signed contract and invoice/ });
    expect(emails).toHaveLength(1);
    const [email] = emails;
    expect(email.to).toBe('signer@example.test');
    expect(email.subject).toBe(draft.subject);
    expect(email.sender).toBe('contracts');
    expect(email.cc).toEqual(['billing@example.test']);
    expect(email.text).toContain(draft.message);
    expect(email.text).toContain(draft.signature);
    expect(email.html).toContain('Contracts &amp; Billing');
    expect(email.html).toContain('Download copy of your contract');
    expect(email.html).toContain(`href="${invoiceLink}">Download copy of your invoice`);
    const token = email.text.match(/\/sign\/(copy-[a-f0-9-]+)/)![1];
    const copy = await publicSignatureRequest(token);
    expect(String(copy?._id)).toBe(f.id);
    expect(hasSigningAccess(copy!)).toBe(false);
    const accessToken = await verifiedAccess(token);
    expect(hasSigningAccess((await publicSignatureRequest(token))!, accessToken)).toBe(true);
    expect(
      await publicSignatureRequest(token.replace(/.$/, (last) => (last === 'a' ? 'b' : 'a'))),
    ).toBeNull();
  }));
