import { FileCode, BadgeAlert } from 'lucide-react';
import type { Seed } from '../../model/types';
import { DANGER, WARN, INFO, NEUTRAL, mix } from './tokens';

export function RootCausePane({ seed, rootCause }: { seed: Seed; rootCause: string }) {
  const sevColor = seed.severity === 'crit' ? DANGER
    : seed.severity === 'high' ? WARN
    : seed.severity === 'med'  ? INFO : NEUTRAL;
  return (
    <div className="px-4 py-3 border-b border-[var(--border-muted)]">
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center mt-0.5"
          style={{ background: mix(sevColor, 12), border: `1px solid ${mix(sevColor, 33)}` }}
        >
          <BadgeAlert className="w-3.5 h-3.5" style={{ color: sevColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[9px] font-mono uppercase tracking-[var(--track-eyebrow)]"
              style={{ color: sevColor }}
            >
              {seed.severity}
            </span>
            <span className="text-[9px] font-mono uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
              · {seed.kind}
            </span>
          </div>
          <div className="text-[12px] font-semibold text-[var(--fg-default)] leading-snug truncate">
            {seed.title}
          </div>
          <div className="text-[11px] text-[var(--fg-muted)] leading-relaxed mt-1">
            <span className="text-[var(--fg-subtle)] mr-1">root cause —</span>{rootCause}
          </div>
          {seed.evidenceRefs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {seed.evidenceRefs.map((e, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-1.5 h-4 rounded-sm text-[9px] font-mono text-[var(--fg-muted)]"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}
                  title={e.path}
                >
                  <FileCode className="w-2.5 h-2.5" />
                  {e.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
