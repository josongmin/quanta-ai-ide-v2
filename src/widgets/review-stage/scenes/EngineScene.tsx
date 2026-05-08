// ─────────────────────────────────────────────────────────────────────────
// ENGINE SCENE — auto-review findings with inline auto-fix
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import {
  ArrowUpRight, Bot, ShieldCheck, Wand2,
} from 'lucide-react';
import {
  engineFindings, engineSummary,
  type EngineFinding, type EngineSeverity, type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import { SEV, SEV_LABEL } from '../lib/tones';
import { trimMid } from '../lib/format';
import V2Card from '../ui/V2Card';

export default function EngineScene({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const { t } = useTranslation('review');
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const [filter, setFilter] = useState<'all' | EngineSeverity>('all');
  const visible = filter === 'all' ? findings : findings.filter((f) => f.severity === filter);

  return (
    <V2Card className="p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Bot className="w-3.5 h-3.5 text-[#5a8fce]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
            p0 engine · auto-review
          </span>
          <span className="text-[10px] font-mono text-white/40">
            static · deterministic · cached
          </span>
        </div>
        {summary.autoFix > 0 && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold transition-colors text-black"
            style={{
              background: 'linear-gradient(140deg, #7aa7d4, #5a8fce)',
              boxShadow: 'none',
            }}
          >
            <Wand2 className="w-3 h-3" />
            Apply {summary.autoFix} fix{summary.autoFix === 1 ? '' : 'es'} in batch
          </button>
        )}
      </div>

      {/* Severity filter chips */}
      <div className="mt-3 flex items-center gap-1 flex-wrap">
        <SevChip
          label={`All ${String(findings.length)}`}
          active={filter === 'all'}
          color="#8b949e"
          onClick={() => { setFilter('all'); }}
        />
        {(['blocker', 'high', 'medium', 'low'] as EngineSeverity[]).map((sev) => (
          <SevChip
            key={sev}
            label={`${SEV_LABEL[sev]} ${String(summary[sev])}`}
            active={filter === sev}
            color={SEV[sev]}
            onClick={() => { setFilter(sev); }}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center text-center px-4 py-10 rounded-lg border border-dashed border-white/10">
          <ShieldCheck className="w-5 h-5 mb-2 text-white/30" />
          <div className="text-[12px] font-bold text-white/40">{t('empty.noFindings')}</div>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((f) => (
            <FindingRow key={f.id} f={f} />
          ))}
        </ul>
      )}
    </V2Card>
  );
}

function SevChip({
  label, active, color, onClick,
}: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
      style={{
        background: active ? `${color}26` : 'rgba(255,255,255,0.04)',
        color: active ? color : 'rgba(255,255,255,0.55)',
        border: active ? `1px solid ${color}77` : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </button>
  );
}

function FindingRow({ f }: { f: EngineFinding }) {
  const { t } = useTranslation('review');
  const c = SEV[f.severity];
  return (
    <li
      className="rounded-lg px-3 py-2.5 relative overflow-hidden transition-colors hover:bg-white/[0.02]"
      style={{
        background: `linear-gradient(140deg, ${c}10, transparent 60%)`,
        border: `1px solid ${c}30`,
      }}
    >
      {/* Severity carried by the gradient + border tint and the pill —
          no left-edge accent stripe. */}
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.18em]" style={{ background: `${c}26`, color: c }}>
          {SEV_LABEL[f.severity]}
        </span>
        <span className="text-[10px] font-mono text-white/40 truncate">
          {f.category}/{f.rule}
        </span>
        <span className="ml-auto text-[10px] font-mono text-white/40 truncate" title={f.filePath}>
          {trimMid(f.filePath, 36)}{f.line !== null ? `:${String(f.line)}` : ''}
        </span>
      </div>
      <div className="text-[13px] font-bold leading-snug text-white/85">{f.title}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-white/55">{f.body}</div>
      {f.autoFixable && f.fixRationale !== null && (
        <div className="mt-1 text-[11px] italic text-white/40">
          why safe — {f.fixRationale}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        {f.autoFixable ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[11px] font-bold transition-colors bg-[#5a8fce]/15 text-[#7aa7ff] hover:bg-[#5a8fce]/30"
          >
            <Wand2 className="w-2.5 h-2.5" />
            Auto-fix
          </button>
        ) : (
          <span className="text-[11px] text-white/40">{t('merge.needsManualReview')}</span>
        )}
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-medium text-[#7aa7ff] hover:underline"
        >
          Jump to file
          <ArrowUpRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </li>
  );
}
