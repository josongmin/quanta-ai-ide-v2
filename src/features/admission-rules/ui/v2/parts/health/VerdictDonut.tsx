import { SEVERITY_COLOR, useV2 } from '../tokens';

export function VerdictDonut({
  block, warn, pass,
}: { block: number; warn: number; pass: number }) {
  const t = useV2();
  const total = block + warn + pass;
  const r = 28;
  const c = 2 * Math.PI * r;
  const seg = (n: number) => (total === 0 ? 0 : (n / total) * c);
  const offsets = {
    block: 0,
    warn: seg(block),
    pass: seg(block) + seg(warn),
  };
  return (
    <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
      <svg viewBox="0 0 80 80" width={80} height={80}>
        <defs>
          <filter id="donut-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        {/* track */}
        <circle cx={40} cy={40} r={r} fill="none" stroke={t.inset} strokeWidth={6} />
        {total > 0 && (
          <g transform="rotate(-90 40 40)">
            <circle
              cx={40} cy={40} r={r}
              fill="none"
              stroke={SEVERITY_COLOR.block}
              strokeWidth={6}
              strokeDasharray={`${seg(block)} ${c}`}
              strokeDashoffset={-offsets.block}
              strokeLinecap="round"
              filter="url(#donut-glow)"
            />
            <circle
              cx={40} cy={40} r={r}
              fill="none"
              stroke={SEVERITY_COLOR.warn}
              strokeWidth={6}
              strokeDasharray={`${seg(warn)} ${c}`}
              strokeDashoffset={-offsets.warn}
              strokeLinecap="round"
            />
            <circle
              cx={40} cy={40} r={r}
              fill="none"
              stroke={t.ok}
              strokeWidth={6}
              strokeDasharray={`${seg(pass)} ${c}`}
              strokeDashoffset={-offsets.pass}
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular-nums leading-none" style={{ color: t.textHi }}>
          {total}
        </span>
        <span className="text-2xs font-bold uppercase tracking-eyebrow mt-0.5" style={{ color: t.textSubtle }}>
          rules
        </span>
      </div>
    </div>
  );
}
