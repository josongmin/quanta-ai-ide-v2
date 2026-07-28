import { Sparkles, Box, Network } from 'lucide-react';
import type { FileRecord } from '@entities/repo';
import { useTranslation, formatNumber } from '@shared/i18n';

// AI-context box — the "what an agent can actually safely reason about
// here" view. Three sub-facts:
//   1. Confidence breakdown — *why* the engine returned EXACT/OVER/UNK,
//      not just the label. Each contributing axis (types, tests, dispatch)
//      gets a tiny pill so the user can audit the score.
//   2. Token budget — how big this file is in LLM units, and the 1-hop
//      context that would need to come along to make an agent edit safely.
//   3. Embedding state — whether the file's vector is current. If it's
//      stale, retrieval is flying blind on this file.
// Numbers come from real model fields where present and from cheap
// formulas (loc → tokens) elsewhere; production swaps in the real
// telemetry without touching the layout.

export function AiContextBox({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const m = file.metrics;

  // Token estimate: ~4 chars per token, ~38 chars/line average.
  const tokens = Math.round((m.loc * 38) / 4);
  // 1-hop context: this file + everything it imports.
  const hopFiles = 1 + m.fanOut;
  const hopTokens = Math.round(tokens * (1 + m.fanOut * 0.6));

  // Confidence axes — each is a binary "passed / partial / failed" derived
  // from concrete metrics so the user can trust the label.
  const axes: { label: string; ok: boolean; partial?: boolean; detail: string }[] = [
    {
      label: t('aiCtx.axis.types', { defaultValue: 'Types' }),
      ok: m.anyCount === 0 && !m.strictOptOut,
      partial: m.anyCount > 0 && m.anyCount < 5 && !m.strictOptOut,
      detail: m.anyCount === 0 ? '0 any' : `${m.anyCount} any`,
    },
    {
      label: t('aiCtx.axis.tests', { defaultValue: 'Tests' }),
      ok: m.hasTestFile && m.lineCoverage >= 70,
      partial: m.hasTestFile && m.lineCoverage >= 30,
      detail: `${m.lineCoverage}%`,
    },
    {
      label: t('aiCtx.axis.dispatch', { defaultValue: 'Dispatch' }),
      ok: !m.unknownReasons.includes('dynamic dispatch'),
      detail: m.unknownReasons.includes('dynamic dispatch') ? 'dynamic' : 'static',
    },
    {
      label: t('aiCtx.axis.boundary', { defaultValue: 'Boundary' }),
      ok: !m.secretsLikely && m.sastFindings === 0,
      partial: !m.secretsLikely && m.sastFindings > 0 && m.sastFindings <= 2,
      detail: m.secretsLikely
        ? 'secret'
        : m.sastFindings > 0
          ? `${m.sastFindings} sast`
          : 'clean',
    },
  ];

  // Embedding "state": derived from confidence + index state. In real
  // life this is a separate signal; here we surface a sensible proxy.
  const embeddingFresh = m.confidence === 'exact' && m.indexState === 'fresh';

  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
        <div
          className="text-2xs font-black uppercase tracking-eyebrow"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('aiCtx.title', { defaultValue: 'AI context' })}
        </div>
        <span
          className="ml-auto text-2xs font-black uppercase tracking-eyebrow"
          style={{
            color: embeddingFresh ? 'var(--intent-success-fg)' : 'var(--fg-subtle)',
          }}
        >
          {embeddingFresh
            ? t('aiCtx.embedded', { defaultValue: 'Embedded' })
            : t('aiCtx.notEmbedded', { defaultValue: 'No vector' })}
        </span>
      </div>

      {/* Confidence axes — pill row */}
      <div className="mt-2 flex flex-wrap gap-1">
        {axes.map((a) => {
          const tone = a.ok ? 'good' : a.partial ? 'partial' : 'bad';
          const bg =
            tone === 'good'    ? 'rgb(from var(--intent-success-vivid) r g b / 0.15)' :
            tone === 'partial' ? 'rgb(from var(--intent-warn-vivid)    r g b / 0.15)' :
                                 'rgb(from var(--intent-danger-vivid)  r g b / 0.15)';
          const fg =
            tone === 'good'    ? 'var(--intent-success-fg)' :
            tone === 'partial' ? 'var(--intent-warn-fg)' :
                                 'var(--intent-danger-fg)';
          return (
            <span
              key={a.label}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-mono"
              style={{ background: bg, color: fg }}
              title={`${a.label}: ${a.detail}`}
            >
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: fg }}
              />
              <span className="font-bold uppercase tracking-eyebrow">{a.label}</span>
              <span className="opacity-75">{a.detail}</span>
            </span>
          );
        })}
      </div>

      {/* Token + context budget */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <BudgetCell
          icon={<Box className="w-2.5 h-2.5" />}
          label={t('aiCtx.thisFile', { defaultValue: 'This file' })}
          value={`${formatNumber(tokens)} tok`}
          sub={`${m.loc} LOC`}
        />
        <BudgetCell
          icon={<Network className="w-2.5 h-2.5" />}
          label={t('aiCtx.oneHopCtx', { defaultValue: '1-hop ctx' })}
          value={`${formatNumber(hopTokens)} tok`}
          sub={t('aiCtx.hopFiles', { count: hopFiles, defaultValue: `${hopFiles} files` })}
          warn={hopTokens > 32000}
        />
      </div>

      {hopTokens > 32000 && (
        <div
          className="mt-2 text-xs leading-relaxed px-2 py-1.5 rounded-md"
          style={{
            background: 'rgb(from var(--intent-warn-vivid) r g b / 0.12)',
            color: 'var(--intent-warn-fg)',
          }}
        >
          {t('aiCtx.contextOverflow', {
            defaultValue: 'Context exceeds 32k tokens — agent will work with a summarized view',
          })}
        </div>
      )}
    </div>
  );
}

function BudgetCell({
  icon, label, value, sub, warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  warn?: boolean;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-1 text-2xs font-black uppercase tracking-eyebrow"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div
        className="mt-0.5 flex items-baseline gap-1.5"
      >
        <span
          className="text-sm font-mono font-bold tabular-nums"
          style={{ color: warn ? 'var(--intent-warn-fg)' : 'var(--fg-default)' }}
        >
          {value}
        </span>
        <span
          className="text-2xs font-mono"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {sub}
        </span>
      </div>
    </div>
  );
}
