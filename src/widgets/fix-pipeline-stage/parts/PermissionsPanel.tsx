import type { TFunction } from 'i18next';
import type { PermissionLedger } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  permissions: PermissionLedger;
  t: TFunction;
};

// Gradual-permission mode — visible so the user understands *why* the
// gate may be holding at human-required. Without this panel the rule
// looks arbitrary; with it, the user sees a path to graduation.
export function PermissionsPanel({ permissions, t }: Props) {
  const ratio = Math.min(1, permissions.successfulRuns / permissions.graduationThreshold);
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader
        title={t('permissions.header')}
        badge={permissions.graduated ? t('permissions.graduated') : t('permissions.gated')}
      />

      <div className="text-[11px] mt-1" style={{ color: 'var(--fg-default)' }}>
        {permissions.graduated
          ? t('permissions.graduatedHint')
          : t('permissions.gatedHint', {
              done: permissions.successfulRuns,
              total: permissions.graduationThreshold,
            })}
      </div>

      <div
        className="mt-2 h-1 w-full rounded-full overflow-hidden"
        style={{ background: 'var(--bg-surface-muted)' }}
      >
        <div
          className="h-full"
          style={{
            width: `${(ratio * 100).toFixed(0)}%`,
            background: permissions.graduated ? 'var(--intent-success-vivid)' : 'var(--fg-default)',
          }}
        />
      </div>
    </GlassCard>
  );
}
