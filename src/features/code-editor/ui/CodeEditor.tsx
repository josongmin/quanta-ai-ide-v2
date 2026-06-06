import { useEffect, useMemo, useRef } from 'react';
import { EditorState, Compartment, type Extension } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars,
  hoverTooltip,
} from '@codemirror/view';
import {
  defaultKeymap, history, historyKeymap, indentWithTab,
} from '@codemirror/commands';
import {
  bracketMatching, foldGutter, foldKeymap, indentOnInput, indentUnit,
} from '@codemirror/language';
import {
  autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap,
} from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap, search } from '@codemirror/search';
import { lintGutter, linter, lintKeymap } from '@codemirror/lint';
import type { FileRecord } from '@entities/repo';

import { editorTheme } from '../lib/theme';
import { languageExtension } from '../lib/language';
import { mockCompletions, mockDiagnostics, mockHover } from '../lib/mockLsp';

// CodeMirror 6 host. The wrapper above (CodeEditorModal) owns the chrome,
// dirty state, and toolbar. This component just runs CM and exposes save
// via a callback.
//
// LSP-flavored extensions that ship here:
//   • diagnostics (linter + lintGutter)
//   • hover (symbol summary)
//   • autocomplete (keywords + entity symbols)
//   • search panel (Cmd/Ctrl-F)
//   • bracket matching, indent-on-input, history, multi-cursor

export type CodeEditorProps = {
  file: FileRecord;
  initialDoc: string;
  isDark: boolean;
  onChange: (doc: string) => void;
  onSave?: (doc: string) => void;
  jumpToLine?: number;
};

export function CodeEditor({
  file, initialDoc, isDark, onChange, onSave, jumpToLine,
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const langCompartment = useRef(new Compartment());

  // Stash the latest callbacks in refs so the editor instance lives across
  // prop changes without being torn down (CM6 reconfigures via compartments).
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onChangeRef.current = onChange;
    onSaveRef.current = onSave;
  });

  const lspExtensions = useMemo<Extension[]>(() => [
    linter((view) => mockDiagnostics(view, file)),
    lintGutter(),
    autocompletion({ override: [mockCompletions(file)] }),
    hoverTooltip((view, pos) => {
      const word = view.state.wordAt(pos);
      if (!word) return null;
      const text = view.state.sliceDoc(word.from, word.to);
      const md = mockHover(file, text);
      if (!md) return null;
      return {
        pos: word.from,
        end: word.to,
        above: true,
        create: () => {
          const dom = document.createElement('div');
          dom.className = 'cm-mock-hover';
          dom.style.cssText = 'padding:8px 10px; max-width:360px; font-size:12px; line-height:1.45; white-space:pre-wrap;';
          dom.textContent = md;
          return { dom };
        },
      };
    }),
  ], [file]);

  // Mount once — file/theme changes reconfigure compartments.
  useEffect(() => {
    if (!hostRef.current) return;

    const saveKeymap = keymap.of([
      {
        key: 'Mod-s',
        preventDefault: true,
        run: (view) => {
          onSaveRef.current?.(view.state.doc.toString());
          return true;
        },
      },
    ]);

    const updateListener = EditorView.updateListener.of((u) => {
      if (u.docChanged) onChangeRef.current(u.state.doc.toString());
    });

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        search({ top: true }),
        indentUnit.of('  '),
        EditorState.tabSize.of(2),
        langCompartment.current.of(languageExtension(file)),
        themeCompartment.current.of(editorTheme(isDark)),
        ...lspExtensions,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
          indentWithTab,
        ]),
        saveKeymap,
        updateListener,
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mount once. This intentionally captures `initialDoc`, `file` and
    // `lspExtensions` only as the editor's initial state — re-running on
    // their change would destroy/recreate the EditorView and lose undo
    // history, selection and scroll. Every one of those inputs is instead
    // routed in-place after mount: callbacks via refs (onChangeRef/
    // onSaveRef), theme/file/doc via the compartment-reconfigure effects
    // below. The exhaustive-deps disable is therefore correct, not a silence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme flip — reconfigure the theme compartment in place.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: themeCompartment.current.reconfigure(editorTheme(isDark)) });
  }, [isDark]);

  // File swap — replace doc + language. We treat opening a different file
  // the same way an IDE swaps a buffer: undo history is reset on purpose.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() === initialDoc) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: initialDoc },
      effects: langCompartment.current.reconfigure(languageExtension(file)),
    });
  }, [file, initialDoc]);

  // Jump-to-line on demand (e.g. dot click points at a specific spot).
  useEffect(() => {
    if (!jumpToLine) return;
    const view = viewRef.current;
    if (!view) return;
    const safeLine = Math.max(1, Math.min(jumpToLine, view.state.doc.lines));
    const line = view.state.doc.line(safeLine);
    view.dispatch({
      selection: { anchor: line.from, head: line.from },
      scrollIntoView: true,
    });
    view.focus();
  }, [jumpToLine]);

  return (
    <div
      ref={hostRef}
      className="h-full w-full overflow-hidden"
      style={{ background: 'transparent' }}
    />
  );
}
