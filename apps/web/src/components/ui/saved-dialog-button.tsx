'use client';

import { Button } from '@/components/ui';
import { useDetailPopupClose } from './detail-popup';

export function SavedDialogButton({
  saved,
  pending,
  disabled = false,
}: {
  saved: boolean;
  pending: boolean;
  disabled?: boolean;
}) {
  const close = useDetailPopupClose();
  return (
    <Button
      type={saved && close ? 'button' : 'submit'}
      disabled={pending || disabled}
      onClick={saved ? close : undefined}
    >
      {pending ? 'Saving' : saved && close ? 'Close' : 'Save'}
    </Button>
  );
}
