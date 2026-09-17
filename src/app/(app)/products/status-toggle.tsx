'use client';

import { Button } from '@/components/ui';
import { toggleProductStatusAction } from './actions';

/** Retired rather than deleted: contracts and ticket history still refer to the product. */
export function StatusToggle({ id, status }: { id: string; status: string }) {
  return (
    <form action={toggleProductStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button variant="secondary" type="submit">
        {status === 'active' ? 'Retire' : 'Reactivate'}
      </Button>
    </form>
  );
}
