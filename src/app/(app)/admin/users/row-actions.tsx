'use client';

import { Button, Select } from '@/components/ui';
import { ROLES } from '@/modules/core/permissions';
import { changeRoleAction, toggleStatusAction } from './actions';

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  return (
    <form action={changeRoleAction}>
      <input type="hidden" name="userId" value={userId} />
      <Select
        name="role"
        defaultValue={role}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="max-w-40"
      >
        {ROLES.map((option) => (
          <option key={option} value={option}>
            {option.replace('_', ' ')}
          </option>
        ))}
      </Select>
    </form>
  );
}

export function StatusButton({ userId, status }: { userId: string; status: string }) {
  return (
    <form action={toggleStatusAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={status} />
      <Button variant={status === 'active' ? 'danger' : 'secondary'} type="submit">
        {status === 'active' ? 'Suspend' : 'Reactivate'}
      </Button>
    </form>
  );
}
