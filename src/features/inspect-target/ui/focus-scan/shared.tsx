// ─── shared primitives used across 2+ tabs of the FocusScan panel ────────
//
// These are the unchanged primitives that the original FocusScanPanel.tsx
// kept colocated at the bottom of the file. They are pulled out here so the
// individual tab files can import them without duplication.

import type { Confidence } from '@entities/repo';
import { Badge as SharedBadge, type BadgeVariant } from '@shared/ui/Badge';

// SectionHeader — used by Profile, Graph, Risk (ChannelHits), Proof.
export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <div
        className="text-2xs font-black uppercase tracking-eyebrow"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {title}
      </div>
      {sub && (
        <div
          className="text-2xs mt-0.5"
          style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
        >{sub}</div>
      )}
    </div>
  );
}

// Note — soft callout box used by RiskTab to frame the blast hop list.
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3 py-2.5 rounded-xl border text-xs leading-relaxed"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
        color: 'var(--fg-muted)',
      }}
    >
      {children}
    </div>
  );
}

// MiniStat — label/value row used in Profile, Graph, Risk stat grids.
export function MiniStat({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-xs" style={{ color: 'var(--fg-muted)' }}>
      <span>{label}</span>
      <span
        className={`font-bold tabular-nums ${valueClass ?? ''}`}
        style={valueClass ? undefined : { color: 'var(--fg-default)' }}
      >{value}</span>
    </div>
  );
}

// Section — titled list group used by RiskTab to render blast-hop sections.
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-2xs font-black uppercase tracking-eyebrow mb-1.5"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// Empty — italicised placeholder shown when a list is empty.
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs italic px-2 py-1"
      style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
    >{children}</div>
  );
}

// Badge — status/confidence/safety chip used by the panel header. Delegates
// to the shared <Badge>, mapping the panel's kind/severity to a Badge variant
// so the colour encoding stays consistent with the rest of shared/ui. Outline
// fill (default) keeps the label-against-surface read the panel relied on.
export function Badge({
  children, kind, conf, safety,
}: {
  children: React.ReactNode;
  kind: 'STABLE' | 'MODIFIED' | 'NEW' | 'SECURITY_ALERT' | 'confidence' | 'safety';
  conf?: Confidence;
  safety?: number;
}) {
  let variant: BadgeVariant = 'neutral';
  if (kind === 'confidence' && conf) {
    variant =
      conf === 'exact'      ? 'success' :
      conf === 'overapprox' ? 'warn'    :
      conf === 'unknown'    ? 'danger'  :
                              'neutral';
  } else if (kind === 'safety' && safety !== undefined) {
    variant =
      safety >= 70 ? 'success' :
      safety >= 40 ? 'warn'    :
                     'danger';
  } else if (kind === 'SECURITY_ALERT') {
    variant = 'danger';
  } else if (kind === 'NEW' || kind === 'MODIFIED') {
    variant = 'success';
  }

  return <SharedBadge variant={variant}>{children}</SharedBadge>;
}
