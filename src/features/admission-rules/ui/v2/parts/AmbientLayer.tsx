import { v2Tokens } from './tokens';

// ─────────────────────────────────────────────────────────────────────────
// Ambient background — subtle radial gradients pinned behind everything,
// plus a slow-moving scanline. Sets the "alive" mood before any data
// even loads.
// ─────────────────────────────────────────────────────────────────────────

export function AmbientLayer({ isDark }: { isDark: boolean }) {
  // Aurora alphas tuned per-mode. In light theme the canvas is bright
  // already, so we cool the gradients further and shift the scanline
  // colour to the light accent (#1f5b9c blue).
  const t = v2Tokens(isDark);
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(1400px 700px at -10% -10%, ${t.aurora1}, transparent 55%),
            radial-gradient(1100px 600px at 110% 0%, ${t.aurora2}, transparent 55%),
            radial-gradient(1200px 700px at 50% 120%, ${t.aurora3}, transparent 55%)
          `,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[1px] overflow-hidden pointer-events-none opacity-50"
      >
        <div
          className="admv2-scan h-full"
          style={{
            width: '40%',
            background: `linear-gradient(90deg, transparent, ${t.scan}, transparent)`,
            boxShadow: `0 0 16px ${t.scan}`,
          }}
        />
      </div>
    </>
  );
}
