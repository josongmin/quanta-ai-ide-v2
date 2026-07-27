import { useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe2, Check, AlertTriangle, X, ShieldCheck, Award, Lock, FileWarning,
} from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Section, Row, Toggle, Button } from '@shared/ui/forms';
import { ModalBackdrop, useDialogA11y } from '@shared/ui';

type RegionId = 'us' | 'eu' | 'apac';

type Region = {
  id: RegionId;
  letters: string;
  nameKey: string;
  centers: string;
  latency: string;
  // `null` = not active; rendered as a localized placeholder.
  storedSummary: string | null;
};

const REGIONS: Region[] = [
  { id: 'us',   letters: 'US', nameKey: 'dataResidency.region.us',   centers: 'Virginia · Oregon',  latency: '32 ms',  storedSummary: '2.4 TB · 18,402 sessions' },
  { id: 'eu',   letters: 'EU', nameKey: 'dataResidency.region.eu',   centers: 'Frankfurt · Dublin', latency: '94 ms',  storedSummary: null },
  { id: 'apac', letters: 'AP', nameKey: 'dataResidency.region.apac', centers: 'Tokyo · Singapore',  latency: '141 ms', storedSummary: null },
];

const CERTS_BY_REGION: Record<RegionId, string[]> = {
  us:   ['SOC 2 Type II', 'ISO 27001', 'HIPAA-eligible', 'FedRAMP Moderate'],
  eu:   ['SOC 2 Type II', 'ISO 27001', 'C5', 'GDPR'],
  apac: ['SOC 2 Type II', 'ISO 27001', 'IRAP'],
};

export default function DataResidencyPage() {
  const { t } = useTranslation('org');
  const [active, setActive] = useState<RegionId>('us');
  const [pending, setPending] = useState<RegionId | null>(null);
  const [noCrossReplica, setNoCrossReplica] = useState(false);
  const [blockExport, setBlockExport] = useState(true);

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title={t('dataResidency.title')}
      subtitle={t('dataResidency.subtitle')}
    >
      <div
        className="px-5 py-4 rounded-lg mb-6 flex items-start gap-3"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <Globe2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--fg-accent)' }} />
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {t('dataResidency.controls.title')}
          </span>
          <span className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            {t('dataResidency.controls.body')}
          </span>
        </div>
      </div>

      <Section title={t('dataResidency.region.title')} hint={t('dataResidency.region.hint')}>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {REGIONS.map((r) => {
            const isActive = r.id === active;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => { if (!isActive) setPending(r.id); }}
                className="flex flex-col gap-2.5 p-4 rounded-lg text-left transition-colors"
                style={{
                  background: isActive ? 'var(--bg-active)' : 'var(--bg-canvas)',
                  border: `1px solid ${isActive ? 'var(--fg-accent)' : 'var(--border-default)'}`,
                  cursor: isActive ? 'default' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-canvas)'; }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center text-sm font-black"
                    style={{
                      background: 'var(--bg-surface-muted)',
                      color: 'var(--fg-strong)',
                      border: '1px solid var(--border-muted)',
                    }}
                  >
                    {r.letters}
                  </div>
                  {isActive && (
                    <span
                      className="inline-flex items-center gap-1 text-xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        background: 'var(--intent-success-bg)',
                        color: 'var(--intent-success-fg)',
                        border: '1px solid var(--intent-success-fg)',
                      }}
                    >
                      <Check className="w-2.5 h-2.5" />
                      {t('dataResidency.region.selected')}
                    </span>
                  )}
                </div>
                <span className="text-lg font-semibold" style={{ color: 'var(--fg-strong)' }}>{t(r.nameKey)}</span>
                <div className="flex flex-col gap-1.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
                  <Stat label={t('dataResidency.region.dataCenters')} value={r.centers} />
                  <Stat label={t('dataResidency.region.latency')} value={r.latency} />
                  <Stat label={t('dataResidency.region.stored')} value={r.storedSummary ?? t('dataResidency.region.notActive')} />
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t('dataResidency.settings.title')} hint={t('dataResidency.settings.hint')}>
        <Row label={t('dataResidency.settings.noCrossReplica')} sub={t('dataResidency.settings.noCrossReplicaSub')}>
          <Toggle checked={noCrossReplica} onChange={setNoCrossReplica} />
        </Row>
        <Row label={t('dataResidency.settings.blockExport')} sub={t('dataResidency.settings.blockExportSub')}>
          <Toggle checked={blockExport} onChange={setBlockExport} />
        </Row>
      </Section>

      <Section title={t('dataResidency.certs.title')} hint={t('dataResidency.certs.hint')}>
        <div className="flex flex-wrap gap-2 pt-2">
          {CERTS_BY_REGION[active].map((c) => (
            <CertBadge key={c} label={c} Icon={c.startsWith('SOC') ? ShieldCheck : c.startsWith('FedRAMP') ? Lock : Award} />
          ))}
        </div>
      </Section>

      <p className="text-sm mt-6 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <FileWarning className="w-3 h-3 mt-0.5 shrink-0" />
        {t('dataResidency.footer')}
      </p>

      {pending && (
        <ConfirmMigration
          from={REGIONS.find((r) => r.id === active)!}
          to={REGIONS.find((r) => r.id === pending)!}
          onCancel={() => { setPending(null); }}
          onConfirm={() => { setActive(pending); setPending(null); }}
        />
      )}
    </OrgShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ color: 'var(--fg-subtle)' }}>{label}</span>
      <span className="font-mono text-sm" style={{ color: 'var(--fg-default)' }}>{value}</span>
    </div>
  );
}

function CertBadge({
  label, Icon,
}: { label: string; Icon: React.ComponentType<{ className?: string; style?: CSSProperties }> }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-sm font-medium"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
        color: 'var(--fg-default)',
      }}
    >
      <Icon className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
      {label}
    </span>
  );
}

function ConfirmMigration({
  from, to, onCancel, onConfirm,
}: { from: Region; to: Region; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation('org');
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onCancel);
  const toName = t(to.nameKey);
  const fromName = t(from.nameKey);
  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} label={t('common.closeDialog')} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('dataResidency.migration.ariaLabel', { region: toName })}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] rounded-lg overflow-hidden outline-none"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-warn-fg)' }} />
            <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {t('dataResidency.migration.title', { region: toName })}
            </span>
          </div>
          <button type="button" onClick={onCancel} aria-label={t('common.close')} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <p className="text-base leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            {t('dataResidency.migration.bodyPre')}<strong style={{ color: 'var(--fg-strong)' }}>{fromName}</strong>{t('dataResidency.migration.bodyMid')}<strong style={{ color: 'var(--fg-strong)' }}>{toName}</strong>{t('dataResidency.migration.bodyPost')}
          </p>
          <ul className="flex flex-col gap-1.5 text-sm p-3 rounded-md"
            style={{ background: 'var(--intent-warn-bg)', border: '1px solid var(--intent-warn-fg)', color: 'var(--intent-warn-fg)' }}
          >
            <li>{t('dataResidency.migration.downtime')}</li>
            <li>{t('dataResidency.migration.cost')}</li>
            <li>{t('dataResidency.migration.sessions')}</li>
            <li>{t('dataResidency.migration.rollback')}</li>
          </ul>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>{t('dataResidency.migration.cancel')}</Button>
          <Button variant="primary" size="md" onClick={onConfirm}>{t('dataResidency.migration.confirm')}</Button>
        </div>
      </div>
    </>
  );
}
