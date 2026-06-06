import { Calendar, Hand, Shield, Sparkles } from 'lucide-react';
import type { HitlCheckpoint, Routine, TranslateFn } from '../types';
import { Field, BudgetField } from './fields';
import type { DryRunResult } from './dryRun';

// Theme-derived tone strings, computed once in the container and threaded
// through every tab so each panel stays presentational.
export type EditorTones = {
  isDark: boolean;
  heading: string;
  muted: string;
  faint: string;
  labelTone: string;
  inputBg: string;
};

export function DefinitionTab({
  draft, setDraft, tones, t,
}: {
  draft: Routine;
  setDraft: (next: Routine) => void;
  tones: EditorTones;
  t: TranslateFn;
}) {
  const { isDark, muted, faint, inputBg } = tones;
  return (
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
  );
}

export function GuardrailsTab({
  draft, setDraft, tones, t,
}: {
  draft: Routine;
  setDraft: (next: Routine) => void;
  tones: EditorTones;
  t: TranslateFn;
}) {
  const { isDark, muted, faint, inputBg } = tones;
  return (
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
  );
}

export function ScheduleTab({
  draft, setDraft, tones, t,
}: {
  draft: Routine;
  setDraft: (next: Routine) => void;
  tones: EditorTones;
  t: TranslateFn;
}) {
  const { isDark, muted, labelTone, inputBg } = tones;
  return (
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
  );
}

export function DryRunTab({
  dryRun, tones, t,
}: {
  dryRun: DryRunResult;
  tones: EditorTones;
  t: TranslateFn;
}) {
  const { isDark, heading, muted, faint } = tones;
  return (
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
  );
}
