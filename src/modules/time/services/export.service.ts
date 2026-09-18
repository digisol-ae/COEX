import { loadTimesheet, loadTotals } from './timesheet.service';
import { formatMinutes } from '../week';
import { toDateKey } from '../week';

/**
 * Exports.
 *
 * CSV is written by hand rather than with a library, because the whole job is quoting: a task
 * title containing a comma or a quotation mark must not shift every later column. Excel receives
 * a UTF-8 byte order mark, without which Arabic and accented names arrive as mojibake.
 */

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';

  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function toCsv(rows: (string | number | null)[][]): string {
  const body = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  return `﻿${body}\r\n`;
}

export async function timesheetCsv(week: Date, userId?: string): Promise<string> {
  const timesheet = await loadTimesheet(week, userId);

  const rows: (string | number | null)[][] = [
    ['Date', 'Person', 'Task', 'Title', 'Space', 'Customer', 'Hours', 'Billable', 'Note'],
    ...timesheet.entries.map((entry) => [
      toDateKey(entry.workDate),
      timesheet.userName,
      entry.taskNumber,
      entry.taskTitle,
      entry.spaceName,
      entry.organisationName,
      (entry.minutes / 60).toFixed(2),
      entry.billable ? 'Yes' : 'No',
      entry.note,
    ]),
    [],
    ['Total', '', '', '', '', '', (timesheet.totalMinutes / 60).toFixed(2), '', ''],
    ['Billable', '', '', '', '', '', (timesheet.billableMinutes / 60).toFixed(2), '', ''],
  ];

  return toCsv(rows);
}

export async function totalsCsv(from: Date, to: Date): Promise<string> {
  const totals = await loadTotals(from, to);

  const section = (
    title: string,
    rows: { label: string; minutes: number; billableMinutes: number }[],
  ): (string | number | null)[][] => [
    [title, 'Hours', 'Billable hours'],
    ...rows.map((row) => [
      row.label,
      (row.minutes / 60).toFixed(2),
      (row.billableMinutes / 60).toFixed(2),
    ]),
    [],
  ];

  return toCsv([
    ['Period', toDateKey(from), toDateKey(to)],
    [],
    ...section('Person', totals.byPerson),
    ...section('Space', totals.bySpace),
    ...section('Customer', totals.byCustomer),
    ['Total hours', (totals.totalMinutes / 60).toFixed(2)],
    ['Billable hours', (totals.billableMinutes / 60).toFixed(2)],
  ]);
}

/** A readable file name, since people keep these in folders for years. */
export function exportFileName(prefix: string, date: Date): string {
  return `${prefix}-${toDateKey(date)}.csv`;
}

export { formatMinutes };
