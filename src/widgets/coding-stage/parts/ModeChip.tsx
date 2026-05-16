// ModeChip — compact entry point to the AgentProfileModal.
//
// Shows the active mode's icon + name + a tiny trust-dial bar so the
// user can see "what kind of agent am I talking to right now" without
// opening the modal. Clicking opens it.
//
// Why a chip and not just a menu: the trust dial is the part competitors
// hide behind nested settings. Surfacing it on the chrome means users
// build a mental model of "I'm in Builder mode, trust 3" the way they
// already grok "I'm on `main`, ahead by 2".

import { MODE_ACCENT_HEX, MODE_ICON } from './AgentProfileModal';
import type { AgentMode, TrustLevel } from './types';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

export function ModeChip({
  mode, onClick, t,
}: {
  mode: AgentMode;
  // `isDark` was previously threaded through but the chip now relies on
  // semantic CSS variables for theming; keep optional so callers don't
  // have to update at once.
  isDark?: boolean;
  onClick: () => void;
  t: TranslateFn;
}) {
  const Icon = MODE_ICON[mode.icon];
  const accent = MODE_ACCENT_HEX[mode.accent];
  const text = 'text-[var(--fg-strong)]';
  const subtle = 'text-[var(--fg-muted)]';

  return (
    <button
      type="button"
      onClick={onClick}
      title={t('agentProfile.modeChip.tooltip', { mode: mode.name, trust: mode.trust })}
      className={`group flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${text} hover:bg-[color:var(--bg-elev1)]`}
      style={{ boxShadow: `inset 0 0 0 1px ${accent}33` }}
    >
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded"
        style={{ background: `${accent}1f`, color: accent }}
      >
        <Icon className="w-2.5 h-2.5" />
      </span>
      <span>{mode.name}</span>
      <span className={subtle}>·</span>
      <TrustBar value={mode.trust} accent={accent} />
    </button>
  );
}

// Inline 5-pip mini trust dial. Read-only here — clicking the chip
// opens the modal where the user can change it. The pips fade from
// green (1) → amber (3) → rose (5) so colour signals risk at a glance.
function TrustBar({
  value, accent,
}: {
  value: TrustLevel;
  accent: string;
}) {
  const inactive = 'rgba(255,255,255,0.10)';
  // Risk colour by level — keeps the chip visually consistent with the
  // dial in the modal so users can recognise it across surfaces.
  const colourFor = (lv: number): string => {
    if (lv <= 2) return '#34d399';      // emerald
    if (lv <= 3) return '#fbbf24';      // amber
    if (lv <= 4) return '#fb923c';      // orange-amber
    return '#fb7185';                   // rose
  };
  const fill = colourFor(value);
  void accent;
  return (
    <span className="inline-flex items-center gap-px">
      {[1, 2, 3, 4, 5].map((lv) => (
        <span
          key={lv}
          className="block w-1 h-2 rounded-sm"
          style={{ background: lv <= value ? fill : inactive }}
        />
      ))}
    </span>
  );
}
