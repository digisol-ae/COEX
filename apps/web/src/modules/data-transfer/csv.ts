/** RFC 4180-style CSV, including BOM, escaped quotes and multiline cells. */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 500;
export function parseCsv(source: string): Record<string, string>[] {
  if (new TextEncoder().encode(source).length > MAX_IMPORT_BYTES)
    throw new Error('Use a CSV file smaller than 2 MB.');
  const text = source.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  const field = () => {
    row.push(cell);
    cell = '';
    closed = false;
  };
  const line = () => {
    field();
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
    if (rows.length > MAX_IMPORT_ROWS + 1) throw new Error('Import at most 500 records at a time.');
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"') {
      if (cell || closed)
        throw new Error('Unexpected quote in CSV. Put quotes around the entire cell.');
      quoted = true;
    } else if (c === ',') field();
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      line();
    } else {
      if (closed) throw new Error('Unexpected text after a quoted CSV cell.');
      cell += c;
    }
  }
  if (quoted) throw new Error('A quoted CSV cell is not closed.');
  if (cell || row.length || closed) line();
  const headers = rows.shift()?.map((h) => h.trim());
  if (!headers?.length || headers.some((h) => !h) || new Set(headers).size !== headers.length)
    throw new Error('CSV needs unique, non-empty column headings.');
  if (!rows.length) throw new Error('Add at least one record below the CSV headings.');
  return rows.map((cells, index) => {
    if (cells.length !== headers.length)
      throw new Error(`Record ${index + 1} has ${cells.length} cells; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i].trim()]));
  });
}
export function toCsv(headers: readonly string[], rows: Record<string, unknown>[]): string {
  const cell = (value: unknown) => {
    let text = value == null ? '' : String(value);
    // Prevent spreadsheet formula execution, including formulas hidden behind whitespace.
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return (
    '\uFEFF' +
    [
      headers.map(cell).join(','),
      ...rows.map((row) => headers.map((h) => cell(row[h])).join(',')),
    ].join('\r\n') +
    '\r\n'
  );
}
