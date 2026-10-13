'use client';

import { useActionState, useState, useTransition } from 'react';
import { Badge, Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import type { ChannelSettingsView } from '@/modules/channels/services/channel-settings.service';
import type { ChannelMessageRow } from '@/modules/channels/services/channel-messages.service';
import {
  queueTestMessageAction,
  rotateSecretAction,
  saveChannelSettingsAction,
  simulateInboundAction,
  type ChannelFormState,
} from './actions';

const initialState: ChannelFormState = {};

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 h-4 w-4"
      />
      <span>
        <span className="font-medium text-[var(--color-ink)]">{label}</span>
        {hint ? <span className="block text-xs text-[var(--color-ink-subtle)]">{hint}</span> : null}
      </span>
    </label>
  );
}

const STATUS_TONE: Record<string, 'neutral' | 'ok' | 'warn' | 'alert' | 'info'> = {
  received: 'info',
  pending: 'warn',
  sending: 'warn',
  sent: 'ok',
  delivered: 'ok',
  read: 'ok',
  failed: 'alert',
};

function Endpoint({ label, method, url }: { label: string; method: string; url: string }) {
  return (
    <div className="text-sm">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <code className="mt-0.5 block break-all rounded bg-[var(--color-surface-sunken)] px-2 py-1 text-xs">
        {method} {url}
      </code>
    </div>
  );
}

export function WhatsAppSettingsForm({
  settings,
  queues,
  messages,
  endpointBase,
}: {
  settings: ChannelSettingsView;
  queues: { id: string; name: string }[];
  messages: ChannelMessageRow[];
  endpointBase: string;
}) {
  const [state, formAction, pending] = useActionState(saveChannelSettingsAction, initialState);
  const [provider, setProvider] = useState(settings.provider);
  const [delivery, setDelivery] = useState(settings.delivery);
  const [secretResult, setSecretResult] = useState<ChannelFormState>({});
  const [testResult, setTestResult] = useState<ChannelFormState>({});
  const [testAccount, setTestAccount] = useState<'support' | 'crm'>('support');
  const [testNumber, setTestNumber] = useState('+971500000000');
  const [testText, setTestText] = useState('Hello, I need help with my order.');
  const [working, start] = useTransition();

  return (
    <div className="space-y-4">
      <form action={formAction}>
        <Card>
          <CardSection title="Connection">
            <div className="space-y-4">
              <Toggle
                name="enabled"
                label="WhatsApp is on"
                hint="Turn on once the numbers and signing secret are ready."
                defaultChecked={settings.enabled}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Provider"
                  hint="Test mode sends nothing outside COEX, for trying the flow."
                >
                  <Select
                    name="provider"
                    value={provider}
                    onChange={(event) => setProvider(event.target.value as 'mock' | 'xverse')}
                  >
                    <option value="mock">Test mode</option>
                    <option value="xverse">XVERSE</option>
                  </Select>
                </Field>
                <Field
                  label="How messages go out"
                  hint="Decided once XVERSE confirms its API (spec section 7)."
                >
                  <Select
                    name="delivery"
                    value={delivery}
                    onChange={(event) => setDelivery(event.target.value as 'push' | 'pull')}
                  >
                    <option value="push">COEX sends through the XVERSE API</option>
                    <option value="pull">XVERSE collects from COEX</option>
                  </Select>
                </Field>
              </div>
              {provider === 'xverse' && delivery === 'push' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="XVERSE API address">
                    <Input
                      name="xverseBaseUrl"
                      placeholder="https://"
                      defaultValue={settings.xverseBaseUrl}
                    />
                  </Field>
                  <Field
                    label="XVERSE API key"
                    hint={settings.hasApiKey ? 'Saved. Leave blank to keep it.' : 'Not set.'}
                  >
                    <Input name="xverseApiKey" type="password" autoComplete="new-password" />
                  </Field>
                </div>
              ) : (
                <>
                  <input type="hidden" name="xverseBaseUrl" value={settings.xverseBaseUrl} />
                  <input type="hidden" name="xverseApiKey" value="" />
                </>
              )}
              {settings.lastError ? <Notice tone="alert">{settings.lastError}</Notice> : null}
            </div>
          </CardSection>

          <CardSection title="Numbers">
            <div className="space-y-5">
              <div className="space-y-3">
                <Toggle
                  name="supportEnabled"
                  label="Support number"
                  hint="Messages open or continue a ticket. Unknown senders get a ticket too."
                  defaultChecked={settings.support.enabled}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Number (international)">
                    <Input
                      name="supportNumber"
                      placeholder="+9714XXXXXXX"
                      defaultValue={settings.support.number}
                    />
                  </Field>
                  <Field label="New WhatsApp tickets go to">
                    <Select name="supportQueueId" defaultValue={settings.support.queueId ?? ''}>
                      <option value="">Choose a queue</option>
                      {queues.map((queue) => (
                        <option key={queue.id} value={queue.id}>
                          {queue.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
              <div className="space-y-3">
                <Toggle
                  name="crmEnabled"
                  label="CRM number"
                  hint="Messages are kept on the contact's timeline as conversations."
                  defaultChecked={settings.crm.enabled}
                />
                <Field label="Number (international)">
                  <Input
                    name="crmNumber"
                    placeholder="+9715XXXXXXXX"
                    defaultValue={settings.crm.number}
                  />
                </Field>
              </div>
            </div>
          </CardSection>

          <CardSection title="Customer notifications (Support number)">
            <div className="space-y-3">
              <Toggle
                name="notifyTicketReceived"
                label="Ticket received"
                hint="Always sent, with the ticket number."
                defaultChecked
                disabled
              />
              <Toggle
                name="notifyAssigned"
                label="Ticket assigned to an agent"
                defaultChecked={settings.notifications.assigned}
              />
              <Toggle
                name="notifyAwaitingReply"
                label="Awaiting the customer's reply"
                defaultChecked={settings.notifications.awaitingReply}
              />
              <Toggle
                name="notifyResolved"
                label="Ticket resolved"
                defaultChecked={settings.notifications.resolved}
              />
              <Toggle
                name="notifyClosed"
                label="Ticket closed, with satisfaction link"
                defaultChecked={settings.notifications.closed}
              />
              <p className="text-xs text-[var(--color-ink-subtle)]">
                Sending starts with milestone M6.4. Settings chosen now are kept.
              </p>
            </div>
          </CardSection>

          <CardSection>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>
                Save
              </Button>
              {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
              {state.saved ? <Notice tone="ok">Saved.</Notice> : null}
            </div>
          </CardSection>
        </Card>
      </form>

      <Card>
        <CardSection title="For the XVERSE team">
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Every call is signed with the secret below: header X-COEX-Timestamp (unix seconds) and
              X-COEX-Signature, sha256= HMAC of “timestamp.body”. Details in
              docs/M6-CHANNELS-SPEC.md.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={settings.hasSigningSecret ? 'ok' : 'warn'}>
                {settings.hasSigningSecret ? 'Signing secret set' : 'No signing secret yet'}
              </Badge>
              <Button
                type="button"
                variant="secondary"
                disabled={working}
                onClick={() => {
                  if (
                    settings.hasSigningSecret &&
                    !window.confirm('A new secret stops the current one working at once. Continue?')
                  )
                    return;
                  start(async () => setSecretResult(await rotateSecretAction()));
                }}
              >
                {settings.hasSigningSecret ? 'Replace signing secret' : 'Generate signing secret'}
              </Button>
            </div>
            {secretResult.secret ? (
              <Notice tone="warn">
                Copy this now; it will not be shown again:{' '}
                <code className="break-all font-mono">{secretResult.secret}</code>
              </Notice>
            ) : null}
            {secretResult.error ? <Notice tone="alert">{secretResult.error}</Notice> : null}
            <Endpoint label="Incoming messages" method="POST" url={`${endpointBase}/inbound`} />
            <Endpoint label="Delivery receipts" method="POST" url={`${endpointBase}/status`} />
            {delivery === 'pull' ? (
              <>
                <Endpoint
                  label="Collect messages to send"
                  method="GET"
                  url={`${endpointBase}/outbox`}
                />
                <Endpoint
                  label="Acknowledge them"
                  method="POST"
                  url={`${endpointBase}/outbox/ack`}
                />
              </>
            ) : null}
          </div>
        </CardSection>
      </Card>

      <Card>
        <CardSection title="Recent messages">
          {settings.provider === 'mock' && settings.enabled ? (
            <div className="mb-4 space-y-3 rounded-[var(--radius-control)] bg-[var(--color-surface-muted)] p-3">
              <p className="text-sm font-medium">Try it in test mode</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Select
                  value={testAccount}
                  onChange={(event) => setTestAccount(event.target.value as 'support' | 'crm')}
                  aria-label="Number"
                >
                  <option value="support">Support number</option>
                  <option value="crm">CRM number</option>
                </Select>
                <Input
                  value={testNumber}
                  onChange={(event) => setTestNumber(event.target.value)}
                  aria-label="Customer number"
                />
                <Input
                  value={testText}
                  onChange={(event) => setTestText(event.target.value)}
                  aria-label="Message"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={working}
                  onClick={() =>
                    start(async () =>
                      setTestResult(await simulateInboundAction(testAccount, testNumber, testText)),
                    )
                  }
                >
                  Receive from customer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={working}
                  onClick={() =>
                    start(async () =>
                      setTestResult(
                        await queueTestMessageAction(testAccount, testNumber, testText),
                      ),
                    )
                  }
                >
                  Send to customer
                </Button>
              </div>
              {testResult.error ? <Notice tone="alert">{testResult.error}</Notice> : null}
              {testResult.message ? <Notice tone="ok">{testResult.message}</Notice> : null}
            </div>
          ) : null}
          <p className="mb-2 text-xs text-[var(--color-ink-subtle)]">
            Waiting to send: {settings.pendingCount} · Failed: {settings.failedCount} · Last
            received:{' '}
            {settings.lastInboundAt ? new Date(settings.lastInboundAt).toLocaleString() : 'never'}
          </p>
          {messages.length ? (
            <ul className="divide-y divide-[var(--color-line)] text-sm">
              {messages.map((message) => (
                <li key={message.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="text-[var(--color-ink-subtle)]">
                        {message.direction === 'in' ? 'From' : 'To'}{' '}
                        {message.direction === 'in' ? message.from : message.to} ·{' '}
                        {message.account === 'crm' ? 'CRM' : 'Support'}
                      </span>
                    </p>
                    <p className="truncate" title={message.text ?? undefined}>
                      {message.text ?? `(${message.type})`}
                    </p>
                    {message.error ? (
                      <p className="text-xs text-[var(--color-status-alert)]">{message.error}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone={STATUS_TONE[message.status] ?? 'neutral'}>{message.status}</Badge>
                    <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                      {new Date(message.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-ink-subtle)]">No WhatsApp messages yet.</p>
          )}
        </CardSection>
      </Card>
    </div>
  );
}
