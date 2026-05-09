import type { TFunction } from 'i18next';
import type { ReanalysisSnapshot } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  snapshot: ReanalysisSnapshot;
  t: TFunction;
};

// Post-patch re-analysis — show before vs after for taint paths, blast,
// hotspot. MVP runs on a mock; real impl re-runs the static engine
// against a virtual tree. Latency is the real constraint, but a cached
// snapshot lets the UI prove the loop is honest about delta.
export function ReanalysisPanel({ snapshot, t }: Props) {
  const ran = snapshot.ranAt !== null;
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader
        title={t('reanalysis.header')}
        badge={ran ? t('reanalysis.ran') : t('reanalysis.predicted')}
      />

      <div className="grid grid-cols-3 gap-2 mt-2">
        <DeltaCell
          label={t('reanalysis.taintPaths')}
          before={snapshot.before.taintPaths}
          after={snapshot.after.taintPaths}
        />
        <DeltaCell
          label={t('reanalysis.blastModules')}
          before={snapshot.before.blastModules}
          after={snapshot.after.blastModules}
        />
        <DeltaCell
          label={t('reanalysis.hotspot')}
          before={snapshot.before.hotspotScore}
          after={snapshot.after.hotspotScore}
        />
      </div>
    </GlassCard>
  );
}

function DeltaCell({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  const arrow = delta < 0 ? '↓' : delta > 0 ? '↑' : '·';
  return (
    <div className="rounded-md px-2 py-1.5" style={{ background: 'var(--bg-surface-muted)' }}>
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </div>
      <div
        className="text-[12px] font-mono mt-0.5 flex items-baseline gap-1"
        style={{ color: 'var(--fg-strong)' }}
      >
        <span style={{ color: 'var(--fg-muted)' }}>{before.toString()}</span>
        <span>→</span>
        <span>{after.toString()}</span>
        <span className="ml-auto text-[10px]" style={{ color: 'var(--fg-muted)' }}>{arrow}</span>
      </div>
    </div>
  );
}
