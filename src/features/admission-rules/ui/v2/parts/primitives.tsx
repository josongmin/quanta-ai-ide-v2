import { GlassCard } from '@shared/ui';
import { SEVERITY_COLOR, useV2 } from './tokens';

// V2Card — a GlassCard variant with an opaque inner backing so the
// page-level aurora and grid don't bleed through. Visually matches the
// intelligence-tab cards (FilterBar / FILES / STATUS), which sit on a
// dark static background and read as solid surfaces. Use everywhere in
// v2 instead of the bare GlassCard.
export function V2Card({
  className = '', children, style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const t = useV2();
  return (
    <GlassCard
      className={`relative overflow-hidden ${className}`}
      style={{ boxShadow: 'none', ...style }}
    >
      {/* Inner backing — opaque page-tinted fill so the surface reads as
          a solid card on top of the aurora. Light mode flips polarity. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: t.cardBacking,
          borderRadius: 'inherit',
        }}
      />
      <div className="relative">{children}</div>
    </GlassCard>
  );
}

// ── Sidebar primitives ───────────────────────────────────────────────

export function NavGroup({
  label, children,
}: { label: string; children: React.ReactNode }) {
  const t = useV2();
  return (
    <div className="mb-3 last:mb-0">
      <div
        className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: t.textSubtle }}
      >
        {label}
      </div>
      <div className="flex flex-col">
        {children}
      </div>
    </div>
  );
}

export function NavItem({
  icon: Icon, label, shortcut, badge, active, onClick,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  shortcut?: string;
  badge?: { text: string; color?: string };
  active: boolean;
  onClick: () => void;
}) {
  const t = useV2();
  return (
    <button type="button"
      onClick={onClick}
      className="group relative flex items-center gap-2 h-8 px-3 text-left transition-colors"
      style={{
        backgroundColor: active ? t.hoverActive : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = t.hoverSubtle;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Workspace-sidebar exception: thin left stripe on the active nav
          item is the explicitly-allowed "you are here" affordance for
          primary nav columns (memory feedback_no_left_stripes line 25). */}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-[2px]"
          style={{ background: t.textHi }}
        />
      )}
      <Icon
        className="w-3.5 h-3.5 shrink-0"
        style={{ color: active ? t.textBody : t.textMuted }}
      />
      <span
        className="flex-1 text-[12px] font-medium truncate"
        style={{ color: active ? t.textHi : t.textMuted }}
      >
        {label}
      </span>
      {badge ? (
        <span
          className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[16px] px-1.5 rounded-md text-[10px] font-mono tabular-nums"
          style={{
            background: badge.color ? `${badge.color}1f` : t.badgeBg,
            color: badge.color ?? t.textMuted,
          }}
        >
          {badge.text}
        </span>
      ) : shortcut ? (
        <span
          className="shrink-0 text-[10px] font-mono"
          style={{ color: active ? t.textSubtle : t.textFaint }}
        >
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}

// ── Section title — used on every card header across pages ─────────

export function SectionTitle({
  icon: Icon, children,
}: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  const t = useV2();
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex" style={{ color: t.textMuted }}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: t.textBody }}>
        {children}
      </h3>
    </div>
  );
}

// ── Stat — label / value pair used in the Cockpit signal map ─────

export function Stat({
  label, value, tone = 'mute',
}: {
  label: string;
  value: number | string;
  tone?: 'mute' | 'critical' | 'warn';
}) {
  const t = useV2();
  const color = tone === 'critical' ? SEVERITY_COLOR.block
    : tone === 'warn' ? SEVERITY_COLOR.warn
    : t.textBody;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>{label}</span>
      <span
        className="text-[18px] font-bold tabular-nums leading-none"
        style={{
          color,
          textShadow: tone !== 'mute' ? `0 0 14px ${color}55` : 'none',
        }}
      >
        {value}
      </span>
    </div>
  );
}
