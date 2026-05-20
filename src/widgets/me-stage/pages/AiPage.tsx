import { useMemo } from 'react';
import { Sparkles, Zap, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Toggle, Select, Divider, SaveBar } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';

type ModelTier = 'fast' | 'balanced' | 'best';

type Model = {
  id: string;
  vendor: 'Anthropic' | 'OpenAI' | 'Google' | 'Mistral';
  name: string;
  tier: ModelTier;
  inputCostPerMTok: number;     // USD per million input tokens
  outputCostPerMTok: number;
  context: string;
  speed: number;                 // tokens/sec, marketing-ish number
  reasoning: 'short' | 'medium' | 'extended';
};

const MODELS: Model[] = [
  { id: 'claude-haiku-4.5',  vendor: 'Anthropic', name: 'Claude Haiku 4.5',  tier: 'fast',     inputCostPerMTok: 0.80, outputCostPerMTok: 4.00,  context: '200K', speed: 130, reasoning: 'short'    },
  { id: 'claude-sonnet-4.6', vendor: 'Anthropic', name: 'Claude Sonnet 4.6', tier: 'balanced', inputCostPerMTok: 3.00, outputCostPerMTok: 15.00, context: '1M',   speed: 80,  reasoning: 'medium'   },
  { id: 'claude-opus-4.7',   vendor: 'Anthropic', name: 'Claude Opus 4.7',   tier: 'best',     inputCostPerMTok: 15.0, outputCostPerMTok: 75.00, context: '1M',   speed: 35,  reasoning: 'extended' },
  { id: 'gpt-mini',          vendor: 'OpenAI',    name: 'GPT mini',          tier: 'fast',     inputCostPerMTok: 0.50, outputCostPerMTok: 1.50,  context: '128K', speed: 110, reasoning: 'short'    },
  { id: 'gpt-pro',           vendor: 'OpenAI',    name: 'GPT pro',           tier: 'balanced', inputCostPerMTok: 5.00, outputCostPerMTok: 20.00, context: '256K', speed: 60,  reasoning: 'medium'   },
  { id: 'gemini-pro',        vendor: 'Google',    name: 'Gemini pro',        tier: 'balanced', inputCostPerMTok: 2.50, outputCostPerMTok: 10.00, context: '1M',   speed: 90,  reasoning: 'medium'   },
];

type Surface = 'coding' | 'review' | 'fix';

type AiPrefs = {
  models: Record<Surface, string>;       // model id per surface
  inlineSuggestions: boolean;
  suggestionVerbosity: 'brief' | 'normal' | 'verbose';
  autoCommitMessages: boolean;
  autoReviewSummaries: boolean;
  autoEvidenceLinks: boolean;
  contextDepth: 'file' | 'module' | 'workspace';
  trainingOptOut: boolean;
  redactSecrets: boolean;
  costCapPerDay: number;                 // USD; 0 = no cap
  spikeAlertAt: number;                  // % of cap
  fallbackToFastModel: boolean;
};

const INITIAL: AiPrefs = {
  models: {
    coding:      'claude-haiku-4.5',
    review:      'claude-sonnet-4.6',
    fix:         'claude-opus-4.7',
  },
  inlineSuggestions: true,
  suggestionVerbosity: 'normal',
  autoCommitMessages: true,
  autoReviewSummaries: true,
  autoEvidenceLinks: true,
  contextDepth: 'module',
  trainingOptOut: true,
  redactSecrets: true,
  costCapPerDay: 8,
  spikeAlertAt: 80,
  fallbackToFastModel: false,
};

const SURFACE_META: Record<Surface, { label: string; sub: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  coding:      { label: 'Coding',      sub: 'Inline suggestions, refactors, drafts',     icon: Zap          },
  review:      { label: 'Review',      sub: 'PR summaries, risk highlights',             icon: ShieldCheck  },
  fix:         { label: 'Fix pipeline',sub: 'Multi-step verified fixes',                 icon: Sparkles     },
};

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

// ─────────────────────────────────────────────────────────────────────────
// Per-surface model picker

function ModelRow({
  surface, model, onChange,
}: {
  surface: Surface;
  model: Model;
  onChange: (id: string) => void;
}) {
  const meta = SURFACE_META[surface];
  const Icon = meta.icon;
  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-md"
      style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
    >
      <span
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
          border: '1px solid var(--fg-accent)',
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
      </span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {meta.label}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{meta.sub}</span>
      </div>
      <select
        value={model.id}
        onChange={(e) => { onChange(e.target.value); }}
        className="h-9 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
          minWidth: 220,
        }}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.vendor} · {m.name}
          </option>
        ))}
      </select>
      <ModelMeta model={model} />
    </div>
  );
}

function ModelMeta({ model }: { model: Model }) {
  const tierColor = model.tier === 'best'
    ? 'var(--fg-accent)'
    : model.tier === 'balanced'
      ? 'var(--fg-default)'
      : 'var(--fg-muted)';
  return (
    <div className="flex items-center gap-2 text-[10px] tabular-nums shrink-0" style={{ color: 'var(--fg-subtle)' }}>
      <span style={{ color: tierColor }}>{model.tier}</span>
      <span>· {model.context}</span>
      <span>· {model.speed} tok/s</span>
      <span className="font-mono">${model.inputCostPerMTok.toFixed(2)} / ${model.outputCostPerMTok.toFixed(2)} /Mtok</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Cost input

function CostInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>$</span>
      <input
        type="number"
        min={0}
        max={500}
        step={1}
        value={value}
        onChange={(e) => { onChange(Math.max(0, Math.min(500, Number(e.target.value) || 0))); }}
        className="w-20 h-8 px-2.5 rounded-md text-[12px] tabular-nums outline-none text-right"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      />
      <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>/ day</span>
      {value === 0 && (
        <span
          className="text-[10px] uppercase tracking-[0.14em] font-semibold ml-2"
          style={{ color: 'var(--intent-warn-fg)' }}
        >
          No cap set
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Spend meter

function SpendMeter({
  pct, cap, spent, alertAt,
}: { pct: number; cap: number; spent: number; alertAt: number }) {
  const fill =
    pct >= 100 ? 'var(--intent-danger-fg)'
    : pct >= alertAt ? 'var(--intent-warn-fg)'
    : 'var(--fg-accent)';
  const triggered = pct >= alertAt;

  return (
    <div
      className="flex flex-col gap-2 px-3 py-2.5 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" style={{ color: 'var(--fg-muted)' }} />
          <span style={{ color: 'var(--fg-default)' }}>
            ${spent.toFixed(2)} of ${cap.toFixed(2)} today
          </span>
        </div>
        <span className="font-mono tabular-nums" style={{ color: fill }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="relative h-[3px] rounded-full overflow-hidden"
        style={{ background: 'var(--border-muted)' }}
      >
        {/* alert-at marker */}
        <span
          className="absolute top-[-2px] bottom-[-2px] w-px"
          style={{ left: `${alertAt}%`, background: 'var(--fg-subtle)' }}
          aria-hidden
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: fill,
            transition: 'width 240ms ease',
          }}
        />
      </div>
      {triggered && (
        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--intent-warn-fg)' }}>
          <AlertTriangle className="w-2.5 h-2.5" />
          Crossed your alert threshold ({alertAt}% of cap). Inbox notification sent.
        </div>
      )}
    </div>
  );
}
