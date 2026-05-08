import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { classifierStats, type Confusion } from './statsKit';
import { useV2 } from './tokens';
import { V2Card, SectionTitle } from './primitives';

// Per-rule calibration card. Shows a confusion matrix and the derived
// precision / recall / F1 / FPR for every rule that fires often enough
// for those numbers to be stable. Treats each PR firing as a "predicted
// positive" (would block) and uses the retrospective ground-truth label
// (PR was actually problematic) to score it.
//
// Why these four together:
//   precision = of the PRs we blocked, how many were actually bad?
//                (anything < ~0.7 means the rule annoys engineers)
//   recall    = of the bad PRs, how many did we catch?
//                (anything < ~0.6 means the rule misses real defects)
//   F1        = the harmonic mean — single number for "did we calibrate?"
//   FPR       = of the *good* PRs, how often did we wrongly block?
//                (< 0.05 is the usual budget for blocking gates)

type RuleRow = {
  id: string;
  label: string;
  confusion: Confusion;
};

type Props = {
  rows: RuleRow[];
  // Sort by F1 desc by default (best calibrated first); pass 'fpr' to
  // surface the worst false-positive rules at the top.
  sortBy?: 'f1' | 'fpr';
};

export function RuleCalibrationCard({ rows, sortBy = 'f1' }: Props) {
  const { t } = useTranslation('admission');
  const v = useV2();

  const sorted = useMemo(() => {
    const scored = rows.map((r) => ({
      ...r,
      stats: classifierStats(r.confusion),
    }));
    scored.sort((a, b) => {
      if (sortBy === 'fpr') return b.stats.fpr - a.stats.fpr;
      return b.stats.f1 - a.stats.f1;
    });
    return scored;
  }, [rows, sortBy]);

  return (
    <V2Card className="p-4">
      <SectionTitle icon={Target}>
        {t('calibration.title', { defaultValue: 'Rule calibration' })}
      </SectionTitle>

      <div className="text-[9px] font-mono mt-0.5"
           style={{ color: v.textFaint }}>
        {t('calibration.sub', {
          defaultValue: 'precision · recall · F1 · false-positive rate',
        })}
      </div>

      {/* Header row */}
      <div
        className="grid grid-cols-[1fr_repeat(4,40px)] gap-2 mt-3 pb-1 border-b text-[8.5px] font-black uppercase tracking-[0.16em]"
        style={{
          borderColor: v.borderSoft,
          color: v.textFaint,
        }}
      >
        <span>{t('calibration.col.rule', { defaultValue: 'Rule' })}</span>
        <span className="text-right">P</span>
        <span className="text-right">R</span>
        <span className="text-right">F1</span>
        <span className="text-right">FPR</span>
      </div>

      <div className="mt-1 max-h-[240px] overflow-y-auto scrollbar-hide divide-y"
           style={{ borderColor: v.borderSoft }}>
        {sorted.map((r) => (
          <Row key={r.id} row={r} v={v} />
        ))}
        {sorted.length === 0 && (
          <div className="text-[10px] italic py-4 text-center"
               style={{ color: v.textFaint }}>
            {t('calibration.empty', {
              defaultValue: 'No rules with enough samples to calibrate yet.',
            })}
          </div>
        )}
      </div>
    </V2Card>
  );
}

function Row({
  row, v,
}: {
  row: RuleRow & { stats: ReturnType<typeof classifierStats> };
  v: ReturnType<typeof useV2>;
}) {
  const { stats } = row;
  const { tp, fp, fn, tn } = row.confusion;

  // Color scoring — F1 colors follow the same warning bands as our
  // overall verdict palette. FPR follows the inverse (low = good).
  const f1Color =
    stats.f1 >= 0.8 ? v.ok :
    stats.f1 >= 0.6 ? '#c5a155' :
    stats.f1 >= 0.4 ? '#d98a85' :
                      '#a83a3f';
  const fprColor =
    stats.fpr <= 0.05 ? v.ok :
    stats.fpr <= 0.10 ? '#c5a155' :
    stats.fpr <= 0.20 ? '#d98a85' :
                        '#a83a3f';

  return (
    <div className="grid grid-cols-[1fr_repeat(4,40px)] gap-2 py-1.5 text-[10.5px] font-mono items-baseline">
      <div className="min-w-0">
        <div className="truncate font-bold" style={{ color: v.textBody }}>
          {row.label}
        </div>
        <div className="text-[8.5px] mt-0.5"
             style={{ color: v.textFaint }}>
          tp {tp} · fp {fp} · fn {fn} · tn {tn}
        </div>
      </div>
      <span className="text-right tabular-nums" style={{ color: v.textBody }}>
        {(stats.precision * 100).toFixed(0)}
      </span>
      <span className="text-right tabular-nums" style={{ color: v.textBody }}>
        {(stats.recall * 100).toFixed(0)}
      </span>
      <span
        className="text-right tabular-nums font-bold"
        style={{ color: f1Color }}
      >
        {stats.f1.toFixed(2)}
      </span>
      <span
        className="text-right tabular-nums"
        style={{ color: fprColor }}
      >
        {(stats.fpr * 100).toFixed(1)}
      </span>
    </div>
  );
}
