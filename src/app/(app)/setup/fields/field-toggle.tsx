'use client';

import { Button } from '@/components/ui';
import { toggleFieldAction } from './actions';

export function FieldToggle({ id, status }: { id: string; status: string }) {
  return (
    <form action={toggleFieldAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button variant="secondary" type="submit">
        {status === 'active' ? 'Hide' : 'Show'}
      </Button>
    </form>
  );
}
