import { useMemo } from 'react';
import { Save, X, RotateCcw, FileCode2, Search, AlertTriangle, Lock, ShieldCheck } from 'lucide-react';
import { Modal } from '@shared/ui/Modal';
import { useTheme } from '@shared/theme';
import { useFilterStore } from '@entities/filter-state';
import type { FileRecord } from '@entities/repo';

import { useCodeEditor } from '../model/CodeEditorContext';
import { buildMockSource } from '../lib/mockSource';
import { useDirtyBuffer } from '../lib/useDirtyBuffer';
import { CodeEditor } from './CodeEditor';
import { FileExplorerSidebar } from './FileExplorerSidebar';

// Modal wrapper around the CodeMirror host. Owns:
//   • title bar (file path + language + close)
//   • dirty-state tracking (Save / Reset)
//   • status bar (diagnostics summary + edit-safety)
//
// Uses the shared <Modal> primitive (portal + backdrop blur + a11y) and
// inherits the app's glass tokens — no custom chrome, no left stripes.

export function CodeEditorModal() {
  const { request, open: openEditor, close } = useCodeEditor();
  const repo = useFilterStore((s) => s.repo);
  const { isDark } = useTheme();

  const file: FileRecord | null = useMemo(() => {
    if (!request) return null;
    return repo.files[request.fileId] ?? null;
  }, [request, repo.files]);

  const initialDoc = useMemo(() => (file ? buildMockSource(file) : ''), [file]);
  const {
    doc, setDoc, isDirty: dirty, save: onSave, reset: onReset, savedAnnounce,
  } = useDirtyBuffer(initialDoc);

  if (!file) return null;
  const open = request !== null;

  const path = `${file.folderPath.split('.').join('/')}/${file.name}`;
  const safety = file.metrics.editSafety;
  const safetyLabel = safety >= 70 ? 'Safe' : safety >= 40 ? 'Caution' : 'High blast';
  const SafetyIcon = safety >= 70 ? ShieldCheck : safety >= 40 ? AlertTriangle : Lock;

  const handleOpenFile = (id: number) => {
    if (id === file.id) return;
    if (dirty && !window.confirm('Discard unsaved changes in the current file?')) return;
    // Reuse the editor's request channel — same code path as a fresh open
    // from the dot field, so jump-to-line / language swap stay consistent.
    openEditor({ fileId: id });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      width="min(1280px, 94vw)"
      maxWidth="1400px"
      ariaLabel={`Code editor — ${path}`}
      align="center"
    >
      <div className="flex flex-col" style={{ height: 'min(80vh, 760px)' }}>
        <Header
          path={path}
          language={file.language}
          dirty={dirty}
          onClose={() => {
            if (dirty && !window.confirm('Discard unsaved changes?')) return;
            close();
          }}
          onSave={() => { onSave(doc); }}
          onReset={onReset}
        />

        <div className="flex-1 min-h-0 flex gap-0 px-2 pb-2">
          <aside
            className="shrink-0 rounded-lg border overflow-hidden mr-2"
            style={{
              width: 240,
              borderColor: 'var(--border-muted)',
              background: isDark ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,1)',
              ...(isDark ? { backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } : {}),
            }}
          >
            <FileExplorerSidebar
              repo={repo}
              activeFileId={file.id}
              onOpenFile={handleOpenFile}
            />
          </aside>

          <div
            className="flex-1 min-w-0 rounded-lg border overflow-hidden"
            style={{
              borderColor: 'var(--border-muted)',
              background: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,1)',
              ...(isDark ? { backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } : {}),
            }}
          >
            <CodeEditor
              file={file}
              initialDoc={initialDoc}
              isDark={isDark}
              onChange={setDoc}
              onSave={onSave}
              jumpToLine={request?.line}
            />
          </div>
        </div>

        <Footer
          file={file}
          safety={safety}
          safetyLabel={safetyLabel}
          SafetyIcon={SafetyIcon}
          dirty={dirty}
        />
        <span role="status" aria-live="polite" className="sr-only">
          {savedAnnounce}
        </span>
      </div>
    </Modal>
  );
}


function Header({
  path, language, dirty, onClose, onSave, onReset,
}: {
  path: string;
  language: FileRecord['language'];
  dirty: boolean;
  onClose: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <FileCode2 size={14} style={{ color: 'var(--fg-subtle)' }} />
      <span
        className="text-[11px] font-mono truncate"
        style={{ color: 'var(--fg-default)' }}
        title={path}
      >
        {path}
      </span>
      <span
        className="text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded border"
        style={{
          color: 'var(--fg-subtle)',
          background: 'var(--bg-surface-muted)',
          borderColor: 'var(--border-muted)',
        }}
      >
        {language}
      </span>
      {dirty && (
        <span
          className="text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded"
          style={{
            color: 'var(--fg-default)',
            background: 'var(--bg-surface-muted)',
          }}
        >
          unsaved
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        <ToolbarButton onClick={onReset} title="Reset to saved (Esc-equivalent)" disabled={!dirty}>
          <RotateCcw size={13} />
          Reset
        </ToolbarButton>
        <ToolbarButton onClick={onSave} title="Save (⌘S / Ctrl-S)" disabled={!dirty} primary>
          <Save size={13} />
          Save
        </ToolbarButton>
        <ToolbarButton onClick={onClose} title="Close" iconOnly>
          <X size={14} />
        </ToolbarButton>
      </div>
    </div>
  );
}

function Footer({
  file, safety, safetyLabel, SafetyIcon, dirty,
}: {
  file: FileRecord;
  safety: number;
  safetyLabel: string;
  SafetyIcon: typeof ShieldCheck;
  dirty: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-1.5 border-t text-[10px]"
      style={{ borderColor: 'var(--border-muted)', color: 'var(--fg-subtle)' }}
    >
      <span className="flex items-center gap-1">
        <Search size={11} />
        <kbd className="font-mono">⌘F</kbd>
        <span>find</span>
      </span>
      <Sep />
      <span className="font-mono">LOC {file.metrics.loc}</span>
      <Sep />
      <span>
        ESLint:{' '}
        <span style={{ color: file.metrics.eslintErrors > 0 ? 'var(--fg-default)' : undefined }}>
          {file.metrics.eslintErrors}E / {file.metrics.eslintWarnings}W
        </span>
      </span>
      <Sep />
      <span className="flex items-center gap-1">
        <SafetyIcon size={11} />
        Edit safety: {safety}/100 ({safetyLabel})
      </span>
      <span className="ml-auto">
        {dirty ? 'modified' : 'in sync'} · owner {file.owner}
      </span>
    </div>
  );
}

function Sep() {
  return <span style={{ color: 'var(--border-muted)' }}>·</span>;
}

function ToolbarButton({
  children, onClick, title, disabled, primary, iconOnly,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  primary?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex items-center gap-1 rounded-md border text-[10px] uppercase tracking-[0.14em] transition-colors ${iconOnly ? 'p-1' : 'px-2 py-1'} disabled:opacity-50 disabled:cursor-not-allowed hover:[background:var(--bg-hover)]`}
      style={{
        background: primary ? 'var(--bg-surface)' : 'var(--bg-surface-muted)',
        color: 'var(--fg-default)',
        borderColor: 'var(--border-muted)',
      }}
    >
      {children}
    </button>
  );
}
