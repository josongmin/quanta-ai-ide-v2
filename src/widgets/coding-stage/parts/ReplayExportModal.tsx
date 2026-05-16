import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, X } from 'lucide-react';
import { toClaudeScript, toMarkdown } from '../lib/exportReplay';
import type { Project, Task } from './types';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

type Tab = 'markdown' | 'script';

// Modal that serializes the whole task thread as either a markdown
// transcript or a runnable claude-CLI script. Visual language matches
// BudgetSoftCapModal (rounded-xl, backdrop blur, max-w-[560px]). No
// coloured left stripes on rows or cards — flat surfaces only.
export default function ReplayExportModal({
  task,
  project,
  t,
  onClose,
}: {
  task: Task;
  project: Project;
  t: TranslateFn;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('markdown');
  const [copied, setCopied] = useState(false);

  // Re-serialize whenever the task changes so the user always sees the
  // current snapshot. Cheap; the thread is at most a few dozen turns.
  const markdown = useMemo(() => toMarkdown(task, project), [task, project]);
  const script = useMemo(() => toClaudeScript(task, project), [task, project]);

  const body = tab === 'markdown' ? markdown : script;
  const ext = tab === 'markdown' ? 'md' : 'sh';
  const mime = tab === 'markdown' ? 'text/markdown' : 'text/x-shellscript';
  const filename = `${task.branch.replace(/[^a-z0-9-_]/gi, '-')}-replay.${ext}`;
  const byteLen = useMemo(() => new TextEncoder().encode(body).length, [body]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  // Reset the "Copied!" affordance when switching tabs so the label
  // doesn't lie about which payload was copied.
  const [prevTab, setPrevTab] = useState(tab);
  if (prevTab !== tab) {
    setPrevTab(tab);
    setCopied(false);
  }

  const surface = 'bg-[var(--bg-surface)] border-[var(--border-strong)]';
  const heading = 'text-[var(--fg-strong)]';
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  const border = 'border-[var(--border-default)]';

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => { setCopied(false); }, 1200);
    } catch {
      // Clipboard can throw in headless / iframe sandboxes; swallow so
      // the modal stays usable. Download still works.
    }
  };

  const onDownload = () => {
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Defer revoke so Safari has time to commit the download.
    window.setTimeout(() => { URL.revokeObjectURL(url); }, 0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
    >
      <div className={`absolute inset-0 bg-[var(--bg-scrim)] backdrop-blur-sm`} />
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- stops backdrop click-through; outer wrapper handles keyboard. */}
      <div
        className={`relative w-full max-w-[560px] rounded-xl border shadow-2xl ${surface} coding-pill-rise`}
        onClick={(e) => { e.stopPropagation(); }}
        role="dialog"
        aria-label={t('replayExport.title')}
      >
        <div className={`flex items-center justify-between px-5 py-3 border-b ${border}`}>
          <div className="flex items-center gap-2 min-w-0">
            <Download className={`w-3.5 h-3.5 ${muted}`} />
            <h2 className={`text-[12px] font-semibold ${heading} truncate`}>
              {t('replayExport.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`p-1 rounded-md transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:[background:var(--bg-hover)]`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-3">
          {/* Segmented tab toggle — same micro-control style as the
              Density picker in ContextRail. */}
          <div className={`flex items-center gap-px rounded-md p-px bg-[var(--bg-active)]`}>
            {(['markdown', 'script'] as const).map((id) => {
              const label = id === 'markdown' ? t('replayExport.tabMarkdown') : t('replayExport.tabScript');
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setTab(id); }}
                  aria-pressed={tab === id}
                  className={`flex-1 px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                    tab === id
                      ? ('bg-[var(--bg-active-strong)] text-[var(--fg-on-active-strong)]')
                      : ('text-[var(--fg-muted)] hover:text-[var(--fg-default)]')
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 pb-4">
          <pre
            className={`font-mono text-[11px] leading-relaxed whitespace-pre overflow-auto scrollbar-thin max-h-[60vh] rounded-md border px-3 py-2.5 bg-black/30 border-[var(--border-default)] text-[var(--fg-strong)]`}
          >
            {body}
          </pre>
        </div>

        <div className={`flex items-center justify-between gap-2 px-5 py-3 border-t ${border}`}>
          <span className={`text-[10px] font-mono ${faint}`}>
            {t('replayExport.bytes', { n: byteLen })} · {t('replayExport.closeHint')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { void onCopy(); }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono transition-colors border border-[var(--border-strong)] hover:[background:var(--bg-hover)] text-[var(--fg-strong)]`}
            >
              <Copy className="w-3 h-3" />
              {copied ? t('replayExport.copied') : t('replayExport.copy')}
            </button>
            <button
              type="button"
              onClick={onDownload}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-mono transition-colors border border-[var(--border-strong)] bg-[var(--bg-active)] hover:[background:var(--bg-elevated)] text-[var(--fg-strong)]`}
            >
              <Download className="w-3 h-3" />
              {tab === 'markdown' ? t('replayExport.downloadMd') : t('replayExport.downloadSh')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
