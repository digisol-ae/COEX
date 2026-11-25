'use client';
import { useActionState, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Badge } from '@/components/ui';
import { registrationSettingsAction, reviewApplicationAction } from './actions';
import type { listTrialApplications } from '@/modules/core/services/trial-registration.service';

export function RegistrationControls({
  enabled,
  senderReady,
  publicConfigurationReady,
}: {
  enabled: boolean;
  senderReady: boolean;
  publicConfigurationReady: boolean;
}) {
  const [state, action, pending] = useActionState(registrationSettingsAction, {});
  const [dirty, setDirty] = useState(false);
  return (
    <Card>
      <CardSection title="Public trial registration">
        <form
          action={action}
          onChange={() => setDirty(true)}
          onSubmit={() => setDirty(false)}
          className="space-y-3"
        >
          <p className="text-sm">
            Every application requires email verification and your approval. Automatic registration
            will be enabled in a later rollout.
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Registration messages use this platform workspace’s Admin sender, with its standard
            sender as fallback. Configure it in Setup → Email.
          </p>
          {(!senderReady || !publicConfigurationReady) && (
            <Notice tone="warn">
              Before opening applications, configure outgoing email, the public app URL and the
              authentication secret.
            </Notice>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input name="enabled" type="checkbox" defaultChecked={enabled} />
            Accept public trial applications
          </label>
          {state.error && <Notice tone="alert">{state.error}</Notice>}
          {state.saved && !dirty && <Notice tone="ok">Registration settings saved.</Notice>}
          <Button type="submit" disabled={pending}>
            Save registration settings
          </Button>
        </form>
      </CardSection>
    </Card>
  );
}

type Application = Awaited<ReturnType<typeof listTrialApplications>>[number];
function ApplicationReview({ application }: { application: Application }) {
  const [state, action, pending] = useActionState(reviewApplicationAction, {});
  return (
    <article className="space-y-3 border-b border-[var(--color-line)] py-4 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{application.companyName}</h3>
        <Badge tone={application.status === 'approved' ? 'ok' : 'warn'}>
          {application.status === 'unverified' ? 'Email not verified' : application.status}
        </Badge>
      </div>
      <p className="text-sm text-[var(--color-ink-muted)]">
        {application.adminName} · {application.email}
        <br />
        Workspace identifier: {application.slug} ·{' '}
        {new Date(application.createdAt).toLocaleDateString('en-GB')}
      </p>
      {application.status === 'pending' ? (
        <form action={action} className="space-y-3">
          <input type="hidden" name="applicationId" value={application.id} />
          <Field
            label="Review note"
            hint="Required for rejection; included in the rejection email."
          >
            <Input name="note" maxLength={500} />
          </Field>
          {state.error && <Notice tone="alert">{state.error}</Notice>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="decision" value="approve" disabled={pending}>
              Approve and create trial
            </Button>
            <Button
              type="submit"
              name="decision"
              value="reject"
              variant="danger"
              disabled={pending}
            >
              Reject application
            </Button>
          </div>
        </form>
      ) : application.status === 'approved' ? (
        <p className="text-sm">
          {application.activated
            ? 'Administrator activated.'
            : 'Activation email queued. Waiting for the administrator to choose a password.'}
        </p>
      ) : application.reviewNote ? (
        <p className="text-sm">{application.reviewNote}</p>
      ) : null}
    </article>
  );
}

export function TrialApplications({ applications }: { applications: Application[] }) {
  return (
    <Card>
      <CardSection title="Trial applications">
        <p className="text-sm text-[var(--color-ink-muted)]">
          Latest 100 applications. Only verified applications can be approved. Approval starts the
          trial and creates a separate company workspace.
        </p>
        {applications.length ? (
          applications.map((application) => (
            <ApplicationReview
              key={`${application.id}:${application.status}`}
              application={application}
            />
          ))
        ) : (
          <p className="py-4 text-sm">No trial applications yet.</p>
        )}
      </CardSection>
    </Card>
  );
}
