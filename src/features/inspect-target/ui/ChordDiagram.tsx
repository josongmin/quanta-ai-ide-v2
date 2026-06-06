import { useMemo } from 'react';
import type { RepoData } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import { formatNumber } from '@shared/lib';

// Top coupling list — replaces the chord diagram, which proved unreadable
// at panel scale. Same underlying question ("who imports whom across
// modules?"), but expressed the way SonarQube, IntelliJ's Module
// Dependencies, and GitHub Insights all express it: a ranked horizontal-
// bar list of the heaviest module-to-module pairs.
//
// The advantages of this format here:
//   - one row, one fact: "features → shared, 142 imports"
//   - the heaviest pair is always at top — no scanning required
//   - bars are normalized to the heaviest pair so relative weight reads
//     instantly without legends or color decoding
//
// We bucket by *second-level under src* (features, shared, widgets,
// entities, …) plus top-level for non-src (vendor, tests). This is the
// granularity refactors actually happen at — pulling a coupling apart
// between two folders, not between two files.

type Props = {
  repo: RepoData;
  isDark: boolean;
  size?: number;
};

type Pair = { from: string; to: string; n: number };

const TOP_N = 8;

export default function ChordDiagram({ repo, size = 280 }: Props) {
  const { t } = useTranslation('inspect');

  const data = useMemo(() => {
    const bucket = (folderPath: string) => {
      const parts = folderPath.split('.').filter(Boolean);
      if (parts.length === 0) return 'root';
      const top = parts[0];
      if (top === 'src' && parts.length >= 2) return parts[1];
      return top;
    };

    const fileBucket = new Map<number, string>();
    for (const f of repo.files) fileBucket.set(f.id, bucket(f.folderPath));

    const pairCount = new Map<string, number>();
    let totalEdges = 0;
    for (const f of repo.files) {
      // Invariant: every file in repo.files was inserted into fileBucket
      // (keyed by f.id) in the loop above, so this lookup is always defined.
      const a = fileBucket.get(f.id)!;
      for (const tid of f.deps) {
        const b = fileBucket.get(tid);
        if (!b || a === b) continue;
        const key = `${a}${b}`;
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
        totalEdges++;
      }
    }

    const pairs: Pair[] = Array.from(pairCount.entries()).map(([k, n]) => {
      const [from, to] = k.split('');
      return { from, to, n };
    });
    pairs.sort((a, b) => b.n - a.n);

    const top = pairs.slice(0, TOP_N);
    const max = top[0]?.n ?? 1;
    const remaining = pairs.slice(TOP_N).reduce((a, p) => a + p.n, 0);
    const buckets = new Set<string>();
    pairs.forEach((p) => { buckets.add(p.from); buckets.add(p.to); });

    return { top, max, totalEdges, remaining, bucketsCount: buckets.size };
  }, [repo]);

  const rowH = 22;
  const headerH = 16;
  const totalH = headerH + data.top.length * rowH + 12;

  const labelMaxLen = 11;
  const truncate = (s: string) =>
    s.length > labelMaxLen ? `${s.slice(0, labelMaxLen - 1)}…` : s;

  return (
    <div className="flex flex-col items-stretch w-full" style={{ width: size }}>
      {/* Column header */}
      <div
        className="flex items-center text-[8px] font-black uppercase tracking-[var(--track-eyebrow)] pb-1 border-b"
        style={{
          color: 'var(--fg-subtle)',
          borderColor: 'var(--border-muted)',
          height: headerH,
        }}
      >
        <span className="w-[42%] truncate">
          {t('deps.coupling.from', { defaultValue: 'From' })}
        </span>
        <span className="w-[6%] text-center opacity-60">→</span>
        <span className="w-[42%] truncate">
          {t('deps.coupling.to', { defaultValue: 'To' })}
        </span>
        <span className="w-[10%] text-right tabular-nums">
          {t('deps.coupling.imports', { defaultValue: 'imp' })}
        </span>
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {data.top.map((p, i) => {
          const ratio = p.n / data.max;
          return (
            <div
              key={`${p.from}>${p.to}-${i}`}
              className="relative flex items-center"
              style={{ height: rowH }}
            >
              {/* Background bar — fills row right-to-left up to ratio.
                  Sits *behind* the text so labels never get obscured. */}
              <div
                className="absolute inset-y-1 left-0 rounded-sm pointer-events-none"
                style={{
                  width: `${Math.max(2, ratio * 100)}%`,
                  background: 'var(--bg-active)',
                }}
              />
              <span
                className="relative w-[42%] text-sm font-mono font-semibold truncate pl-1"
                style={{ color: 'var(--fg-default)' }}
                title={p.from}
              >
                {truncate(p.from)}
              </span>
              <span
                className="relative w-[6%] text-center text-[10px]"
                style={{ color: 'var(--fg-subtle)' }}
              >
                →
              </span>
              <span
                className="relative w-[42%] text-sm font-mono font-semibold truncate"
                style={{ color: 'var(--fg-default)' }}
                title={p.to}
              >
                {truncate(p.to)}
              </span>
              <span
                className="relative w-[10%] text-right text-[10px] font-mono font-bold tabular-nums pr-1"
                style={{ color: 'var(--fg-default)' }}
              >
                {p.n}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tail summary if we truncated */}
      {data.remaining > 0 && (
        <div
          className="text-[9px] mt-1.5 pt-1.5 border-t border-dashed"
          style={{ color: 'var(--fg-subtle)', borderColor: 'var(--border-muted)' }}
        >
          {t('deps.coupling.remaining', {
            n: formatNumber(data.remaining),
            defaultValue: `+ ${formatNumber(data.remaining)} more imports across smaller pairs`,
          })}
        </div>
      )}

      <div
        className="text-[9px] uppercase tracking-[var(--track-eyebrow)] mt-2 text-center"
        style={{ color: 'var(--fg-subtle)', minHeight: Math.max(0, size - totalH) }}
      >
        {t('deps.couplingSummary', {
          buckets: data.bucketsCount,
          edges: formatNumber(data.totalEdges),
          defaultValue: `${data.bucketsCount} modules · ${formatNumber(data.totalEdges)} cross-module imports`,
        })}
      </div>
    </div>
  );
}
