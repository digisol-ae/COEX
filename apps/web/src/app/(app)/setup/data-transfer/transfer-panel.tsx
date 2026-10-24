'use client';
import { useState, useTransition } from 'react';
import { ENTITIES, columns, type Entity } from '@/modules/data-transfer/spec';
import { MAX_IMPORT_BYTES } from '@/modules/data-transfer/csv';
import type { TransferResult } from '@/modules/data-transfer/service';
import { transferAction } from './actions';
const required: Record<Entity, string> = {
  tasks: 'title, space',
  tickets: 'subject, queue, body',
  customers: 'name',
  leads: 'name',
  products: 'name, code',
  contracts: 'title, customer, startDate, endDate',
};
const control =
  'rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm';
export function TransferPanel() {
  const [entity, setEntity] = useState<Entity>('tasks');
  const [csv, setCsv] = useState(''),
    [fileName, setFileName] = useState('');
  const [result, setResult] = useState<TransferResult>(),
    [error, setError] = useState('');
  const [pending, start] = useTransition();
  function run(commit = false) {
    setError('');
    start(async () => {
      try {
        setResult(await transferAction(entity, csv, commit ? result?.proof : undefined));
      } catch {
        setError('The request failed. Preview the file again before retrying.');
        setResult(undefined);
      }
    });
  }
  return (
    <div className="space-y-5 text-sm">
      <p>
        Move core records using CSV files. Imports create new records and skip matches; they do not
        update existing records. Start with customers and products before importing linked
        contracts, tasks or tickets.
      </p>
      <label className="block font-medium">
        Record type{' '}
        <select
          aria-label="Record type"
          className={`${control} ml-2 capitalize`}
          value={entity}
          disabled={pending}
          onChange={(e) => {
            setEntity(e.target.value as Entity);
            setCsv('');
            setFileName('');
            setResult(undefined);
            setError('');
          }}
        >
          {ENTITIES.map((value) => (
            <option key={value} value={value}>
              {value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <section className="rounded-xl border border-[var(--color-line)] p-4 space-y-3">
        <h2 className="font-semibold">1. Prepare your file</h2>
        <div className="flex flex-wrap gap-3">
          <a className="underline" href={`/api/data-transfer/${entity}?template=1`}>
            Download {entity} template
          </a>
          <a className="underline" href={`/api/data-transfer/${entity}`}>
            Export {entity} CSV
          </a>
        </div>
        <p>
          Required columns: <strong>{required[entity]}</strong>. Use the template headings exactly.
          Maximum 500 records and 2 MB per import.
        </p>
        <details>
          <summary className="cursor-pointer">Columns and matching rules</summary>
          <p className="mt-2 break-words">{columns(entity).join(', ')}</p>
          <p className="mt-2">
            Customer, Space and queue names must match exactly one existing record. Separate
            contract product codes with |. Dates use YYYY-MM-DD; task times need an ISO timezone.
            Amounts use a decimal point without thousands separators.
          </p>
          <p className="mt-2">
            Matches are skipped: tasks by Space and title; tickets by queue and subject; customers
            by name or email; leads by name/company or existing CRM matches; products by code;
            contracts by customer, title and dates.
          </p>
        </details>
        <p className="text-[var(--color-ink-muted)]">
          Exports contain core fields and current status for reference, up to 10,000 records.
          Attachments, conversation history and custom fields are excluded. Columns starting with _
          are read-only and ignored on import. Imported tasks start unassigned in the first Space
          column, tickets start New and contracts start Draft. Lead ownership defaults to you.
          Existing assignment and alert rules still apply.
        </p>
      </section>
      <section className="rounded-xl border border-[var(--color-line)] p-4 space-y-3">
        <h2 className="font-semibold">2. Upload and preview</h2>
        <input
          key={entity}
          aria-label="CSV file"
          type="file"
          accept=".csv,text/csv"
          disabled={pending}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            setResult(undefined);
            setCsv('');
            setFileName(file?.name ?? '');
            setError('');
            if (!file) return;
            if (file.size > MAX_IMPORT_BYTES) {
              setError('Use a CSV file smaller than 2 MB.');
              return;
            }
            try {
              setCsv(await file.text());
            } catch {
              setError('Could not read this file.');
            }
          }}
        />
        {fileName ? <p>{fileName}</p> : null}
        <button type="button" className={control} disabled={!csv || pending} onClick={() => run()}>
          {' '}
          {pending ? 'Processing…' : 'Preview import'}
        </button>
        {error || result?.error ? (
          <p role="alert" className="text-red-700">
            {error || result?.error}
          </p>
        ) : null}
      </section>
      {result?.rows.length ? (
        <section className="rounded-xl border border-[var(--color-line)] p-4 space-y-3">
          <h2 className="font-semibold">3. Review {result.committed ? 'results' : 'and import'}</h2>
          <p role="status">
            {result.rows.filter((r) => r.status === 'ready').length} ready ·{' '}
            {result.rows.filter((r) => r.status === 'duplicate').length} skipped ·{' '}
            {result.rows.filter((r) => r.status === 'invalid' || r.status === 'failed').length}{' '}
            errors · {result.rows.filter((r) => r.status === 'created').length} created
          </p>
          {!result.committed ? (
            <button
              className={control}
              type="button"
              disabled={pending || !result.proof || !result.rows.some((r) => r.status === 'ready')}
              onClick={() => run(true)}
            >
              Import {result.rows.filter((r) => r.status === 'ready').length} records
            </button>
          ) : (
            <p>
              Import finished. Review any errors below. Correct failed records and preview again to
              retry; matching records will be skipped.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="p-2">Record</th>
                  <th className="p-2">Name / subject</th>
                  <th className="p-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.record} className="border-t border-[var(--color-line)]">
                    <td className="p-2">{row.record}</td>
                    <td className="p-2">{row.label}</td>
                    <td className="p-2">
                      {row.status}: {row.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
