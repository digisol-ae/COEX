'use client';

import { useActionState, useRef, useState } from 'react';

interface SaveCloseState {
  saved?: boolean;
  error?: string;
}

/** A save only applies to the submitted edit version, including edits made while it was pending. */
export function useSaveCloseAction(
  action: (state: SaveCloseState, data: FormData) => Promise<SaveCloseState>,
  initialState: SaveCloseState,
) {
  const editVersion = useRef(0);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState(
    async (previous: SaveCloseState, data: FormData) => {
      const submittedVersion = editVersion.current;
      setSavedVersion(null);
      const result = await action(previous, data);
      if (result.saved && !result.error && submittedVersion === editVersion.current)
        setSavedVersion(submittedVersion);
      return result;
    },
    initialState,
  );

  function markEdited() {
    editVersion.current += 1;
    setSavedVersion(null);
  }

  return {
    state,
    formAction,
    pending,
    saved: Boolean(state.saved && !state.error && !pending && savedVersion !== null),
    markEdited,
  };
}
