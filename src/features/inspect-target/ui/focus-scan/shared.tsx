// ─── shared primitives used across 2+ tabs of the FocusScan panel ────────
//
// These are the unchanged primitives that the original FocusScanPanel.tsx
// kept colocated at the bottom of the file. They are pulled out here so the
// individual tab files can import them without duplication.

import type { Confidence } from '@entities/repo';

// SectionHeader — used by Profile, Graph, Risk (ChannelHits), Proof.
export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {title}
      </div>
      {sub && (
        <div
          className="text-[9px] mt-0.5"
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
      className="px-3 py-2.5 rounded-xl border text-[10px] leading-relaxed"
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
    <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--fg-muted)' }}>
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
        className="text-[9px] font-black uppercase tracking-[0.18em] mb-1.5"
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
      className="text-[10px] italic px-2 py-1"
      style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
    >{children}</div>
  );
}

// Badge — pill chip used by the panel header for status/confidence/safety.
// Outlined pill (rounded-full + 1px border + solid text colour, no fill) so
// the chips read as labels against the panel surface rather than as filled
// alerts. The colour itself encodes the kind/severity.
export function Badge({
  children, kind, conf, safety,
}: {
  children: React.ReactNode;
  kind: 'STABLE' | 'MODIFIED' | 'NEW' | 'SECURITY_ALERT' | 'confidence' | 'safety';
  conf?: Confidence;
  safety?: number;
}) {
  let color = 'var(--fg-muted)';
  if (kind === 'confidence' && conf) {
    color =
      conf === 'exact'      ? 'var(--intent-success-fg)'   :
      conf === 'overapprox' ? 'var(--intent-warn-vivid)'   :
      conf === 'unknown'    ? 'var(--intent-danger-vivid)' :
                              'var(--fg-muted)';
  } else if (kind === 'safety' && safety !== undefined) {
    color =
      safety >= 70 ? 'var(--intent-success-fg)'   :
      safety >= 40 ? 'var(--intent-warn-vivid)'   :
                     'var(--intent-danger-vivid)';
  } else if (kind === 'SECURITY_ALERT') {
    color = 'var(--intent-danger-vivid)';
  } else if (kind === 'NEW' || kind === 'MODIFIED') {
    color = 'var(--intent-success-vivid)';
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-[0.18em]"
      style={{ color, borderColor: 'currentColor' }}
    >
      {children}
    </span>
  );
}
