import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib';
import sharp from 'sharp';
import {
  agreementCoverBlue,
  agreementCoverHeading,
  agreementCoverRed,
  agreementCoverText,
  type AgreementCoverDetails,
} from './agreement-cover';
import { agreementCoverLogo } from './agreement-cover-logo';
import type { AgreementSignature } from '@coex/shared/crm/models/agreement-signature.model';
import { signatureImage, verifyCompletion } from './signature-evidence';

/**
 * The signed agreement as a real PDF file, so customers and staff get "Download PDF copy" rather
 * than a browser print dialog (John, 5 Nov 2026).
 *
 * The standard PDF fonts cover Western European text only. A contract is a legal record, so a
 * character the font cannot draw is never replaced: the caller falls back to the portable HTML
 * copy instead (`UnsupportedPdfText`).
 */
export class UnsupportedPdfText extends Error {}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 56.7; // 20 mm
const FOOTER_SPACE = 48;
const INK = rgb(0.067, 0.067, 0.067);
const MUTED = rgb(0.33, 0.33, 0.33);

type Signed = AgreementSignature & { _id: unknown };

function colourOf(hex: string | undefined) {
  const value = hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#0f172a';
  const n = parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Every character must be drawable, or the whole PDF is refused rather than altered. */
function assertDrawable(font: PDFFont, values: string[]) {
  const seen = new Set<string>();
  for (const value of values)
    for (const character of value.replace(/[\r\n\t]/g, ' ')) {
      if (seen.has(character)) continue;
      seen.add(character);
      try {
        font.encodeText(character);
      } catch {
        throw new UnsupportedPdfText(`Character U+${character.codePointAt(0)!.toString(16)}`);
      }
    }
}

/** Wraps on spaces, keeps blank lines, and splits words (hashes, URLs) wider than the line. */
export function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/(?<= )/)) {
      const candidate = line + word;
      if (font.widthOfTextAtSize(candidate.trimEnd(), size) <= width) {
        line = candidate;
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = '';
      let rest = word;
      while (font.widthOfTextAtSize(rest.trimEnd(), size) > width) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

async function embedDataUrlImage(pdf: PDFDocument, dataUrl: string | undefined | null) {
  const match = dataUrl?.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return null;
  const bytes = Buffer.from(match[2], 'base64');
  if (match[1] === 'jpeg') return pdf.embedJpg(bytes);
  if (match[1] === 'png') return pdf.embedPng(bytes);
  return pdf.embedPng(await sharp(bytes, { limitInputPixels: 16000000 }).png().toBuffer());
}

class Writer {
  page!: PDFPage;
  y = 0;
  readonly width = A4.width - MARGIN * 2;
  constructor(private readonly pdf: PDFDocument) {
    this.newPage();
  }
  newPage() {
    this.page = this.pdf.addPage([A4.width, A4.height]);
    this.y = A4.height - MARGIN;
  }
  ensure(height: number) {
    if (this.y - height < MARGIN + FOOTER_SPACE) this.newPage();
  }
  text(
    value: string,
    font: PDFFont,
    size: number,
    options: {
      color?: ReturnType<typeof rgb>;
      align?: 'left' | 'right';
      gap?: number;
      width?: number;
    } = {},
  ) {
    const leading = size * 1.45;
    for (const line of wrapText(value, font, size, options.width ?? this.width)) {
      this.ensure(leading);
      const lineWidth = font.widthOfTextAtSize(line, size);
      this.page.drawText(line, {
        x: options.align === 'right' ? MARGIN + this.width - lineWidth : MARGIN,
        y: this.y - size,
        size,
        font,
        color: options.color ?? INK,
      });
      this.y -= leading;
    }
    this.y -= options.gap ?? 0;
  }
  rule(colour: ReturnType<typeof rgb>, thickness = 1, gap = 12) {
    this.ensure(gap * 2);
    this.y -= gap / 2;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: MARGIN + this.width, y: this.y },
      thickness,
      color: colour,
    });
    this.y -= gap;
  }
  image(image: PDFImage, maxWidth: number, maxHeight: number) {
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale,
      height = image.height * scale;
    this.ensure(height + 6);
    this.page.drawImage(image, { x: MARGIN, y: this.y - height, width, height });
    this.y -= height + 8;
  }
}

async function drawCover(
  pdf: PDFDocument,
  customerName: string,
  details: AgreementCoverDetails | null | undefined,
  bold: PDFFont,
) {
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const page = pdf.addPage([A4.width, A4.height]);
  const red = colourOf(agreementCoverRed);
  const blue = colourOf(agreementCoverBlue);
  const right = 504;
  const logoRight = 492;
  const { subtitle, period } = agreementCoverText(details);

  function text(
    value: string,
    top: number,
    size: number,
    font: PDFFont,
    color: typeof INK,
    alignRight: boolean,
  ) {
    const width = right - MARGIN;
    const lines = wrapText(value, font, size, width);
    const fontSize = Math.min(size, (size * 4) / Math.max(1, lines.length));
    wrapText(value, font, fontSize, width).forEach((line, index) => {
      page.drawText(line, {
        x: alignRight ? right - font.widthOfTextAtSize(line, fontSize) : MARGIN,
        y: A4.height - top - index * fontSize * 1.3,
        size: fontSize,
        font,
        color,
      });
    });
  }

  page.drawRectangle({ x: MARGIN, y: A4.height - 64, width: 419, height: 4.5, color: red });
  page.drawRectangle({ x: 483, y: A4.height - 63, width: 9, height: 3, color: blue });
  text(agreementCoverHeading.toUpperCase(), 88, 14, bold, INK, true);
  text(subtitle, 105, 12, bold, red, true);
  const logo = await pdf.embedPng(Buffer.from(agreementCoverLogo.split(',')[1], 'base64'));
  page.drawImage(logo, { x: logoRight - 138, y: A4.height - 425, width: 138, height: 121 });
  text(period, 584, 13, serif, red, true);
  text(customerName, 610, 13, serif, blue, false);
}

/** Builds the signed agreement PDF from verified evidence only. */
export async function signedAgreementPdf(
  request: Signed,
  legacyCover?: AgreementCoverDetails | null,
): Promise<Uint8Array> {
  if (request.status !== 'signed' || !request.signedAt || !request.signedName)
    throw new Error('The agreement has not been signed.');
  verifyCompletion(request);
  const signature = signatureImage(request);
  const letterhead = request.letterhead ?? null;

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const typedFont = await pdf.embedFont(
    (request.signatureStyle ?? 0) === 2
      ? StandardFonts.HelveticaOblique
      : StandardFonts.TimesRomanItalic,
  );
  const coverDetails = request.coverDetails ?? legacyCover;
  const { subtitle, period } = agreementCoverText(coverDetails);
  const footerText = letterhead ? letterhead.footer || letterhead.name : '';
  assertDrawable(regular, [
    request.body,
    subtitle,
    period,
    request.contractNumber,
    request.customerName,
    request.signedName,
    request.signerName,
    request.signerEmail,
    request.consentText,
    letterhead?.name ?? '',
    letterhead?.address ?? '',
    letterhead?.contact ?? '',
    footerText,
  ]);
  pdf.setTitle(`${request.contractNumber} — signed agreement`);
  pdf.setSubject(`Signed agreement for ${request.customerName}`);
  pdf.setCreator('Worktello');
  pdf.setProducer('Worktello');
  pdf.setCreationDate(request.signedAt);

  const colour = colourOf(letterhead?.color);
  await drawCover(pdf, request.customerName, coverDetails, bold);
  const w = new Writer(pdf);

  if (letterhead) {
    const logo = await embedDataUrlImage(pdf, letterhead.logoDataUrl).catch(() => null);
    const top = w.y;
    if (logo) {
      const scale = Math.min(1, 180 / logo.width, 70 / logo.height);
      w.page.drawImage(logo, {
        x: MARGIN,
        y: top - logo.height * scale,
        width: logo.width * scale,
        height: logo.height * scale,
      });
    }
    const width = logo ? w.width - 200 : w.width;
    w.text(letterhead.name, bold, 15, { color: colour, align: 'right', gap: 2, width });
    w.text(letterhead.address, regular, 9, { align: 'right', gap: 2, width });
    if (letterhead.contact.trim())
      w.text(letterhead.contact, regular, 8, { align: 'right', width });
    if (logo) w.y = Math.min(w.y, top - Math.min(70, logo.height * Math.min(1, 180 / logo.width)));
    w.rule(colour, 2, 14);
  }

  w.text('Signed agreement', bold, 17, { gap: 2 });
  w.text(`${request.contractNumber} · ${request.customerName}`, regular, 10.5, {
    color: MUTED,
    gap: 10,
  });
  w.text(request.body, regular, 10.5, { gap: 6 });

  // Keep the signature record together rather than leaving its heading alone at a page end.
  w.ensure(220);
  w.rule(rgb(0.73, 0.73, 0.73), 1, 14);
  w.text('Electronic signature record', bold, 13, { gap: 6 });
  const image = signature ? await embedDataUrlImage(pdf, signature) : null;
  if (image) w.image(image, 260, 110);
  else w.text(request.signedName, typedFont, 24, { gap: 6 });
  const evidence = [
    `Signed by: ${request.signedName}`,
    `Invited signer: ${request.signerName} (${request.signerEmail})`,
    `Signed at (UTC): ${request.signedAt.toISOString()}`,
    `Agreement revision: ${request.draftRevision}`,
    `Request reference: ${String(request._id)}`,
    `Agreement SHA-256: ${request.bodyHash}`,
    ...(request.documentHash ? [`Document with letterhead SHA-256: ${request.documentHash}`] : []),
  ];
  for (const line of evidence) w.text(line, regular, 9);
  w.y -= 6;
  w.text(request.consentText, regular, 9, { gap: 4 });
  w.text(
    `Signing method: ${request.signatureMethod ?? 'typed'}; ${
      request.signerVerifiedAt
        ? `invited email verified at ${request.signerVerifiedAt.toISOString()}`
        : 'private invitation link'
    }; explicit acceptance.`,
    regular,
    9,
    { color: MUTED },
  );

  const pages = pdf.getPages();
  pages.forEach((page, index) => {
    if (index === 0) return;
    const label = `Page ${index + 1} of ${pages.length}`;
    if (footerText) {
      const line = wrapText(footerText, regular, 8, A4.width - MARGIN * 2 - 80)[0] ?? '';
      page.drawLine({
        start: { x: MARGIN, y: MARGIN + 22 },
        end: { x: A4.width - MARGIN, y: MARGIN + 22 },
        thickness: 0.75,
        color: colour,
      });
      page.drawText(line, { x: MARGIN, y: MARGIN + 8, size: 8, font: regular, color: MUTED });
    }
    page.drawText(label, {
      x: A4.width - MARGIN - regular.widthOfTextAtSize(label, 8),
      y: MARGIN + 8,
      size: 8,
      font: regular,
      color: MUTED,
    });
  });
  return pdf.save();
}

const fileStem = (request: Signed) => request.contractNumber.replace(/[^a-zA-Z0-9-]/g, '');

/** PDF when every character is drawable; otherwise the faithful HTML copy, never altered text. */
export async function signedAgreementDownload(
  request: Signed,
  htmlFallback: (request: Signed, legacyCover?: AgreementCoverDetails | null) => Response,
  loadLegacyCover?: (request: Signed) => Promise<AgreementCoverDetails | null>,
) {
  const legacyCover = request.coverDetails ? undefined : await loadLegacyCover?.(request);
  let bytes: Uint8Array;
  try {
    bytes = await signedAgreementPdf(request, legacyCover);
  } catch (error) {
    if (error instanceof UnsupportedPdfText) return htmlFallback(request, legacyCover);
    throw error;
  }
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileStem(request)}-signed.pdf"`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
