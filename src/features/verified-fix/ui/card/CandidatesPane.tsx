import type { CandidateFix } from '../../model/types';
import { ACCENT, SUCCESS, WARN, DANGER, mix } from './tokens';
import { PaneHeader } from './shared';

export function CandidatesPane({
  candidates, selectedCandidateId, onSelectCandidate,
}: {
  candidates: CandidateFix[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
}) {
  return (
    <div className="px-4 py-3 border-b border-[var(--border-muted)]">
      <PaneHeader label={`Candidates · ${String(candidates.length)}`} />
      <div className="space-y-1.5">
        {candidates.slice(0, 3).map((c) => (
          <CandidateRow
            key={c.id}
            cand={c}
            selected={c.id === selectedCandidateId}
            onClick={() => { onSelectCandidate(c.id); }}
          />
        ))}
      </div>
    </div>
  );
}

function CandidateRow({
  cand, selected, onClick,
}: { cand: CandidateFix; selected: boolean; onClick: () => void }) {
  const tierColor = cand.tier === 'safe-mechanical' ? SUCCESS
    : cand.tier === 'guarded' ? WARN : DANGER;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="w-full text-left rounded-md px-3 py-2 transition-colors"
      style={{
        background: selected ? mix(ACCENT, 10) : 'var(--bg-surface-muted)',
        border: selected ? `1px solid ${mix(ACCENT, 33)}` : '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: tierColor, boxShadow: selected ? `0 0 6px ${tierColor}` : 'none' }}
        />
        <span className="text-sm font-bold text-[var(--fg-default)] truncate">{cand.title}</span>
        <span
          className="ml-auto shrink-0 text-2xs font-mono uppercase tracking-eyebrow"
          style={{ color: tierColor }}
        >
          {cand.tier}
        </span>
      </div>
      <div className="text-xs text-[var(--fg-muted)] leading-relaxed mt-1 line-clamp-2">
        {cand.rationale}
      </div>
      <div className="flex items-center gap-3 text-2xs font-mono text-[var(--fg-subtle)] mt-1.5">
        <span>{cand.diffSummary}</span>
        <span>·</span>
        <span>{cand.changedLines}L · {String(cand.changedFiles)}f</span>
        <span>·</span>
        <span>blast {String(cand.blastModules)} mod</span>
        <span className="ml-auto" style={{ color: tierColor }}>
          conf {(cand.confidence * 100).toFixed(0)}%
        </span>
      </div>
    </button>
  );
}
