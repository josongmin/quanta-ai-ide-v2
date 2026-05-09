import { Sparkles, X } from 'lucide-react';
import { IconButton } from '@shared/ui';
import type { InvestigationTarget } from '@entities/investigation';

export function PanelHeader({
  activeTarget,
  onClear,
  onClose,
}: {
  activeTarget: InvestigationTarget | null;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 shrink-0"
      style={{
        height: 40,
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <Sparkles
        className="w-4 h-4 shrink-0"
        style={{ color: 'var(--intent-success-vivid)' }}
      />
      <span
        className="font-mono font-bold text-[12px] shrink-0"
        style={{ color: 'var(--fg-default)' }}
      >
        Investigation
      </span>
      <div className="flex-1 min-w-0 flex flex-col items-start ml-2">
        {activeTarget ? (
          <>
            <span
              className="block truncate text-[11px] font-semibold w-full"
              style={{ color: 'var(--fg-default)' }}
            >
              {activeTarget.label}
            </span>
            {activeTarget.subtitle && (
              <span
                className="block truncate text-[10px] w-full"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {activeTarget.subtitle}
              </span>
            )}
          </>
        ) : null}
      </div>
      {activeTarget ? (
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] font-mono uppercase tracking-[0.12em] px-1.5 py-1 rounded-md transition-colors hover:[background:var(--bg-hover)]"
          style={{
            background: 'transparent',
            color: 'var(--fg-subtle)',
            cursor: 'pointer',
          }}
          title="Clear current target — back to demo list"
        >
          Reset
        </button>
      ) : null}
      <IconButton icon={X} label="Close investigation" size="sm" onClick={onClose} />
    </div>
  );
}
