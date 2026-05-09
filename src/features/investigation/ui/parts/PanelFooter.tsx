import { RefreshCw } from 'lucide-react';
import type { BundleStatus, InvestigationTarget } from '@entities/investigation';
import { ShortcutsHint } from './ShortcutsHint';

export function PanelFooter({
  activeTarget,
  evidenceCount,
  status,
  demoTargetCount,
  onRegenerate,
}: {
  activeTarget: InvestigationTarget | null;
  evidenceCount: number;
  status: BundleStatus;
  demoTargetCount: number;
  onRegenerate: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 shrink-0"
      style={{
        height: 36,
        borderTop: '1px solid var(--border-default)',
        color: 'var(--fg-subtle)',
        fontSize: 10,
      }}
    >
      <span className="shrink-0">
        {activeTarget
          ? `${evidenceCount.toString()} evidence · ${status}`
          : `${demoTargetCount.toString()} demo targets · pick one above`}
      </span>
      {activeTarget ? <ShortcutsHint /> : null}
      {activeTarget ? (
        <button
          type="button"
          onClick={onRegenerate}
          disabled={status === 'gathering'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors hover:[background:var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          style={{
            background: 'transparent',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
          }}
          aria-label="Regenerate investigation"
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate
        </button>
      ) : null}
    </div>
  );
}
