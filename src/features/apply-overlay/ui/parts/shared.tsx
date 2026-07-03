import {
  useRef, type KeyboardEvent,
} from 'react';
import {
  X, ShieldCheck, Power,
} from 'lucide-react';

// --- Theme-aware palette --------------------------------------------------

// Brand "on / active" affordance. Theme-aware via --fg-accent so the panel
// no longer hardcodes a green that breaks in light mode.
export const ACCENT = 'var(--fg-accent)';
export const ACCENT_TINT_BG = 'color-mix(in srgb, var(--fg-accent) 16%, transparent)';
export const ACCENT_TINT_RING = 'color-mix(in srgb, var(--fg-accent) 42%, transparent)';
export const ACCENT_TEXT = 'var(--fg-accent)';

// Discrete category hues for the footer / preview chips, theme-aware.
export const HUE_DANGER = 'var(--intent-danger-fg)';
export const HUE_LINK = 'var(--fg-link)';
export const HUE_WARN = 'var(--intent-warn-fg)';
export const HUE_INFO = 'var(--intent-info-fg)';
export const HUE_NEUTRAL = 'var(--fg-muted)';

// --- Shared presentational bits used across detail panes -------------------

export function DetailHeader({
  title, onClear,
}: { title: string; onClear?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-2xs font-black uppercase tracking-eyebrow text-[var(--fg-subtle)]">
        {title}
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-2xs font-black uppercase tracking-eyebrow px-1.5 py-0.5 rounded transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-hover)]"
        >
          <X className="w-2.5 h-2.5" /> clear
        </button>
      )}
    </div>
  );
}

export function MetricRow({
  active, onClick, label, hint, hue,
}: {
  active: boolean; onClick: () => void;
  label: string; hint: string; hue: string;
}) {
  return (
    <button type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
        active
          ? 'bg-[var(--bg-active)] text-[var(--fg-strong)]'
          : 'hover:bg-[var(--bg-hover)] text-[var(--fg-default)]'
      }`}
    >
      <span
        className="relative w-2.5 h-2.5 rounded-full shrink-0 transition-all"
        style={{
          background: active ? hue : 'transparent',
          boxShadow: active
            ? `0 0 0 1px ${hue}, 0 0 10px ${hue}`
            : 'inset 0 0 0 1px var(--border-strong)',
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold leading-tight">{label}</div>
        <div
          className={`text-xs leading-snug mt-0.5 ${
            active ? 'text-[var(--fg-muted)]' : 'text-[var(--fg-subtle)]'
          }`}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {hint}
        </div>
      </div>
      {active && <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: ACCENT }} />}
    </button>
  );
}

export function Slider({
  label, value, onChange,
}: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="px-1.5">
      <div className="flex justify-between text-2xs font-bold uppercase tracking-eyebrow mb-1 text-[var(--fg-muted)]">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={0} max={1} step={0.01}
        value={value}
        onChange={(e) => { onChange(+e.target.value); }}
        className="w-full"
        style={{ accentColor: 'var(--intent-danger-fg)' }}
      />
    </div>
  );
}

// Pill-group control with arrow-key navigation. Used for the time-window
// picker; centralised so segmented controls feel uniform across the panel.
export function SegmentedControl<T extends string>({
  options, value, onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = options.findIndex((o) => o.key === value);
    const next = e.key === 'ArrowRight'
      ? (i + 1) % options.length
      : (i - 1 + options.length) % options.length;
    onChange(options[next].key);
    wrapRef.current?.querySelector<HTMLButtonElement>(
      `button[data-segment-key="${options[next].key}"]`,
    )?.focus();
  };
  return (
    <div
      ref={wrapRef}
      onKeyDown={onKey}
      className="flex items-center gap-1"
      role="radiogroup"
    >
      {options.map(({ key, label }) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            data-segment-key={key}
            onClick={() => { onChange(key); }}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className="flex-1 px-2 py-1.5 rounded-md text-xs font-black uppercase tracking-eyebrow transition-colors outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--border-focus)]"
            style={active
              ? {
                  background: ACCENT_TINT_BG,
                  color: ACCENT_TEXT,
                  boxShadow: `inset 0 0 0 1px ${ACCENT_TINT_RING}`,
                }
              : undefined
            }
          >
            <span className={!active ? 'text-[var(--fg-muted)]' : ''}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ToggleButton({
  on, onClick, label,
}: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-black uppercase tracking-eyebrow transition-colors"
      style={on
        ? {
            background: ACCENT_TINT_BG,
            color: ACCENT_TEXT,
            boxShadow: `inset 0 0 0 1px ${ACCENT_TINT_RING}`,
          }
        : undefined
      }
    >
      <Power className={`w-3.5 h-3.5 ${on ? '' : 'text-[var(--fg-muted)]'}`} />
      <span className={!on ? 'text-[var(--fg-default)]' : ''}>{label}</span>
    </button>
  );
}

// Footer chip — colour-tinted glass pill with an inline clear button so the
// user can drop a single overlay without going back to its detail pane.
export function FooterChip({
  color, label, onClear,
}: { color: string; label: string; onClear: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 pl-1.5 pr-0.5 py-0.5 rounded text-2xs font-bold uppercase tracking-eyebrow"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="truncate max-w-[180px]">{label}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClear(); }}
        aria-label="clear"
        className="ml-0.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded transition-opacity opacity-60 hover:opacity-100"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}
