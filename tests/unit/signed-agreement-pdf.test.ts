import { describe, expect, it, vi } from 'vitest';
import {
  PDFArray,
  PDFDocument,
  PDFName,
  PDFRawStream,
  StandardFonts,
  decodePDFRawStream,
} from 'pdf-lib';
import sharp from 'sharp';
import { renderToStaticMarkup } from 'react-dom/server';
import SigningPage from '@/app/sign/[token]/page';
import { GET as downloadCopy } from '@/app/sign/[token]/download/route';
import { GET as downloadReceipt } from '@/app/sign/[token]/receipt/route';
import { publicSignatureRequest } from '@/modules/crm/services/agreement-signature.service';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'verified-session' }) }),
}));
vi.mock('@/modules/crm/services/agreement-signature.service', () => ({
  publicSignatureRequest: vi.fn(),
  signingCookieName: () => 'signing',
  hasSigningAccess: () => true,
  legacyAgreementCover: async () => null,
  pendingProviderInvitation: () => null,
  signingPageDetails: async (request: { coverDetails?: unknown }) => request.coverDetails,
}));
vi.mock('@/app/sign/[token]/sign-form', () => ({
  SignForm: () => null,
}));
vi.mock('@/app/sign/[token]/verification-form', () => ({ SigningVerification: () => null }));

import { signedAgreementResponse } from '@/modules/crm/signed-agreement';

// Evidence verification is covered by the database suite; here only the PDF layout is under test.
vi.mock('@/modules/crm/signature-evidence', () => ({
  verifyCompletion: vi.fn(),
  completionPayload: () => JSON.stringify({ requestId: 'sample' }),
  signatureImage: vi.fn(
    (request: { signatureImageForTest?: string }) => request.signatureImageForTest ?? null,
  ),
}));

import {
  signedAgreementDownload,
  signedAgreementPdf,
  wrapText,
} from '@/modules/crm/signed-agreement-pdf';

async function pngDataUrl(width: number, height: number, colour: string) {
  const png = await sharp({
    create: { width, height, channels: 3, background: colour },
  })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function signed(overrides: Record<string, unknown> = {}) {
  return {
    _id: '6720f0c0a1b2c3d4e5f60789',
    status: 'signed',
    contractNumber: 'DGS-AMC-0042',
    customerName: 'Sample Dental Clinic',
    signerName: 'Sample Signer',
    signerEmail: 'signer@example.test',
    signedName: 'Sample Signer',
    expiresAt: new Date('2026-11-19T08:30:00Z'),
    signedAt: new Date('2026-11-05T08:30:00Z'),
    signerVerifiedAt: new Date('2026-11-05T08:25:00Z'),
    signatureMethod: 'typed',
    signatureStyle: 0,
    draftRevision: 3,
    bodyHash: 'a'.repeat(64),
    documentHash: 'b'.repeat(64),
    consentText: 'I have read this agreement and agree to its terms.',
    body: Array.from(
      { length: 60 },
      (_, i) =>
        `${i + 1}. The provider supports the clinic systems during office hours, 08:00 – 17:00, and responds to “urgent” requests within four hours.`,
    ).join('\n'),
    letterhead: {
      name: 'DigiSol LLC-FZ',
      logoDataUrl: await pngDataUrl(300, 90, '#e8604c'),
      address: 'Office 1\nDubai, United Arab Emirates',
      contact: 'info@example.test · +971 4 000 0000',
      footer: 'Sample registration 123',
      color: '#e8604c',
    },
    ...overrides,
  } as never;
}

describe('signed agreement PDF', () => {
  it('builds a multi-page A4 PDF with letterhead, terms and page numbers', async () => {
    const bytes = await signedAgreementPdf(await signed());
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    const [width, height] = [pdf.getPage(0).getWidth(), pdf.getPage(0).getHeight()];
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
    expect(pdf.getTitle()).toBe('DGS-AMC-0042 — signed agreement');
  });

  it('places contract details on the first page of PDF and printable HTML copies', async () => {
    const coverDetails = {
      title: 'Dental Practice Management System',
      startDate: '2026-11-01',
      endDate: '2027-10-31',
    };
    const agreement = await signed({ coverDetails });
    const pdf = await PDFDocument.load(await signedAgreementPdf(agreement));
    const firstPage = pdf.getPage(0);
    const contents = firstPage.node.lookup(PDFName.of('Contents'), PDFArray);
    const stream = contents.lookup(0, PDFRawStream);
    const instructions = Buffer.from(decodePDFRawStream(stream).decode()).toString('ascii');
    for (const line of [
      'For Dental Practice Management System',
      '01-11-2026 to 31-10-2027',
      'Sample Dental Clinic',
    ]) {
      expect(instructions).toContain(Buffer.from(line).toString('hex').toUpperCase());
    }
    const html = await signedAgreementDownload(
      await signed({ coverDetails, body: 'أحكام' }),
      signedAgreementResponse,
    );
    const copy = await html.text();
    expect(copy).toContain('For Dental Practice Management System');
    expect(copy.indexOf('01-11-2026 to 31-10-2027')).toBeLessThan(copy.indexOf('أحكام'));
  });

  it('embeds a drawn signature image and accepts a WebP letterhead logo', async () => {
    const webp = await sharp({
      create: { width: 120, height: 40, channels: 3, background: '#123456' },
    })
      .webp()
      .toBuffer();
    const request = await signed({
      signatureMethod: 'drawn',
      signatureImageForTest: await pngDataUrl(500, 200, '#ffffff'),
    });
    (request as { letterhead: { logoDataUrl: string } }).letterhead.logoDataUrl =
      `data:image/webp;base64,${webp.toString('base64')}`;
    const pdf = await PDFDocument.load(await signedAgreementPdf(request));
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });

  it('serves a PDF download, or the faithful HTML copy when a character cannot be drawn', async () => {
    const html = vi.fn(
      () => new Response('html copy', { headers: { 'Content-Type': 'text/html' } }),
    );
    const pdf = await signedAgreementDownload(await signed(), html);
    expect(pdf.headers.get('Content-Type')).toBe('application/pdf');
    expect(pdf.headers.get('Content-Disposition')).toBe(
      'attachment; filename="DGS-AMC-0042-signed.pdf"',
    );
    expect(html).not.toHaveBeenCalled();

    const fallback = await signedAgreementDownload(await signed({ body: 'Terms\nأحكام' }), html);
    expect(await fallback.text()).toBe('html copy');
    expect(html).toHaveBeenCalledOnce();
  });

  it('refuses an unsigned request', async () => {
    await expect(signedAgreementPdf(await signed({ status: 'pending' }))).rejects.toThrow(
      'not been signed',
    );
  });

  it('wraps long words and keeps blank lines', async () => {
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    const lines = wrapText(`Short line\n\n${'x'.repeat(300)}`, font, 10, 200);
    expect(lines[0]).toBe('Short line');
    expect(lines[1]).toBe('');
    expect(lines.length).toBeGreaterThan(4);
    expect(lines.every((line) => font.widthOfTextAtSize(line, 10) <= 200)).toBe(true);
  });
});

it('offers only the signed copy on the customer screen', async () => {
  vi.mocked(publicSignatureRequest).mockResolvedValue(await signed());
  const token = 'sample-token';
  const params = Promise.resolve({ token });
  const request = new Request(`https://example.test/sign/${token}`);
  const markup = renderToStaticMarkup(await SigningPage({ params }));
  expect(markup).toContain(`href="/sign/${token}/download"`);
  expect(markup).not.toContain(`href="/sign/${token}/receipt"`);
  expect(markup).not.toContain('Print / Save PDF');

  const copy = await downloadCopy(request, { params });
  expect(copy.headers.get('Content-Type')).toBe('application/pdf');
  expect(copy.headers.get('Content-Disposition')).toContain('-signed.pdf');
  const receipt = await downloadReceipt(request, { params });
  expect(receipt.headers.get('Content-Disposition')).toContain('-signing-receipt.json');
  expect(await receipt.json()).toMatchObject({ format: 'worktello.signing-receipt' });
});

it('shows the customer, product and contract period before signing', async () => {
  vi.mocked(publicSignatureRequest).mockResolvedValue(
    await signed({
      status: 'pending',
      coverDetails: {
        title: 'Annual support agreement',
        productNames: ['Dental Practice Management System'],
        startDate: '2026-11-01',
        endDate: '2027-10-31',
      },
    }),
  );
  const markup = renderToStaticMarkup(
    await SigningPage({ params: Promise.resolve({ token: 'sample-token' }) }),
  );
  expect(markup).toContain('Sample Dental Clinic');
  expect(markup).toContain('Dental Practice Management System');
  expect(markup).toContain('01-11-2026 to 31-10-2027');
});
