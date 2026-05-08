import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import type { Confidence, RepoData } from '@entities/repo';
import type { PullRequest } from '@entities/pr';
import { useOverlay } from '@features/apply-overlay';
import { useTranslation } from '@shared/i18n';
import { RiskProfileCard } from './OverviewTab';

type Props = {
  pr: PullRequest;
  repo: RepoData;
  isDark: boolean;
};

// Risk tab is informational. The Overview card is the same component (so
// the headline numbers stay consistent), and below it we expand to a
// per-file table so a reviewer can drill in to specific outliers.

export default function RiskTab({ pr, repo, isDark }: Props) {
  return (
    <div className="space-y-6">
      <RiskProfileCard pr={pr} repo={repo} isDark={isDark} />
      <PerFileTable pr={pr} repo={repo} isDark={isDark} />
    </div>
  );
}

// ─── Per-file table ─────────────────────────────────────────────────────

type Row = {
  path: string;
  fileId: number | null;
  blastRadius: number;
  fanIn: number;
  editSafety: number;
  coverage: number;
  confidence: Confidence;
};

function PerFileTable({
  pr, repo, isDark,
}: {
  pr: PullRequest;
  repo: RepoData;
  isDark: boolean;
}) {
  const overlay = useOverlay();
  const { t } = useTranslation('review');
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = pr.files.map((f) => {
      if (f.fileId === null) {
        return {
          path: f.path,
          fileId: null,
          blastRadius: 0, fanIn: 0, editSafety: 0, coverage: 0,
          confidence: 'unknown',
        };
      }
      const file = repo.files[f.fileId];
      if (!file) {
        return {
          path: f.path,
          fileId: f.fileId,
          blastRadius: 0, fanIn: 0, editSafety: 0, coverage: 0,
          confidence: 'unknown',
        };
      }
      const m = file.metrics;
      return {
        path: f.path,
        fileId: f.fileId,
        blastRadius: m.blastRadius,
        fanIn: m.fanIn,
        editSafety: m.editSafety,
        coverage: m.lineCoverage,
        confidence: m.confidence,
      };
    });
    // Sort by editSafety asc — risky files first.
    out.sort((a, b) => a.editSafety - b.editSafety);
    return out;
  }, [pr.files, repo]);

  const card = isDark
    ? 'bg-white/[0.04] border-white/10'
    : 'bg-white border-black/5';
  const muted = 'text-[color:var(--fg-muted)]';
  const fg = 'text-[color:var(--fg-strong)]';
  const sep = isDark ? 'divide-white/5' : 'divide-black/5';
  const header = 'text-[color:var(--fg-subtle)]';

  // First file with a real fileId — drives the "Blast preview" CTA so the
  // user lands on a meaningful seed when they switch back to Intelligence.
  const seedRow = rows.find((r) => r.fileId !== null) ?? null;

  return (
    <section className={`rounded-xl border ${card}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[color:var(--border-muted)]">
        <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${header}`}>
          Per-file risk
        </div>
        {seedRow?.fileId != null && (
          <button
            type="button"
            onClick={() => {
              if (seedRow.fileId !== null) overlay.setBlastSeed(seedRow.fileId);
            }}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold ${
              isDark
                ? 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]'
                : 'bg-black/[0.05] text-black/70 hover:bg-black/[0.08]'
            }`}
            title={t('risk.seedTitle')}
          >
            <Sparkles className="w-3 h-3" />
            Blast preview
          </button>
        )}
      </div>

      <div className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${header}`}>
        <span>{t('risk.headers.file')}</span>
        <span className="text-right">{t('risk.headers.blast')}</span>
        <span className="text-right">{t('risk.headers.fanIn')}</span>
        <span className="text-right">{t('risk.headers.editSafety')}</span>
        <span className="text-right">{t('risk.headers.coverage')}</span>
        <span className="text-right">{t('risk.headers.confidence')}</span>
      </div>

      <div className={`divide-y ${sep}`}>
        {rows.length === 0 && (
          <div className={`px-4 py-3 text-[11px] ${muted}`}>{t('empty.noFiles')}</div>
        )}
        {rows.map((r) => (
          <div
            key={r.path}
            className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-4 py-1.5 items-center text-[11px] font-mono ${fg}`}
          >
            <span className="truncate" title={r.path}>{r.path}</span>
            <span className="text-right tabular-nums">{r.blastRadius}</span>
            <span className="text-right tabular-nums">{r.fanIn}</span>
            <span className="text-right">
              <SafetyDot value={r.editSafety} />
              <span className="ml-1.5 tabular-nums">{r.editSafety}</span>
            </span>
            <span className="text-right tabular-nums">{r.coverage}%</span>
            <span className="text-right">
              <ConfidencePill c={r.confidence} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SafetyDot({ value }: { value: number }) {
  const color =
    value >= 70 ? '#5fa86c'
    : value >= 40 ? '#a8893a'
    : '#c25a55';
  return (
    <span
      className="inline-block w-2 h-2 rounded-full align-middle"
      style={{ background: color }}
    />
  );
}

function ConfidencePill({ c }: { c: Confidence }) {
  const meta = CONF_META[c];
  return (
    <span
      className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{ background: `${meta.color}26`, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

const CONF_META: Record<Confidence, { label: string; color: string }> = {
  exact:      { label: 'Exact',     color: '#5fa86c' },
  overapprox: { label: 'Approx',    color: '#a8893a' },
  stale:      { label: 'Stale',     color: '#a8893a' },
  unknown:    { label: 'Unknown',   color: '#8b949e' },
};
