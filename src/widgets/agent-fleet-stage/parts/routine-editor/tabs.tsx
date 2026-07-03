import { Calendar, Hand, Shield, Sparkles } from 'lucide-react';
import type { HitlCheckpoint, Routine, TranslateFn } from '../types';
import { Field, BudgetField } from './fields';
import type { DryRunResult } from './dryRun';

// Theme-derived tone strings, computed once in the container and threaded
// through every tab so each panel stays presentational.
export type EditorTones = {
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
  const { muted, faint, inputBg } = tones;
  return (
    <div className="space-y-3">
      <Field label="name">
        <input
          value={draft.name}
          onChange={(e) => { setDraft({ ...draft, name: e.target.value }); }}
          className={`w-full px-2 py-1 rounded-md border outline-none text-base ${inputBg}`}
        />
      </Field>
      <Field label="description">
        <textarea
          value={draft.description}
          onChange={(e) => { setDraft({ ...draft, description: e.target.value }); }}
          rows={3}
          className={`w-full px-2 py-1 rounded-md border outline-none text-base resize-none ${inputBg}`}
        />
      </Field>
      <Field label={t('editor.scope')}>
        <div className={`text-sm font-mono ${muted}`}>
          {draft.scope.repos.join(', ')}{draft.scope.pathGlobs ? ` · ${draft.scope.pathGlobs.join(', ')}` : ''}
        </div>
      </Field>
      <Field label={t('editor.trustDial')}>
        <div className={`flex items-center gap-px rounded-md p-px bg-[var(--bg-hover)]`}>
          {[1, 2, 3, 4, 5].map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => { setDraft({ ...draft, trustLevel: lv as 1|2|3|4|5 }); }}
              aria-pressed={draft.trustLevel === lv}
              className={`flex-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                draft.trustLevel === lv
                  ? 'bg-[var(--bg-selected)] text-[var(--fg-strong)]'
                  : 'text-[var(--fg-subtle)] hover:text-[var(--fg-default)]'
              }`}
              title={t(`trust.level${lv}`)}
            >
              <Shield className="w-2.5 h-2.5 inline mr-1 opacity-70" />{lv}
            </button>
          ))}
        </div>
        <div className={`mt-1 text-xs font-mono ${faint}`}>{t(`trust.level${draft.trustLevel}`)}</div>
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
  const { muted, faint, inputBg } = tones;
  return (
    <div className="space-y-3">
      <Field label={t('editor.guardrail.maxLoc')}>
        <input
          type="number"
          value={draft.guardrails.maxLocPerPr}
          onChange={(e) => { setDraft({ ...draft, guardrails: { ...draft.guardrails, maxLocPerPr: Number(e.target.value) || 0 } }); }}
          className={`w-32 px-2 py-1 rounded-md border outline-none text-base font-mono tabular-nums ${inputBg}`}
        />
      </Field>
      <Field label={t('editor.guardrail.confidenceFloor')}>
        <input
          type="range" min={0} max={1} step={0.05}
          value={draft.guardrails.confidenceFloor}
          onChange={(e) => { setDraft({ ...draft, guardrails: { ...draft.guardrails, confidenceFloor: Number(e.target.value) } }); }}
          className="w-full"
        />
        <div className={`text-xs font-mono ${muted}`}>{Math.round(draft.guardrails.confidenceFloor * 100)}%</div>
      </Field>
      <Field label={t('editor.guardrail.requireGreenCi')}>
        <button
          type="button"
          onClick={() => { setDraft({ ...draft, guardrails: { ...draft.guardrails, requireGreenCi: !draft.guardrails.requireGreenCi } }); }}
          aria-pressed={draft.guardrails.requireGreenCi}
          className={`inline-flex items-center w-9 h-5 rounded-full transition-colors ${
            draft.guardrails.requireGreenCi
              ? 'bg-[color:var(--intent-success-vivid)]'
              : 'bg-[var(--bg-selected)]'
          }`}
        >
          <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${draft.guardrails.requireGreenCi ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
        </button>
      </Field>
      <Field label={t('editor.guardrail.forbidden')}>
        <div className={`flex flex-wrap gap-1 text-xs font-mono ${muted}`}>
          {draft.guardrails.forbiddenPaths.length === 0 ? <span className={faint}>—</span>
            : draft.guardrails.forbiddenPaths.map((p, i) => (
              <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--bg-active)]`}>{p}</span>
            ))}
        </div>
      </Field>
      <Field label={t('editor.guardrail.checkpoints')}>
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
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono border transition-colors ${
                  on
                    ? 'border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)] text-[color:var(--intent-warn-fg)]'
                    : 'border-[var(--border-strong)] text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)]'
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
  const { muted, labelTone, inputBg } = tones;
  return (
    <div className="space-y-3">
      <Field label="trigger">
        <div className={`text-base ${muted} flex items-center gap-2`}>
          <Calendar className="w-3 h-3 opacity-70" />
          {draft.trigger.kind === 'cron' ? t('trigger.cron', { label: draft.trigger.humanLabel })
            : draft.trigger.kind === 'event' ? t('trigger.event', { event: t(`trigger.evt.${draft.trigger.event}`) })
            : t('trigger.manual')}
        </div>
      </Field>
      <Field label={t('editor.budget.title')}>
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
  const { heading, muted, faint } = tones;
  return (
    <div className="space-y-3">
      <div className={`text-sm ${muted}`}>{t('editor.dryRun.title')}</div>
      <div className={`px-3 py-3 rounded-lg border bg-[var(--bg-surface-muted)] border-[var(--border-default)]`}>
        <div className={`flex items-center gap-1.5 text-base font-mono tabular-nums ${heading}`}>
          <Sparkles className="w-3 h-3 opacity-70" />
          {t('editor.dryRun.summary', { prs: dryRun.prs, lines: dryRun.lines, usd: dryRun.usd.toFixed(2) })}
        </div>
      </div>
      <div>
        <div className={`mb-1.5 text-xs font-bold uppercase tracking-eyebrow ${faint}`}>
          {t('editor.dryRun.candidatesHeader')}
        </div>
        {dryRun.candidates.length === 0 ? (
          <div className={`text-sm ${muted}`}>{t('editor.dryRun.noCandidates')}</div>
        ) : (
          <div className="space-y-1">
            {dryRun.candidates.map((c, i) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-muted)]`}>
                <span className={`shrink-0 inline-flex items-center px-1 py-px rounded-sm text-2xs font-bold uppercase tracking-eyebrow bg-[var(--bg-hover)] text-[var(--fg-muted)]`}>{c.kind}</span>
                <span className={`text-sm truncate flex-1 ${heading}`}>{c.title}</span>
                <span className={`text-xs font-mono ${muted}`}>+{c.added} -{c.removed}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
