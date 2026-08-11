import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, KeyRound, FileWarning, TestTube2, FileLock2, GitBranch,
  ChevronDown, ChevronRight, RotateCcw, ScrollText,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { WsShell } from '../parts/WsShell';
import { SettingsContractNotice } from '../parts/SettingsContractNotice';
import { Section, SaveBar } from '@shared/ui/forms';
import { InlineError, SkeletonText } from '@shared/ui';
import {
  SEED_ADMISSION_RULES,
  type AdmissionSeverity,
  type AdmissionRuleCore,
} from '@entities/admission';
import {
  workspaceArray,
  workspaceObject,
  workspaceString,
} from '@entities/workspace';
import { useWorkspaceSettingsForm } from '../lib/useWorkspaceSettingsForm';

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

const SEVERITIES: Severity[] = ['block', 'warn', 'off'];

export default function AdmissionPage() {
  const { t } = useTranslation('ws');
  const blockedMessage = t('settingsContract.body', { surface: t('admission.title') });
  const {
    actionError,
    detail,
    dirty,
    discard,
    form: rules,
    isPending,
    isReal,
    loadError,
    retryLoad,
    save,
    saveBlockedReason,
    saving,
    setForm: setRules,
    shell,
  } = useWorkspaceSettingsForm<Rule[]>({
    initial: SEED_RULES,
    fromDetail: (workspace) => {
      const admission = workspaceObject(workspace.raw, 'admission', 'admissionRules') ?? {};
      const loaded = workspaceArray(admission, 'rules')
        ?? workspaceArray(workspace.raw, 'admission_rules', 'admissionRules')
        ?? [];
      const byId = new Map<string, Record<string, unknown>>();
      for (const item of loaded) {
        const rule = workspaceObject(item);
        const id = workspaceString(rule, 'id');
        if (!rule || !id) continue;
        byId.set(id, rule);
      }
      return SEED_RULES.map((rule) => {
        const loadedRule = byId.get(rule.id);
        const orgDefault = workspaceString(loadedRule, 'org_default', 'orgDefault');
        const effective = workspaceString(loadedRule, 'effective', 'severity');
        return {
          ...rule,
          orgDefault: SEVERITIES.includes(orgDefault as Severity) ? orgDefault as Severity : rule.orgDefault,
          effective: SEVERITIES.includes(effective as Severity) ? effective as Severity : rule.effective,
        };
      });
    },
    toPatch: (next) => ({
      admission: {
        rules: next.map((rule) => ({
          id: rule.id,
          org_default: rule.orgDefault,
          effective: rule.effective,
        })),
      },
    }),
    realSaveMode: 'unsupported',
    realSaveMessage: blockedMessage,
  });
  const [collapsed, setCollapsed] = useState<Set<Rule['category']>>(new Set());

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

  const totalActive   = rules.filter((r) => r.effective !== 'off').length;
  const totalBlocking = rules.filter((r) => r.effective === 'block').length;
  const inheritedCount = rules.filter((r) => r.effective === r.orgDefault).length;

  if (isReal && loadError) {
    return (
      <WsShell
        orgName={shell.orgName}
        orgSlug={shell.orgSlug}
        wsName={shell.wsName}
        wsSlug={shell.wsSlug}
        title={t('admission.title')}
        subtitle={t('admission.subtitle')}
      >
        <InlineError message={loadError} onRetry={retryLoad} />
      </WsShell>
    );
  }

  if (isReal && isPending && !detail) {
    return (
      <WsShell
        orgName={shell.orgName}
        orgSlug={shell.orgSlug}
        wsName={shell.wsName}
        wsSlug={shell.wsSlug}
        title={t('admission.title')}
        subtitle={t('admission.subtitle')}
      >
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={6} />
        </div>
      </WsShell>
    );
  }

  return (
    <WsShell
      orgName={shell.orgName}
      orgSlug={shell.orgSlug}
      wsName={shell.wsName}
      wsSlug={shell.wsSlug}
      title={t('admission.title')}
      subtitle={t('admission.subtitle')}
    >
      {isReal && saveBlockedReason && (
        <div className="mb-3">
          <SettingsContractNotice title={t('settingsContract.title')} message={saveBlockedReason} />
        </div>
      )}

      {actionError && (
        <div className="mb-3">
          <InlineError message={actionError} onRetry={() => { void save(); }} />
        </div>
      )}

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
        onSave={() => { void save(); }}
        onDiscard={discard}
        saveDisabled={Boolean(saveBlockedReason)}
        saveDisabledTitle={saveBlockedReason ?? undefined}
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
              className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-xs transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--fg-muted)' }}
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
