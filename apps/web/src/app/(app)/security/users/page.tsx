import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listUsers } from '@/modules/core/services/user.service';
import { Badge, Card, PageHeader, Table, Td, Th } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { CreateUserPanel } from './create-user-panel';
import { RoleSelect, StatusButton, ResetPasswordButton, AccessEditor } from './row-actions';

export const metadata = { title: 'Users · Worktello' };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const customers = kind === 'customers';
  const actor = await requirePermission('user.manage');
  const users = await asUser(actor, () => listUsers({ kind: customers ? 'customers' : 'staff' }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={customers ? 'Customer portal accounts' : 'Worktello users'}
        description={
          customers
            ? 'Customer sign-ins for raising and following tickets. These accounts are separate from Worktello staff.'
            : 'Administrators, managers and agents. Customer contacts and portal accounts are managed separately.'
        }
        action={
          !customers && actor.permissions.includes('user.manage') ? <CreateUserPanel /> : undefined
        }
      />

      <nav aria-label="Account type" className="mb-4 flex gap-2 text-sm">
        <Link
          prefetch={false}
          href="/security/users"
          aria-current={!customers ? 'page' : undefined}
          className={`rounded border px-3 py-2 ${!customers ? 'font-semibold bg-[var(--color-surface-muted)]' : ''}`}
        >
          Worktello users
        </Link>
        <Link
          prefetch={false}
          href="/security/users?kind=customers"
          aria-current={customers ? 'page' : undefined}
          className={`rounded border px-3 py-2 ${customers ? 'font-semibold bg-[var(--color-surface-muted)]' : ''}`}
        >
          Customer portal accounts
        </Link>
      </nav>
      <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
        {users.length} {customers ? 'customer portal accounts' : 'Worktello users'}
      </p>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last signed in</Th>
              <Th>{''}</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={user.name} size="small" />
                    <div>
                      <div className="font-medium text-[var(--color-ink)]">{user.name}</div>
                      <div className="text-xs text-[var(--color-ink-subtle)]">{user.email}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  {!customers &&
                  actor.permissions.includes('user.manage') &&
                  user.id !== actor.id ? (
                    <RoleSelect userId={user.id} role={user.role} />
                  ) : (
                    <span className="text-[var(--color-ink-muted)]">
                      {user.role.replace('_', ' ')}
                    </span>
                  )}
                </Td>
                <Td>
                  <Badge tone={user.status === 'active' ? 'ok' : 'warn'}>{user.status}</Badge>
                </Td>
                <Td className="text-[var(--color-ink-muted)]">
                  {user.lastSignedInAt ? user.lastSignedInAt.toLocaleString('en-GB') : 'Never'}
                </Td>
                <Td>
                  {actor.permissions.includes('user.manage') && user.id !== actor.id ? (
                    <div className="flex justify-end gap-2">
                      {!customers ? (
                        <AccessEditor
                          userId={user.id}
                          role={user.role}
                          grants={user.permissionGrants}
                          denials={user.permissionDenials}
                        />
                      ) : null}
                      <ResetPasswordButton userId={user.id} email={user.email} />
                      <StatusButton userId={user.id} status={user.status} />
                    </div>
                  ) : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
