import { useEffect, useMemo, useState } from 'react';
import { Calendar, Hand, Shield, Sparkles, X } from 'lucide-react';
import type { HitlCheckpoint, Routine } from './types';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

type Tab = 'definition' | 'guardrails' | 'schedule' | 'dryRun';

export default function RoutineEditorModal({
  routine, isDark, t, onClose, onSave,
}: {
  routine: Routine;
  isDark: boolean;
  t: TranslateFn;
  onClose: () => void;
  onSave: (next: Routine) => void;
}) {
  const [draft, setDraft] = useState<Routine>(routine);
  const [tab, setTab] = useState<Tab>('definition');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const surface = isDark ? 'bg-[#11141a] border-white/[0.10]' : 'bg-white border-black/[0.10]';
  const heading = isDark ? 'text-white/90' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  const labelTone = isDark ? 'text-white/40' : 'text-black/45';
  const inputBg = isDark
    ? 'bg-white/[0.04] text-white/85 placeholder:text-white/30 border-white/[0.08]'
    : 'bg-black/[0.03] text-black/85 placeholder:text-black/35 border-black/[0.08]';

  const dryRun = useMemo(() => simulateDryRun(draft), [draft]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Dismiss"
        className={`absolute inset-0 ${isDark ? 'bg-black/40' : 'bg-black/20'} backdrop-blur-sm border-0 p-0 cursor-default`}
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-[640px] max-h-[80vh] flex flex-col rounded-xl border shadow-2xl ${surface}`}
      >
        <div className={`shrink-0 flex items-center justify-between px-5 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
          <h2 className={`text-[12px] font-bold ${heading}`}>{t('editor.title', { name: draft.name })}</h2>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'text-white/45 hover:text-white/85 hover:bg-white/[0.05]' : 'text-black/45 hover:text-black/85 hover:bg-black/[0.05]'
            }`}
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`shrink-0 px-5 py-2 border-b ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
          <div className={`flex items-center gap-px rounded-md p-px ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`}>
            {(['definition', 'guardrails', 'schedule', 'dryRun'] as Tab[]).map((tk) => (
              <button
                key={tk}
                type="button"
                onClick={() => { setTab(tk); }}
                aria-pressed={tab === tk}
                className={`flex-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                  tab === tk
                    ? (isDark ? 'bg-white/[0.10] text-white' : 'bg-white text-black')
                    : (isDark ? 'text-white/45 hover:text-white/75' : 'text-black/45 hover:text-black/75')
                }`}
              >
                {t(`editor.tab${tk.charAt(0).toUpperCase() + tk.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin px-5 py-4">
          {tab === 'definition' && (
            <div className="space-y-3">
              <Field label="name" isDark={isDark}>
                <input
                  value={draft.name}
                  onChange={(e) => { setDraft({ ...draft, name: e.target.value }); }}
                  className={`w-full px-2 py-1 rounded-md border outline-none text-[12px] ${inputBg}`}
                />
              </Field>
              <Field label="description" isDark={isDark}>
                <textarea
                  value={draft.description}
                  onChange={(e) => { setDraft({ ...draft, description: e.target.value }); }}
                  rows={3}
                  className={`w-full px-2 py-1 rounded-md border outline-none text-[12px] resize-none ${inputBg}`}
                />
              </Field>
              <Field label={t('editor.scope')} isDark={isDark}>
                <div className={`text-[11px] font-mono ${muted}`}>
                  {draft.scope.repos.join(', ')}{draft.scope.pathGlobs ? ` · ${draft.scope.pathGlobs.join(', ')}` : ''}
                </div>
              </Field>
              <Field label={t('editor.trustDial')} isDark={isDark}>
                <div className={`flex items-center gap-px rounded-md p-px ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`}>
                  {[1, 2, 3, 4, 5].map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => { setDraft({ ...draft, trustLevel: lv as 1|2|3|4|5 }); }}
                      aria-pressed={draft.trustLevel === lv}
                      className={`flex-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                        draft.trustLevel === lv
                          ? (isDark ? 'bg-white/[0.10] text-white' : 'bg-white text-black')
                          : (isDark ? 'text-white/45 hover:text-white/75' : 'text-black/45 hover:text-black/75')
                      }`}
                      title={t(`trust.level${lv}`)}
                    >
                      <Shield className="w-2.5 h-2.5 inline mr-1 opacity-70" />{lv}
                    </button>
                  ))}
                </div>
                <div className={`mt-1 text-[10px] font-mono ${faint}`}>{t(`trust.level${draft.trustLevel}`)}</div>
              </Field>
            </div>
          )}

          {tab === 'guardrails' && (
            <div className="space-y-3">
              <Field label={t('editor.guardrail.maxLoc')} isDark={isDark}>
                <input
                  type="number"
                  value={draft.guardrails.maxLocPerPr}
                  onChange={(e) => { setDraft({ ...draft, guardrails: { ...draft.guardrails, maxLocPerPr: Number(e.target.value) || 0 } }); }}
                  className={`w-32 px-2 py-1 rounded-md border outline-none text-[12px] font-mono tabular-nums ${inputBg}`}
                />
              </Field>
              <Field label={t('editor.guardrail.confidenceFloor')} isDark={isDark}>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={draft.guardrails.confidenceFloor}
                  onChange={(e) => { setDraft({ ...draft, guardrails: { ...draft.guardrails, confidenceFloor: Number(e.target.value) } }); }}
                  className="w-full"
                />
                <div className={`text-[10px] font-mono ${muted}`}>{Math.round(draft.guardrails.confidenceFloor * 100)}%</div>
              </Field>
              <Field label={t('editor.guardrail.requireGreenCi')} isDark={isDark}>
                <button
                  type="button"
                  onClick={() => { setDraft({ ...draft, guardrails: { ...draft.guardrails, requireGreenCi: !draft.guardrails.requireGreenCi } }); }}
                  aria-pressed={draft.guardrails.requireGreenCi}
                  className={`inline-flex items-center w-9 h-5 rounded-full transition-colors ${
                    draft.guardrails.requireGreenCi
                      ? 'bg-[color:var(--intent-success-vivid)]'
                      : (isDark ? 'bg-white/[0.15]' : 'bg-black/[0.15]')
                  }`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${draft.guardrails.requireGreenCi ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </button>
              </Field>
              <Field label={t('editor.guardrail.forbidden')} isDark={isDark}>
                <div className={`flex flex-wrap gap-1 text-[10px] font-mono ${muted}`}>
                  {draft.guardrails.forbiddenPaths.length === 0 ? <span className={faint}>—</span>
                    : draft.guardrails.forbiddenPaths.map((p, i) => (
                      <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${isDark ? 'bg-white/[0.08]' : 'bg-black/[0.06]'}`}>{p}</span>
                    ))}
                </div>
              </Field>
              <Field label={t('editor.guardrail.checkpoints')} isDark={isDark}>
                <div className="flex flex-wrap gap-1.5">
                  {(['plan-approval', 'pre-push', 'risky-tier-only'] as HitlCheckpoint[]).map((cp) => {
                    const on = draft.guardrails.hitlCheckpoints.includes(cp);
                    return (
                      <button
                        key={cp}
                        type="button"
                        onClick={() => {
                          const list = on
                            ? draft.guardrails.hitlCheckpoints.filter((x) => x !== cp)
                            : [...draft.guardrails.hitlCheckpoints, cp];
                          setDraft({ ...draft, guardrails: { ...draft.guardrails, hitlCheckpoints: list } });
                        }}
                        aria-pressed={on}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono border transition-colors ${
                          on
                            ? 'border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)] text-[color:var(--intent-warn-fg)]'
                            : (isDark ? 'border-white/[0.10] text-white/55 hover:bg-white/[0.05]' : 'border-black/[0.10] text-black/55 hover:bg-black/[0.05]')
                        }`}
                      >
                        <Hand className="w-2.5 h-2.5 opacity-70" />
                        {t(`hitl.checkpoint.${cp}`)}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          )}

          {tab === 'schedule' && (
            <div className="space-y-3">
              <Field label="trigger" isDark={isDark}>
                <div className={`text-[12px] ${muted} flex items-center gap-2`}>
                  <Calendar className="w-3 h-3 opacity-70" />
                  {draft.trigger.kind === 'cron' ? t('trigger.cron', { label: draft.trigger.humanLabel })
                    : draft.trigger.kind === 'event' ? t('trigger.event', { event: t(`trigger.evt.${draft.trigger.event}`) })
                    : t('trigger.manual')}
                </div>
              </Field>
              <Field label={t('editor.budget.title')} isDark={isDark}>
                <div className="grid grid-cols-3 gap-2">
                  <BudgetField
                    label={t('editor.budget.daily', { n: draft.budget.dailyUsd })}
                    value={draft.budget.dailyUsd}
                    onChange={(v) => { setDraft({ ...draft, budget: { ...draft.budget, dailyUsd: v } }); }}
                    inputBg={inputBg}
                    labelTone={labelTone}
                  />
                  <BudgetField
                    label={t('editor.budget.weekly', { n: draft.budget.weeklyUsd })}
                    value={draft.budget.weeklyUsd}
                    onChange={(v) => { setDraft({ ...draft, budget: { ...draft.budget, weeklyUsd: v } }); }}
                    inputBg={inputBg}
                    labelTone={labelTone}
                  />
                  <BudgetField
                    label={t('editor.budget.perRun', { n: draft.budget.perRunUsd })}
                    value={draft.budget.perRunUsd}
                    onChange={(v) => { setDraft({ ...draft, budget: { ...draft.budget, perRunUsd: v } }); }}
                    inputBg={inputBg}
                    labelTone={labelTone}
                  />
                </div>
              </Field>
            </div>
          )}

          {tab === 'dryRun' && (
            <div className="space-y-3">
              <div className={`text-[11px] ${muted}`}>{t('editor.dryRun.title')}</div>
              <div className={`px-3 py-3 rounded-lg border ${isDark ? 'bg-white/[0.025] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                <div className={`flex items-center gap-1.5 text-[12px] font-mono tabular-nums ${heading}`}>
                  <Sparkles className="w-3 h-3 opacity-70" />
                  {t('editor.dryRun.summary', { prs: dryRun.prs, lines: dryRun.lines, usd: dryRun.usd.toFixed(2) })}
                </div>
              </div>
              <div>
                <div className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${faint}`}>
                  {t('editor.dryRun.candidatesHeader')}
                </div>
                {dryRun.candidates.length === 0 ? (
                  <div className={`text-[11px] ${muted}`}>{t('editor.dryRun.noCandidates')}</div>
                ) : (
                  <div className="space-y-1">
                    {dryRun.candidates.map((c, i) => (
                      <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                        isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-black/[0.06] bg-black/[0.015]'
                      }`}>
                        <span className={`shrink-0 inline-flex items-center px-1 py-px rounded-sm text-[9px] font-bold uppercase tracking-[0.18em] ${
                          isDark ? 'bg-white/[0.04] text-white/55' : 'bg-black/[0.04] text-black/55'
                        }`}>{c.kind}</span>
                        <span className={`text-[11px] truncate flex-1 ${heading}`}>{c.title}</span>
                        <span className={`text-[10px] font-mono ${muted}`}>+{c.added} -{c.removed}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`text-[11px] font-mono px-3 py-1.5 rounded-md transition-colors ${
              isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.05]' : 'text-black/55 hover:text-black hover:bg-black/[0.04]'
            }`}
          >
            {t('editor.discard')}
          </button>
          <button
            type="button"
            onClick={() => { onSave(draft); }}
            className="text-[11px] font-mono px-3 py-1.5 rounded-md border border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)] hover:bg-[color:var(--intent-success-bg)] text-[color:var(--intent-success-fg)] transition-colors"
          >
            {t('editor.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
  const labelTone = isDark ? 'text-white/40' : 'text-black/45';
  return (
    <div>
      <div className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-1 ${labelTone}`}>{label}</div>
      {children}
    </div>
  );
}

function BudgetField({
  label, value, onChange, inputBg, labelTone,
}: {
  label: string; value: number; onChange: (v: number) => void;
  inputBg: string; labelTone: string;
}) {
  return (
    <label className="block">
      <div className={`text-[9px] font-bold uppercase tracking-[0.18em] mb-1 ${labelTone}`}>{label}</div>
      <input
        type="number" step={0.5}
        value={value}
        onChange={(e) => { onChange(Number(e.target.value) || 0); }}
        className={`w-full px-2 py-1 rounded-md border outline-none text-[12px] font-mono tabular-nums ${inputBg}`}
      />
    </label>
  );
}

// Synthetic dry-run — derives a deterministic preview from the routine
// definition. Real impl would replay the routine's analyzers against
// yesterday's repo snapshot.
function simulateDryRun(r: Routine): {
  prs: number;
  lines: number;
  usd: number;
  candidates: { kind: string; title: string; added: number; removed: number }[];
} {
  const trustWeight = r.trustLevel >= 4 ? 1 : r.trustLevel >= 3 ? 0.6 : 0.3;
  const guardScale = Math.min(1, r.guardrails.maxLocPerPr / 100);
  const baseFromKind: Record<string, { prs: number; lpr: number; cost: number; samples: { kind: string; title: string; added: number; removed: number }[] }> = {
    'quality-sweeper': {
      prs: 6, lpr: 14, cost: 0.6, samples: [
        { kind: 'lint', title: 'chore: remove unused imports in packages/cli', added: 0, removed: 18 },
        { kind: 'type', title: 'chore: tighten Awaited<T> usage in api/handlers', added: 6, removed: 4 },
        { kind: 'lint', title: 'chore: drop dead branch in router/middleware', added: 0, removed: 9 },
      ],
    },
    'dead-code': {
      prs: 1, lpr: 142, cost: 4, samples: [
        { kind: 'remove', title: 'chore: drop legacy v1 webhook handler', added: 0, removed: 142 },
      ],
    },
    'flaky-tests': {
      prs: 2, lpr: 24, cost: 0.9, samples: [
        { kind: 'test', title: 'fix(test): retry-with-jitter on receipt session race', added: 18, removed: 4 },
      ],
    },
    'dep-caretaker': {
      prs: 3, lpr: 22, cost: 1.2, samples: [
        { kind: 'deps', title: 'deps: bump zod 3.23 → 3.24', added: 1, removed: 1 },
        { kind: 'deps', title: 'deps: bump @vitejs/plugin-react minor', added: 8, removed: 8 },
      ],
    },
    'perf-hunter': { prs: 0, lpr: 0, cost: 0, samples: [] },
    'docs-drift': {
      prs: 4, lpr: 9, cost: 0.3, samples: [
        { kind: 'docs', title: 'docs: sync withSession docstring with new signature', added: 6, removed: 3 },
      ],
    },
  };
  const base = baseFromKind[r.kind] ?? { prs: 0, lpr: 0, cost: 0, samples: [] };
  const prs = Math.max(0, Math.round(base.prs * trustWeight * (0.5 + guardScale)));
  const lines = Math.round(base.lpr * prs);
  const usd = Math.min(r.budget.dailyUsd, base.cost * Math.max(1, prs / Math.max(1, base.prs)));
  return { prs, lines, usd, candidates: base.samples.slice(0, Math.max(0, prs)) };
}
