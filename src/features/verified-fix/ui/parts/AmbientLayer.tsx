import { useVfx } from './tokens';

// Soft aurora background, mirrors AdmissionV2's AmbientLayer in spirit
// (no actual import — different palette, lighter spec).
export function AmbientLayer() {
  const t = useVfx();
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute"
        style={{
          width: 720, height: 720,
          left: '15%', top: '-10%',
          background: `radial-gradient(closest-side, ${t.aurora1}, transparent)`,
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute"
        style={{
          width: 600, height: 600,
          right: '10%', bottom: '-15%',
          background: `radial-gradient(closest-side, ${t.aurora2}, transparent)`,
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute"
        style={{
          width: 420, height: 420,
          left: '55%', top: '20%',
          background: `radial-gradient(closest-side, ${t.aurora3}, transparent)`,
          filter: 'blur(50px)',
        }}
      />
    </div>
  );
}
