import { useState, type CSSProperties } from 'react';
import { Globe, Database, Cpu, BookOpen, AlertTriangle } from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Section, Row, Toggle, SaveBar } from '@shared/ui/forms';
import { shallowEqual } from '@shared/lib';

type ModelId =
  | 'claude-opus-4-7' | 'claude-sonnet-4-6' | 'claude-haiku-4-5'
  | 'gpt-4-omni' | 'gpt-4-omni-mini'
  | 'gemini-2-5-pro' | 'gemini-2-5-flash'
  | 'open-llama-70b';

type Model = {
  id: ModelId;
  label: string;
  vendor: 'Anthropic' | 'OpenAI' | 'Google' | 'Self-hosted';
  contextK: number;
  tier: 'frontier' | 'fast' | 'cheap';
  residencyOk: ('us' | 'eu' | 'apac')[];
};

// Tier chip lives in the model table. Pulls hue from semantic intent
// tokens so it auto-flips with the active theme palette: brand-indigo for
// the headline frontier tier, info-blue for FAST (speed), success-green
// for CHEAP (cost-friendly). Previous uniform grey read as "disabled"
// and made the table look like dead data.
function tierBadgeStyle(tier: Model['tier']): CSSProperties {
  const fgVar =
    tier === 'frontier' ? 'var(--fg-accent)'
    : tier === 'fast'   ? 'var(--intent-info-fg)'
    :                     'var(--intent-success-fg)';
  const bgVar =
    tier === 'frontier' ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)'
    : tier === 'fast'   ? 'var(--intent-info-bg)'
    :                     'var(--intent-success-bg)';
  return {
    background: bgVar,
    color: fgVar,
    border: `1px solid color-mix(in srgb, ${fgVar} 45%, transparent)`,
  };
}

const MODELS: Model[] = [
  { id: 'claude-opus-4-7',     label: 'Claude Opus 4.7',     vendor: 'Anthropic',   contextK: 1000, tier: 'frontier', residencyOk: ['us', 'eu'] },
  { id: 'claude-sonnet-4-6',   label: 'Claude Sonnet 4.6',   vendor: 'Anthropic',   contextK:  500, tier: 'frontier', residencyOk: ['us', 'eu', 'apac'] },
  { id: 'claude-haiku-4-5',    label: 'Claude Haiku 4.5',    vendor: 'Anthropic',   contextK:  200, tier: 'fast',     residencyOk: ['us', 'eu', 'apac'] },
  { id: 'gpt-4-omni',          label: 'GPT-4 Omni',          vendor: 'OpenAI',      contextK:  128, tier: 'frontier', residencyOk: ['us', 'eu'] },
  { id: 'gpt-4-omni-mini',     label: 'GPT-4 Omni mini',     vendor: 'OpenAI',      contextK:  128, tier: 'cheap',    residencyOk: ['us'] },
  { id: 'gemini-2-5-pro',      label: 'Gemini 2.5 Pro',      vendor: 'Google',      contextK: 2000, tier: 'frontier', residencyOk: ['us', 'eu'] },
  { id: 'gemini-2-5-flash',    label: 'Gemini 2.5 Flash',    vendor: 'Google',      contextK: 1000, tier: 'fast',     residencyOk: ['us'] },
  { id: 'open-llama-70b',      label: 'Open Llama 70B',      vendor: 'Self-hosted', contextK:   32, tier: 'cheap',    residencyOk: ['us', 'eu', 'apac'] },
];

type Residency = 'us' | 'eu' | 'apac';

type Form = {
  allowedModels: Set<ModelId>;
  defaultModel: ModelId;
  fastModel: ModelId;
  optOutOfTraining: boolean;
  residency: Residency;
  retentionDays: number;
  redactSecretsInPrompts: boolean;
  blockPiiInPrompts: boolean;
  monthlyTokenCapM: number;
  allowAgentBrowsing: boolean;
  allowToolUse: boolean;
  reviewerOverride: boolean;
};

const INITIAL: Form = {
  allowedModels: new Set<ModelId>(['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'gpt-4-omni']),
  defaultModel: 'claude-sonnet-4-6',
  fastModel: 'claude-haiku-4-5',
  optOutOfTraining: true,
  residency: 'us',
  retentionDays: 30,
  redactSecretsInPrompts: true,
  blockPiiInPrompts: false,
  monthlyTokenCapM: 250,
  allowAgentBrowsing: true,
  allowToolUse: true,
  reviewerOverride: false,
};

export default function AiPoliciesPage() {
  const [form, setForm] = useState<Form>(INITIAL);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');

  const dirty = !shallowEqual(form, INITIAL);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const toggleModel = (id: ModelId) => {
    setForm((f) => {
      const next = new Set(f.allowedModels);
      if (next.has(id)) next.delete(id); else next.add(id);
      const updates: Partial<Form> = { allowedModels: next };
      if (!next.has(f.defaultModel)) updates.defaultModel = Array.from(next)[0] ?? 'claude-sonnet-4-6';
      if (!next.has(f.fastModel)) {
        const arr = Array.from(next);
        updates.fastModel = arr[arr.length - 1] ?? 'claude-haiku-4-5';
      }
      return { ...f, ...updates };
    });
  };

  const save = () => {
    setSaving('saving');
    setTimeout(() => {
      setSaving('saved');
      setTimeout(() => { setSaving('idle'); }, 1200);
    }, 600);
  };

  const residencyConflicts = Array.from(form.allowedModels).filter(
    (id) => !MODELS.find((m) => m.id === id)!.residencyOk.includes(form.residency),
  );

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title="AI policies"
      subtitle="Which models the org can use, where data lives, and how prompts are sanitized before they leave the org."
    >
      {/* Allowed models */}
      <Section
        title="Allowed models"
        hint="Members can only pick from this list. Disabling a model immediately stops in-flight runs from queuing follow-ups."
      >
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
          <div
            className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{
              gridTemplateColumns: '24px 1fr 110px 90px 80px 100px',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span />
            <span>Model</span>
            <span>Vendor</span>
            <span>Context</span>
            <span>Tier</span>
            <span>Residency</span>
          </div>
          {MODELS.map((m) => {
            const on = form.allowedModels.has(m.id);
            const conflict = on && !m.residencyOk.includes(form.residency);
            return (
              <label
                key={m.id}
                className="grid items-center px-3 h-12 text-[12px] cursor-pointer transition-colors"
                style={{
                  gridTemplateColumns: '24px 1fr 110px 90px 80px 100px',
                  gap: 12,
                  borderTop: '1px solid var(--border-muted)',
                  // Brand-tinted highlight instead of `--bg-active` (a heavy
                  // white-alpha that came out muddy grey in light theme).
                  // `brand-bg` is already alpha-baked so it sits softly on
                  // both light and dark canvases.
                  background: on ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'transparent',
                  opacity: 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => { toggleModel(m.id); }}
                  className="w-3.5 h-3.5 cursor-pointer"
                />
                <div className="flex flex-col min-w-0 gap-0.5">
                  <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>{m.label}</span>
                  <span className="font-mono text-[10px] truncate" style={{ color: 'var(--fg-subtle)' }}>{m.id}</span>
                </div>
                <span style={{ color: 'var(--fg-default)' }}>{m.vendor}</span>
                <span className="tabular-nums" style={{ color: 'var(--fg-muted)' }}>{m.contextK}k</span>
                <span
                  className="text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded w-fit"
                  style={tierBadgeStyle(m.tier)}
                >
                  {m.tier}
                </span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: conflict ? 'var(--intent-danger-fg)' : 'var(--fg-muted)' }}
                  title={conflict ? `Not available in ${form.residency.toUpperCase()}` : undefined}
                >
                  {m.residencyOk.join(', ')}
                </span>
              </label>
            );
          })}
        </div>
        {residencyConflicts.length > 0 && (
          <p className="text-[11px] mt-2 flex items-start gap-1.5" style={{ color: 'var(--intent-danger-fg)' }}>
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            {residencyConflicts.length} selected model{residencyConflicts.length === 1 ? ' is' : 's are'} not available in the chosen residency. Members will get an error on use.
          </p>
        )}
      </Section>

      {/* Defaults */}
      <Section title="Defaults" hint="What members get if they don't pick a model. Must be in the allowed list above.">
        <Row label="Default model" sub={<>For interactive use (chat, inspect).</>}>
          <select
            value={form.defaultModel}
            onChange={(e) => { set('defaultModel', e.target.value as ModelId); }}
            className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 200 }}
          >
            {Array.from(form.allowedModels).map((id) => (
              <option key={id} value={id}>{MODELS.find((m) => m.id === id)?.label ?? id}</option>
            ))}
          </select>
        </Row>
        <Row label="Fast model" sub="For bulk / background work (admission, agents). Pick a fast tier for cost.">
          <select
            value={form.fastModel}
            onChange={(e) => { set('fastModel', e.target.value as ModelId); }}
            className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 200 }}
          >
            {Array.from(form.allowedModels).map((id) => (
              <option key={id} value={id}>{MODELS.find((m) => m.id === id)?.label ?? id}</option>
            ))}
          </select>
        </Row>
        <Row label="Allow reviewers to override" sub="If on, individual reviewers can pick a non-default model for one-off review runs.">
          <Toggle checked={form.reviewerOverride} onChange={(v) => { set('reviewerOverride', v); }} />
        </Row>
      </Section>

      {/* Data handling */}
      <Section title="Data handling" hint="What providers can do with org prompts, and where they live.">
        <Row label="Opt out of model training" sub="Tell the provider not to use any prompt / completion for fine-tuning.">
          <Toggle checked={form.optOutOfTraining} onChange={(v) => { set('optOutOfTraining', v); }} />
        </Row>
        <Row label="Data residency" sub="Models will only be routed to inference endpoints in the chosen region.">
          <div className="inline-flex gap-1 rounded-md overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
            {(['us', 'eu', 'apac'] as Residency[]).map((r) => {
              const active = form.residency === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { set('residency', r); }}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[10px] uppercase tracking-[0.14em] font-semibold transition-colors"
                  style={{
                    background: active ? 'var(--bg-active)' : 'transparent',
                    color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  }}
                >
                  <Globe className="w-3 h-3" />
                  {r.toUpperCase()}
                </button>
              );
            })}
          </div>
        </Row>
        <Row label="Provider retention" sub="How many days the provider keeps prompts in their logs.">
          <select
            value={form.retentionDays}
            onChange={(e) => { set('retentionDays', Number(e.target.value)); }}
            className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 120 }}
          >
            <option value={0}>0 days (zero retention)</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </Row>
      </Section>

      {/* Prompt safety */}
      <Section title="Prompt safety" hint="Pre-send filters applied to every prompt that leaves the org.">
        <Row label="Redact secrets" sub={<>Run the secret scanner against every prompt and replace matches with <span className="font-mono">[REDACTED]</span>.</>}>
          <Toggle checked={form.redactSecretsInPrompts} onChange={(v) => { set('redactSecretsInPrompts', v); }} />
        </Row>
        <Row label="Block PII" sub="Refuse to send a prompt that contains PII (emails, SSNs, credit cards, phone numbers).">
          <Toggle checked={form.blockPiiInPrompts} onChange={(v) => { set('blockPiiInPrompts', v); }} />
        </Row>
      </Section>

      {/* Agent capabilities */}
      <Section title="Agent capabilities" hint="What autonomous agents are allowed to do on behalf of the org.">
        <Row label="Web browsing" sub="Allow agents to fetch external URLs as part of investigations.">
          <Toggle checked={form.allowAgentBrowsing} onChange={(v) => { set('allowAgentBrowsing', v); }} />
        </Row>
        <Row label="Tool use" sub="Allow function-calling against internal tools (admission, fix-pipeline, audit).">
          <Toggle checked={form.allowToolUse} onChange={(v) => { set('allowToolUse', v); }} />
        </Row>
      </Section>

      {/* Spend cap */}
      <Section title="Spend cap" hint="Hard limit on monthly token spend. Org gets paused on cap; admins are paged.">
        <Row label="Monthly token cap" sub="Counted across every allowed model. 0 disables the cap.">
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
          >
            <input
              type="number"
              min={0}
              value={form.monthlyTokenCapM}
              onChange={(e) => { set('monthlyTokenCapM', Number(e.target.value) || 0); }}
              className="w-20 bg-transparent outline-none text-[12px] tabular-nums"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>M tokens / month</span>
          </div>
        </Row>
      </Section>

      <div className="flex items-start gap-3 mt-6 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-start gap-1.5">
            <Cpu className="w-3 h-3 mt-0.5" />
            Changes apply on the next agent / chat invocation.
          </span>
          <span className="flex items-start gap-1.5">
            <Database className="w-3 h-3 mt-0.5" />
            Existing prompts already at the provider follow whatever retention was in force when they were sent.
          </span>
          <span className="flex items-start gap-1.5">
            <BookOpen className="w-3 h-3 mt-0.5" />
            Audit log records who changed what, every time. Reviewers can re-read decisions back to a configuration snapshot.
          </span>
        </div>
      </div>

      <SaveBar
        visible={dirty || saving !== 'idle'}
        dirty={dirty}
        savingState={saving}
        onSave={save}
        onDiscard={() => { setForm(INITIAL); }}
      />
    </OrgShell>
  );
}

