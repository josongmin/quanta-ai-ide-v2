import { useTranslation } from 'react-i18next';
import { Moon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// Time field (HH:MM input with arrows)

export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        className="h-8 px-2.5 rounded-md text-base outline-none"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      />
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Clock preview — visualises the muted span

export function ClockPreview({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation('me');
  const fromMin = toMinutes(from);
  const toMin = toMinutes(to);
  // Wraps midnight: e.g. 22:00 → 08:00. Treat as two arcs if so.
  const dayMin = 24 * 60;
  const arcs = fromMin < toMin
    ? [{ start: fromMin, end: toMin }]
    : [{ start: fromMin, end: dayMin }, { start: 0, end: toMin }];
  return (
    <div className="flex items-center gap-3">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="24" fill="none" stroke="var(--border-muted)" strokeWidth="2" />
        {arcs.map((a, i) => (
          <path
            key={i}
            d={describeArc(28, 28, 24, a.start / dayMin * 360, a.end / dayMin * 360)}
            stroke="var(--fg-accent)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        ))}
        <Moon
          x="22" y="22" width="12" height="12"
          color="var(--fg-accent)"
        />
      </svg>
      <div className="flex flex-col text-sm" style={{ color: 'var(--fg-muted)' }}>
        <span>
          {t('notifications.quiet.muteWindow')}<span className="font-mono tabular-nums" style={{ color: 'var(--fg-default)' }}>
            {from} → {to}
          </span>
        </span>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          {durationLabel(fromMin, toMin, t)}
        </span>
      </div>
    </div>
  );
}

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
function durationLabel(from: number, to: number, t: (key: string, opts?: Record<string, unknown>) => string) {
  const total = from < to ? to - from : 24 * 60 - from + to;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return t('notifications.quiet.durationLabel', { hours: h, minutes: m });
}
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  // SVG arc helper — handles arcs starting from "12 o'clock" (top).
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const start = { x: cx + r * Math.cos(toRad(startDeg)), y: cy + r * Math.sin(toRad(startDeg)) };
  const end   = { x: cx + r * Math.cos(toRad(endDeg)),   y: cy + r * Math.sin(toRad(endDeg))   };
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}
