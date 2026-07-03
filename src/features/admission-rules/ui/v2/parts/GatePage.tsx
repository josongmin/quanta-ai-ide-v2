import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldX, Gavel, FileText,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { Portal, ModalBackdrop, useDialogA11y } from '@shared/ui';
import { useFilterStore } from '@entities/filter-state';
import type { PRDiff } from '@entities/repo';
import type { evaluateAdmission, RuleSeverity } from '@entities/admission';
import { useAdmissionStore } from '../../../model/store';
import { SOURCE_GLYPH, usesHint, describeSignal } from '../../sourceStyle';
import { SEVERITY_COLOR, useV2 } from './tokens';
import { V2Card, SectionTitle } from './primitives';
import { Hero } from './HealthPage';
import { Field, DrawerInput } from './DrawerFields';

// ═════════════════════════════════════════════════════════════════════════
// GATE PAGE — current PR's verdict, fired-rule details, override workflow
// ═════════════════════════════════════════════════════════════════════════

export function GatePage({
  decision, diff, seed, onRegenerate,
}: {
  decision: ReturnType<typeof evaluateAdmission>;
  diff: PRDiff;
  seed: number;
  onRegenerate: () => void;
}) {
  const repo = useFilterStore((s) => s.repo);
  const overrides = useAdmissionStore((s) => s.overrides);
  const recordOverride = useAdmissionStore((s) => s.recordOverride);
  const rules = useAdmissionStore((s) => s.rules);
  const { t: tr } = useTranslation('app');
  const { t: tA } = useTranslation('admission');
  const t = useV2();

  const [overrideTarget, setOverrideTarget] = useState<{ ruleId: string; ruleName: string; severity: RuleSeverity } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  // Override modal a11y: ESC closes, Tab cycles within the dialog, autofocus
  // first field on open, restore focus to the opener on close.
  const overrideDialogRef = useRef<HTMLDivElement>(null);
  const closeOverride = useCallback(() => {
    setOverrideTarget(null);
    setOverrideReason('');
  }, []);
  useDialogA11y(overrideDialogRef, overrideTarget !== null, closeOverride);

  const fired = decision.ruleResults.filter((r) => r.status === 'block' || r.status === 'warn');
  const passed = decision.ruleResults.filter((r) => r.status === 'pass');

  const accent = decision.outcome === 'block' ? SEVERITY_COLOR.block
    : decision.outcome === 'warn' ? SEVERITY_COLOR.warn : '#5fa86c';
  const Icon = decision.outcome === 'allow' ? ShieldCheck
    : decision.outcome === 'warn' ? ShieldAlert : ShieldX;

  // Per-PR override count
  const prOverrides = useMemo(
    () => overrides.filter((o) => o.prSeed === seed),
    [overrides, seed],
  );

  return (
    <div className="relative min-h-full p-6 pt-10 flex flex-col gap-5">
      <div className="admv2-rise">
        <Hero
          decision={decision}
          diff={diff}
          seed={seed}
          onRegenerate={onRegenerate}
        />
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0,360px) minmax(0,1fr)' }}>
        {/* Left — files */}
        <V2Card className="p-0 admv2-rise admv2-rise-1 overflow-hidden">
          <div className="px-5 py-3 border-b" style={{ borderColor: t.borderSoft }}>
            <SectionTitle icon={FileText}>{tA('section.filesInPr')}</SectionTitle>
            <div className="mt-1 text-xs font-mono" style={{ color: t.textSubtle }}>
              {diff.changes.length} files · {diff.affected.length} ripple
            </div>
          </div>
          <div className="max-h-[600px] overflow-auto admv2-gate-filelist">
            <style>{`.admv2-gate-filelist > * + * { border-top: 1px solid ${t.borderSoft}; }`}</style>
            {diff.changes.map((c) => {
              const f = repo.files[c.id];
              if (!f) return null;
              const fileFired = decision.ruleResults
                .filter((rr) => rr.hits.some((h) => h.fileId === c.id));
              const worst = fileFired.find((r) => r.status === 'block')
                ?? fileFired.find((r) => r.status === 'warn');
              const stripeColor = worst?.status === 'block' ? SEVERITY_COLOR.block
                : worst?.status === 'warn' ? SEVERITY_COLOR.warn : null;
              return (
                <div key={c.id} className="px-5 py-2.5 flex items-start gap-2.5">
                  <span className="relative shrink-0 mt-1 inline-flex items-center justify-center w-3 h-3">
                    {stripeColor && (
                      <span
                        className="absolute inset-0 rounded-full"
                        style={{ background: stripeColor, opacity: 0.2, filter: 'blur(2px)' }}
                      />
                    )}
                    <span
                      className="relative w-1.5 h-1.5 rounded-full"
                      style={{
                        background: stripeColor ?? t.textFaint,
                        boxShadow: stripeColor && worst?.status === 'block' ? `0 0 0 2px ${stripeColor}33` : 'none',
                      }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono truncate" style={{ color: t.textBody }}>
                        {f.folderPath}.{f.name}
                      </span>
                      <span className="ml-auto text-2xs font-mono uppercase tracking-eyebrow" style={{ color: t.textSubtle }}>
                        {c.kind}
                      </span>
                    </div>
                    {fileFired.length > 0 && (
                      <div className="mt-1 text-xs font-mono truncate" style={{ color: t.textSubtle }}>
                        {fileFired.map((r) => r.ruleName).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </V2Card>

        {/* Right — fired-rule cards with override */}
        <div className="flex flex-col gap-4 admv2-rise admv2-rise-2">
          {fired.length === 0 ? (
            <V2Card className="p-8 text-center">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3" style={{ color: t.ok }} />
              <div className="text-lg font-bold" style={{ color: t.textBody }}>{tr('admission.gate.allChecksPassed')}</div>
              <div className="mt-1 text-sm font-mono" style={{ color: t.textSubtle }}>
                {passed.length} rules evaluated · 0 blocking · 0 warning
              </div>
            </V2Card>
          ) : (
            <>
              <V2Card className="p-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                  <span className="text-sm font-bold uppercase tracking-eyebrow" style={{ color: accent }}>
                    {fired.length} rule{fired.length === 1 ? '' : 's'} fired
                  </span>
                  <div className="flex-1" />
                  {prOverrides.length > 0 && (
                    <span className="text-xs font-mono" style={{ color: t.textSubtle }}>
                      {prOverrides.length} override{prOverrides.length === 1 ? '' : 's'} on this PR
                    </span>
                  )}
                </div>
              </V2Card>

              {fired.map((r) => {
                const sevColor = r.status === 'block' ? SEVERITY_COLOR.block : SEVERITY_COLOR.warn;
                const rule = rules.find((x) => x.id === r.ruleId);
                const overridden = prOverrides.some((o) => o.ruleId === r.ruleId);
                return (
                  <V2Card key={r.ruleId} className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="relative shrink-0 mt-1 inline-flex items-center justify-center w-3 h-3">
                        <span
                          className="absolute inset-0 rounded-full"
                          style={{ background: sevColor, opacity: 0.2, filter: 'blur(2px)' }}
                        />
                        <span
                          className="relative w-2 h-2 rounded-full"
                          style={{
                            background: sevColor,
                            boxShadow: r.status === 'block' ? `0 0 0 2px ${sevColor}33` : 'none',
                          }}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono" style={{ color: t.textSubtle }}>
                            {SOURCE_GLYPH[r.source]} {r.source}
                          </span>
                          <span style={{ color: t.textFaint }}>·</span>
                          <span
                            className="text-2xs font-mono uppercase tracking-eyebrow px-1.5 py-px rounded-md"
                            style={{ color: sevColor, background: `${sevColor}1a` }}
                          >
                            {r.severity}
                          </span>
                          {overridden && (
                            <span
                              className="ml-auto text-2xs font-mono uppercase tracking-eyebrow px-2 py-px rounded-md"
                              style={{
                                color: t.accent,
                                background: `${t.accent}15`,
                                border: `1px solid ${t.accent}44`,
                              }}
                            >
                              overridden
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-lg font-bold" style={{ color: t.textBody }}>
                          {r.ruleName}
                        </div>
                        {rule && (
                          <div className="mt-0.5 text-sm font-mono" style={{ color: t.textSubtle }}>
                            uses {usesHint(rule.signal)} · {describeSignal(rule.signal)}
                          </div>
                        )}
                        <div className="mt-2 text-sm font-mono" style={{ color: t.textMuted }}>
                          {r.reason}
                        </div>

                        {r.hits.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {r.hits.slice(0, 5).map((h) => {
                              const f = repo.files[h.fileId];
                              return (
                                <div key={h.fileId} className="flex items-center gap-2 text-xs font-mono px-2 py-1 rounded-md" style={{ background: t.inset }}>
                                  <span className="w-1 h-1 rounded-full" style={{ background: t.textSubtle }} />
                                  <span className="truncate flex-1" style={{ color: t.textBody }}>
                                    {f ? `${f.folderPath}.${f.name}` : `#${h.fileId}`}
                                  </span>
                                  <span className="truncate max-w-[14rem]" style={{ color: t.textSubtle }}>
                                    {h.evidenceText}
                                  </span>
                                </div>
                              );
                            })}
                            {r.hits.length > 5 && (
                              <div className="text-xs font-mono px-2" style={{ color: t.textSubtle }}>
                                … {r.hits.length - 5} more
                              </div>
                            )}
                          </div>
                        )}

                        {!overridden && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => { setOverrideTarget({ ruleId: r.ruleId, ruleName: r.ruleName, severity: r.severity }); }}
                              className="text-xs font-mono uppercase tracking-eyebrow px-3 py-1 rounded-md border transition-colors"
                              style={{ background: 'transparent', borderColor: t.border, color: t.textMuted }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverSubtle; e.currentTarget.style.color = t.textHi; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
                            >
                              override with reason
                            </button>
                            <button
                              type="button"
                              className="text-xs font-mono uppercase tracking-eyebrow px-3 py-1 rounded-md border transition-colors"
                              style={{ background: 'transparent', borderColor: t.border, color: t.textMuted }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverSubtle; e.currentTarget.style.color = t.textHi; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
                            >
                              request escalation
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </V2Card>
                );
              })}
            </>
          )}

          {/* Passed summary */}
          {passed.length > 0 && (
            <V2Card className="p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: t.ok }} />
                <span className="text-xs font-bold uppercase tracking-eyebrow" style={{ color: t.textMuted }}>
                  {passed.length} rule{passed.length === 1 ? '' : 's'} passed
                </span>
                <div className="flex-1" />
                <span className="text-xs font-mono" style={{ color: t.textSubtle }}>
                  {passed.map((r) => r.ruleName).slice(0, 4).join(' · ')}
                  {passed.length > 4 && ` +${passed.length - 4}`}
                </span>
              </div>
            </V2Card>
          )}
        </div>
      </div>

      {/* Override modal */}
      {overrideTarget && (
        <Portal>
        {/* Backdrop — click-to-dismiss; Escape/focus-trap via useDialogA11y. */}
        <ModalBackdrop
          onClick={closeOverride}
          z="z-[210]"
          alpha={0.65}
          label="Close"
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        />
        <div className="fixed inset-0 z-[211] flex items-center justify-center pointer-events-none">
          <V2Card className="p-6 w-[480px] admv2-rise pointer-events-auto">
            <div
              ref={overrideDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Override admission rule"
              tabIndex={-1}
              className="outline-none"
            >
              <div className="flex items-center gap-2 mb-4">
                <Gavel className="w-4 h-4" style={{ color: t.textMuted }} />
                <h3 className="text-sm font-bold uppercase tracking-eyebrow" style={{ color: t.textHi }}>
                  {tr('admission.override.title')}
                </h3>
              </div>
              <div className="text-base font-bold mb-1" style={{ color: t.textBody }}>
                {overrideTarget.ruleName}
              </div>
              <div className="text-sm font-mono mb-4" style={{ color: t.textMuted }}>
                {tr('admission.override.notice')}
              </div>
              <Field label="Reason (required)">
                <DrawerInput
                  value={overrideReason}
                  onChange={setOverrideReason}
                  placeholder={tA('override.whyPlaceholder')}
                  multiline
                />
              </Field>
              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeOverride}
                  className="text-xs font-mono uppercase tracking-eyebrow px-3 py-1.5 rounded-md border transition-colors"
                  style={{ background: 'transparent', borderColor: t.border, color: t.textMuted }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverSubtle; e.currentTarget.style.color = t.textHi; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted; }}
                >
                  cancel
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  disabled={!overrideReason.trim()}
                  onClick={() => {
                    recordOverride({
                      prSeed: seed,
                      ruleId: overrideTarget.ruleId,
                      ruleName: overrideTarget.ruleName,
                      actor: 'sondoo',
                      severity: overrideTarget.severity,
                      reason: overrideReason.trim(),
                    });
                    closeOverride();
                  }}
                  className="px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-eyebrow disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: t.textHi, color: t.page }}
                >
                  record override
                </button>
              </div>
            </div>
          </V2Card>
        </div>
        </Portal>
      )}
    </div>
  );
}
