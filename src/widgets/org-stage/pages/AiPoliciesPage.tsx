import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('org');
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

  const residencyConflicts = Array.from(form.allowedModels).filter((id) => {
    // Ids only ever come from MODELS, so a missing entry is treated as "no conflict".
    const model = MODELS.find((m) => m.id === id);
    return model != null && !model.residencyOk.includes(form.residency);
  });

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title={t('aiPolicies.title')}
      subtitle={t('aiPolicies.subtitle')}
    >
      {/* Allowed models */}
      <Section
        title={t('aiPolicies.allowedModels.title')}
        hint={t('aiPolicies.allowedModels.hint')}
      >
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
          <div
            className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
            style={{
              gridTemplateColumns: '24px 1fr 110px 90px 80px 100px',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span />
            <span>{t('aiPolicies.allowedModels.model')}</span>
            <span>{t('aiPolicies.allowedModels.vendor')}</span>
            <span>{t('aiPolicies.allowedModels.context')}</span>
            <span>{t('aiPolicies.allowedModels.tier')}</span>
            <span>{t('aiPolicies.allowedModels.residency')}</span>
          </div>
          {MODELS.map((m) => {
            const on = form.allowedModels.has(m.id);
            const conflict = on && !m.residencyOk.includes(form.residency);
            return (
              <label
                key={m.id}
                className="grid items-center px-3 h-12 text-base cursor-pointer transition-colors"
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
                  <span className="font-mono text-xs truncate" style={{ color: 'var(--fg-subtle)' }}>{m.id}</span>
                </div>
                <span style={{ color: 'var(--fg-default)' }}>{m.vendor}</span>
                <span className="tabular-nums" style={{ color: 'var(--fg-muted)' }}>{m.contextK}k</span>
                <span
                  className="text-xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded w-fit"
                  style={tierBadgeStyle(m.tier)}
                >
                  {t(`aiPolicies.tier.${m.tier}`)}
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: conflict ? 'var(--intent-danger-fg)' : 'var(--fg-muted)' }}
                  title={conflict ? t('aiPolicies.allowedModels.notAvailable', { region: form.residency.toUpperCase() }) : undefined}
                >
                  {m.residencyOk.join(', ')}
                </span>
              </label>
            );
          })}
        </div>
        {residencyConflicts.length > 0 && (
          <p className="text-sm mt-2 flex items-start gap-1.5" style={{ color: 'var(--intent-danger-fg)' }}>
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            {t('aiPolicies.allowedModels.conflict', { count: residencyConflicts.length })}
          </p>
        )}
      </Section>

      {/* Defaults */}
      <Section title={t('aiPolicies.defaults.title')} hint={t('aiPolicies.defaults.hint')}>
        <Row label={t('aiPolicies.defaults.defaultModel')} sub={t('aiPolicies.defaults.defaultModelSub')}>
          <select
            value={form.defaultModel}
            onChange={(e) => { set('defaultModel', e.target.value as ModelId); }}
            className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 200 }}
          >
            {Array.from(form.allowedModels).map((id) => (
              <option key={id} value={id}>{MODELS.find((m) => m.id === id)?.label ?? id}</option>
            ))}
          </select>
        </Row>
        <Row label={t('aiPolicies.defaults.fastModel')} sub={t('aiPolicies.defaults.fastModelSub')}>
          <select
            value={form.fastModel}
            onChange={(e) => { set('fastModel', e.target.value as ModelId); }}
            className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 200 }}
          >
            {Array.from(form.allowedModels).map((id) => (
              <option key={id} value={id}>{MODELS.find((m) => m.id === id)?.label ?? id}</option>
            ))}
          </select>
        </Row>
        <Row label={t('aiPolicies.defaults.reviewerOverride')} sub={t('aiPolicies.defaults.reviewerOverrideSub')}>
          <Toggle checked={form.reviewerOverride} onChange={(v) => { set('reviewerOverride', v); }} />
        </Row>
      </Section>

      {/* Data handling */}
      <Section title={t('aiPolicies.dataHandling.title')} hint={t('aiPolicies.dataHandling.hint')}>
        <Row label={t('aiPolicies.dataHandling.optOut')} sub={t('aiPolicies.dataHandling.optOutSub')}>
          <Toggle checked={form.optOutOfTraining} onChange={(v) => { set('optOutOfTraining', v); }} />
        </Row>
        <Row label={t('aiPolicies.dataHandling.residency')} sub={t('aiPolicies.dataHandling.residencySub')}>
          <div className="inline-flex gap-1 rounded-md overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
            {(['us', 'eu', 'apac'] as Residency[]).map((r) => {
              const active = form.residency === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { set('residency', r); }}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs uppercase tracking-eyebrow font-semibold transition-colors"
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
        <Row label={t('aiPolicies.dataHandling.retention')} sub={t('aiPolicies.dataHandling.retentionSub')}>
          <select
            value={form.retentionDays}
            onChange={(e) => { set('retentionDays', Number(e.target.value)); }}
            className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 120 }}
          >
            <option value={0}>{t('aiPolicies.dataHandling.retention0')}</option>
            <option value={7}>{t('aiPolicies.dataHandling.retention7')}</option>
            <option value={30}>{t('aiPolicies.dataHandling.retention30')}</option>
            <option value={90}>{t('aiPolicies.dataHandling.retention90')}</option>
          </select>
        </Row>
      </Section>

      {/* Prompt safety */}
      <Section title={t('aiPolicies.promptSafety.title')} hint={t('aiPolicies.promptSafety.hint')}>
        <Row label={t('aiPolicies.promptSafety.redactPre')} sub={<>{t('aiPolicies.promptSafety.redactSubPre')}<span className="font-mono">[REDACTED]</span>{t('aiPolicies.promptSafety.redactSubPost')}</>}>
          <Toggle checked={form.redactSecretsInPrompts} onChange={(v) => { set('redactSecretsInPrompts', v); }} />
        </Row>
        <Row label={t('aiPolicies.promptSafety.blockPii')} sub={t('aiPolicies.promptSafety.blockPiiSub')}>
          <Toggle checked={form.blockPiiInPrompts} onChange={(v) => { set('blockPiiInPrompts', v); }} />
        </Row>
      </Section>

      {/* Agent capabilities */}
      <Section title={t('aiPolicies.agentCaps.title')} hint={t('aiPolicies.agentCaps.hint')}>
        <Row label={t('aiPolicies.agentCaps.browsing')} sub={t('aiPolicies.agentCaps.browsingSub')}>
          <Toggle checked={form.allowAgentBrowsing} onChange={(v) => { set('allowAgentBrowsing', v); }} />
        </Row>
        <Row label={t('aiPolicies.agentCaps.toolUse')} sub={t('aiPolicies.agentCaps.toolUseSub')}>
          <Toggle checked={form.allowToolUse} onChange={(v) => { set('allowToolUse', v); }} />
        </Row>
      </Section>

      {/* Spend cap */}
      <Section title={t('aiPolicies.spendCap.title')} hint={t('aiPolicies.spendCap.hint')}>
        <Row label={t('aiPolicies.spendCap.monthlyCap')} sub={t('aiPolicies.spendCap.monthlyCapSub')}>
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
          >
            <input
              type="number"
              min={0}
              value={form.monthlyTokenCapM}
              onChange={(e) => { set('monthlyTokenCapM', Number(e.target.value) || 0); }}
              className="w-20 bg-transparent outline-none text-base tabular-nums"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>{t('aiPolicies.spendCap.unit')}</span>
          </div>
        </Row>
      </Section>

      <div className="flex items-start gap-3 mt-6 text-sm" style={{ color: 'var(--fg-subtle)' }}>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-start gap-1.5">
            <Cpu className="w-3 h-3 mt-0.5" />
            {t('aiPolicies.notes.changes')}
          </span>
          <span className="flex items-start gap-1.5">
            <Database className="w-3 h-3 mt-0.5" />
            {t('aiPolicies.notes.retention')}
          </span>
          <span className="flex items-start gap-1.5">
            <BookOpen className="w-3 h-3 mt-0.5" />
            {t('aiPolicies.notes.audit')}
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

