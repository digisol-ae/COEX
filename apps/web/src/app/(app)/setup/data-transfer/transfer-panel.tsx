'use client';
import { useState, useTransition } from 'react';
import { ENTITIES, columns, type Entity } from '@/modules/data-transfer/spec';
import { instructions } from '@/modules/data-transfer/templates';
import { MAX_IMPORT_BYTES, toCsv } from '@/modules/data-transfer/csv';
import type { TransferResult, TransferDecisions } from '@/modules/data-transfer/service';
import { transferAction } from './actions';
const required: Record<Entity, string> = {
  tasks: 'title, space',
  tickets: 'subject, queue, body',
  customers: 'name',
  contacts: 'name and either customer or customerId',
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
  const [decisions, setDecisions] = useState<TransferDecisions>({});
  const [pending, start] = useTransition();
  function run(commit = false) {
    setError('');
    start(async () => {
      try {
        setResult(await transferAction(entity, csv, commit ? result?.proof : undefined, decisions));
      } catch {
        setError('The request failed. Preview the file again before retrying.');
        setResult(undefined);
      }
    });
  }
  return (
    <div className="space-y-5 text-sm">
      <p>
        Import core records using CSV files. Review every match before importing. Customers and
        contacts can be updated or created separately after review. Import customers before
        contacts, and customers and products before linked contracts, tasks or tickets.
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
            setDecisions({});
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
        <p className="font-medium">
          The template contains two example rows. Delete both example rows, keep the headings, and
          enter your own records. Rows with an _example marker are blocked from import.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          {instructions[entity].map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer">Columns and matching rules</summary>
          <p className="mt-2 break-words">{columns(entity).join(', ')}</p>
          <p className="mt-2">
            Customer, Space and queue names must match exactly one existing record. Separate
            contract product codes with |. Dates use YYYY-MM-DD; task times need an ISO timezone.
            Amounts use a decimal point without thousands separators.
          </p>
          <p className="mt-2">
            Matches require an explicit decision. Choose skip, or for customers and contacts choose
            create separately or update a specific existing match. Update replaces only non-empty
            CSV fields; blank fields preserve existing values. A shared email is a possible match,
            not proof that two businesses are the same. Other record types support skip; correct
            their matching fields to create a different record. File-only matches can be skipped or
            created separately; combine rows to update the same existing record. Preview again after
            every decision change.
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
            setDecisions({});
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
            {result.rows.filter((r) => r.status === 'duplicate').length} matches ·{' '}
            {result.rows.filter((r) => r.status === 'skipped').length} skipped ·{' '}
            {result.rows.filter((r) => r.status === 'invalid' || r.status === 'failed').length}{' '}
            errors · {result.rows.filter((r) => r.status === 'created').length} created ·{' '}
            {result.rows.filter((r) => r.status === 'updated').length} updated
          </p>
          {result.proof && !result.committed ? (
            <p className="font-medium">
              Confirmed plan: {result.rows.filter((r) => r.decision?.action === 'update').length}{' '}
              updates, {result.rows.filter((r) => r.decision?.action === 'skip').length} skips,{' '}
              {result.rows.filter((r) => !r.decision || r.decision.action === 'create').length} new
              records.
            </p>
          ) : null}
          <button
            type="button"
            className={control}
            onClick={() => {
              const report = toCsv(
                ['record', 'label', 'status', 'message', 'decision', 'updateTarget', 'matches'],
                result.rows.map((r) => ({
                  record: r.record,
                  label: r.label,
                  status: r.status,
                  message: r.message,
                  decision: r.decision?.action,
                  updateTarget: r.decision?.targetId,
                  matches: r.matches
                    ?.map(
                      (m) =>
                        `${m.record ? `CSV record ${m.record}` : m.id}: ${m.label} (${m.reason})`,
                    )
                    .join(' | '),
                })),
              );
              const url = URL.createObjectURL(
                new Blob([report], { type: 'text/csv;charset=utf-8' }),
              );
              const link = document.createElement('a');
              link.href = url;
              link.download = `worktello-${entity}-import-report.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download review report
          </button>
          {!result.committed ? (
            <button
              className={control}
              type="button"
              disabled={
                pending ||
                !result.proof ||
                !result.rows.some((r) => r.status === 'ready' || r.status === 'duplicate')
              }
              onClick={() => run(true)}
            >
              Confirm import decisions
            </button>
          ) : (
            <p>
              Import finished. Review the results below. To retry errors, upload only the failed
              rows and preview again. Matching records always require your decision.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="p-2">Record</th>
                  <th className="p-2">Name / subject</th>
                  <th className="p-2">Result / matching records</th>
                  {!result.committed ? <th className="p-2">Your decision</th> : null}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.record} className="border-t border-[var(--color-line)]">
                    <td className="p-2">{row.record}</td>
                    <td className="p-2">{row.label}</td>
                    <td className="p-2">
                      <p>
                        {row.status}: {row.message}
                      </p>
                      {row.matches?.map((m) => (
                        <div
                          key={m.id}
                          className="mt-2 rounded border border-[var(--color-line)] p-2"
                        >
                          <p className="font-medium">
                            {m.record ? `CSV record ${m.record}` : 'Existing record'}: {m.label}
                          </p>
                          <p>
                            {m.reason}
                            {!m.record ? ` · ID: ${m.id}` : ''}
                          </p>
                          {m.values ? (
                            <details>
                              <summary className="cursor-pointer">Existing values</summary>
                              <dl>
                                {Object.entries(m.values)
                                  .filter(([, v]) => v)
                                  .map(([k, v]) => (
                                    <div key={k}>
                                      <dt className="inline font-medium">{k}: </dt>
                                      <dd className="inline break-words">{v}</dd>
                                    </div>
                                  ))}
                              </dl>
                            </details>
                          ) : null}
                        </div>
                      ))}
                      {row.incoming ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer">Incoming CSV values</summary>
                          <dl>
                            {Object.entries(row.incoming).map(([k, v]) => (
                              <div key={k}>
                                <dt className="inline font-medium">{k}: </dt>
                                <dd className="inline break-words">{v}</dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      ) : null}
                    </td>
                    {!result.committed ? (
                      <td className="p-2 align-top">
                        {row.matches?.length ? (
                          <select
                            aria-label={`Decision for record ${row.record}`}
                            className={control}
                            disabled={pending}
                            value={
                              decisions[String(row.record)]
                                ? decisions[String(row.record)].action === 'update'
                                  ? `update:${decisions[String(row.record)].targetId}`
                                  : decisions[String(row.record)].action
                                : ''
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              setDecisions((previous) => {
                                const next = { ...previous };
                                if (!value) delete next[String(row.record)];
                                else
                                  next[String(row.record)] = value.startsWith('update:')
                                    ? { action: 'update', targetId: value.slice(7) }
                                    : { action: value as 'skip' | 'create' };
                                return next;
                              });
                              setResult((previous) =>
                                previous ? { ...previous, proof: undefined } : previous,
                              );
                              setError(
                                'Decisions changed. Click Preview import again to review them.',
                              );
                            }}
                          >
                            <option value="">Choose an action…</option>
                            <option value="skip">Skip this row</option>
                            {entity === 'customers' || entity === 'contacts' ? (
                              <>
                                <option value="create">Create a separate record</option>
                                {row.matches
                                  .filter((m) => !m.record)
                                  .map((m) => (
                                    <option key={m.id} value={`update:${m.id}`}>
                                      Update {m.label} ({m.id})
                                    </option>
                                  ))}
                              </>
                            ) : null}
                          </select>
                        ) : (
                          <span>New record</span>
                        )}
                      </td>
                    ) : null}
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
