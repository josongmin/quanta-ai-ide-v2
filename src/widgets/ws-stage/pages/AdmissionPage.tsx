import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, KeyRound, FileWarning, TestTube2, FileLock2, GitBranch,
  ChevronDown, ChevronRight, RotateCcw, ScrollText,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { WsShell } from '../parts/WsShell';
import { Section, SaveBar } from '@shared/ui/forms';
import { shallowEqual } from '@shared/lib';
import {
  SEED_ADMISSION_RULES,
  type AdmissionSeverity,
  type AdmissionRuleCore,
} from '@entities/admission';

// Per-workspace admission rules. Each rule inherits an org default and may
// be locally overridden. The inheritance indicator surfaces whether the
// effective severity matches the org default or has drifted.
//
// The rule display core (id/title/description/category) is shared with the org
// Policies page via the admission entity; this page adds the inheritance tail
// (org default + effective severity) and resolves icons locally by rule id.

type Severity = AdmissionSeverity;

type IconComponent = React.ComponentType<{ className?: string; style?: CSSProperties }>;

type Rule = AdmissionRuleCore & {
  icon: IconComponent;
  orgDefault: Severity;
  effective: Severity;
};

// Icons + this page's severity tail, keyed by canonical rule id. Icons live
// here (not in the entity) to keep the entity layer free of lucide-react.
const RULE_TAIL: Record<string, { icon: IconComponent; orgDefault: Severity; effective: Severity }> = {
  'r-secrets':        { icon: KeyRound,   orgDefault: 'block', effective: 'block' },
  'r-2-approvers':    { icon: ShieldCheck, orgDefault: 'block', effective: 'warn' },
  'r-owner-review':   { icon: ShieldCheck, orgDefault: 'block', effective: 'block' },
  'r-tests-pass':     { icon: TestTube2,  orgDefault: 'block', effective: 'block' },
  'r-coverage':       { icon: TestTube2,  orgDefault: 'warn',  effective: 'off' },
  'r-license':        { icon: FileWarning, orgDefault: 'block', effective: 'block' },
  'r-stale-deps':     { icon: FileWarning, orgDefault: 'warn',  effective: 'warn' },
  'r-no-prod-config': { icon: FileLock2,  orgDefault: 'block', effective: 'block' },
};

// This page shows a subset of the canonical rules, in canonical order.
const SEED_RULES: Rule[] = SEED_ADMISSION_RULES
  .filter((r) => r.id in RULE_TAIL)
  .map((r) => ({ ...r, ...RULE_TAIL[r.id] }));

// Category label resolved from ws:admission.categories.<id> at render time.
const CATEGORIES: { id: Rule['category']; icon: React.ComponentType<{ className?: string; style?: CSSProperties }> }[] = [
  { id: 'secrets', icon: KeyRound },
  { id: 'review',  icon: ShieldCheck },
  { id: 'tests',   icon: TestTube2 },
  { id: 'deps',    icon: FileWarning },
  { id: 'config',  icon: GitBranch },
];

export default function AdmissionPage() {
  const { t } = useTranslation('ws');
  const [rules, setRules] = useState<Rule[]>(SEED_RULES);
  const [collapsed, setCollapsed] = useState<Set<Rule['category']>>(new Set());
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');

  const dirty = !shallowEqual(rules, SEED_RULES);

  const setSeverity = (id: string, s: Severity) => {
    setRules((all) => all.map((r) => (r.id === id ? { ...r, effective: s } : r)));
  };
  const resetToDefault = (id: string) => {
    setRules((all) => all.map((r) => (r.id === id ? { ...r, effective: r.orgDefault } : r)));
  };
  const toggleCollapse = (cat: Rule['category']) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const save = () => {
    setSaving('saving');
    setTimeout(() => {
      setSaving('saved');
      setTimeout(() => { setSaving('idle'); }, 1200);
    }, 600);
  };

  const totalActive   = rules.filter((r) => r.effective !== 'off').length;
  const totalBlocking = rules.filter((r) => r.effective === 'block').length;
  const inheritedCount = rules.filter((r) => r.effective === r.orgDefault).length;

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName="monorepo"
      wsSlug="monorepo"
      title={t('admission.title')}
      subtitle={t('admission.subtitle')}
    >
      {/* Summary band */}
      <div
        className="grid grid-cols-3 gap-3 p-4 rounded-md mb-6"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <Stat label={t('admission.activeRules')} value={`${totalActive} / ${rules.length}`} />
        <Stat label={t('admission.hardBlocks')} value={String(totalBlocking)} tone="warn" />
        <Stat label={t('admission.inherited')} value={`${inheritedCount} / ${rules.length}`} sub={t('admission.overriddenSub', { count: rules.length - inheritedCount })} />
      </div>

      <Section title={t('admission.rulesSection.title')} hint={t('admission.rulesSection.hint')}>
        <div className="flex flex-col gap-3">
          {CATEGORIES.map((c) => {
            const inCat = rules.filter((r) => r.category === c.id);
            if (inCat.length === 0) return null;
            const open = !collapsed.has(c.id);
            const overriddenInCat = inCat.filter((r) => r.effective !== r.orgDefault).length;
            const CatIcon = c.icon;
            return (
              <div
                key={c.id}
                className="rounded-md overflow-hidden"
                style={{ border: '1px solid var(--border-muted)' }}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => { toggleCollapse(c.id); }}
                  className="w-full flex items-center gap-2 px-3 h-9 text-left"
                  style={{ background: 'var(--bg-surface-muted)' }}
                >
                  {open
                    ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
                    : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />}
                  <CatIcon className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
                  <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
                    {t(`admission.categories.${c.id}`)}
                  </span>
                  <span className="ml-auto flex items-center gap-2 text-xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                    {overriddenInCat > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded text-2xs uppercase tracking-eyebrow font-semibold"
                        style={{
                          background: 'var(--intent-warn-bg)',
                          color: 'var(--intent-warn-fg)',
                          border: '1px solid var(--intent-warn-fg)',
                        }}
                      >
                        {t('admission.overriddenBadge', { count: overriddenInCat })}
                      </span>
                    )}
                    <span>{t('admission.activeOfTotal', { active: inCat.filter((r) => r.effective !== 'off').length, total: inCat.length })}</span>
                  </span>
                </button>
                {open && inCat.map((r) => (
                  <RuleRow
                    key={r.id}
                    rule={r}
                    onSetSeverity={(s) => { setSeverity(r.id, s); }}
                    onReset={() => { resetToDefault(r.id); }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </Section>

      <p className="text-sm mt-4 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <ScrollText className="w-3 h-3 mt-0.5 shrink-0" />
        {t('admission.lockNote')}
      </p>

      <SaveBar
        visible={dirty || saving !== 'idle'}
        dirty={dirty}
        savingState={saving}
        onSave={save}
        onDiscard={() => { setRules(SEED_RULES); }}
      />
    </WsShell>
  );
}

function RuleRow({
  rule, onSetSeverity, onReset,
}: { rule: Rule; onSetSeverity: (s: Severity) => void; onReset: () => void }) {
  const { t } = useTranslation('ws');
  const Icon = rule.icon;
  const overridden = rule.effective !== rule.orgDefault;

  return (
    <div
      className="flex items-start gap-3 px-3 py-3"
      style={{ borderTop: '1px solid var(--border-muted)' }}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>{rule.title}</span>
        <span className="text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>{rule.description}</span>
        <div className="flex items-center gap-2 text-xs mt-0.5">
          <InheritanceBadge orgDefault={rule.orgDefault} overridden={overridden} />
          {overridden && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-xs transition-colors"
              style={{ color: 'var(--fg-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              {t('admission.resetToOrgDefault')}
            </button>
          )}
        </div>
      </div>
      <SeverityPicker value={rule.effective} onChange={onSetSeverity} />
    </div>
  );
}

function InheritanceBadge({
  orgDefault, overridden,
}: { orgDefault: Severity; overridden: boolean }) {
  const { t } = useTranslation('ws');
  const label = orgDefault.toUpperCase();
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <span>{t('admission.orgDefault')}</span>
      <span
        className="px-1 py-0.5 rounded text-2xs uppercase tracking-eyebrow font-semibold"
        style={{
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-default)',
          border: '1px solid var(--border-muted)',
        }}
      >
        {label}
      </span>
      {overridden ? (
        <span
          className="px-1 py-0.5 rounded text-2xs uppercase tracking-eyebrow font-semibold"
          style={{
            background: 'var(--intent-warn-bg)',
            color: 'var(--intent-warn-fg)',
            border: '1px solid var(--intent-warn-fg)',
          }}
        >
          {t('admission.overridden')}
        </span>
      ) : (
        <span
          className="px-1 py-0.5 rounded text-2xs uppercase tracking-eyebrow font-semibold"
          style={{
            background: 'var(--intent-success-bg)',
            color: 'var(--intent-success-fg)',
            border: '1px solid var(--intent-success-fg)',
          }}
        >
          {t('admission.inheritedBadge')}
        </span>
      )}
    </span>
  );
}

function SeverityPicker({
  value, onChange,
}: { value: Severity; onChange: (v: Severity) => void }) {
  const { t } = useTranslation('ws');
  const opts: { id: Severity; label: string; bg: string; fg: string }[] = [
    { id: 'block', label: t('admission.severity.block'), bg: 'var(--intent-danger-bg)',  fg: 'var(--intent-danger-fg)'  },
    { id: 'warn',  label: t('admission.severity.warn'),  bg: 'var(--intent-warn-bg)',    fg: 'var(--intent-warn-fg)'    },
    { id: 'off',   label: t('admission.severity.off'),   bg: 'var(--bg-surface-muted)',  fg: 'var(--fg-muted)'          },
  ];
  return (
    <div className="inline-flex shrink-0 rounded-md overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => { onChange(o.id); }}
            className="h-7 px-2.5 text-xs uppercase tracking-eyebrow font-semibold transition-colors"
            style={{
              background: active ? o.bg : 'transparent',
              color: active ? o.fg : 'var(--fg-muted)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Stat({
  label, value, sub, tone = 'default',
}: { label: string; value: string; sub?: string; tone?: 'default' | 'warn' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>{label}</span>
      <span
        className="text-2xl font-semibold tabular-nums"
        style={{ color: tone === 'warn' ? 'var(--intent-warn-fg)' : 'var(--fg-strong)' }}
      >
        {value}
      </span>
      {sub && <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{sub}</span>}
    </div>
  );
}
