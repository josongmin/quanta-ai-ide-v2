// ─────────────────────────────────────────────────────────────────────────
// Ambient — radial aurora + scanline. Lifted from Admission v2 so the two
// surfaces feel like the same product. Anchored behind everything; very
// low alpha so cards still read as cards.
// ─────────────────────────────────────────────────────────────────────────

export default function AmbientLayer() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(1200px 700px at -10% -10%, rgba(79,154,92,0.04), transparent 60%),
          radial-gradient(1100px 600px at 110% 0%, rgba(122,167,212,0.03), transparent 60%)
        `,
      }}
    />
  );
}
