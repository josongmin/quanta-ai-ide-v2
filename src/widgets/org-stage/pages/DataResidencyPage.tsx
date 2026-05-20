import { useState, type CSSProperties } from 'react';
import {
  Globe2, Check, AlertTriangle, X, ShieldCheck, Award, Lock, FileWarning,
} from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Section, Row, Toggle, Button } from '@shared/ui/forms';

type RegionId = 'us' | 'eu' | 'apac';

type Region = {
  id: RegionId;
  letters: string;
  name: string;
  centers: string;
  latency: string;
  storedSummary: string;
};

const REGIONS: Region[] = [
  { id: 'us',   letters: 'US', name: 'United States', centers: 'Virginia · Oregon',     latency: '32 ms',  storedSummary: '2.4 TB · 18,402 sessions' },
  { id: 'eu',   letters: 'EU', name: 'Europe',        centers: 'Frankfurt · Dublin',    latency: '94 ms',  storedSummary: '— not active —' },
  { id: 'apac', letters: 'AP', name: 'Asia-Pacific',  centers: 'Tokyo · Singapore',     latency: '141 ms', storedSummary: '— not active —' },
];

const CERTS_BY_REGION: Record<RegionId, string[]> = {
  us:   ['SOC 2 Type II', 'ISO 27001', 'HIPAA-eligible', 'FedRAMP Moderate'],
  eu:   ['SOC 2 Type II', 'ISO 27001', 'C5', 'GDPR'],
  apac: ['SOC 2 Type II', 'ISO 27001', 'IRAP'],
};

export default function DataResidencyPage() {
  const [active, setActive] = useState<RegionId>('us');
  const [pending, setPending] = useState<RegionId | null>(null);
  const [noCrossReplica, setNoCrossReplica] = useState(false);
  const [blockExport, setBlockExport] = useState(true);

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title="Data residency"
      subtitle="Choose where ACME data is processed and stored."
    >
      <div
        className="px-5 py-4 rounded-lg mb-6 flex items-start gap-3"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <Globe2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--fg-accent)' }} />
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
            What residency controls
          </span>
          <span className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Source code, agent runs, secrets, and audit logs are stored in the selected region. Authentication metadata
            (email, tenant ID) lives in our global control plane. Switching regions triggers a one-time migration with
            a coordinated cutover.
          </span>
        </div>
      </div>

      <Section title="Active region" hint="Click another region to request migration.">
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
                    className="w-9 h-9 rounded-md flex items-center justify-center text-[11px] font-black"
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
                      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        background: 'var(--intent-success-bg)',
                        color: 'var(--intent-success-fg)',
                        border: '1px solid var(--intent-success-fg)',
                      }}
                    >
                      <Check className="w-2.5 h-2.5" />
                      Selected
                    </span>
                  )}
                </div>
                <span className="text-[14px] font-semibold" style={{ color: 'var(--fg-strong)' }}>{r.name}</span>
                <div className="flex flex-col gap-1.5 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                  <Stat label="Data centers" value={r.centers} />
                  <Stat label="Latency from you" value={r.latency} />
                  <Stat label="Currently stored" value={r.storedSummary} />
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Residency settings" hint="Stricter controls for regulated workloads.">
        <Row label="Disable cross-region replication" sub="Backups stay in the selected region only. Increases the risk of total data loss in a region-wide outage.">
          <Toggle checked={noCrossReplica} onChange={setNoCrossReplica} />
        </Row>
        <Row label="Block data export to other regions" sub="CSV exports, agent calls, and webhook deliveries can only target endpoints in the same region.">
          <Toggle checked={blockExport} onChange={setBlockExport} />
        </Row>
      </Section>

      <Section title="Compliance certifications" hint="Audited by independent third parties. Reports available on request.">
        <div className="flex flex-wrap gap-2 pt-2">
          {CERTS_BY_REGION[active].map((c) => (
            <CertBadge key={c} label={c} Icon={c.startsWith('SOC') ? ShieldCheck : c.startsWith('FedRAMP') ? Lock : Award} />
          ))}
        </div>
      </Section>

      <p className="text-[11px] mt-6 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <FileWarning className="w-3 h-3 mt-0.5 shrink-0" />
        Region changes are recorded in the audit log and notified to all owners and admins.
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
      <span className="font-mono text-[11px]" style={{ color: 'var(--fg-default)' }}>{value}</span>
    </div>
  );
}

function CertBadge({
  label, Icon,
}: { label: string; Icon: React.ComponentType<{ className?: string; style?: CSSProperties }> }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-medium"
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
  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 z-40 bg-transparent border-0 p-0 cursor-default"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onCancel}
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-warn-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Request migration to {to.name}?
            </span>
          </div>
          <button type="button" onClick={onCancel} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            We&apos;ll snapshot all org data in <strong style={{ color: 'var(--fg-strong)' }}>{from.name}</strong>,
            replicate it to <strong style={{ color: 'var(--fg-strong)' }}>{to.name}</strong>,
            then perform a coordinated cutover.
          </p>
          <ul className="flex flex-col gap-1.5 text-[11px] p-3 rounded-md"
            style={{ background: 'var(--intent-warn-bg)', border: '1px solid var(--intent-warn-fg)', color: 'var(--intent-warn-fg)' }}
          >
            <li>· Estimated downtime: <strong>~12 minutes</strong> during cutover (scheduled off-hours)</li>
            <li>· One-time data transfer cost: <strong>$420</strong> billed to current invoice</li>
            <li>· Active sessions are signed out at cutover</li>
            <li>· Rollback window: 7 days post-migration</li>
          </ul>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="md" onClick={onConfirm}>Request migration</Button>
        </div>
      </div>
    </>
  );
}
