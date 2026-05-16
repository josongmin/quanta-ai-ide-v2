import { useMemo, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldX, Gavel, FileText,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { Portal } from '@shared/ui';
import { useFilterStore } from '@features/filter-files';
import type { PRDiff } from '@entities/repo';
import type { evaluateAdmission, RuleSeverity } from '@entities/admission';
import { useAdmissionStore } from '../../../model/store';
import { SOURCE_GLYPH, usesHint, describeSignal } from '../../sourceStyle';
import { SEVERITY_COLOR } from './tokens';
import { V2Card, SectionTitle } from './primitives';
import { Hero } from './HealthPage';
import { Field, DrawerInput } from './RuleEditorOverlay';

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

  const [overrideTarget, setOverrideTarget] = useState<{ ruleId: string; ruleName: string; severity: RuleSeverity } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

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
          <div className="px-5 py-3 border-b border-white/5">
            <SectionTitle icon={FileText}>{tA('section.filesInPr')}</SectionTitle>
            <div className="mt-1 text-[10px] font-mono text-white/40">
              {diff.changes.length} files · {diff.affected.length} ripple
            </div>
          </div>
          <div className="max-h-[600px] overflow-auto divide-y divide-white/5">
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
                        background: stripeColor ?? 'rgba(255,255,255,0.35)',
                        boxShadow: stripeColor && worst?.status === 'block' ? `0 0 0 2px ${stripeColor}33` : 'none',
                      }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-white/85 truncate">
                        {f.folderPath}.{f.name}
                      </span>
                      <span className="ml-auto text-[9px] font-mono uppercase tracking-[0.18em] text-white/40">
                        {c.kind}
                      </span>
                    </div>
                    {fileFired.length > 0 && (
                      <div className="mt-1 text-[10px] font-mono text-white/40 truncate">
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
              <ShieldCheck className="w-10 h-10 mx-auto mb-3" style={{ color: '#5fa86c' }} />
              <div className="text-[14px] font-bold text-white/85">{tr('admission.gate.allChecksPassed')}</div>
              <div className="mt-1 text-[11px] font-mono text-white/40">
                {passed.length} rules evaluated · 0 blocking · 0 warning
              </div>
            </V2Card>
          ) : (
            <>
              <V2Card className="p-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                    {fired.length} rule{fired.length === 1 ? '' : 's'} fired
                  </span>
                  <div className="flex-1" />
                  {prOverrides.length > 0 && (
                    <span className="text-[10px] font-mono text-white/40">
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
                          <span className="text-[10px] font-mono text-white/40">
                            {SOURCE_GLYPH[r.source]} {r.source}
                          </span>
                          <span className="text-white/30">·</span>
                          <span
                            className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
                            style={{ color: sevColor, background: `${sevColor}1a` }}
                          >
                            {r.severity}
                          </span>
                          {overridden && (
                            <span
                              className="ml-auto text-[9px] font-mono uppercase tracking-[0.18em] px-2 py-px rounded-md"
                              style={{
                                color: '#7aa7d4',
                                background: '#7aa7d415',
                                border: '1px solid #7aa7d444',
                              }}
                            >
                              overridden
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[14px] font-bold text-white/85">
                          {r.ruleName}
                        </div>
                        {rule && (
                          <div className="mt-0.5 text-[11px] font-mono text-white/40">
                            uses {usesHint(rule.signal)} · {describeSignal(rule.signal)}
                          </div>
                        )}
                        <div className="mt-2 text-[11px] font-mono text-white/55">
                          {r.reason}
                        </div>

                        {r.hits.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {r.hits.slice(0, 5).map((h) => {
                              const f = repo.files[h.fileId];
                              return (
                                <div key={h.fileId} className="flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded-md bg-white/[0.03]">
                                  <span className="w-1 h-1 rounded-full bg-white/45" />
                                  <span className="text-white/85 truncate flex-1">
                                    {f ? `${f.folderPath}.${f.name}` : `#${h.fileId}`}
                                  </span>
                                  <span className="text-white/40 truncate max-w-[14rem]">
                                    {h.evidenceText}
                                  </span>
                                </div>
                              );
                            })}
                            {r.hits.length > 5 && (
                              <div className="text-[10px] font-mono text-white/40 px-2">
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
                              className="text-[10px] font-mono uppercase tracking-[0.18em] px-3 py-1 rounded-md hover:bg-white/5 text-white/55 hover:text-white border border-white/10"
                            >
                              override with reason
                            </button>
                            <button type="button" className="text-[10px] font-mono uppercase tracking-[0.18em] px-3 py-1 rounded-md hover:bg-white/5 text-white/55 hover:text-white border border-white/10">
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
                <ShieldCheck className="w-3.5 h-3.5 text-[#5fa86c]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                  {passed.length} rule{passed.length === 1 ? '' : 's'} passed
                </span>
                <div className="flex-1" />
                <span className="text-[10px] font-mono text-white/40">
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
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- backdrop click-to-dismiss with paired Escape onKeyDown */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Override admission rule"
          className="fixed inset-0 z-[210] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => { setOverrideTarget(null); setOverrideReason(''); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOverrideTarget(null); setOverrideReason(''); }
          }}
        >
          <V2Card className="p-6 w-[480px] admv2-rise" >
            <div role="presentation" onClick={(e) => { e.stopPropagation(); }}>
              <div className="flex items-center gap-2 mb-4">
                <Gavel className="w-4 h-4 text-white/55" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                  {tr('admission.override.title')}
                </h3>
              </div>
              <div className="text-[12px] font-bold text-white/85 mb-1">
                {overrideTarget.ruleName}
              </div>
              <div className="text-[11px] font-mono text-white/55 mb-4">
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
                  onClick={() => { setOverrideTarget(null); setOverrideReason(''); }}
                  className="text-[10px] font-mono uppercase tracking-[0.18em] px-3 py-1.5 rounded-md text-white/55 hover:text-white border border-white/10 hover:bg-white/5"
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
                    setOverrideTarget(null);
                    setOverrideReason('');
                  }}
                  className="px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed"
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
