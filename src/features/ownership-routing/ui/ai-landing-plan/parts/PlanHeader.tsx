import type { OwnershipZone } from '@entities/ownership';
import { GeneratedPill } from './primitives';

export function PlanHeader({
  zone,
  footerShown,
  onSkip,
}: {
  zone: OwnershipZone;
  footerShown: boolean;
  onSkip: () => void;
}) {
  return (
    <header
      className="flex items-start justify-between gap-3 px-5 py-4 border-b"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h2
            className="text-sm font-black uppercase tracking-[0.22em]"
            style={{ color: 'var(--fg-strong)' }}
          >
            AI Landing Plan
          </h2>
          <GeneratedPill />
        </div>
        <div
          className="text-base truncate"
          style={{ color: 'var(--fg-muted)' }}
          title={zone.label}
        >
          {zone.label}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {!footerShown && (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center px-2 py-1 rounded-md text-2xs font-black uppercase tracking-[0.22em] transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--fg-muted)',
              border: '1px solid var(--border-muted)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label="Skip animation and show full plan"
          >
            Skip
          </button>
        )}
      </div>
    </header>
  );
}
