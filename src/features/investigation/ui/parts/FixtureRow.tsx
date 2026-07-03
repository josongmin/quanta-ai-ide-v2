import type { InvestigationTarget } from '@entities/investigation';
import { TargetKindBadge } from './TargetKindBadge';

export function FixtureRow({
  target,
  onClick,
}: {
  target: InvestigationTarget;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors hover:[background:var(--bg-hover)]"
      style={{ background: 'transparent', cursor: 'pointer' }}
    >
      <TargetKindBadge kind={target.kind} />
      <span className="flex-1 min-w-0">
        <span
          className="block truncate text-sm font-semibold"
          style={{ color: 'var(--fg-default)' }}
        >
          {target.label}
        </span>
        {target.subtitle && (
          <span
            className="block truncate text-xs"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {target.subtitle}
          </span>
        )}
      </span>
    </button>
  );
}
