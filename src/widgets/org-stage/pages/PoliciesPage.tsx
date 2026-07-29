import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollText, ShieldCheck, FileWarning, KeyRound, GitBranch,
  TestTube2, FileLock2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import type { CSSProperties } from 'react';
import { Section, Toggle, SaveBar } from '@shared/ui/forms';
import { shallowEqual } from '@shared/lib';
import {
  SEED_ADMISSION_RULE_BY_ID,
  type AdmissionSeverity,
  type AdmissionRuleCore,
} from '@entities/admission';

// Org-default admission rules. Shares the rule display core (id/title/
// description/category) with the per-workspace Admission page via the
// admission entity; this page adds the org tail (single severity + rollout
// counters) and resolves icons locally by rule id.

type Severity = AdmissionSeverity;

type IconComponent = React.ComponentType<{ className?: string; style?: CSSProperties }>;

type Rule = AdmissionRuleCore & {
  icon: IconComponent;
  severity: Severity;
  appliedToWorkspaces: number;
  totalWorkspaces: number;
  whenChanged: string;
  // Org-specific copy overrides carry an i18n key instead of literal text.
  titleKey?: string;
  descriptionKey?: string;
};

// Icons + this page's tail, keyed by canonical rule id. Icons live here (not in
// the entity) to keep the entity layer free of lucide-react. A couple of rules
// render slightly different copy on this page than the canonical seed; those
// `titleOverride` / `descriptionOverride` values preserve the exact org wording.
type OrgTail = {
  icon: IconComponent;
  severity: Severity;
  appliedToWorkspaces: number;
  totalWorkspaces: number;
  whenChanged: string;
  titleKey?: string;
  descriptionKey?: string;
};

// Ordered id list drives this page's rows (order differs from the canonical seed).
const ORG_RULE_TAILS: (OrgTail & { id: string })[] = [
  { id: 'r-secrets', icon: KeyRound, severity: 'block',
    appliedToWorkspaces: 12, totalWorkspaces: 12, whenChanged: '2026-04-12' },
  { id: 'r-2-approvers', icon: ShieldCheck, severity: 'block',
    appliedToWorkspaces: 11, totalWorkspaces: 12, whenChanged: '2026-04-19',
    titleKey: 'policies.override.title2Approvers',
    descriptionKey: 'policies.override.desc2Approvers' },
  { id: 'r-tests-pass', icon: TestTube2, severity: 'block',
    appliedToWorkspaces: 12, totalWorkspaces: 12, whenChanged: '2026-04-08' },
  { id: 'r-coverage', icon: TestTube2, severity: 'warn',
    appliedToWorkspaces: 7, totalWorkspaces: 12, whenChanged: '2026-04-30' },
  { id: 'r-no-prod-config', icon: FileLock2, severity: 'block',
    appliedToWorkspaces: 8, totalWorkspaces: 12, whenChanged: '2026-05-02' },
  { id: 'r-license', icon: FileWarning, severity: 'block',
    appliedToWorkspaces: 12, totalWorkspaces: 12, whenChanged: '2026-04-21' },
  { id: 'r-stale-deps', icon: FileWarning, severity: 'warn',
    appliedToWorkspaces: 5, totalWorkspaces: 12, whenChanged: '2026-04-25',
    titleKey: 'policies.override.titleStaleDeps' },
  { id: 'r-protected-paths', icon: GitBranch, severity: 'block',
    appliedToWorkspaces: 12, totalWorkspaces: 12, whenChanged: '2026-04-15' },
];

const SEED_RULES: Rule[] = ORG_RULE_TAILS.map(({ id, ...tail }) => {
  const core = SEED_ADMISSION_RULE_BY_ID[id];
  return { ...core, ...tail };
});

const CATEGORY_IDS: Rule['category'][] = ['secrets', 'review', 'tests', 'deps', 'config'];

export default function PoliciesPage() {
  const { t } = useTranslation('org');
  const [rules, setRules] = useState<Rule[]>(SEED_RULES);
  const [propagateOverrides, setPropagateOverrides] = useState(true);
  const [enforceOnCreate, setEnforceOnCreate] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<Rule['category']>>(new Set());
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');

  const dirty = !shallowEqual(rules, SEED_RULES);

  const setSeverity = (id: string, s: Severity) => {
    setRules((all) => all.map((r) => (r.id === id ? { ...r, severity: s } : r)));
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

  const totalActive = rules.filter((r) => r.severity !== 'off').length;
  const totalBlocking = rules.filter((r) => r.severity === 'block').length;

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title={t('policies.title')}
      subtitle={t('policies.subtitle')}
    >
      {/* Summary band */}
      <div
        className="grid grid-cols-3 gap-3 p-4 rounded-md mb-6"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        <Stat label={t('policies.stat.activeRules')} value={`${totalActive} / ${rules.length}`} />
        <Stat label={t('policies.stat.hardBlocks')}  value={String(totalBlocking)}              tone="warn" />
        <Stat label={t('policies.stat.workspaces')}  value={`${rules[0].totalWorkspaces}`}      sub={t('policies.stat.inheriting')} />
      </div>

      {/* Inheritance switches */}
      <Section title={t('policies.inheritance.title')} hint={t('policies.inheritance.hint')}>
        <div className="flex items-center justify-between py-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
          <div className="flex flex-col gap-1 max-w-[460px]">
            <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>{t('policies.inheritance.applyNew')}</span>
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
              {t('policies.inheritance.applyNewSub')}
            </span>
          </div>
          <Toggle checked={enforceOnCreate} onChange={setEnforceOnCreate} />
        </div>
        <div className="flex items-center justify-between py-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
          <div className="flex flex-col gap-1 max-w-[460px]">
            <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>{t('policies.inheritance.pushExisting')}</span>
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
              {t('policies.inheritance.pushExistingSub')}
            </span>
          </div>
          <Toggle checked={propagateOverrides} onChange={setPropagateOverrides} />
        </div>
      </Section>

      {/* Rule list grouped by category */}
      <Section title={t('policies.rules.title')} hint={t('policies.rules.hint')}>
        <div className="flex flex-col gap-3">
          {CATEGORY_IDS.map((cid) => {
            const inCat = rules.filter((r) => r.category === cid);
            if (inCat.length === 0) return null;
            const open = !collapsed.has(cid);
            return (
              <div
                key={cid}
                className="overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => { toggleCollapse(cid); }}
                  aria-expanded={open}
                  className="w-full flex items-center gap-2 px-3 h-8 text-left"
                >
                  {open ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />}
                  <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
                    {t(`policies.category.${cid}`)}
                  </span>
                  <span className="ml-auto text-xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                    {t('policies.rules.activeOf', { active: inCat.filter((r) => r.severity !== 'off').length, total: inCat.length })}
                  </span>
                </button>
                {open && inCat.map((r) => (
                  <RuleRow
                    key={r.id}
                    rule={r}
                    onSetSeverity={(s) => { setSeverity(r.id, s); }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </Section>

      <p className="text-sm mt-4 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <ScrollText className="w-3 h-3 mt-0.5 shrink-0" />
        {t('policies.footer')}
      </p>

      <SaveBar
        visible={dirty || saving !== 'idle'}
        dirty={dirty}
        savingState={saving}
        onSave={save}
        onDiscard={() => { setRules(SEED_RULES); }}
      />
    </OrgShell>
  );
}

function RuleRow({
  rule, onSetSeverity,
}: { rule: Rule; onSetSeverity: (s: Severity) => void }) {
  const { t } = useTranslation('org');
  const Icon = rule.icon;
  const partial = rule.appliedToWorkspaces < rule.totalWorkspaces;
  return (
    <div
      className="flex items-start gap-3 px-3 py-3"
      style={{ borderTop: '1px solid var(--border-muted)' }}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>{rule.titleKey ? t(rule.titleKey) : rule.title}</span>
        <span className="text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>{rule.descriptionKey ? t(rule.descriptionKey) : rule.description}</span>
        <div className="flex items-center gap-3 text-xs tabular-nums mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
          <span style={{ color: partial ? 'var(--intent-warn-fg)' : 'var(--fg-subtle)' }}>
            {t('policies.row.workspaces', { applied: rule.appliedToWorkspaces, total: rule.totalWorkspaces })}
            {partial && t('policies.row.localOverrides')}
          </span>
          <span>·</span>
          <span>{t('policies.row.lastChanged', { date: rule.whenChanged })}</span>
        </div>
      </div>
      <SeverityPicker value={rule.severity} onChange={onSetSeverity} />
    </div>
  );
}

function SeverityPicker({
  value, onChange,
}: { value: Severity; onChange: (v: Severity) => void }) {
  const { t } = useTranslation('org');
  const opts: { id: Severity; label: string; bg: string; fg: string; border: string }[] = [
    { id: 'block', label: t('policies.severity.block'), bg: 'var(--intent-danger-bg)',  fg: 'var(--intent-danger-fg)',  border: 'var(--intent-danger-fg)'  },
    { id: 'warn',  label: t('policies.severity.warn'),  bg: 'var(--intent-warn-bg)',    fg: 'var(--intent-warn-fg)',    border: 'var(--intent-warn-fg)'    },
    { id: 'off',   label: t('policies.severity.off'),   bg: 'var(--bg-surface-muted)',  fg: 'var(--fg-muted)',          border: 'var(--border-muted)'      },
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
              borderLeft: 'none',
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

