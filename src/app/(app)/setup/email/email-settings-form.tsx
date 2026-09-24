'use client';

import { useActionState, useState, useTransition } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import type { EmailSettingsView } from '@/modules/core/services/email.service';
import {
  saveEmailSettingsAction,
  sendTestEmailAction,
  testMailboxAction,
  type EmailFormState,
} from './actions';

const initialState: EmailFormState = {};

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4"
      />
      <span>
        <span className="font-medium text-[var(--color-ink)]">{label}</span>
        {hint ? <span className="block text-xs text-[var(--color-ink-subtle)]">{hint}</span> : null}
      </span>
    </label>
  );
}

function formatDate(value: Date | null): string {
  return value ? new Date(value).toLocaleString() : 'never';
}

export function EmailSettingsForm({
  settings,
  queues,
}: {
  settings: EmailSettingsView;
  queues: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveEmailSettingsAction, initialState);
  const [testResult, setTestResult] = useState<EmailFormState>({});
  const [testing, startTest] = useTransition();

  const runTest = (action: () => Promise<EmailFormState>) =>
    startTest(async () => setTestResult(await action()));

  const { inbound, outbound, customer, staff } = settings;

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardSection title="Support mailbox (incoming)">
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Every new email to this mailbox becomes a ticket, and replies join their ticket. COEX
              is told of new mail the moment it arrives. Mail already in the inbox when intake
              starts is left alone.
            </p>
            <Toggle
              name="inboundEnabled"
              label="Turn email into tickets"
              defaultChecked={inbound.enabled}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="IMAP server">
                <Input
                  name="inboundHost"
                  defaultValue={inbound.host}
                  placeholder="imap.hostinger.com"
                />
              </Field>
              <Field label="Port">
                <Input name="inboundPort" type="number" defaultValue={inbound.port} />
              </Field>
              <Field label="Security">
                <div className="pt-2">
                  <Toggle name="inboundSecure" label="SSL/TLS" defaultChecked={inbound.secure} />
                </div>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mailbox address (username)">
                <Input
                  name="inboundUsername"
                  defaultValue={inbound.username}
                  placeholder="support@digisol.ae"
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Password"
                hint={inbound.hasPassword ? 'Stored. Leave blank to keep it.' : 'Not stored yet.'}
              >
                <Input name="inboundPassword" type="password" autoComplete="new-password" />
              </Field>
            </div>
            <Field label="New email tickets go to">
              <Select name="inboundQueueId" defaultValue={inbound.queueId ?? ''}>
                <option value="">Choose a queue</option>
                {queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-xs text-[var(--color-ink-subtle)]">
              Last checked: {formatDate(inbound.lastCheckedAt)}.
              {inbound.enabled && !inbound.started ? ' Waiting for the email worker to start.' : ''}
            </p>
            {inbound.lastError ? <Notice tone="warn">{inbound.lastError}</Notice> : null}
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={testing}
                onClick={() => runTest(testMailboxAction)}
              >
                Test mailbox connection
              </Button>
            </div>
          </div>
        </CardSection>

        <CardSection title="Sending account (outgoing)">
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Used for customer replies, the automatic acknowledgement and staff alerts. Usually the
              same mailbox as above.
            </p>
            <Toggle
              name="outboundEnabled"
              label="Send email from COEX"
              defaultChecked={outbound.enabled}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="SMTP server">
                <Input
                  name="outboundHost"
                  defaultValue={outbound.host}
                  placeholder="smtp.hostinger.com"
                />
              </Field>
              <Field label="Port">
                <Input name="outboundPort" type="number" defaultValue={outbound.port} />
              </Field>
              <Field label="Security">
                <div className="pt-2">
                  <Toggle
                    name="outboundSecure"
                    label="SSL/TLS (port 465)"
                    defaultChecked={outbound.secure}
                  />
                </div>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username">
                <Input
                  name="outboundUsername"
                  defaultValue={outbound.username}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Password"
                hint={outbound.hasPassword ? 'Stored. Leave blank to keep it.' : 'Not stored yet.'}
              >
                <Input name="outboundPassword" type="password" autoComplete="new-password" />
              </Field>
              <Field label="From name">
                <Input
                  name="fromName"
                  defaultValue={outbound.fromName}
                  placeholder="DigiSol Support"
                />
              </Field>
              <Field label="From address">
                <Input
                  name="fromAddress"
                  defaultValue={outbound.fromAddress}
                  placeholder="support@digisol.ae"
                />
              </Field>
            </div>
            <p className="text-xs text-[var(--color-ink-subtle)]">
              Waiting to send: {settings.pendingCount}. Failed after retries: {settings.failedCount}
              .
            </p>
            {outbound.lastError ? <Notice tone="warn">{outbound.lastError}</Notice> : null}
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={testing}
                onClick={() => runTest(sendTestEmailAction)}
              >
                Send me a test email
              </Button>
            </div>
          </div>
        </CardSection>

        <CardSection title="Customer emails">
          <div className="space-y-4">
            <Toggle
              name="emailPublicReplies"
              label="Email public replies to the customer"
              hint="Internal notes are never emailed. Each email carries the ticket number so the answer threads back."
              defaultChecked={customer.emailPublicReplies}
            />
            <Toggle
              name="autoReplyEnabled"
              label="Send an automatic acknowledgement for new email tickets"
              hint="Never sent to automatic mail (out of office, bounces, lists), and at most once an hour per sender."
              defaultChecked={customer.autoReplyEnabled}
            />
            <Field
              label="Acknowledgement message"
              hint="Placeholders: {customer}, {ticket}, {subject}"
            >
              <textarea
                name="autoReplyBody"
                defaultValue={customer.autoReplyBody}
                rows={6}
                className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]"
              />
            </Field>
          </div>
        </CardSection>

        <CardSection title="Staff alerts">
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Sent to each person&apos;s COEX login email. Nobody is alerted about their own action.
            </p>
            <Toggle
              name="ticketAssigned"
              label="A ticket is assigned to me"
              defaultChecked={staff.ticketAssigned}
            />
            <Toggle
              name="customerReplied"
              label="A customer replies on my ticket"
              defaultChecked={staff.customerReplied}
            />
            <Toggle
              name="taskAssigned"
              label="A task is assigned to me"
              defaultChecked={staff.taskAssigned}
            />
          </div>
        </CardSection>
      </Card>

      {testResult.error ? <Notice tone="warn">{testResult.error}</Notice> : null}
      {testResult.message ? <Notice>{testResult.message}</Notice> : null}
      {state.error ? <Notice tone="warn">{state.error}</Notice> : null}
      {state.saved ? (
        <Notice>Saved. The email worker picks up changes within a minute.</Notice>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save email settings'}
        </Button>
      </div>
    </form>
  );
}
