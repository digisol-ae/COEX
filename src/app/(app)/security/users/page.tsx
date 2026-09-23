import { asUser, requirePermission } from '@/lib/session';
import { listUsers } from '@/modules/core/services/user.service';
import { Badge, Card, PageHeader, Table, Td, Th } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { CreateUserPanel } from './create-user-panel';
import { RoleSelect, StatusButton, ResetPasswordButton } from './row-actions';

export const metadata = { title: 'Users · COEX' };

export default async function UsersPage() {
  const actor = await requirePermission('user.manage');
  const users = await asUser(actor, listUsers);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Users"
        description={`Everyone who can sign in to ${actor.tenantName}. A suspended account loses its open sessions immediately.`}
        action={actor.permissions.includes('user.manage') ? <CreateUserPanel /> : undefined}
      />

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
                  {actor.permissions.includes('user.manage') && user.id !== actor.id ? (
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
