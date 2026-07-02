// ─── shared viz primitives used across the WorkspaceBody tabs ────────────
//
// Small presentational sub-parts pulled out of WorkspaceBody.tsx so the tab
// bodies (Overview in particular) stay readable. Markup / classNames / tokens
// are preserved exactly from the original file.

import { C, pct, toneToColors } from '@shared/lib';
import type { Verdict } from '@entities/metric';
import { useTranslation } from '@shared/i18n';

// ─── Verdict strip ────────────────────────────────────────────────────
// One line, four tones, dropped right under the header. This is the
// "Admission Readiness" badge from Spec §10.
export function VerdictStrip({ verdict }: { verdict: Verdict }) {
  const { t } = useTranslation('inspect');
  const tone = verdict.tone;
  // Tone → palette via the shared SSOT. Unknown tones (the old default branch)
  // fall through to 'info', which resolves dot/bg/fg to --fg-link — matching
  // the previous inline default. Keys map: dot→dot, bg→bg, text→fg.
  const palette = toneToColors(
    tone === 'ok' || tone === 'warn' || tone === 'critical' ? tone : 'info',
  );
  // Translate at the UI boundary — entity layer emits a key + params only.
  const title = t(`verdict.${verdict.key}.title`, verdict.params ?? {});
  const hint  = t(`verdict.${verdict.key}.hint`,  verdict.params ?? {});
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: palette.bg }}
    >
      <span className="relative shrink-0">
        <span className="block w-2 h-2 rounded-full animate-ping absolute opacity-50"
              style={{ background: palette.dot }} />
        <span className="block w-2 h-2 rounded-full relative" style={{ background: palette.dot }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold leading-tight" style={{ color: palette.fg }}>
          {title}
        </div>
        <div className="text-[9px] truncate" style={{ color: 'var(--fg-subtle)' }}>
          {hint}
        </div>
      </div>
      <span
        className="text-[8px] font-black uppercase tracking-[var(--track-eyebrow)]"
        style={{ color: palette.fg, opacity: 0.75 }}
      >
        {tone === 'ok' ? t('verdict.ready') : tone === 'critical' ? t('verdict.block') : tone === 'warn' ? t('verdict.review') : t('verdict.info')}
      </span>
    </div>
  );
}

// ─── SE Health: top offenders mini-list ───────────────────────────────
export function TopOffenders({
  title, rows,
}: { title: string; rows: { path: string; meta: string }[] }) {
  return (
    <div
      className="mt-3 pt-2 border-t border-dashed space-y-1"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <div
        className="text-[8px] font-black uppercase tracking-[var(--track-eyebrow)]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {title}
      </div>
      {rows.map((r) => (
        <div key={r.path} className="flex items-center justify-between gap-2 text-[10px]">
          <span className="truncate font-mono" style={{ color: 'var(--fg-muted)' }}>{r.path}</span>
          <span className="shrink-0 font-mono tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
            {r.meta}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── AI Efficiency: 5-bin safety histogram ────────────────────────────
// Sequential warm → cool hue ramp, low → high, indexed by bin:
//   0 = "don't touch" (critical) … 4 = "safe". Single-hue progression mirrors
// the Heat overlay's principle. Mid-tones (#9a8537 / #4f9a5c) are intentional
// between-step values with no semantic token, so they stay literal here.
const HISTOGRAM_HUES = [C.critical, C.warning, '#9a8537', C.ok, '#4f9a5c'];

export function SafetyHistogram({
  bins, total,
}: { bins: number[]; total: number }) {
  const { t } = useTranslation('inspect');
  const max = Math.max(1, ...bins);
  const labels = ['0–20', '21–40', '41–60', '61–80', '81–100'];
  const hueAt = (i: number) => HISTOGRAM_HUES[i];
  return (
    <div className="mt-2">
      <div
        className="text-[8px] font-black uppercase tracking-[var(--track-eyebrow)] mb-1"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {t('histogram.title')}
      </div>
      <div className="flex items-end gap-1 h-10">
        {bins.map((n, i) => {
          const h = (n / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5"
                 title={`${labels[i]}: ${n} (${pct(n, total)}%)`}>
              <div className="w-full rounded-sm" style={{ height: `${Math.max(2, h)}%`, background: hueAt(i), opacity: n === 0 ? 0.15 : 0.85 }} />
              <span className="text-[8px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                {n}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-0.5 text-[8px] uppercase tracking-[var(--track-eyebrow)]">
        <span style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}>{t('histogram.dontTouch')}</span>
        <span style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}>{t('histogram.safe')}</span>
      </div>
    </div>
  );
}

export function AgentCapacityLine({
  autoFixable, autoPct, humanOnly, humanPct, unknown, unknownPct,
}: {
  autoFixable: number; autoPct: number;
  humanOnly: number; humanPct: number;
  unknown: number; unknownPct: number;
}) {
  const { t } = useTranslation('inspect');
  return (
    <div
      className="mt-2 px-2 py-2 rounded-md text-[10px] leading-relaxed"
      style={{ background: 'var(--bg-surface-muted)' }}
    >
      <span
        className="font-black uppercase tracking-[var(--track-eyebrow)] mr-2"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {t('agent.label')}
      </span>
      <span className="font-bold" style={{ color: 'var(--intent-success-fg)' }}>{autoFixable}</span>
      <span style={{ color: 'var(--fg-muted)' }}> {t('agent.autoFix')} ({autoPct}%) · </span>
      <span className="font-bold" style={{ color: 'var(--intent-danger-fg)' }}>{humanOnly}</span>
      <span style={{ color: 'var(--fg-muted)' }}> {t('agent.needHumans')} ({humanPct}%) · </span>
      <span className="font-bold" style={{ color: 'var(--intent-warn-fg)' }}>{unknown}</span>
      <span style={{ color: 'var(--fg-muted)' }}> {t('agent.needMoreProof')} ({unknownPct}%)</span>
    </div>
  );
}

// ─── Stack chip row ───────────────────────────────────────────────────
export function ChipBlock({
  label, items,
}: {
  label: string;
  items: { text: string; tone?: 'ok' | 'warn' | 'muted'; mono?: boolean }[];
}) {
  return (
    <div className="mt-2.5">
      <div
        className="text-[8px] font-black uppercase tracking-[var(--track-eyebrow)] mb-1"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((it) => {
          const tone = it.tone;
          const style: React.CSSProperties = tone === 'warn'
            ? { background: 'rgb(from var(--intent-warn-vivid) r g b / 0.12)', color: 'var(--intent-warn-fg)' }
            : tone === 'ok'
              ? { background: 'rgb(from var(--intent-success-vivid) r g b / 0.12)', color: 'var(--intent-success-fg)' }
              : tone === 'muted'
                ? { background: 'var(--bg-surface-muted)', color: 'var(--fg-subtle)' }
                : { background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)' };
          return (
            <span
              key={it.text}
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${it.mono ? 'font-mono' : 'font-bold'}`}
              style={style}
            >
              {it.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
