import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles, Gavel, EyeOff, ChevronDown, ChevronRight,
  ShieldX, ShieldAlert,
} from 'lucide-react';
import type { RuleEvaluation , AdmissionRule } from '@entities/admission';
import type { FileRecord } from '@entities/repo';
import { describeSignal, SOURCE_GLYPH, SOURCE_LABEL } from '../sourceStyle';
import { useOverrideAudit } from '../../model/selectors';
import { generateSnippet } from './snippet';
import { CodeLensCard } from './CodeLensCard';
import { FixDrawer } from './parts/FixDrawer';
import { OverrideDrawer } from './parts/OverrideDrawer';
import { SuppressDrawer } from './parts/SuppressDrawer';

// Per-fired-rule action plan. Renders the rule header, the code-lens
// evidence for each file that tripped, and a "what now" footer with three
// modelled actions:
//
//   Fix       — author asks the agent to draft a patch (preview drawer).
//               Demo shows a static stub diff; in production this is the
//               seam where you'd POST to a fix-suggestion service.
//   Override  — formally bypass the rule on this PR with a reason +
//               required expiry. Logged in the override ledger.
//   Suppress  — narrower bypass scoped to one (rule, file) on this branch.
//               Always has an expiry so it can't rot.
//
// The trio is the *contract* the page makes with the author: every
// blocking finding has at least one path forward. Hides "Fix" for
// rules whose evidence isn't code-shaped (e.g. metric rules), so the
// button isn't a lie.
//
// Each action opens a drawer modal (see parts/). This component owns only
// the card rendering plus a single drawer-selection state.

export function ActionPlanCard({
  evaluation, rule, prSeed, fileById,
}: {
  evaluation: RuleEvaluation;
  rule: AdmissionRule | undefined;
  prSeed: number;
  fileById: (id: number) => FileRecord | undefined;
}) {
  const { t } = useTranslation('admission');
  const { overrides, suppressions } = useOverrideAudit();

  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState<'fix' | 'override' | 'suppress' | null>(null);
  const [suppressTarget, setSuppressTarget] = useState<{ fileId: number; filePath: string } | null>(null);
  const [mountedAt] = useState(() => Date.now());

  const isOverridden = useMemo(
    () => overrides.some((o) => o.ruleId === evaluation.ruleId && o.prSeed === prSeed),
    [overrides, evaluation.ruleId, prSeed],
  );
  const suppressedFileIds = useMemo(() => {
    const set = new Set<number>();
    for (const sp of suppressions) {
      if (sp.ruleId === evaluation.ruleId && sp.prSeed === prSeed && sp.expiresAt > mountedAt) {
        set.add(sp.fileId);
      }
    }
    return set;
  }, [suppressions, evaluation.ruleId, prSeed, mountedAt]);

  const sevColor = evaluation.status === 'block'
    ? 'var(--intent-danger-fg)'
    : 'var(--intent-warn-fg)';
  const SevIcon = evaluation.status === 'block' ? ShieldX : ShieldAlert;

  // "Fix" only makes sense when there's a code-shaped finding. Metric
  // rules (e.g. cyclomatic > 30) get a softer "How to fix" hint instead
  // of a fake diff.
  const fixApplicable = rule != null && rule.signal.kind !== 'metric';

  return (
    <article
      className="rounded-md overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header
        className="flex items-start gap-3 px-4 py-3"
        style={{ borderBottom: collapsed ? 'none' : '1px solid var(--border-default)' }}
      >
        <button
          type="button"
          onClick={() => { setCollapsed((c) => !c); }}
          aria-label={collapsed ? t('gate.card.expand') : t('gate.card.collapse')}
          className="shrink-0 mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded transition-colors"
          style={{ color: 'var(--fg-subtle)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg-strong)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-subtle)'; }}
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />}
        </button>
        <SevIcon className="shrink-0 mt-0.5 w-4 h-4" style={{ color: sevColor }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3
              className="text-[12px] font-semibold leading-snug truncate"
              style={{ color: 'var(--fg-strong)' }}
            >
              {evaluation.ruleName}
            </h3>
            <span
              className="text-[10px] uppercase tracking-[0.14em] font-mono shrink-0"
              style={{ color: sevColor }}
            >
              {evaluation.status}
            </span>
            <span
              className="text-[10px] font-mono shrink-0"
              style={{ color: 'var(--fg-subtle)' }}
              title={SOURCE_LABEL[evaluation.source]}
            >
              {SOURCE_GLYPH[evaluation.source]} {SOURCE_LABEL[evaluation.source]}
            </span>
            {isOverridden && (
              <span
                className="text-[10px] font-mono uppercase tracking-[0.14em] px-1.5 py-px rounded shrink-0"
                style={{
                  color: 'var(--fg-muted)',
                  background: 'var(--bg-active)',
                }}
                title={t('gate.card.overriddenTitle')}
              >
                {t('gate.card.overridden')}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
            {evaluation.reason}
          </p>
          {rule && (
            <p
              className="mt-0.5 text-[10px] font-mono truncate"
              style={{ color: 'var(--fg-subtle)' }}
              title={describeSignal(rule.signal)}
            >
              {describeSignal(rule.signal)}
            </p>
          )}
        </div>
        <span
          className="shrink-0 text-[10px] font-mono tabular-nums self-center"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('gate.card.hits', { count: evaluation.hits.length })}
        </span>
      </header>

      {/* ─── Body — code lens for each hit ─────────────────────────── */}
      {!collapsed && (
        <div className="p-4 flex flex-col gap-3">
          {evaluation.hits.slice(0, 4).map((h) => {
            const f = fileById(h.fileId);
            if (!f) return null;
            const filePath = f.folderPath ? `${f.folderPath}/${f.name}` : f.name;
            const snippet = generateSnippet({
              ruleId: evaluation.ruleId,
              ruleSource: evaluation.source,
              fileId: h.fileId,
              fileName: f.name,
              fileLanguage: f.language,
              evidenceText: h.evidenceText,
            });
            const suppressed = suppressedFileIds.has(h.fileId);
            return (
              <div key={h.fileId} className="flex flex-col gap-2">
                <CodeLensCard
                  filePath={filePath}
                  snippet={snippet}
                  evidenceText={h.evidenceText}
                  confidence={h.confidence}
                />
                {suppressed && (
                  <div
                    className="text-[10px] font-mono px-2 py-1 rounded"
                    style={{
                      background: 'var(--bg-surface-muted)',
                      color: 'var(--fg-subtle)',
                    }}
                  >
                    {t('gate.card.suppressedNote')}
                  </div>
                )}
                {!suppressed && !isOverridden && (
                  <button
                    type="button"
                    onClick={() => {
                      setSuppressTarget({ fileId: h.fileId, filePath });
                      setDrawer('suppress');
                    }}
                    className="self-start text-[10px] font-medium inline-flex items-center gap-1 transition-colors"
                    style={{ color: 'var(--fg-subtle)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg-strong)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-subtle)'; }}
                  >
                    <EyeOff className="w-3 h-3" />
                    {t('gate.card.suppressForFile')}
                  </button>
                )}
              </div>
            );
          })}
          {evaluation.hits.length > 4 && (
            <p className="text-[11px] font-mono" style={{ color: 'var(--fg-subtle)' }}>
              {t('gate.card.moreHits', { count: evaluation.hits.length - 4 })}
            </p>
          )}
        </div>
      )}

      {/* ─── Footer — action trio ───────────────────────────────────── */}
      {!collapsed && !isOverridden && (
        <footer
          className="flex items-center gap-2 px-4 py-3"
          style={{
            borderTop: '1px solid var(--border-default)',
            background: 'var(--bg-surface-muted)',
          }}
        >
          {fixApplicable && (
            <ActionButton
              icon={Sparkles}
              label={t('gate.card.draftFix')}
              onClick={() => { setDrawer('fix'); }}
              tone="primary"
            />
          )}
          {!fixApplicable && rule && (
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
              {t(`gate.fixHint.${evaluation.source}`, { defaultValue: t('gate.card.noFix') })}
            </span>
          )}
          <div className="flex-1" />
          <ActionButton
            icon={Gavel}
            label={t('gate.card.overrideWithReason')}
            onClick={() => { setDrawer('override'); }}
            tone="ghost"
          />
        </footer>
      )}

      {/* ─── Drawers / modals ────────────────────────────────────────── */}
      {drawer === 'fix' && (
        <FixDrawer
          ruleName={evaluation.ruleName}
          onClose={() => { setDrawer(null); }}
        />
      )}
      {drawer === 'override' && (
        <OverrideDrawer
          evaluation={evaluation}
          rule={rule}
          prSeed={prSeed}
          onClose={() => { setDrawer(null); }}
        />
      )}
      {drawer === 'suppress' && suppressTarget && (
        <SuppressDrawer
          evaluation={evaluation}
          prSeed={prSeed}
          target={suppressTarget}
          onClose={() => { setDrawer(null); setSuppressTarget(null); }}
        />
      )}
    </article>
  );
}

// ─── Action button (shared) ─────────────────────────────────────────────

function ActionButton({
  icon: Icon, label, onClick, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tone: 'primary' | 'ghost';
}) {
  const isPrimary = tone === 'primary';
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
      style={{
        color: isPrimary ? 'var(--bg-canvas)' : 'var(--fg-strong)',
        background: isPrimary ? 'var(--fg-strong)' : 'transparent',
        border: isPrimary ? '1px solid var(--fg-strong)' : '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => {
        if (isPrimary) {
          e.currentTarget.style.opacity = '0.9';
        } else {
          e.currentTarget.style.background = 'var(--bg-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (isPrimary) {
          e.currentTarget.style.opacity = '1';
        } else {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}
