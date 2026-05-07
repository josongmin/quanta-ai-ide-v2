import { useTheme } from '@shared/theme';

// Three-segment bar — exact / overapprox / unknown.
// We keep it monochrome (three opacity levels of `currentColor`) so it
// doesn't compete with the severity palette. Hover for raw counts.

export function ConfidenceMix({
  mix,
  width = 80,
  height = 3,
}: {
  mix: { exact: number; overapprox: number; unknown: number };
  width?: number;
  height?: number;
}) {
  const { isDark } = useTheme();
  const total = mix.exact + mix.overapprox + mix.unknown;
  if (total === 0) {
    return (
      <div
        className={isDark ? 'bg-white/10 rounded-full' : 'bg-black/10 rounded-full'}
        style={{ width, height }}
      />
    );
  }
  const pct = (n: number) => (n / total) * 100;
  const base = isDark ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
  return (
    <div
      className="rounded-full overflow-hidden flex"
      style={{ width, height }}
      title={`exact ${mix.exact} · overapprox ${mix.overapprox} · unknown ${mix.unknown}`}
    >
      <span style={{ width: `${pct(mix.exact)}%`,      backgroundColor: `${base}0.85)` }} />
      <span style={{ width: `${pct(mix.overapprox)}%`, backgroundColor: `${base}0.45)` }} />
      <span style={{ width: `${pct(mix.unknown)}%`,    backgroundColor: `${base}0.18)` }} />
    </div>
  );
}
