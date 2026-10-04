'use client';

import { useActionState, useState, useTransition } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import type { EmailSettingsView, SenderView } from '@/modules/core/services/email.service';
import { EmailPreview, SAMPLE } from '@/components/ui/email-preview';
import {
  customerEmailText,
  fillAcknowledgement,
  renderSignature,
} from '@/modules/tickets/email-text';
import {
  CONTRACT_EMAIL_PLACEHOLDERS,
  SAMPLE_CONTRACT_EMAIL_VALUES,
  fillContractTemplate,
} from '@/modules/crm/contract-email';
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
  queues: { id: string; name: string; signature: string | null; autoSign: boolean }[];
}) {
  const [state, formAction, pending] = useActionState(saveEmailSettingsAction, initialState);
  const [testResult, setTestResult] = useState<EmailFormState>({});
  const [testing, startTest] = useTransition();

  const runTest = (action: () => Promise<EmailFormState>) =>
    startTest(async () => setTestResult(await action()));

  const { inbound, outbound, customer, staff } = settings;
  const [intakeQueueId, setIntakeQueueId] = useState(inbound.queueId ?? '');
  const [ackBody, setAckBody] = useState(customer.autoReplyBody);
  const [previewing, setPreviewing] = useState(false);

  // Exactly as the worker builds it: filled, then signed by the intake queue with no agent.
  const intakeQueue = queues.find((queue) => queue.id === intakeQueueId);
  const ackText = customerEmailText({
    body: fillAcknowledgement(ackBody, {
      customer: SAMPLE.customer,
      ticket: SAMPLE.ticket,
      subject: SAMPLE.subject,
    }),
    signature:
      intakeQueue && intakeQueue.autoSign
        ? renderSignature(intakeQueue.signature, { queueName: intakeQueue.name })
        : '',
    ticketNumber: SAMPLE.ticket,
    footer: false,
  });
  const fromLabel = outbound.fromAddress
    ? outbound.fromName
      ? `"${outbound.fromName}" <${outbound.fromAddress}>`
      : outbound.fromAddress
    : 'The standard sender (not set up yet)';

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
              <Select
                name="inboundQueueId"
                value={intakeQueueId}
                onChange={(event) => setIntakeQueueId(event.target.value)}
              >
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

        <CardSection title="Standard sender (outgoing)">
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Customer replies and the automatic acknowledgement come from here, usually the same
              mailbox as above. Staff alerts and account emails come from here too until their own
              senders below are set up.
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
                onClick={() => runTest(() => sendTestEmailAction('standard'))}
              >
                Send me a test email
              </Button>
            </div>
          </div>
        </CardSection>

        <CardSection title="Alert, Admin and Contracts senders">
          <div className="space-y-6">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Separate addresses so people can tell mail apart at a glance. Leave an address blank
              to send that mail from the standard sender. With Microsoft 365, the standard mailbox
              needs &ldquo;Send As&rdquo; permission for these addresses, or give each its own
              sign-in below.
            </p>
            <SenderFields
              prefix="alert"
              title="Alert"
              uses="New tickets, assignments, customer replies, task assignments and @mentions."
              placeholder="alerts@digisolteam.com"
              sender={settings.senders.alert}
              testing={testing}
              onTest={() => runTest(() => sendTestEmailAction('alert'))}
            />
            <SenderFields
              prefix="admin"
              title="Admin"
              uses="Password links, and telling someone an administrator reset their password."
              placeholder="admin@digisolteam.com"
              sender={settings.senders.admin}
              testing={testing}
              onTest={() => runTest(() => sendTestEmailAction('admin'))}
            />
            <SenderFields
              prefix="contracts"
              title="Contracts"
              uses="Emails staff send to a customer about a contract, such as a renewal reminder."
              placeholder="contracts@digisolteam.com"
              sender={settings.senders.contracts}
              testing={testing}
              onTest={() => runTest(() => sendTestEmailAction('contracts'))}
            />
          </div>
        </CardSection>

        <CardSection title="Contract email templates">
          <ContractTemplates templates={settings.contractTemplates} />
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
                value={ackBody}
                onChange={(event) => setAckBody(event.target.value)}
                rows={6}
                className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]"
              />
            </Field>
            <div>
              <Button type="button" variant="secondary" onClick={() => setPreviewing(true)}>
                Preview the acknowledgement
              </Button>
            </div>
            {previewing ? (
              <EmailPreview
                from={fromLabel}
                to={`${SAMPLE.customer} <${SAMPLE.email}>`}
                subject={`Re: [${SAMPLE.ticket}] ${SAMPLE.subject}`}
                text={ackText}
                note={`${SAMPLE.note} Signed with the intake queue's signature${intakeQueue ? ` (${intakeQueue.name})` : ''}, without agent lines.`}
                onClose={() => setPreviewing(false)}
              />
            ) : null}
          </div>
        </CardSection>

        <CardSection title="Staff alerts">
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Sent from the Alert sender to each person&apos;s COEX login email. Nobody is alerted
              about their own action.
            </p>
            <Field
              label="When a new ticket arrives, tell"
              hint="Whoever it is assigned to hears anyway, in their own assignment email."
            >
              <Select name="ticketCreated" defaultValue={staff.ticketCreated}>
                <option value="admins">Administrators only</option>
                <option value="desk">Everyone who works the whole desk</option>
                <option value="off">Nobody</option>
              </Select>
            </Field>
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
            <Toggle
              name="mentioned"
              label="Someone mentions me with @ in a note"
              defaultChecked={staff.mentioned}
            />
            <Toggle
              name="contractRenewal"
              label="A contract I own is nearing its end date"
              defaultChecked={staff.contractRenewal}
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

const TEMPLATE_TITLES = {
  renewal: ['Renewal reminder', 'Offered when a contract is expiring.'],
  expired: ['Contract ended', 'Offered when a contract has passed its end date.'],
  general: ['General message', 'Offered for any other contract. Edited before sending.'],
} as const;

/** The three emails staff pick from on the Contracts page, each with a live preview. */
function ContractTemplates({ templates }: { templates: EmailSettingsView['contractTemplates'] }) {
  const [values, setValues] = useState(templates);

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-ink-muted)]">
        What staff send from a contract&apos;s email button, one email per contact, from the
        Contracts sender. They can still change the words before sending. Placeholders:{' '}
        {CONTRACT_EMAIL_PLACEHOLDERS.map(([token]) => token).join(' ')}
      </p>

      {(Object.keys(TEMPLATE_TITLES) as (keyof typeof TEMPLATE_TITLES)[]).map((key) => (
        <fieldset
          key={key}
          className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-line)] p-4"
        >
          <legend className="px-1 text-sm font-semibold text-[var(--color-ink)]">
            {TEMPLATE_TITLES[key][0]}
          </legend>
          <p className="text-xs text-[var(--color-ink-subtle)]">{TEMPLATE_TITLES[key][1]}</p>
          <Field label="Subject">
            <Input
              name={`template_${key}_subject`}
              value={values[key].subject}
              onChange={(event) =>
                setValues({ ...values, [key]: { ...values[key], subject: event.target.value } })
              }
            />
          </Field>
          <Field label="Message">
            <textarea
              name={`template_${key}_body`}
              rows={7}
              value={values[key].body}
              onChange={(event) =>
                setValues({ ...values, [key]: { ...values[key], body: event.target.value } })
              }
              className="w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            />
          </Field>
          <div className="rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] p-3 text-sm">
            <p className="text-xs text-[var(--color-ink-subtle)]">Preview with sample values</p>
            <p className="mt-1 font-medium text-[var(--color-ink)]">
              {fillContractTemplate(values[key].subject, SAMPLE_CONTRACT_EMAIL_VALUES)}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[var(--color-ink-muted)]">
              {fillContractTemplate(values[key].body, SAMPLE_CONTRACT_EMAIL_VALUES)}
            </p>
          </div>
        </fieldset>
      ))}
    </div>
  );
}

/**
 * One extra sender. Its own sign-in is optional: most set-ups send every address through the
 * standard mailbox, so those fields stay hidden until asked for.
 */
function SenderFields({
  prefix,
  title,
  uses,
  placeholder,
  sender,
  testing,
  onTest,
}: {
  prefix: 'alert' | 'admin' | 'contracts';
  title: string;
  uses: string;
  placeholder: string;
  sender: SenderView;
  testing: boolean;
  onTest: () => void;
}) {
  const [ownAccount, setOwnAccount] = useState(sender.ownAccount);

  return (
    <fieldset className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-line)] p-4">
      <legend className="px-1 text-sm font-semibold text-[var(--color-ink)]">{title} sender</legend>
      <p className="text-xs text-[var(--color-ink-subtle)]">{uses}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From name">
          <Input
            name={`${prefix}FromName`}
            defaultValue={sender.fromName}
            placeholder={`DigiSol ${title}`}
          />
        </Field>
        <Field label="From address" hint="Blank sends from the standard sender.">
          <Input
            name={`${prefix}FromAddress`}
            defaultValue={sender.fromAddress}
            placeholder={placeholder}
          />
        </Field>
      </div>
      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          name={`${prefix}OwnAccount`}
          checked={ownAccount}
          onChange={(event) => setOwnAccount(event.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="font-medium text-[var(--color-ink)]">Sign in with its own account</span>
          <span className="block text-xs text-[var(--color-ink-subtle)]">
            Off: sent through the standard mailbox&apos;s connection with this From address.
          </span>
        </span>
      </label>
      {ownAccount ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="SMTP server">
            <Input
              name={`${prefix}Host`}
              defaultValue={sender.host}
              placeholder="smtp.office365.com"
            />
          </Field>
          <Field label="Port">
            <Input name={`${prefix}Port`} type="number" defaultValue={sender.port} />
          </Field>
          <Field label="Security">
            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`${prefix}Secure`}
                  defaultChecked={sender.secure}
                  className="h-4 w-4"
                />
                SSL/TLS (port 465)
              </label>
            </div>
          </Field>
          <Field label="Username">
            <Input name={`${prefix}Username`} defaultValue={sender.username} autoComplete="off" />
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="Password"
              hint={sender.hasPassword ? 'Stored. Leave blank to keep it.' : 'Not stored yet.'}
            >
              <Input name={`${prefix}Password`} type="password" autoComplete="new-password" />
            </Field>
          </div>
        </div>
      ) : (
        <>
          <input type="hidden" name={`${prefix}Host`} value={sender.host} />
          <input type="hidden" name={`${prefix}Port`} value={sender.port} />
          {sender.secure ? <input type="hidden" name={`${prefix}Secure`} value="on" /> : null}
          <input type="hidden" name={`${prefix}Username`} value={sender.username} />
        </>
      )}
      {sender.lastError ? <Notice tone="warn">{sender.lastError}</Notice> : null}
      <div>
        <Button type="button" variant="secondary" disabled={testing} onClick={onTest}>
          Send me a test from {title}
        </Button>
      </div>
    </fieldset>
  );
}
