import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { formatMinutes } from './week';

/**
 * The Team activity page as a PDF for sharing by email (John, 9 Oct 2026).
 *
 * Pure: rows in, bytes out, so it is tested without a database. The standard PDF fonts carry only
 * Latin letters, so anything else in a name or title is shown as "?" rather than failing the
 * whole report; a name in another script still prints in the app.
 */

export interface ReportRow {
  userName: string;
  kind: 'task' | 'ticket';
  number: string;
  title: string;
  stage: string;
  minutes: number;
  running: boolean;
  lastWorked: string;
}

export interface ReportInput {
  title: string;
  periodLabel: string;
  filtersLabel: string;
  generatedBy: string;
  generatedAt: string;
  rows: ReportRow[];
}

const PAGE = { width: 842, height: 595 };
const MARGIN = 36;
const COLUMNS = [
  { key: 'person', label: 'Person', width: 120 },
  { key: 'item', label: 'Task or ticket', width: 350 },
  { key: 'stage', label: 'Stage', width: 110 },
  { key: 'time', label: 'Time', width: 70 },
  { key: 'last', label: 'Last worked', width: 120 },
] as const;

/** Standard fonts cannot draw characters outside Latin-1. */
export function safeText(value: string): string {
  return [...value.replace(/[\r\n\t]+/g, ' ')]
    .map((character) => (character.charCodeAt(0) > 255 ? '?' : character))
    .join('');
}

function fit(text: string, font: PDFFont, size: number, width: number): string {
  const clean = safeText(text);
  if (font.widthOfTextAtSize(clean, size) <= width) return clean;
  let cut = clean;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > width)
    cut = cut.slice(0, -1);
  return `${cut}...`;
}

export async function buildActivityReport(input: ReportInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.08, 0.08, 0.08);
  const muted = rgb(0.4, 0.4, 0.4);
  const line = rgb(0.82, 0.82, 0.82);

  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;

  const text = (value: string, x: number, size: number, font: PDFFont, color = ink) =>
    page.drawText(safeText(value), { x, y, size, font, color });

  text(input.title, MARGIN, 18, bold);
  y -= 18;
  text(input.periodLabel, MARGIN, 10, regular, muted);
  y -= 13;
  text(input.filtersLabel, MARGIN, 9, regular, muted);
  y -= 13;
  text(`Prepared by ${input.generatedBy} on ${input.generatedAt}`, MARGIN, 9, regular, muted);
  y -= 22;

  const totals = new Map<string, number>();
  for (const row of input.rows)
    totals.set(row.userName, (totals.get(row.userName) ?? 0) + row.minutes);
  const people = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const total = people.reduce((sum, [, minutes]) => sum + minutes, 0);

  text('Summary', MARGIN, 11, bold);
  y -= 15;
  if (people.length === 0) {
    text('No time was recorded for these days and filters.', MARGIN, 10, regular, muted);
    y -= 15;
  }
  for (const [name, minutes] of people) {
    text(fit(name, regular, 10, 200), MARGIN, 10, regular);
    text(formatMinutes(minutes), MARGIN + 210, 10, regular);
    y -= 13;
  }
  if (people.length > 1) {
    text('Total', MARGIN, 10, bold);
    text(formatMinutes(total), MARGIN + 210, 10, bold);
    y -= 13;
  }
  y -= 12;

  const header = () => {
    let x = MARGIN;
    for (const column of COLUMNS) {
      text(column.label, x, 9, bold, muted);
      x += column.width;
    }
    y -= 5;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE.width - MARGIN, y },
      thickness: 0.6,
      color: line,
    });
    y -= 12;
  };

  if (input.rows.length > 0) header();

  for (const row of input.rows) {
    if (y < MARGIN + 20) {
      page = pdf.addPage([PAGE.width, PAGE.height]);
      y = PAGE.height - MARGIN;
      header();
    }
    const cells = [
      row.userName,
      `${row.number} ${row.title}${row.kind === 'ticket' ? ' (ticket)' : ''}`,
      row.stage,
      row.running ? `${formatMinutes(row.minutes)} (working now)` : formatMinutes(row.minutes),
      row.running ? 'Now' : row.lastWorked,
    ];
    let x = MARGIN;
    COLUMNS.forEach((column, index) => {
      text(fit(cells[index], regular, 9, column.width - 8), x, 9, regular);
      x += column.width;
    });
    y -= 14;
  }

  return Buffer.from(await pdf.save());
}
