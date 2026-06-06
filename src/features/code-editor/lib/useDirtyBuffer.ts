import { useCallback, useEffect, useState } from 'react';

// Tracks the editor's working buffer against its last-saved baseline.
//
// `doc` is the live document, `savedDoc` the baseline; `isDirty` is the
// delta between them. When the host opens a different file, `initialDoc`
// changes and both buffers re-seed to it — implemented via the documented
// React "adjust state while rendering using a tracked prev value" pattern
// (kept inside the hook so the render body of consumers stays clean).
//
// `save` snapshots the current (or supplied) text as the new baseline and
// fires a transient "Saved" announcement that auto-clears after 1.5s.

type DirtyBuffer = {
  doc: string;
  setDoc: (next: string) => void;
  isDirty: boolean;
  save: (next: string) => void;
  reset: () => void;
  savedAnnounce: string;
};

export function useDirtyBuffer(initialDoc: string): DirtyBuffer {
  const [doc, setDoc] = useState(initialDoc);
  const [savedDoc, setSavedDoc] = useState(initialDoc);
  const [prevInitialDoc, setPrevInitialDoc] = useState(initialDoc);
  const [savedAnnounce, setSavedAnnounce] = useState('');

  // When the open file changes, refresh both buffers. Adjusting state during
  // render via a tracked prev value is the React-sanctioned way to react to a
  // prop change without an extra commit (avoids a transient stale-buffer paint).
  if (initialDoc !== prevInitialDoc) {
    setPrevInitialDoc(initialDoc);
    setDoc(initialDoc);
    setSavedDoc(initialDoc);
  }

  const isDirty = doc !== savedDoc;

  const save = useCallback((next: string) => {
    setSavedDoc(next);
    setDoc(next);
    setSavedAnnounce('Saved');
  }, []);

  // Reset discards edits back to the last-saved baseline.
  const reset = useCallback(() => {
    setDoc(savedDoc);
  }, [savedDoc]);

  useEffect(() => {
    if (!savedAnnounce) return;
    const handle = window.setTimeout(() => { setSavedAnnounce(''); }, 1500);
    return () => { window.clearTimeout(handle); };
  }, [savedAnnounce]);

  return { doc, setDoc, isDirty, save, reset, savedAnnounce };
}
