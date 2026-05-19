import { useState } from 'react';
import {
  Search, Wrench, Eye, FlaskConical, Package, Check, Ban,
  ChevronDown, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { FixCase, LoopStage } from '../../model/types';
import { useVfx } from './tokens';

const STAGE_ORDER: LoopStage[] = ['investigate', 'patch', 'critique', 'validate', 'package', 'done'];
const STAGE_ICON: Record<LoopStage, LucideIcon> = {
  investigate: Search,
  patch:       Wrench,
  critique:    Eye,
  validate:    FlaskConical,
  package:     Package,
  done:        Check,
  aborted:     Ban,
};

export function LoopTape({ fixCase }: { fixCase: FixCase }) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  const [expanded, setExpanded] = useState(false);
  const stages = fixCase.loop.aborted ? [...STAGE_ORDER, 'aborted' as LoopStage] : STAGE_ORDER;
  const currentIdx = stages.indexOf(fixCase.loop.currentStage);
  const totalTokens = fixCase.loop.iterations.reduce((a, b) => a + b.costTokens, 0);
  const totalSeconds = fixCase.loop.iterations.reduce((a, b) => a + b.validationSeconds, 0);
  const iters = fixCase.loop.iterations.length;
  const max = fixCase.loop.maxIterations;
  const overBudget = iters > max;

  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{
        background: t.cardBacking,
        borderColor: t.border,
        boxShadow: t.isDark ? '0 1px 0 rgba(255,255,255,0.02) inset' : '0 1px 0 rgba(0,0,0,0.02) inset',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: t.textMuted }}
          >
            {tr('loop.title')}
          </span>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: overBudget ? t.warnSoft : t.badgeBg,
              color: overBudget ? t.warn : t.textMuted,
            }}
          >
            {tr('loop.status', {
              iters,
              max,
              tokens: totalTokens.toLocaleString(),
              seconds: totalSeconds.toFixed(0),
            })}
          </span>
        </div>
        {fixCase.loop.aborted && fixCase.loop.abortReason && (
          <span
            className="text-[10px] font-semibold"
            style={{ color: t.bad }}
            title={fixCase.loop.abortReason}
          >
            {tr('loop.stopped', { reason: truncate(fixCase.loop.abortReason, 60) })}
          </span>
        )}
      </div>

      {/* tape */}
      <div className="flex items-stretch gap-1">
        {stages.map((stage, i) => {
          const Icon = STAGE_ICON[stage];
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isAborted = stage === 'aborted';
          const fg = isAborted ? t.bad : isPast || isCurrent ? t.textHi : t.textFaint;
          const bg = isCurrent
            ? (isAborted ? t.badSoft : t.accentSoft)
            : isPast
            ? t.badgeBg
            : 'transparent';
          const borderC = isCurrent
            ? (isAborted ? t.bad : t.accent) + '60'
            : isPast
            ? t.borderSoft
            : t.borderHair;
          return (
            <div key={stage} className="flex-1 min-w-0">
              <div
                className="rounded px-2 py-1.5 border flex items-center gap-1.5"
                style={{ background: bg, borderColor: borderC }}
              >
                <Icon className="w-3 h-3 shrink-0" style={{ color: fg }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.12em] truncate"
                  style={{ color: fg }}
                >
                  {tr(`loop.stage.${stage}`)}
                </span>
                {isCurrent && !isAborted && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: t.accent, boxShadow: `0 0 8px ${t.accent}` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* most recent iteration note + expand toggle */}
      {fixCase.loop.iterations.length > 0 && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => { setExpanded((v) => !v); }}
            className="flex items-start gap-1.5 w-full text-left transition-colors"
          >
            {expanded
              ? <ChevronDown className="w-3 h-3 shrink-0 mt-0.5" style={{ color: t.textFaint }} />
              : <ChevronRight className="w-3 h-3 shrink-0 mt-0.5" style={{ color: t.textFaint }} />}
            <span
              className="font-mono text-[10px] mr-2 mt-0.5 shrink-0"
              style={{ color: t.textFaint }}
            >
              #{fixCase.loop.iterations[fixCase.loop.iterations.length - 1].index}
            </span>
            <span className="text-[11px] leading-snug flex-1" style={{ color: t.textBody }}>
              {fixCase.loop.iterations[fixCase.loop.iterations.length - 1].note}
            </span>
            <span
              className="text-[9px] font-mono ml-2 mt-0.5 shrink-0"
              style={{ color: t.textFaint }}
            >
              {expanded ? tr('loop.collapse') : tr('loop.iter', { count: iters })}
            </span>
          </button>

          {expanded && (
            <ol
              className="mt-3 space-y-1.5 border-t pt-2.5"
              style={{ borderColor: t.borderHair }}
            >
              {fixCase.loop.iterations.map((it) => {
                const Icon = STAGE_ICON[it.stage];
                return (
                  <li
                    key={it.index}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span
                      className="font-mono mt-0.5 shrink-0 inline-flex items-center justify-center w-5 h-4 rounded"
                      style={{
                        background: t.badgeBg,
                        color: t.textMuted,
                        fontSize: '9px',
                      }}
                    >
                      #{it.index}
                    </span>
                    <Icon className="w-3 h-3 mt-0.5 shrink-0" style={{ color: t.textMuted }} />
                    <span
                      className="text-[9px] font-bold uppercase tracking-[0.12em] mt-0.5 shrink-0"
                      style={{ color: t.textFaint, minWidth: 64 }}
                    >
                      {tr(`loop.stage.${it.stage}`)}
                    </span>
                    <span className="flex-1" style={{ color: t.textBody }}>
                      {it.note}
                    </span>
                    <span
                      className="text-[9px] font-mono shrink-0"
                      style={{ color: t.textFaint }}
                    >
                      {it.costTokens.toLocaleString()}t
                      {it.validationSeconds > 0 && ` · ${it.validationSeconds.toFixed(0)}s`}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
