import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Sparkles, Gavel, EyeOff, ChevronDown, ChevronRight,
  ShieldX, ShieldAlert, X,
} from 'lucide-react';
import { Portal } from '@shared/ui';
import type { RuleEvaluation , AdmissionRule } from '@entities/admission';
import type { FileRecord } from '@entities/repo';
import { describeSignal, SOURCE_GLYPH, SOURCE_LABEL } from '../sourceStyle';
import { useAdmissionStore } from '../../model/store';
import { generateSnippet } from './snippet';
import { CodeLensCard } from './CodeLensCard';
import { formatDate } from '@shared/i18n';

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

const FAKE_FIX_DIFF: { before: string; after: string } = {
  before: `const row = await db.query(\`SELECT * FROM users WHERE id = '\${id}'\`);`,
  after:  `const row = await db.query('SELECT * FROM users WHERE id = ?', [id]);`,
};

export function ActionPlanCard({
  evaluation, rule, prSeed, fileById,
}: {
  evaluation: RuleEvaluation;
  rule: AdmissionRule | undefined;
  prSeed: number;
  fileById: (id: number) => FileRecord | undefined;
}) {
  const { t } = useTranslation('admission');
  const overrides    = useAdmissionStore((s) => s.overrides);
  const suppressions = useAdmissionStore((s) => s.suppressions);

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

// ─── Modals ─────────────────────────────────────────────────────────────

function ModalShell({
  title, onClose, children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('admission');
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <button
          type="button"
          aria-label="Dismiss"
          className="absolute inset-0 border-0 p-0 cursor-default"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
        <div
          className="relative w-[520px] max-w-[92vw] rounded-md overflow-hidden"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          }}
        >
          <div
            className="flex items-center gap-2 px-4 h-11"
            style={{ borderBottom: '1px solid var(--border-default)' }}
          >
            <h3
              className="text-[12px] font-semibold uppercase tracking-[0.14em] flex-1"
              style={{ color: 'var(--fg-strong)' }}
            >
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('gate.modal.close')}
              className="inline-flex items-center justify-center w-6 h-6 rounded transition-colors"
              style={{ color: 'var(--fg-subtle)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--fg-strong)';
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--fg-subtle)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  );
}

function FixDrawer({
  ruleName, onClose,
}: {
  ruleName: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('admission');
  return (
    <ModalShell title={t('gate.fix.title', { rule: ruleName })} onClose={onClose}>
      <div className="p-4 flex flex-col gap-3">
        <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
          {t('gate.fix.intro')}
        </p>
        <div
          className="rounded-md overflow-hidden font-mono text-[11px] leading-[1.55]"
          style={{ border: '1px solid var(--border-default)' }}
        >
          <div
            className="px-3 py-1 text-[10px] uppercase tracking-[0.14em]"
            style={{
              color: 'var(--fg-subtle)',
              background: 'var(--bg-surface-muted)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            {t('gate.fix.diffHeader')}
          </div>
          <div className="px-3 py-2" style={{ background: 'var(--bg-canvas)' }}>
            <div
              className="whitespace-pre"
              style={{
                color: 'var(--intent-danger-fg)',
                background: 'color-mix(in oklab, var(--intent-danger-fg) 7%, transparent)',
              }}
            >
              − {FAKE_FIX_DIFF.before}
            </div>
            <div
              className="whitespace-pre"
              style={{
                color: 'var(--intent-success-fg)',
                background: 'color-mix(in oklab, var(--intent-success-fg) 7%, transparent)',
              }}
            >
              + {FAKE_FIX_DIFF.after}
            </div>
          </div>
        </div>
        <p
          className="text-[11px] leading-snug"
          style={{ color: 'var(--fg-subtle)' }}
        >
          The agent&apos;s confidence in this patch is moderate — verify the
          parameterised query lands in your DB layer before merging.
        </p>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-7 px-3 rounded-md text-[11px]"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--fg-muted)',
            }}
          >
            {t('gate.modal.close')}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled
            title={t('gate.fix.applyDisabledTitle')}
            className="h-7 px-3 rounded-md text-[11px] font-medium"
            style={{
              background: 'var(--fg-strong)',
              color: 'var(--bg-canvas)',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
          >
            {t('gate.fix.apply')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

const EXPIRY_OPTIONS = [
  { key: 'h24', ms: 1000 * 60 * 60 * 24 },
  { key: 'd7',  ms: 1000 * 60 * 60 * 24 * 7 },
  { key: 'd14', ms: 1000 * 60 * 60 * 24 * 14 },
  { key: 'd30', ms: 1000 * 60 * 60 * 24 * 30 },
] as const;

function OverrideDrawer({
  evaluation, rule, prSeed, onClose,
}: {
  evaluation: RuleEvaluation;
  rule: AdmissionRule | undefined;
  prSeed: number;
  onClose: () => void;
}) {
  const { t } = useTranslation('admission');
  const recordOverride = useAdmissionStore((s) => s.recordOverride);
  const [reason, setReason] = useState('');
  const [expiryIdx, setExpiryIdx] = useState(1); // default 7d
  const [mountedAt] = useState(() => Date.now());

  const requiresApprover = rule?.override.requiresApproverRole;
  const allowsAuthor = rule?.override.allowAuthor !== false;

  const submit = () => {
    if (!reason.trim()) return;
    const expiry = EXPIRY_OPTIONS[expiryIdx];
    if (!expiry) return;
    recordOverride({
      prSeed,
      ruleId: evaluation.ruleId,
      ruleName: evaluation.ruleName,
      actor: 'sondoo',
      severity: evaluation.severity,
      reason: reason.trim(),
      expiresAt: Date.now() + expiry.ms,
    });
    onClose();
  };

  return (
    <ModalShell title={t('gate.override.title', { rule: evaluation.ruleName })} onClose={onClose}>
      <div className="p-4 flex flex-col gap-3">
        {!allowsAuthor && requiresApprover && (
          <div
            className="text-[11px] px-3 py-2 rounded-md"
            style={{
              background: 'color-mix(in oklab, var(--intent-warn-fg) 8%, transparent)',
              color: 'var(--intent-warn-fg)',
              border: '1px solid color-mix(in oklab, var(--intent-warn-fg) 30%, transparent)',
            }}
          >
            {t('gate.override.needsApprover')}{' '}
            <strong>{requiresApprover}</strong>.
          </div>
        )}
        <Field label={t('gate.override.reasonLabel')}>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); }}
            rows={3}
            placeholder={t('gate.override.reasonPlaceholder')}
            className="w-full text-[12px] px-2 py-1.5 rounded outline-none resize-none"
            style={{
              border: '1px solid var(--border-default)',
              background: 'var(--bg-canvas)',
              color: 'var(--fg-strong)',
            }}
          />
        </Field>
        <Field label={t('gate.override.expiresLabel')}>
          <div className="flex items-center gap-1">
            {EXPIRY_OPTIONS.map((opt, i) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setExpiryIdx(i); }}
                className="h-7 px-2.5 rounded-md text-[11px] transition-colors"
                style={{
                  border: '1px solid var(--border-default)',
                  background: i === expiryIdx ? 'var(--bg-active)' : 'transparent',
                  color: i === expiryIdx ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  fontWeight: i === expiryIdx ? 600 : 400,
                }}
              >
                {t(`gate.expiry.${opt.key}`)}
              </button>
            ))}
          </div>
        </Field>
        <p className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          {t('gate.override.ledgerNote', { date: formatDate(new Date(mountedAt + (EXPIRY_OPTIONS[expiryIdx]?.ms ?? 0))) })}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-7 px-3 rounded-md text-[11px]"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--fg-muted)',
            }}
          >
            {t('gate.modal.cancel')}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={submit}
            disabled={!reason.trim()}
            className="h-7 px-3 rounded-md text-[11px] font-medium"
            style={{
              background: 'var(--fg-strong)',
              color: 'var(--bg-canvas)',
              opacity: reason.trim() ? 1 : 0.4,
              cursor: reason.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {t('gate.override.submit')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function SuppressDrawer({
  evaluation, prSeed, target, onClose,
}: {
  evaluation: RuleEvaluation;
  prSeed: number;
  target: { fileId: number; filePath: string };
  onClose: () => void;
}) {
  const { t } = useTranslation('admission');
  const recordSuppression = useAdmissionStore((s) => s.recordSuppression);
  const [reason, setReason] = useState('');
  const [expiryIdx, setExpiryIdx] = useState(1); // default 7d

  const submit = () => {
    if (!reason.trim()) return;
    const expiry = EXPIRY_OPTIONS[expiryIdx];
    if (!expiry) return;
    recordSuppression({
      prSeed,
      ruleId: evaluation.ruleId,
      ruleName: evaluation.ruleName,
      fileId: target.fileId,
      filePath: target.filePath,
      actor: 'sondoo',
      reason: reason.trim(),
      severity: evaluation.severity,
      expiresAt: Date.now() + expiry.ms,
    });
    onClose();
  };

  return (
    <ModalShell title={t('gate.suppress.title', { path: target.filePath })} onClose={onClose}>
      <div className="p-4 flex flex-col gap-3">
        <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
          <Trans
            i18nKey="gate.suppress.intro"
            ns="admission"
            values={{ path: target.filePath }}
            components={[
              <code
                key="path"
                className="font-mono px-1 py-px rounded"
                style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-strong)' }}
              />,
            ]}
          />
        </p>
        <Field label={t('gate.suppress.reasonLabel')}>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); }}
            rows={2}
            placeholder={t('gate.suppress.reasonPlaceholder')}
            className="w-full text-[12px] px-2 py-1.5 rounded outline-none resize-none"
            style={{
              border: '1px solid var(--border-default)',
              background: 'var(--bg-canvas)',
              color: 'var(--fg-strong)',
            }}
          />
        </Field>
        <Field label={t('gate.suppress.expiresLabel')}>
          <div className="flex items-center gap-1">
            {EXPIRY_OPTIONS.map((opt, i) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setExpiryIdx(i); }}
                className="h-7 px-2.5 rounded-md text-[11px] transition-colors"
                style={{
                  border: '1px solid var(--border-default)',
                  background: i === expiryIdx ? 'var(--bg-active)' : 'transparent',
                  color: i === expiryIdx ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  fontWeight: i === expiryIdx ? 600 : 400,
                }}
              >
                {t(`gate.expiry.${opt.key}`)}
              </button>
            ))}
          </div>
        </Field>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-7 px-3 rounded-md text-[11px]"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--fg-muted)',
            }}
          >
            {t('gate.modal.cancel')}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={submit}
            disabled={!reason.trim()}
            className="h-7 px-3 rounded-md text-[11px] font-medium"
            style={{
              background: 'var(--fg-strong)',
              color: 'var(--bg-canvas)',
              opacity: reason.trim() ? 1 : 0.4,
              cursor: reason.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {t('gate.suppress.submit')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-medium"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
