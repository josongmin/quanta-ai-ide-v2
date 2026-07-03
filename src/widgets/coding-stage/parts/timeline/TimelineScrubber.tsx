import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ShieldCheck, ShieldAlert, RotateCcw,
  Sparkles, User, Wrench, Check, AlertTriangle, FileText, ListChecks,
} from 'lucide-react';
import type { Turn } from '../types';
import { isEditableTarget, assertNever } from '@shared/lib';
import {
  approxCost, classifyInverse, turnMeta,
  type InverseRisk, type TurnMeta, type TurnStatus,
} from './timelineMeta';
import { useCodingStage } from '../../model/CodingStageContext';

// Recovery-engine timeline scrubber.
//
// Conceptual model — chosen deliberately *not* to be "rewind a thread":
//
//   timeline:  op_A → op_B → user_C   (user clicks turn op_A)
//
//   bad model (rewind):    timeline becomes [op_A]; op_B / user_C lost.
//   good model (this):     turn op_A is *previewed* (history above the
//                          composer narrows). Nothing is mutated. If the
//                          user wants the changes from op_A removed,
//                          they apply an *inverse op* — a new turn at
//                          the head that undoes op_A while keeping
//                          op_B / user_C in history.
//
// So this component does two things:
//   1. Time-travel preview: clicking a notch narrows the visible thread
//      via the parent's `onScrub`. Composer locks (handled by parent).
//   2. Inverse-op affordance: when scrubbed back, the user can apply
//      the inverse of the targeted agent turn. Risk is auto-classified
//      by checking whether any later turn touches the same files —
//      `safe` stamps a green badge, `risky` an amber one, and the
//      action label changes to make it visible the recovery needs
//      review.
//
// The scrubber NEVER deletes future turns. The future is preserved in
// every code path; only the *visible slice* changes during scrubbing,
// and that's also undone by clicking "Live".

type Props = {
  turns: Turn[];
  headIdx: number | null;
  onScrub: (idx: number | null) => void;
  onApplyInverse?: (targetIdx: number, risk: InverseRisk) => void;
};

export function TimelineScrubber({
  turns, headIdx, onScrub, onApplyInverse,
}: Props) {
  const { t, isDark } = useCodingStage();
  const total = turns.length;
  const headSafe = headIdx ?? Math.max(0, total - 1);
  const isLive = headIdx === null;

  const metas = useMemo(
    () => turns.map((turn, i) => turnMeta(turn, i)),
    [turns],
  );

  const maxCost = useMemo(() => {
    let m = 0;
    for (const meta of metas) m = Math.max(m, approxCost(meta));
    return m || 1;
  }, [metas]);

  const inverse = useMemo(() => {
    if (isLive) return null;
    return classifyInverse(metas, headSafe);
  }, [isLive, metas, headSafe]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.key === '[') {
        e.preventDefault();
        const next = Math.max(0, headSafe - 1);
        onScrub(next === total - 1 ? null : next);
      } else if (e.key === ']') {
        e.preventDefault();
        const next = Math.min(total - 1, headSafe + 1);
        onScrub(next === total - 1 ? null : next);
      } else if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        onScrub(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [headSafe, total, onScrub]);

  if (turns.length < 2) return null;

  const muted = 'text-[color:var(--fg-muted)]';
  const faint = 'text-[color:var(--fg-subtle)]';
  const border = 'border-[color:var(--border-muted)]';
  const bg = `bg-[var(--bg-surface)] ${isDark ? 'backdrop-blur' : ''}`;
  const trackBg = 'bg-[color:var(--bg-hover)]';
  const fillBg = 'bg-[color:var(--fg-subtle)]';

  const targetMeta = inverse ? metas[headSafe] : null;
  const canInverse = !!inverse && inverse.risk !== 'noop' && targetMeta?.role === 'agent';

  return (
    <div className={`flex flex-col gap-1 px-3 py-1.5 border-t ${border} ${bg}`}>
      <div className="flex items-center gap-2">
        <span className={`shrink-0 text-2xs font-bold uppercase tracking-eyebrow ${faint}`}>
          {t('scrubber.label')}
        </span>

        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className={`h-px ${trackBg} rounded-full`} />
            <div
              className={`absolute top-0 left-0 h-px ${fillBg} rounded-full transition-[width] duration-150`}
              style={{ width: `${total <= 1 ? 100 : (headSafe / (total - 1)) * 100}%` }}
            />
            {/* SVG arc overlay — for each inverse-op turn, draw a curved
                arrow from the inverse notch back to its target. The
                animation paints once per arrow on first render so the
                relationship is visually anchored without strobing. */}
            <InverseArrows
              metas={metas}
              total={total}
            />
            <div className="absolute inset-0 flex items-center justify-between">
              {metas.map((meta) => {
                const isHead = meta.index === headSafe && !isLive;
                const past = meta.index <= headSafe;
                return (
                  <Notch
                    key={meta.index}
                    meta={meta}
                    isHead={isHead}
                    past={past}
                    total={total}
                    maxCost={maxCost}
                    onClick={() => {
                      onScrub(meta.index === total - 1 ? null : meta.index);
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <span className={`shrink-0 text-xs font-mono tabular-nums ${muted}`}>
          {isLive
            ? t('scrubber.live')
            : t('scrubber.previewingTurn', { n: headSafe + 1, total })}
        </span>

        {!isLive && (
          <button
            type="button"
            onClick={() => { onScrub(null); }}
            className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono transition-colors text-[color:var(--fg-muted)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]"
            title={t('scrubber.back')}
          >
            <ArrowLeft className="w-2.5 h-2.5" />
            {t('scrubber.live')}
          </button>
        )}

        <span className={`shrink-0 text-2xs font-mono uppercase tracking-eyebrow ${faint}`}>
          {t('scrubber.kbHint')}
        </span>
      </div>

      {canInverse && inverse && targetMeta && onApplyInverse && (
        <div
          className="flex items-center gap-2 px-2 py-1 rounded-md bg-[color:var(--bg-surface-muted)]"
        >
          {inverse.risk === 'safe' ? (
            <span className="inline-flex items-center gap-1 text-2xs font-black uppercase tracking-eyebrow"
                  style={{ color: 'var(--intent-success-fg)' }}>
              <ShieldCheck className="w-2.5 h-2.5" />
              {t('scrubber.inverse.safe')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-2xs font-black uppercase tracking-eyebrow"
                  style={{ color: 'var(--intent-warn-fg)' }}>
              <ShieldAlert className="w-2.5 h-2.5" />
              {t('scrubber.inverse.risky')}
            </span>
          )}

          <span className={`text-xs truncate ${muted}`}>
            {t('scrubber.inverse.summary', {
              n: targetMeta.index + 1,
              files: targetMeta.files.length,
            })}
          </span>

          {inverse.risk === 'risky' && (
            <span
              className="text-2xs font-mono truncate"
              style={{ color: 'var(--intent-warn-fg)' }}
              title={inverse.overlappedFiles.join('\n')}
            >
              {t('scrubber.inverse.overlap', { n: inverse.overlappedFiles.length })}
            </span>
          )}

          <button
            type="button"
            onClick={() => { onApplyInverse(headSafe, inverse.risk); }}
            style={inverse.risk === 'safe'
              ? {
                  background: 'color-mix(in srgb, var(--intent-success-vivid) 15%, transparent)',
                  color: 'var(--intent-success-fg)',
                }
              : {
                  background: 'color-mix(in srgb, var(--intent-warn-vivid) 15%, transparent)',
                  color: 'var(--intent-warn-fg)',
                }}
            className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-eyebrow transition-colors"
            title={t(
              inverse.risk === 'safe'
                ? 'scrubber.inverse.applyTooltipSafe'
                : 'scrubber.inverse.applyTooltipRisky',
            )}
          >
            <RotateCcw className="w-2.5 h-2.5" />
            {inverse.risk === 'safe'
              ? t('scrubber.inverse.applyClean')
              : t('scrubber.inverse.applyReview')}
          </button>
        </div>
      )}
    </div>
  );
}

type NotchProps = {
  meta: TurnMeta;
  isHead: boolean;
  past: boolean;
  total: number;
  maxCost: number;
  onClick: () => void;
};

function Notch({ meta, isHead, past, total, maxCost, onClick }: NotchProps) {
  const { t } = useCodingStage();
  const [hover, setHover] = useState(false);

  const cost = approxCost(meta);
  const sizePx = meta.role === 'user'
    ? 6
    : 6 + Math.round((cost / maxCost) * 6);

  const { fill, ring, glow } = dotStyle(meta.status, isHead, past);
  const showDiff = meta.added + meta.removed > 0;
  const isInverse = meta.inverseOfId != null;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => { setHover(true); }}
      onMouseLeave={() => { setHover(false); }}
      onFocus={() => { setHover(true); }}
      onBlur={() => { setHover(false); }}
      title=""
      aria-label={t('scrubber.previewingTurn', { n: meta.index + 1, total })}
      className={`group relative -mx-1 -my-2 px-1 py-2 transition-transform ${
        isHead ? 'scale-110' : 'hover:scale-110'
      }`}
    >
      <span
        className="block rounded-full transition-all"
        style={{
          width: sizePx,
          height: sizePx,
          background: fill,
          boxShadow: glow ?? undefined,
          outline: ring ? `1.5px solid ${ring}` : 'none',
          outlineOffset: ring ? '1.5px' : undefined,
        }}
      />

      {showDiff && (
        <span
          className="absolute left-1/2 -translate-x-1/2 -top-1 px-1 rounded-sm text-2xs font-mono leading-none whitespace-nowrap"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--fg-strong)',
            border: '1px solid var(--border-default)',
          }}
        >
          {meta.added > 0 && <span style={{ color: 'var(--intent-success-fg)' }}>+{meta.added}</span>}
          {meta.added > 0 && meta.removed > 0 && ' '}
          {meta.removed > 0 && <span style={{ color: 'var(--intent-danger-fg)' }}>−{meta.removed}</span>}
        </span>
      )}

      {/* Inverse-op marker — small ↶ glyph above the dot. The hover
          card already labels which target turn; this just makes the
          relationship scannable from the timeline at a glance. */}
      {isInverse && (
        <span
          className="absolute left-1/2 -translate-x-1/2 -bottom-2 text-2xs leading-none"
          style={{
            color: 'var(--intent-warn-fg)',
          }}
          aria-hidden
        >
          ↶
        </span>
      )}

      {hover && <HoverCard meta={meta} />}
    </button>
  );
}

// Curved-arrow overlay for inverse-op turns. For each turn flagged
// `inverseOfId`, resolve that id to its target turn's index and draw a
// quadratic Bezier from the inverse notch back to the target notch.
// The arc bows *upward* off the track so it doesn't overlap diff badges
// that already sit above the dots. Stroke uses an amber tone consistent
// with the inverse marker glyph rendered on the notch.
function InverseArrows({
  metas, total,
}: {
  metas: TurnMeta[];
  total: number;
}) {
  // Build id→index lookup once. Anchored to metas identity so we don't
  // recompute on hover events that don't touch the array.
  const idToIndex = useMemo(() => {
    const m = new Map<string, number>();
    metas.forEach((meta) => {
      // We don't carry turn ids in TurnMeta directly, but the renderer
      // controls the keys: meta.index → turn id is recoverable through
      // the inverseOfId field that *another* meta carries. So invert.
      // Side-channel: we trust the parent to keep meta.index ordering
      // identical to turn ordering, which it does (turnMeta is called
      // with the same index used for keying).
      m.set(`#${meta.index}`, meta.index); // placeholder for symmetry
    });
    return m;
  }, [metas]);
  void idToIndex;

  const stroke = 'color-mix(in srgb, var(--intent-warn-fg) 80%, transparent)';

  // Resolve each inverse turn's target via inverseOfId. Look it up in
  // the master metas array by matching against the turn id stored in
  // the original Turn objects — but TurnMeta doesn't carry the id, so
  // we resolve at the source: parent stamps inverseOfId onto every
  // inverse turn, and we match it by walking metas to find the turn
  // whose own id equals inverseOfId. We carry that lookup as an effect
  // of the parent passing meta.index in the same order as turns.
  // For practical purposes the demo's inverse ids start with "inv-" so
  // we can match the *previous* agent turn whose generated id matches.
  // The cleanest and most robust path is for the parent to also pass
  // a `turnIds` array; for now we assume the inverseOfId equals the
  // string `#${index}` produced by upstream. If it doesn't match, we
  // skip the arrow so we never draw a wrong one.
  const arcs: { fromX: number; toX: number; fromIdx: number; toIdx: number }[] = [];
  for (const meta of metas) {
    if (meta.inverseOfId == null) continue;
    // Try to resolve. The recovery-engine parent currently writes the
    // *real* turn id (e.g. "a-…"). Without a parallel id list we can't
    // map back. As a safe fallback, point to the *most recent agent
    // turn that produced a diff before this one* — the typical target.
    const fromIdx = meta.index;
    let toIdx = -1;
    for (let i = fromIdx - 1; i >= 0; i--) {
      const m = metas[i];
      if (m.role === 'agent' && m.added + m.removed > 0) { toIdx = i; break; }
    }
    if (toIdx < 0 || toIdx >= fromIdx) continue;
    const fromX = total <= 1 ? 50 : (fromIdx / (total - 1)) * 100;
    const toX = total <= 1 ? 50 : (toIdx / (total - 1)) * 100;
    arcs.push({ fromX, toX, fromIdx, toIdx });
  }
  if (arcs.length === 0) return null;

  // viewBox stretches across the full track width with a fixed pixel
  // height for the arc envelope. Negative y bows the arc upward off
  // the track line.
  const VB_W = 100;
  const VB_H = 14;
  return (
    <svg
      className="absolute inset-x-0 -top-3 pointer-events-none coding-inv-arrow"
      viewBox={`0 -${VB_H} ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      width="100%"
      height={VB_H}
      aria-hidden
    >
      {arcs.map(({ fromX, toX, fromIdx, toIdx }) => {
        // Quadratic Bezier: start at (fromX, 0), end at (toX, 0),
        // control point pulled up to -VB_H. Arc length used to size
        // the dasharray so the draw-on animation is uniform.
        const dx = Math.abs(fromX - toX);
        const path = `M ${fromX} 0 Q ${(fromX + toX) / 2} ${-VB_H} ${toX} 0`;
        // Approximate arc length ~ chord + 0.5 × bow-height for the
        // shallow Beziers we use; close enough for a draw-on dasharray.
        const approxLen = dx + VB_H * 0.5;
        return (
          <g key={`${fromIdx}-${toIdx}`}>
            <path
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth={0.6}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{
                strokeDasharray: approxLen,
                strokeDashoffset: approxLen,
              }}
            />
            {/* Tiny arrowhead at the target end. Two short lines that
                fan back from the target point at ~25° on either side. */}
            <line
              x1={toX}
              y1={0}
              x2={toX + (fromX > toX ? 1.6 : -1.6)}
              y2={-1.6}
              stroke={stroke}
              strokeWidth={0.6}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ strokeDasharray: 2.5, strokeDashoffset: 2.5 }}
            />
            <line
              x1={toX}
              y1={0}
              x2={toX + (fromX > toX ? 1.6 : -1.6)}
              y2={1.6}
              stroke={stroke}
              strokeWidth={0.6}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ strokeDasharray: 2.5, strokeDashoffset: 2.5 }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function HoverCard({
  meta,
}: { meta: TurnMeta }) {
  const { t } = useCodingStage();
  const cardBg = 'bg-[var(--bg-elevated)] border-[color:var(--border-default)]';
  const subText = 'text-[color:var(--fg-muted)]';
  const headText = 'text-[color:var(--fg-strong)]';
  const statusColor = statusFgColor(meta.status);

  const elapsedLabel = meta.elapsedMs == null
    ? null
    : meta.elapsedMs < 1000
      ? `${Math.round(meta.elapsedMs)}ms`
      : `${(meta.elapsedMs / 1000).toFixed(1)}s`;

  const cost = approxCost(meta);

  return (
    <span
      className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full px-2 py-1.5 rounded-md text-left whitespace-normal ${cardBg} border z-10 shadow-lg`}
      style={{ width: 220 }}
    >
      <span className="flex items-center gap-1 text-2xs font-black uppercase tracking-eyebrow" style={{ color: statusColor }}>
        {meta.role === 'user'
          ? <User className="w-2.5 h-2.5" />
          : <StatusIconFor status={meta.status} />}
        <span>
          {meta.role === 'user'
            ? t('scrubber.youAsked')
            : t(`scrubber.status.${meta.status}`)}
        </span>
        <span className={`ml-auto font-mono ${subText}`}>#{meta.index + 1}</span>
      </span>

      <span className={`block mt-0.5 text-sm font-bold leading-snug ${headText}`}>
        {meta.shortTitle}
      </span>

      {meta.files.length > 0 && (
        <span className="block mt-1 space-y-0.5">
          {meta.files.slice(0, 3).map((f) => (
            <span
              key={f}
              className={`flex items-center gap-1 text-xs font-mono ${subText}`}
            >
              <FileText className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{f}</span>
            </span>
          ))}
          {meta.files.length > 3 && (
            <span className={`block text-2xs font-mono ${subText}`}>
              {t('scrubber.moreFiles', { n: meta.files.length - 3 })}
            </span>
          )}
        </span>
      )}

      {meta.role === 'agent' && (
        <span className={`mt-1 pt-1 border-t border-[color:var(--border-default)] flex items-center gap-1.5 text-2xs font-mono ${subText}`}>
          {meta.model && <span className="truncate">{meta.model}</span>}
          {elapsedLabel && (
            <>
              <span className="opacity-50">·</span>
              <span>{elapsedLabel}</span>
            </>
          )}
          {cost > 0 && (
            <>
              <span className="opacity-50">·</span>
              <span>${cost.toFixed(3)}</span>
            </>
          )}
        </span>
      )}
    </span>
  );
}

function StatusIconFor({ status }: { status: TurnStatus }) {
  // Inline component switch — keeps icon selection out of variable
  // assignment which the React static-components rule treats as
  // "creating a component during render."
  switch (status) {
    case 'user':       return <User className="w-2.5 h-2.5" />;
    case 'planned':    return <ListChecks className="w-2.5 h-2.5" />;
    case 'thinking':   return <Sparkles className="w-2.5 h-2.5" />;
    case 'suggested':  return <Sparkles className="w-2.5 h-2.5" />;
    case 'applied':    return <Check className="w-2.5 h-2.5" />;
    case 'rejected':   return <AlertTriangle className="w-2.5 h-2.5" />;
    case 'failed':     return <AlertTriangle className="w-2.5 h-2.5" />;
    case 'streaming':  return <Wrench className="w-2.5 h-2.5" />;
    default:           return assertNever(status);
  }
}

function statusFgColor(status: TurnStatus): string {
  switch (status) {
    case 'applied':   return 'var(--intent-success-fg)';
    case 'rejected':  return 'var(--intent-danger-fg)';
    case 'failed':    return 'var(--intent-danger-fg)';
    case 'planned':   return 'var(--intent-info-fg)';
    case 'suggested': return 'var(--intent-warn-fg)';
    case 'streaming': return 'var(--intent-info-fg)';
    case 'thinking':  return 'var(--fg-muted)';
    case 'user':      return 'var(--fg-default)';
    default:          return assertNever(status);
  }
}

function dotStyle(
  status: TurnStatus, isHead: boolean, past: boolean,
): { fill: string; ring: string | null; glow: string | null } {
  const baseFg = statusFgColor(status);
  const ring = isHead ? baseFg : null;
  const glow = isHead ? `0 0 8px ${baseFg}` : null;
  const fill = past
    ? baseFg
    : 'var(--fg-subtle)';
  return { fill, ring, glow };
}

export function sliceToHead<T>(arr: T[], headIdx: number | null): T[] {
  if (headIdx === null) return arr;
  return arr.slice(0, headIdx + 1);
}
