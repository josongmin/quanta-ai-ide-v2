import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GlassCard,
  SectionHeader,
  Section,
  EmptyHint,
} from '@shared/ui';
import type {
  OwnershipZone,
  Person,
  PersonId,
} from '@entities/ownership';
import {
  OwnerSplit,
  RoleColumn,
  ImpactNarrativeStrip,
  StalePrimaryBanner,
  ConfidencePanel,
  ReviewerRow,
  OwnershipLayer,
} from './routing-card/parts';

export type RoutingCardProps = {
  zone: OwnershipZone;
  people: Person[];
}

export function RoutingCard({ zone, people }: RoutingCardProps): JSX.Element {
  const { t } = useTranslation('ownership');
  const [signalsOpen, setSignalsOpen] = useState(false);

  const personIndex = useMemo(() => {
    const m = new Map<PersonId, Person>();
    for (const p of people) m.set(p.id, p);
    return m;
  }, [people]);

  const resolve = (id: PersonId | null | undefined): Person | undefined =>
    id ? personIndex.get(id) : undefined;

  if (!zone?.id || !zone.label) {
    return (
      <GlassCard className="px-3.5 py-3">
        <SectionHeader title={t('routing.title')} />
        <EmptyHint text={t('routing.empty')} />
      </GlassCard>
    );
  }

  const badge =
    zone.label.length > 28 ? `${zone.label.slice(0, 26)}…` : zone.label;

  const implementer = resolve(zone.implementationOwner);
  const approver = resolve(zone.approvalOwner);
  const primary = resolve(zone.primary);
  const backup = resolve(zone.backup);
  const reviewer = resolve(zone.recommendedReviewer);
  const escalation = resolve(zone.escalation);

  return (
    <GlassCard className="px-3.5 py-3 space-y-3.5">
      <SectionHeader title={t('routing.title')} badge={badge.toUpperCase()} />

      {primary && !primary.active && (
        <StalePrimaryBanner
          primary={primary}
          escalation={escalation ?? backup ?? reviewer}
        />
      )}

      <OwnerSplit implementer={implementer} approver={approver} />

      <div className="grid grid-cols-4 gap-3">
        <RoleColumn label={t('routing.rolePrimary')} person={primary} dimmed={primary && !primary.active} />
        <RoleColumn label={t('routing.roleBackup')} person={backup} />
        <RoleColumn label={t('routing.roleReviewer')} person={reviewer} />
        <RoleColumn label={t('routing.roleEscalation')} person={escalation} />
      </div>

      <div
        className="h-px w-full"
        style={{ background: 'var(--border-muted)' }}
      />

      <ImpactNarrativeStrip narrative={zone.impactNarrative} />

      <ConfidencePanel value={zone.routingConfidence} />

      <div
        className="h-px w-full"
        style={{ background: 'var(--border-muted)' }}
      />

      <Section
        title={t('routing.whyReviewer')}
        subtitle={reviewer ? reviewer.name : undefined}
      >
        <ReviewerRow rationale={zone.reviewerRationale} />
      </Section>

      <div>
        <button
          type="button"
          onClick={() => { setSignalsOpen((s) => !s); }}
          className="w-full flex items-center gap-2 px-0.5 py-1 rounded-md hover:[background:var(--bg-hover)] transition-colors"
          aria-expanded={signalsOpen}
        >
          <span
            className="text-2xs font-black uppercase tracking-eyebrow"
            style={{ color: 'var(--fg-muted)' }}
          >
            {t('routing.ownershipSignals')}
          </span>
          <span
            className="flex-1 h-px"
            style={{ background: 'var(--border-muted)' }}
          />
          <span
            className="text-2xs font-mono tabular-nums"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {zone.scores.length}
          </span>
          <span
            className="text-xs font-mono"
            style={{ color: 'var(--fg-subtle)' }}
            aria-hidden="true"
          >
            {signalsOpen ? '−' : '+'}
          </span>
        </button>
        {signalsOpen && (
          <div className="mt-2">
            <GlassCard tone="inner" className="px-3 py-2.5">
              <OwnershipLayer scores={zone.scores} resolve={resolve} />
            </GlassCard>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
