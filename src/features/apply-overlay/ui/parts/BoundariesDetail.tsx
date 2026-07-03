import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { useBoundaries } from '@features/inspect-boundaries';
import type { EgressProtocol, IngressProtocol } from '@entities/repo';
import {
  ACCENT_TINT_BG, ACCENT_TEXT, ACCENT_TINT_RING, DetailHeader,
} from './shared';

type Boundaries = ReturnType<typeof useBoundaries>;

const INGRESS_PROTOCOLS: IngressProtocol[] = ['http', 'webhook', 'queue', 'grpc'];
const EGRESS_PROTOCOLS: EgressProtocol[] = ['http', 'db', 'fs', 'queue'];

// Entry / ingress / egress boundary toggles with per-direction protocol
// pill filters that surface only when their direction is active.
export function BoundariesDetail({
  t, b,
}: {
  t: TFunction;
  b: Boundaries;
}) {
  const anyOn = b.anyActive;
  return (
    <div>
      <DetailHeader
        title={t('panel.tile.boundaries')}
        onClear={anyOn ? () => { b.clearAll(); } : undefined}
      />
      <div className="space-y-1">
        <BoundaryRow
          active={b.showEntry}
          label={t('boundaries.entry')} caption={t('boundaries.entryCaption')}
          onToggle={() => { b.setShowEntry(!b.showEntry); }}
        />
        <BoundaryRow
          active={b.showIngress}
          label={t('boundaries.ingress')} caption={t('boundaries.ingressCaption')}
          onToggle={() => { b.setShowIngress(!b.showIngress); }}
        />
        {b.showIngress && (
          <ProtocolPills>
            {INGRESS_PROTOCOLS.map((p) => (
              <ProtocolPill key={p}
                active={b.ingressProtocols.has(p)}
                label={t(`boundaries.protocol.${p}`)}
                onClick={() => { b.toggleIngressProtocol(p); }} />
            ))}
          </ProtocolPills>
        )}
        <BoundaryRow
          active={b.showEgress}
          label={t('boundaries.egress')} caption={t('boundaries.egressCaption')}
          onToggle={() => { b.setShowEgress(!b.showEgress); }}
        />
        {b.showEgress && (
          <ProtocolPills>
            {EGRESS_PROTOCOLS.map((p) => (
              <ProtocolPill key={p}
                active={b.egressProtocols.has(p)}
                label={t(`boundaries.protocol.${p}`)}
                onClick={() => { b.toggleEgressProtocol(p); }} />
            ))}
          </ProtocolPills>
        )}
      </div>
    </div>
  );
}

function BoundaryRow({
  active, label, caption, onToggle,
}: { active: boolean; label: string; caption: string; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={active}
      className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
        active
          ? 'bg-[var(--bg-active)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      <span
        className={`mt-0.5 w-3 h-3 rounded-[4px] shrink-0 border transition-colors ${
          active ? 'border-transparent' : 'border-[var(--border-strong)]'
        }`}
        style={{ background: active ? 'var(--intent-danger-fg)' : 'transparent' }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold leading-tight text-[var(--fg-default)]">{label}</div>
        {!active && (
          <div className="text-2xs leading-tight mt-0.5 text-[var(--fg-subtle)]">{caption}</div>
        )}
      </div>
    </button>
  );
}

function ProtocolPills({ children }: { children: ReactNode }) {
  // No left-edge stripe (project convention) — indent via padding only.
  return (
    <div className="mx-2 mb-1 -mt-0.5 pl-5 flex flex-wrap gap-1 pb-1">{children}</div>
  );
}

function ProtocolPill({
  active, label, onClick,
}: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className="px-1.5 py-0.5 rounded-md text-2xs font-bold uppercase tracking-eyebrow transition-colors border"
      style={active
        ? { background: ACCENT_TINT_BG, color: ACCENT_TEXT, borderColor: ACCENT_TINT_RING }
        : undefined
      }
    >
      <span className={!active ? 'text-[var(--fg-muted)]' : ''}>{label}</span>
    </button>
  );
}
