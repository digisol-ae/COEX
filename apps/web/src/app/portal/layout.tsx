import { GlobalTooltip } from '@/components/ui/global-tooltip';
import Link from 'next/link';
import { getSignedInUser } from '@/lib/session';
import { UserMenu } from '@/components/navigation/user-menu';
import { BrowserNotifications } from '@/components/navigation/browser-notifications';
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSignedInUser();
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-line)] px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <Link href="/portal" className="font-bold">
            COEX{' '}
            <span className="font-normal text-[var(--color-ink-muted)]">· Customer portal</span>
          </Link>
          {user ? (
            <UserMenu
              name={user.name}
              email={user.email}
              tenantName="Customer portal"
              notificationScope={`:portal:${user.id}`}
              portal
            />
          ) : (
            <Link href="/login" className="text-sm underline">
              Sign in
            </Link>
          )}
        </div>
      </header>
      {user?.role === 'client_contact' ? (
        <BrowserNotifications endpoint="/api/portal/notifications" scope={`:portal:${user.id}`} />
      ) : null}
      <GlobalTooltip />
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-5">{children}</main>
    </div>
  );
}
