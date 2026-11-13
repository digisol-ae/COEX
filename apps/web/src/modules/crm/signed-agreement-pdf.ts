import { displayDate, displayTimestamp } from '@coex/shared/crm/display-date';
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
  agreementFooterText,
  agreementHeaderDate,
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
  constructor(
    private readonly pdf: PDFDocument,
    private readonly footerSpace: number,
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.pdf.addPage([A4.width, A4.height]);
    this.y = A4.height - MARGIN - 24;
  }
  ensure(height: number) {
    if (this.y - height < MARGIN + this.footerSpace) this.newPage();
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
  const logoWidth = 138;
  const logoHeight = logo.height * (logoWidth / logo.width);
  page.drawImage(logo, {
    x: logoRight - logoWidth,
    y: A4.height - 304 - logoHeight,
    width: logoWidth,
    height: logoHeight,
  });
  text(period, 584, 13, serif, red, true);
  text(customerName, 610, 13, serif, blue, false);
}

async function drawPartySignatures(
  pdf: PDFDocument,
  writer: Writer,
  request: Signed,
  first: NonNullable<Signed['firstParty']>,
  signedName: string,
  signedAt: Date,
  bold: PDFFont,
  regular: PDFFont,
) {
  const width = writer.width;
  const boxHeight = 56;
  const blockHeight = 129;
  const partyDetails = [
    {
      role: 'First Party',
      company: request.letterhead?.name ?? 'First Party',
      name: first.name,
      date: first.signedAt,
      style: first.signatureStyle,
      data: signatureImage(first),
    },
    {
      role: 'Second Party',
      company: request.customerName,
      name: signedName,
      date: signedAt,
      style: request.signatureStyle,
      data: signatureImage(request),
    },
  ];
  writer.ensure(2 * blockHeight + 31);
  writer.text('Acceptance and signatures', bold, 13, { gap: 8 });
  for (const party of partyDetails) {
    const top = writer.y;
    const boxY = top - 54 - boxHeight;
    const x = MARGIN;
    const { page } = writer;
    function fitted(value: string, y: number, font: PDFFont, maxSize: number, maxWidth = width) {
      const text = value.replace(/[\r\n\t]/g, ' ');
      const size = Math.min(
        maxSize,
        (maxSize * maxWidth) / (font.widthOfTextAtSize(text, maxSize) || 1),
      );
      page.drawText(text, { x, y, font, size, color: INK });
    }
    fitted(party.role, top - 10, bold, 10);
    fitted(party.company, top - 26, bold, 11);
    fitted(party.name, top - 43, regular, 10);
    fitted(
      `Signed ${displayDate(party.date.toISOString().slice(0, 10))} UTC`,
      boxY - 12,
      regular,
      9,
    );
    page.drawRectangle({
      x,
      y: boxY,
      width,
      height: boxHeight,
      borderWidth: 0.7,
      borderColor: rgb(0.55, 0.58, 0.62),
      color: rgb(0.96, 0.97, 0.98),
    });
    const image = await embedDataUrlImage(pdf, party.data);
    if (image) {
      const scale = Math.min(1, (width - 20) / image.width, (boxHeight - 20) / image.height);
      const imageWidth = image.width * scale;
      const imageHeight = image.height * scale;
      page.drawImage(image, {
        x: x + (width - imageWidth) / 2,
        y: boxY + (boxHeight - imageHeight) / 2,
        width: imageWidth,
        height: imageHeight,
      });
    } else {
      const font = await pdf.embedFont(
        party.style === 2 ? StandardFonts.HelveticaOblique : StandardFonts.TimesRomanItalic,
      );
      const name = party.name.replace(/[\r\n\t]/g, ' ');
      const size = Math.min(26, (26 * (width - 20)) / font.widthOfTextAtSize(name, 26));
      page.drawText(name, {
        x: x + (width - font.widthOfTextAtSize(name, size)) / 2,
        y: boxY + (boxHeight - size) / 2,
        size,
        font,
        color: INK,
      });
    }
    writer.y -= blockHeight;
  }
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
  const footerText = agreementFooterText(letterhead);
  const headerDate = agreementHeaderDate(request.body, coverDetails);
  assertDrawable(regular, [
    request.body,
    subtitle,
    period,
    request.contractNumber,
    request.customerName,
    request.signedName,
    request.firstParty?.name ?? '',
    request.signerName,
    request.signerEmail,
    request.consentText,
    letterhead?.name ?? '',
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
  const footerWidth = A4.width - MARGIN * 2 - 42;
  const [address, ...channels] = footerText.split(' | ');
  const footerLines = !footerText
    ? []
    : channels.length > 0 && regular.widthOfTextAtSize(footerText, 8) > footerWidth
      ? [
          ...wrapText(address, regular, 8, footerWidth),
          ...wrapText(channels.join(' | '), regular, 8, footerWidth),
        ]
      : wrapText(footerText, regular, 8, footerWidth);
  const w = new Writer(pdf, Math.max(FOOTER_SPACE, 18 + footerLines.length * 10));

  w.text('Signed agreement', bold, 17, { gap: 2 });
  w.text(`${request.contractNumber} · ${request.customerName}`, regular, 10.5, {
    color: MUTED,
    gap: 10,
  });
  w.text(request.body, regular, 10.5, { gap: 6 });

  if (request.firstParty) {
    await drawPartySignatures(
      pdf,
      w,
      request,
      request.firstParty,
      request.signedName,
      request.signedAt,
      bold,
      regular,
    );
  } else {
    // Keep the signature record together rather than leaving its heading alone at a page end.
    w.ensure(220);
    w.rule(rgb(0.73, 0.73, 0.73), 1, 14);
    w.text('Electronic signature record', bold, 13, { gap: 6 });
    const image = signature ? await embedDataUrlImage(pdf, signature) : null;
    if (image) w.image(image, 260, 110);
    else w.text(request.signedName, typedFont, 24, { gap: 6 });
  }
  const evidence = [
    `Signed by: ${request.signedName}`,
    `Invited signer: ${request.signerName} (${request.signerEmail})`,
    `Signed at (UTC): ${displayTimestamp(request.signedAt)}`,
  ];
  for (const line of evidence) w.text(line, regular, 9);
  w.y -= 6;
  w.text(request.consentText, regular, 9, { gap: 4 });
  w.text(
    `Signing method: ${request.signatureMethod ?? 'typed'}; ${
      request.signerVerifiedAt
        ? `invited email verified at ${displayTimestamp(request.signerVerifiedAt)}`
        : 'private invitation link'
    }; explicit acceptance.`,
    regular,
    9,
    { color: MUTED },
  );

  const right = A4.width - MARGIN;
  const mark = await embedDataUrlImage(pdf, letterhead?.logoDataUrl).catch(() => null);
  pdf.getPages().forEach((page, index) => {
    if (index > 0) {
      const y = A4.height - MARGIN;
      page.drawText(`Page ${index}`, { x: MARGIN, y, size: 9, font: regular, color: MUTED });
      if (headerDate)
        page.drawText(headerDate, {
          x: right - regular.widthOfTextAtSize(headerDate, 9),
          y,
          size: 9,
          font: regular,
          color: MUTED,
        });
      page.drawLine({
        start: { x: MARGIN, y: y - 8 },
        end: { x: right, y: y - 8 },
        thickness: 0.75,
        color: colour,
      });
    }
    const footerY = MARGIN + 8;
    footerLines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: (A4.width - regular.widthOfTextAtSize(line, 8)) / 2,
        y: footerY + (footerLines.length - 1 - lineIndex) * 10,
        size: 8,
        font: regular,
        color: MUTED,
      });
    });
    if (index > 0 && mark && Math.abs(mark.width / mark.height - 1) < 0.05) {
      page.drawImage(mark, { x: right - 19, y: footerY - 4, width: 19, height: 19 });
    } else if (index > 0) {
      page.drawRectangle({
        x: right - 19,
        y: footerY - 4,
        width: 19,
        height: 19,
        color: colourOf(agreementCoverRed),
      });
      page.drawText('d.', { x: right - 15, y: footerY, size: 13, font: bold, color: rgb(1, 1, 1) });
    }
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
