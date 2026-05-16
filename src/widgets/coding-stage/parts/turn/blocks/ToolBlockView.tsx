import { memo, useState } from 'react';
import {
  ArrowRight, CheckCircle2, ChevronRight, FileCode, Globe, Loader2,
  Search, Sparkles, Terminal, XCircle,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { ToolBlock } from '../../types';

const TOOL_META = {
  read:   { Icon: FileCode, label: 'read',   color: 'var(--fg-link)' },
  edit:   { Icon: FileCode, label: 'edit',   color: 'var(--intent-success-fg)' },
  run:    { Icon: Terminal, label: 'run',    color: 'var(--intent-warn-fg)' },
  search: { Icon: Search,   label: 'search', color: 'var(--brand-fg)' },
  plan:   { Icon: Sparkles, label: 'plan',   color: 'var(--intent-danger-fg)' },
  web:    { Icon: Globe,    label: 'web',    color: 'var(--fg-link)' },
} as const;

function ToolBlockViewImpl({ block, isDark }: { block: ToolBlock; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[block.tool];
  const Icon = meta.Icon;
  const toneStyle: React.CSSProperties = { color: meta.color };
  const card = isDark ? 'bg-white/[0.025] border-white/[0.06] hover:border-white/[0.12]' : 'bg-white border-black/[0.06] hover:border-black/[0.12]';
  const textPrimary = isDark ? 'text-white/85' : 'text-black/85';
  const textFaint = isDark ? 'text-white/40' : 'text-black/40';
  const StatusIcon = block.status === 'fail' ? XCircle : block.status === 'running' ? Loader2 : CheckCircle2;
  const statusStyle: React.CSSProperties = block.status === 'fail'
    ? { color: 'var(--intent-danger-fg)' }
    : block.status === 'running'
      ? { color: 'var(--intent-warn-fg)' }
      : { color: 'var(--intent-success-fg)' };
  const statusClass = block.status === 'running' ? 'animate-spin' : '';

  return (
    <div className={`rounded-md border overflow-hidden transition-colors ${card}`}>
      <button type="button"
        onClick={() => { if (block.output) setOpen((v) => !v); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <Icon style={toneStyle} className="w-3 h-3 shrink-0" />
        <span style={toneStyle} className="uppercase tracking-[0.18em] text-[9px] font-bold shrink-0">
          {meta.label}
        </span>
        <span className={`flex-1 truncate font-mono text-[12px] ${textPrimary}`}>{block.label}</span>
        {block.detail && (
          <span className={`shrink-0 font-mono text-[11px] ${textFaint}`}>{block.detail}</span>
        )}
        {block.status && (
          <StatusIcon style={statusStyle} className={`w-3 h-3 shrink-0 ${statusClass}`} />
        )}
        {block.output && (
          <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${textFaint} ${open ? 'rotate-90' : ''}`} />
        )}
      </button>
      {open && block.output && (
        <div className={`border-t ${isDark ? 'border-white/[0.06] bg-black/40' : 'border-black/[0.05] bg-black/[0.92]'}`}>
          <pre className={`px-3 py-2 text-[11px] leading-[1.55] font-mono overflow-x-auto whitespace-pre ${
            isDark ? 'text-white/70' : 'text-white/85'
          } scrollbar-thin`}>
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

export const ToolBlockView = memo(ToolBlockViewImpl);

// Linked-failure summary. Above each failure, a thin gradient line
// drops down toward the next sibling (the diff) so the visual reads as
// "this failure points there" without requiring a real DOM connection.
function TestFailuresCard({
  run, isDark,
}: {
  run: NonNullable<ToolBlock['testResults']>;
  isDark: boolean;
}) {
  const { t } = useTranslation('coding');
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  return (
    <div
      style={{ background: 'color-mix(in srgb, var(--intent-danger-vivid) 6%, transparent)' }}
      className={`border-t ${border} px-3 py-2 space-y-1.5`}
    >
      <div
        style={{ color: 'var(--intent-danger-fg)' }}
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
      >
        <XCircle className="w-2.5 h-2.5" />
        {t('testMap.linkedFailures')} · {run.failed} / {run.failed + run.passed}
      </div>
      {run.failures.map((f, i) => (
        <div
          key={i}
          className={`coding-test-link rounded-md border ${border} ${isDark ? 'bg-[#11141a]' : 'bg-white'} px-2 py-1.5`}
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
                    // Dispatch global event the parent thread can use
                    // to scroll into the matching hunk. No-op when no
                    // listener — safe.
                    window.dispatchEvent(new CustomEvent('coding:jump-to-hunk', {
                      detail: { file: h.file, line: h.line, hunkId: h.hunkId },
                    }));
                  }}
                  className={`inline-flex items-center gap-1 px-1.5 py-px rounded text-[9.5px] font-mono transition-colors ${
                    isDark
                      ? 'bg-white/[0.05] text-white/70 hover:text-[var(--intent-danger-fg)]'
                      : 'bg-black/[0.04] text-black/70 hover:text-[var(--intent-danger-fg)]'
                  }`}
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
