import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';

// Global controller for the code-editor modal.
//
// Any feature can call `useCodeEditor().open(fileId)` to pop the editor.
// The provider holds a single open file at a time — opening another file
// just swaps the contents, matching how a tabbed IDE replaces a buffer.

export type CodeEditorRequest = {
  fileId: number;
  // Optional jump target (1-indexed) so dot/file callsites can deep-link.
  line?: number;
  column?: number;
};

type Ctx = {
  request: CodeEditorRequest | null;
  open: (req: CodeEditorRequest) => void;
  close: () => void;
};

const CodeEditorContext = createContext<Ctx | null>(null);

export function CodeEditorProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<CodeEditorRequest | null>(null);

  const open = useCallback((req: CodeEditorRequest) => { setRequest(req); }, []);
  const close = useCallback(() => { setRequest(null); }, []);

  const value = useMemo<Ctx>(() => ({ request, open, close }), [request, open, close]);

  return (
    <CodeEditorContext.Provider value={value}>
      {children}
    </CodeEditorContext.Provider>
  );
}

export function useCodeEditor() {
  const c = useContext(CodeEditorContext);
  if (!c) throw new Error('useCodeEditor must be inside CodeEditorProvider');
  return c;
}
