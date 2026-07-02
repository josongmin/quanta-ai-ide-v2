import { useMemo } from 'react';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Toggle, Select, Divider, SaveBar } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';
import { MODELS, SURFACE_META, INITIAL, type Surface } from './parts/ai/types';
import { ModelRow } from './parts/ai/ModelRow';
import { CostInput } from './parts/ai/CostInput';
import { SpendMeter } from './parts/ai/SpendMeter';

export default function AiPage() {
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);

  // Estimate today's spend from a fake usage history. Drives the warning banner.
  const todaySpend = useMemo(() => 5.42, []);
  const spendPct = draft.costCapPerDay > 0 ? (todaySpend / draft.costCapPerDay) * 100 : 0;

  return (
    <MeShell
      title="AI"
      subtitle="Pick the model behind each workbench, decide what auto-runs on your behalf, and bound the cost."
    >
      <Section
        title="Model selection"
        hint="Each workbench can use a different model. Faster + cheaper for noisy surfaces; deeper reasoning where it matters."
      >
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(SURFACE_META) as Surface[]).map((s) => (
            <ModelRow
              key={s}
              surface={s}
              model={MODELS.find((m) => m.id === draft.models[s])!}
              onChange={(id) => { setDraft({ ...draft, models: { ...draft.models, [s]: id } }); }}
            />
          ))}
        </div>
      </Section>

      <Section title="Behavior" hint="How aggressively the AI offers suggestions and finishes things on your behalf.">
        <Row label="Inline suggestions" sub="Ghost text in the editor as you type.">
          <Toggle
            checked={draft.inlineSuggestions}
            onChange={(v) => { setDraft({ ...draft, inlineSuggestions: v }); }}
            label="Inline suggestions"
          />
        </Row>
        <Row label="Suggestion verbosity" sub="Concise patches vs. paragraph-length explanations.">
          <Select
            value={draft.suggestionVerbosity}
            onChange={(v) => { setDraft({ ...draft, suggestionVerbosity: v }); }}
            options={[
              { id: 'brief',   label: 'Brief',   sub: 'Minimal patches, no prose'  },
              { id: 'normal',  label: 'Normal',  sub: 'Default'                    },
              { id: 'verbose', label: 'Verbose', sub: 'Explains every change'      },
            ]}
          />
        </Row>
        <Row label="Auto-write commit messages" sub="Generate Conventional Commits headlines from the diff.">
          <Toggle
            checked={draft.autoCommitMessages}
            onChange={(v) => { setDraft({ ...draft, autoCommitMessages: v }); }}
            label="Auto commit messages"
          />
        </Row>
        <Row label="Auto-summarize PRs" sub="Adds a 3-bullet summary to each PR description in Reviews.">
          <Toggle
            checked={draft.autoReviewSummaries}
            onChange={(v) => { setDraft({ ...draft, autoReviewSummaries: v }); }}
            label="Auto PR summaries"
          />
        </Row>
        <Row label="Auto-link evidence" sub="Attach related logs / metrics / past PRs to investigations automatically.">
          <Toggle
            checked={draft.autoEvidenceLinks}
            onChange={(v) => { setDraft({ ...draft, autoEvidenceLinks: v }); }}
            label="Auto evidence"
          />
        </Row>
        <Row label="Context depth" sub="How much of the codebase the AI is allowed to read for each call.">
          <Select
            value={draft.contextDepth}
            onChange={(v) => { setDraft({ ...draft, contextDepth: v }); }}
            options={[
              { id: 'file',      label: 'Single file',          sub: 'Cheapest, narrowest' },
              { id: 'module',    label: 'Containing module',    sub: 'Balanced'            },
              { id: 'workspace', label: 'Whole workspace',      sub: 'Most accurate'       },
            ]}
          />
        </Row>
      </Section>

      <Section title="Privacy & training" hint="Control whether your code helps train models.">
        <Row label="Opt out of model training" sub="Your prompts and code are never used to train upstream models.">
          <Toggle
            checked={draft.trainingOptOut}
            onChange={(v) => { setDraft({ ...draft, trainingOptOut: v }); }}
            label="Opt out of training"
          />
        </Row>
        <Row label="Redact secrets before sending" sub="Detects API keys / tokens in prompts and replaces them with placeholders.">
          <Toggle
            checked={draft.redactSecrets}
            onChange={(v) => { setDraft({ ...draft, redactSecrets: v }); }}
            label="Redact secrets"
          />
        </Row>
      </Section>

      <Section
        title="Spend control"
        hint="Caps your AI usage so a runaway loop doesn't burn through your monthly tokens. Org admins can override."
      >
        <Row label="Daily cost cap" sub={<>Stops your account from making AI calls past this dollar amount per day. <span style={{ color: 'var(--fg-subtle)' }}>Today: ${todaySpend.toFixed(2)}</span></>}>
          <CostInput value={draft.costCapPerDay} onChange={(v) => { setDraft({ ...draft, costCapPerDay: v }); }} />
        </Row>

        {draft.costCapPerDay > 0 && (
          <SpendMeter pct={spendPct} cap={draft.costCapPerDay} spent={todaySpend} alertAt={draft.spikeAlertAt} />
        )}

        <Row label="Alert when at" sub="Pings you in the inbox when daily spend crosses this percentage of the cap.">
          <Select
            value={String(draft.spikeAlertAt) as '50' | '75' | '90' | '100'}
            onChange={(v) => { setDraft({ ...draft, spikeAlertAt: Number(v) }); }}
            options={[
              { id: '50',  label: '50% of cap' },
              { id: '75',  label: '75% of cap' },
              { id: '90',  label: '90% of cap' },
              { id: '100', label: '100% (cap hit)' },
            ]}
          />
        </Row>
        <Row label="Fall back to fast model when near cap" sub={<>At {draft.spikeAlertAt}% of cap, future calls use Haiku/GPT-mini regardless of surface preference.</>}>
          <Toggle
            checked={draft.fallbackToFastModel}
            onChange={(v) => { setDraft({ ...draft, fallbackToFastModel: v }); }}
            label="Fallback to fast"
          />
        </Row>
      </Section>

      <Divider />

      <SaveBar visible={true} dirty={dirty} savingState={savingState} onSave={save} onDiscard={discard} />
    </MeShell>
  );
}
