import { useState } from 'react';
import {
  FileCode, Terminal, Search, Sparkles, Globe,
  ChevronRight, CheckCircle2, XCircle, Loader2, ArrowRight,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { ToolBlock } from '../types';

// Tool tones land on theme tokens. Edit/run/web map to semantic intents;
// read/search/plan share the link/accent slots since they don't carry
// success/warn/danger meaning.
const TOOL_META = {
  read:   { Icon: FileCode, label: 'read',   tone: 'text-[var(--fg-link)]' },
  edit:   { Icon: FileCode, label: 'edit',   tone: 'text-[var(--intent-success-fg)]' },
  run:    { Icon: Terminal, label: 'run',    tone: 'text-[var(--intent-warn-fg)]' },
  search: { Icon: Search,   label: 'search', tone: 'text-[var(--fg-accent)]' },
  plan:   { Icon: Sparkles, label: 'plan',   tone: 'text-[var(--fg-accent)]' },
  web:    { Icon: Globe,    label: 'web',    tone: 'text-[var(--fg-link)]' },
} as const;

export function ToolBlockView({ block, isDark }: { block: ToolBlock; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[block.tool];
  const Icon = meta.Icon;
  const tone = meta.tone;
  const card = 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[var(--border-strong)]';
  const textPrimary = 'text-[var(--fg-strong)]';
  const textFaint = 'text-[var(--fg-muted)]';
  const StatusIcon = block.status === 'fail' ? XCircle : block.status === 'running' ? Loader2 : CheckCircle2;
  const statusTone = block.status === 'fail'
    ? 'text-[var(--intent-danger-vivid)]'
    : block.status === 'running'
      ? 'text-[var(--intent-warn-vivid)] animate-spin'
      : 'text-[var(--intent-success-vivid)]';

  return (
    <div className={`rounded-md border overflow-hidden transition-colors ${card}`}>
      <button type="button"
        onClick={() => { if (block.output) setOpen((v) => !v); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <Icon className={`w-3 h-3 shrink-0 ${tone}`} />
        <span className={`uppercase tracking-[0.18em] text-[9px] font-bold shrink-0 ${tone}`}>
          {meta.label}
        </span>
        <span className={`flex-1 truncate font-mono text-[12px] ${textPrimary}`}>{block.label}</span>
        {block.detail && (
          <span className={`shrink-0 font-mono text-[11px] ${textFaint}`}>{block.detail}</span>
        )}
        {block.status && (
          <StatusIcon className={`w-3 h-3 shrink-0 ${statusTone}`} />
        )}
        {block.output && (
          <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${textFaint} ${open ? 'rotate-90' : ''}`} />
        )}
      </button>
      {open && block.output && (
        <div className={`border-t border-[var(--border-default)] bg-[var(--bg-scrim)]`}>
          <pre className={`px-3 py-2 text-[11px] leading-[1.55] font-mono overflow-x-auto whitespace-pre text-[var(--fg-default)] scrollbar-thin`}>
            {block.output}
          </pre>
        </div>
      )}
      {/* Linked test failures — surfaced when the tool is a test runner
          (status === 'fail' or testResults attached). Card lists each
          failing test, expected/got, and a Jump-to-hunk action that
          dispatches a window event for the parent to scroll the diff.
          Pattern: Sentry stack-trace link to source. */}
      {block.testResults && block.testResults.failures.length > 0 && (
        <TestFailuresCard run={block.testResults} isDark={isDark} />
      )}
    </div>
  );
}

// Linked-failure summary. Above each failure, a thin gradient line
// drops down toward the next sibling (the diff) so the visual reads as
// "this failure points there" without requiring a real DOM connection.
function TestFailuresCard({
  run, isDark,
}: {
  run: NonNullable<ToolBlock['testResults']>;
  isDark: boolean;
}) {
  void isDark;
  const { t } = useTranslation('coding');
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  const heading = 'text-[var(--fg-strong)]';
  const border = 'border-[var(--border-default)]';
  return (
    <div className={`border-t ${border} bg-[var(--intent-danger-bg)] px-3 py-2 space-y-1.5`}>
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--intent-danger-fg)]`}>
        <XCircle className="w-2.5 h-2.5" />
        {t('testMap.linkedFailures')} · {run.failed} / {run.failed + run.passed}
      </div>
      {run.failures.map((f, i) => (
        <div
          key={i}
          className={`coding-test-link rounded-md border ${border} bg-[var(--bg-surface)] px-2 py-1.5`}
        >
          <div className={`flex items-center gap-1.5 mb-0.5`}>
            <span className={`text-[11px] font-semibold truncate ${heading}`}>{f.name}</span>
            <span className={`shrink-0 text-[9px] font-mono ${faint}`}>{f.file.split('/').pop()}</span>
          </div>
          <div className={`text-[10px] font-mono leading-relaxed ${muted}`}>{f.message}</div>
          {f.stackHits.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {f.stackHits.slice(0, 3).map((h, j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('coding:jump-to-hunk', {
                      detail: { file: h.file, line: h.line, hunkId: h.hunkId },
                    }));
                  }}
                  className={`inline-flex items-center gap-1 px-1.5 py-px rounded text-[9px] font-mono transition-colors bg-[var(--bg-active)] text-[var(--fg-default)] hover:[background:var(--intent-danger-bg)] hover:text-[var(--intent-danger-fg)]`}
                  title={t('testMap.jumpToHunk')}
                >
                  <ArrowRight className="w-2.5 h-2.5" />
                  {h.file.split('/').pop()}:{h.line}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
