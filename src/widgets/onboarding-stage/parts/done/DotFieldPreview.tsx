import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Dot-field preview — tiny canvas-free animated SVG. Dots drift in toward
// a center. Slow bloom suggests "real-time signal arrival".
export function DotFieldPreview() {
  const { t } = useTranslation('onboarding');
  const dots = useMemo(() => Array.from({ length: 36 }, (_, i) => {
    // Spread points around the canvas in a stable but varied pattern.
    const a = (i * 137.508) * (Math.PI / 180);
    let s = (i * 9301 + 49297) % 233280;
    s = (s * 9301 + 49297) % 233280;
    const r = 24 + (i % 6) * 12 + (s / 233280) * 6;
    const cx = 50 + Math.cos(a) * (r / 100) * 40;
    const cy = 50 + Math.sin(a) * (r / 100) * 40;
    const delay = (i * 47) % 1800;
    const size = 1.3 + ((i * 13) % 7) * 0.25;
    const palette = [
      'var(--fg-accent)',
      'var(--intent-success-vivid)',
      'var(--fg-link)',
      'var(--fg-strong)',
    ];
    return { i, cx, cy, delay, size, color: palette[i % palette.length] };
  }), []);

  return (
    <div
      className="relative aspect-square rounded-md overflow-hidden"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Grid drift */}
      <div className="absolute inset-0 admv2-grid-drift opacity-30" aria-hidden />

      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        {/* Soft halo at center */}
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="var(--fg-accent)" stopOpacity="0.25" />
            <stop offset="60%" stopColor="var(--fg-accent)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--fg-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#halo)" />

        {/* Connecting strokes — randomised spider shapes */}
        {Array.from({ length: 14 }).map((_, k) => {
          const a = dots[(k * 3) % dots.length];
          const b = dots[(k * 3 + 1) % dots.length];
          return (
            <line
              key={k}
              x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
              stroke="var(--border-default)"
              strokeWidth="0.25"
              strokeDasharray="0.6 0.8"
              opacity={0.6}
            >
              <animate attributeName="stroke-dashoffset" from="0" to="6" dur={`${4 + (k % 3)}s`} repeatCount="indefinite" />
            </line>
          );
        })}

        {/* Dots */}
        {dots.map((d) => (
          <circle
            key={d.i}
            cx={d.cx} cy={d.cy} r={d.size}
            fill={d.color}
          >
            <animate
              attributeName="opacity"
              values="0;1;0.6;1"
              dur="2.6s"
              begin={`${d.delay}ms`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values={`${d.size};${d.size * 1.6};${d.size}`}
              dur="2.6s"
              begin={`${d.delay}ms`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      <div
        className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-2xs font-mono tabular-nums"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>{t('done.dotFieldPreview')}</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-1 h-1 rounded-full" style={{ background: 'var(--intent-success-vivid)' }} />
          {t('done.streaming')}
        </span>
      </div>
    </div>
  );
}
