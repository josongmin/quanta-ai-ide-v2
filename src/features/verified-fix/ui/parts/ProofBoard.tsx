import { FileWarning, GitFork, ArrowDown, ArrowUp } from 'lucide-react';
import type { CandidateFix, FixCase, ProofObligation, Seed } from '../../model/types';
import { useVfx, statusColor } from './tokens';

export function ProofBoard({
  fixCase, seed, candidate,
}: {
  fixCase: FixCase;
  seed: Seed;
  candidate: CandidateFix | undefined;
}) {
  const t = useVfx();

  const obligations = candidate?.obligations ?? [];
  const grouped = {
    static:    obligations.filter((o) => o.category === 'static'),
    dynamic:   obligations.filter((o) => o.category === 'dynamic'),
    stylistic: obligations.filter((o) => o.category === 'stylistic'),
  };

  return (
    <div className="grid grid-cols-12 gap-3">
      {/* root cause + evidence */}
      <div
        className="col-span-7 rounded-lg border p-4"
        style={{ background: t.cardBacking, borderColor: t.border }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: t.textMuted }}
          >
            root cause
          </span>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: t.badgeBg, color: t.textMuted }}
          >
            seed: {seed.id.replace('seed-', '')}
          </span>
        </div>
        <p
          className="text-[13px] leading-relaxed mb-3"
          style={{ color: t.textHi }}
        >
          {fixCase.rootCause}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div
              className="text-[9px] font-bold uppercase tracking-[0.14em] mb-1.5"
              style={{ color: t.textFaint }}
            >
              evidence refs
            </div>
            <ul className="space-y-1">
              {seed.evidenceRefs.map((e, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span
                    className="font-mono px-1 py-px rounded shrink-0 mt-px"
                    style={{
                      fontSize: '8px',
                      background: t.badgeBg,
                      color: t.textMuted,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {e.kind}
                  </span>
                  <span style={{ color: t.textBody }}>
                    {e.label}
                    {e.path && (
                      <span
                        className="font-mono ml-1.5"
                        style={{ color: t.textFaint, fontSize: '10px' }}
                      >
                        {e.path}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div
              className="text-[9px] font-bold uppercase tracking-[0.14em] mb-1.5 flex items-center gap-1"
              style={{ color: t.textFaint }}
            >
              <GitFork className="w-2.5 h-2.5" /> blast hint
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {seed.blastHint.map((b) => (
                <span
                  key={b}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: t.infoSoft, color: t.info }}
                >
                  {b}
                </span>
              ))}
            </div>
            {seed.constraints.length > 0 && (
              <>
                <div
                  className="text-[9px] font-bold uppercase tracking-[0.14em] mb-1.5 flex items-center gap-1"
                  style={{ color: t.textFaint }}
                >
                  <FileWarning className="w-2.5 h-2.5" /> constraints
                </div>
                <ul className="space-y-0.5">
                  {seed.constraints.map((c, i) => (
                    <li key={i} className="text-[10.5px]" style={{ color: t.textMuted }}>
                      · {c}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* post-patch delta strip — what the patch changes about the static analysis state */}
        {candidate && (
          <div
            className="mt-3 pt-3 border-t flex items-center gap-3 flex-wrap"
            style={{ borderColor: t.borderSoft }}
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: t.textFaint }}>
              post-patch delta
            </span>
            <DeltaPill from={`${seed.evidenceRefs.filter((e) => e.kind === 'taint-path').length} taint paths`} to="0" trend="down" />
            <DeltaPill from={seed.blastHint.length > 1 ? `${seed.blastHint.length} modules at risk` : '1 module'} to={`${candidate.blastModules}`} trend={candidate.blastModules <= 1 ? 'down' : 'up'} />
            <DeltaPill from="hotspot fading" to={candidate.tier === 'safe-mechanical' ? 'cleared' : 'gated'} trend="down" />
          </div>
        )}
      </div>

      {/* obligations panel */}
      <div
        className="col-span-5 rounded-lg border p-4"
        style={{ background: t.cardBacking, borderColor: t.border }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <span
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: t.textMuted }}
          >
            proof obligations
          </span>
          {candidate && <CoverageRing obligations={obligations} />}
        </div>

        {!candidate && (
          <div
            className="text-[11px] py-6 text-center"
            style={{ color: t.textFaint }}
          >
            no candidate selected
            <div className="text-[10px] mt-1">obligations are defined per-candidate</div>
          </div>
        )}

        {candidate && (
          <div className="space-y-2.5">
            <ObligationGroup label="static"    items={grouped.static} />
            <ObligationGroup label="dynamic"   items={grouped.dynamic} />
            <ObligationGroup label="stylistic" items={grouped.stylistic} />
          </div>
        )}
      </div>
    </div>
  );
}

function DeltaPill({ from, to, trend }: { from: string; to: string; trend: 'down' | 'up' }) {
  const t = useVfx();
  const good = trend === 'down';
  const Icon = good ? ArrowDown : ArrowUp;
  const color = good ? t.ok : t.warn;
  const bg = good ? t.okSoft : t.warnSoft;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded"
      style={{ background: bg, color }}
    >
      <span style={{ opacity: 0.65 }}>{from}</span>
      <Icon className="w-2.5 h-2.5 shrink-0" />
      <span className="font-bold">{to}</span>
    </span>
  );
}

function ObligationGroup({ label, items }: { label: string; items: ProofObligation[] }) {
  const t = useVfx();
  if (items.length === 0) return null;
  return (
    <div>
      <div
        className="text-[8.5px] font-bold uppercase tracking-[0.16em] mb-1"
        style={{ color: t.textFaint }}
      >
        {label}
      </div>
      <ul className="space-y-1">
        {items.map((o) => {
          const c = statusColor(t, o.status);
          return (
            <li
              key={o.id}
              className="flex items-start gap-2 text-[11px] leading-snug"
              title={o.detail}
            >
              <span
                className="shrink-0 inline-flex items-center justify-center px-1.5 py-px rounded font-mono uppercase"
                style={{
                  fontSize: '8.5px',
                  background: c.bg,
                  color: c.fg,
                  letterSpacing: '0.04em',
                  minWidth: 50,
                }}
              >
                {c.label}
              </span>
              <span style={{ color: t.textBody }} className="flex-1">
                {o.label}
                <div style={{ color: t.textFaint }} className="text-[10px] mt-px">
                  {o.detail}
                </div>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CoverageRing({ obligations }: { obligations: ProofObligation[] }) {
  const t = useVfx();
  const total = obligations.length;
  const pass = obligations.filter((o) => o.status === 'pass').length;
  const partial = obligations.filter((o) => o.status === 'partial').length;
  const fail = obligations.filter((o) => o.status === 'fail').length;
  // proof coverage = pass + 0.5 * partial / total
  const coverage = total === 0 ? 0 : (pass + 0.5 * partial) / total;
  const ringColor = fail > 0 ? t.bad : partial > 0 ? t.warn : t.ok;
  const pct = Math.round(coverage * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono" style={{ color: t.textFaint }}>
        coverage
      </span>
      <div className="relative w-7 h-7">
        <svg viewBox="0 0 28 28" className="w-7 h-7 -rotate-90">
          <circle cx="14" cy="14" r="11" stroke={t.borderSoft} strokeWidth="2.5" fill="none" />
          <circle
            cx="14" cy="14" r="11"
            stroke={ringColor}
            strokeWidth="2.5"
            fill="none"
            strokeDasharray={`${(coverage * 2 * Math.PI * 11).toFixed(2)} ${(2 * Math.PI * 11).toFixed(2)}`}
            strokeLinecap="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
          style={{ color: ringColor }}
        >
          {pct}
        </span>
      </div>
    </div>
  );
}
