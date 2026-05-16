// Tracks an "edited" copy of a settings shape and surfaces a dirty bit so
// the SaveBar can show. Pure demo hook — saving is a 700ms timeout that
// flips state to 'saved', then back to 'idle' after another 1.4s.

import { useEffect, useMemo, useRef, useState } from 'react';
import { shallowEqual } from '@shared/lib';

export type SaveState = 'idle' | 'saving' | 'saved';

export function useDirtyState<T>(initial: T) {
  const [committed, setCommitted] = useState<T>(initial);
  const [draft, setDraft] = useState<T>(initial);
  const [savingState, setSavingState] = useState<SaveState>('idle');

  const dirty = useMemo(() => !shallowEqual(committed, draft), [committed, draft]);

  const save = () => {
    setSavingState('saving');
    setTimeout(() => {
      setCommitted(draft);
      setSavingState('saved');
      setTimeout(() => { setSavingState('idle'); }, 1400);
    }, 700);
  };

  const discard = () => { setDraft(committed); };

  const lastInitialRef = useRef<T>(initial);
  useEffect(() => {
    if (!shallowEqual(lastInitialRef.current, initial)) {
      lastInitialRef.current = initial;
      setCommitted(initial);
      setDraft(initial);
    }
  }, [initial]);

  return { draft, setDraft, dirty, savingState, save, discard };
}
