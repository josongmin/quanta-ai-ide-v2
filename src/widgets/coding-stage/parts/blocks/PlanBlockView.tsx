import { useState } from 'react';
import { Sparkles, Check, Zap } from 'lucide-react';
import { useTranslation, formatNumber } from '@shared/i18n';
import type { PlanBlock } from '../types';

export function PlanBlockView({ block, isDark }: { block: PlanBlock; isDark: boolean }) {
  void isDark;
  const { t } = useTranslation('coding');
  // Local-only checkbox state. Real impl would dispatch to the agent
  // and the agent would echo it back as a plan-block patch. We mirror
  // the seed (`item.done`) so already-done items stay ticked.
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    const seed: Record<string, boolean> = {};
    block.items.forEach((it) => { seed[it.id] = it.done; });
    return seed;
  });
  // Auto-advance: when a step flips to done, the next pending step's
  // text is dispatched as a custom event the parent (CodingStage)
  // listens for and feeds into the composer. Opt-in via a tiny toggle
  // so users who want to drive the plan manually aren't surprised.
  const [autoAdvance, setAutoAdvance] = useState(false);

  const doneCount = block.items.filter((it) => done[it.id]).length;
  const total = block.items.length;
  const card = 'bg-gradient-to-b from-white/[0.04] to-white/[0.015] border-[var(--border-default)]';
  const labelColor = 'text-[var(--fg-strong)]';
  const sub = 'text-[var(--fg-muted)]';
  const checkOff = 'border-[var(--border-strong)] hover:border-[var(--fg-muted)]';
  const checkOn = 'bg-[var(--intent-success-vivid)] border-[var(--intent-success-vivid)]';
  const dotIdle = 'bg-[var(--bg-active-strong)]';
  const dotOn   = 'bg-[var(--intent-success-vivid)]';

  function toggle(id: string) {
    const wasDone = done[id];
    const nextDone = !wasDone;
    setDone((cur) => ({ ...cur, [id]: nextDone }));
    if (autoAdvance && nextDone) {
      const idx = block.items.findIndex((it) => it.id === id);
      const next = block.items.slice(idx + 1).find((it) => !done[it.id] && it.id !== id);
      if (next != null) {
        window.dispatchEvent(new CustomEvent('coding:plan-advance', {
          detail: { nextText: next.text, planTitle: block.title },
        }));
      }
    }
  }

  return (
    <div className={`rounded-lg border ${card} p-3`}>
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles className={`w-3 h-3 ${sub}`} />
        <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${sub}`}>plan</span>
        <span className={`text-[12px] font-semibold ${labelColor}`}>{block.title}</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => { setAutoAdvance((v) => !v); }}
          aria-pressed={autoAdvance}
          title={t('autoadvance.tooltip')}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
            autoAdvance
              ? ('bg-[var(--intent-success-bg)] text-[var(--intent-success-fg)]')
              : ('text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:[background:var(--bg-hover)]')
          }`}
        >
          <Zap className="w-2.5 h-2.5" />
          {t('autoadvance.label')}
        </button>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {block.items.map((item, idx) => (
              <span
                key={item.id}
                className={`block w-2 h-2 rounded-full ${done[item.id] ? `${dotOn} coding-dot-pop` : dotIdle}`}
                style={done[item.id] ? { animationDelay: `${idx * 60}ms` } : undefined}
              />
            ))}
          </div>
          <span className={`text-[11px] font-mono ${sub} tabular-nums`}>{doneCount}/{total}</span>
        </div>
      </div>
      <ol className="space-y-1.5">
        {block.items.map((item, i) => {
          const pct = item.confidence != null ? Math.round(item.confidence * 100) : null;
          const confidenceTone = pct == null ? null
            : pct >= 85 ? ('text-[var(--intent-success-fg)]')
            : pct >= 60 ? sub
            : ('text-[var(--intent-warn-fg)]');
          return (
            <li key={item.id} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => { toggle(item.id); }}
                aria-pressed={done[item.id]}
                className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-[5px] border shrink-0 transition-colors cursor-pointer ${
                  done[item.id] ? checkOn : checkOff
                }`}
              >
                {done[item.id] && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <span className={`text-[12px] leading-relaxed ${
                  done[item.id]
                    ? ('text-[var(--fg-muted)] line-through')
                    : labelColor
                }`}>
                  <span className={`mr-1.5 font-mono text-[11px] ${sub}`}>{i + 1}.</span>
                  {item.text}
                </span>
                {(pct != null || item.estTokens != null || item.estSeconds != null) && (
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono">
                    {pct != null && (
                      <span
                        className={confidenceTone ?? sub}
                        title={pct < 60 ? t('planMeta.lowConfidence') : t('planMeta.confidence', { pct })}
                      >
                        {t('planMeta.confidence', { pct })}
                      </span>
                    )}
                    {item.estTokens != null && (
                      <span className={sub}>{t('planMeta.estTokens', { n: formatNumber(item.estTokens) })}</span>
                    )}
                    {item.estSeconds != null && (
                      <span className={sub}>{t('planMeta.estTime', { n: item.estSeconds })}</span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
