import { useState } from 'react';
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
  titleOverride?: string;
  descriptionOverride?: string;
};

// Ordered id list drives this page's rows (order differs from the canonical seed).
const ORG_RULE_TAILS: (OrgTail & { id: string })[] = [
  { id: 'r-secrets', icon: KeyRound, severity: 'block',
    appliedToWorkspaces: 12, totalWorkspaces: 12, whenChanged: '2026-04-12' },
  { id: 'r-2-approvers', icon: ShieldCheck, severity: 'block',
    appliedToWorkspaces: 11, totalWorkspaces: 12, whenChanged: '2026-04-19',
    titleOverride: 'Require ≥2 approvers',
    descriptionOverride: 'Production branches need at least two human approvals. Owners count once.' },
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
    titleOverride: 'Warn on dependencies >365 days behind' },
  { id: 'r-protected-paths', icon: GitBranch, severity: 'block',
    appliedToWorkspaces: 12, totalWorkspaces: 12, whenChanged: '2026-04-15' },
];

const SEED_RULES: Rule[] = ORG_RULE_TAILS.map(({ id, titleOverride, descriptionOverride, ...tail }) => {
  const core = SEED_ADMISSION_RULE_BY_ID[id];
  return {
    ...core,
    ...tail,
    title: titleOverride ?? core.title,
    description: descriptionOverride ?? core.description,
  };
});

const CATEGORIES: { id: Rule['category']; label: string }[] = [
  { id: 'secrets', label: 'Secrets' },
  { id: 'review',  label: 'Review' },
  { id: 'tests',   label: 'Tests & coverage' },
  { id: 'deps',    label: 'Dependencies' },
  { id: 'config',  label: 'Configuration' },
];

export default function PoliciesPage() {
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
      title="Policies"
      subtitle="Org-default admission rules. Workspaces inherit these; per-workspace settings can override unless locked."
    >
      {/* Summary band */}
      <div
        className="grid grid-cols-3 gap-3 p-4 rounded-md mb-6"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        <Stat label="Active rules"    value={`${totalActive} / ${rules.length}`} />
        <Stat label="Hard blocks"     value={String(totalBlocking)}              tone="warn" />
        <Stat label="Workspaces"      value={`${rules[0].totalWorkspaces}`}      sub="inheriting org defaults" />
      </div>

      {/* Inheritance switches */}
      <Section title="Inheritance" hint="How org defaults reach existing and new workspaces.">
        <div className="flex items-center justify-between py-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
          <div className="flex flex-col gap-1 max-w-[460px]">
            <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>Apply to new workspaces</span>
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
              Whenever a workspace is created, copy the active org rules and enforce them by default.
            </span>
          </div>
          <Toggle checked={enforceOnCreate} onChange={setEnforceOnCreate} />
        </div>
        <div className="flex items-center justify-between py-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
          <div className="flex flex-col gap-1 max-w-[460px]">
            <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>Push changes to existing workspaces</span>
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
              When a rule changes here, propagate the new severity to every workspace that hasn&apos;t customized it locally.
            </span>
          </div>
          <Toggle checked={propagateOverrides} onChange={setPropagateOverrides} />
        </div>
      </Section>

      {/* Rule list grouped by category */}
      <Section title="Rules" hint="Each rule has a single severity. Block fails the gate; warn surfaces a soft signal.">
        <div className="flex flex-col gap-3">
          {CATEGORIES.map((c) => {
            const inCat = rules.filter((r) => r.category === c.id);
            if (inCat.length === 0) return null;
            const open = !collapsed.has(c.id);
            return (
              <div
                key={c.id}
                className="overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => { toggleCollapse(c.id); }}
                  className="w-full flex items-center gap-2 px-3 h-8 text-left"
                >
                  {open ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />}
                  <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
                    {c.label}
                  </span>
                  <span className="ml-auto text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                    {inCat.filter((r) => r.severity !== 'off').length} of {inCat.length} active
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

      <p className="text-[11px] mt-4 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <ScrollText className="w-3 h-3 mt-0.5 shrink-0" />
        Saved changes appear in the workspace admission view within seconds. Active fix-pipeline runs are not retroactively re-checked.
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
  const Icon = rule.icon;
  const partial = rule.appliedToWorkspaces < rule.totalWorkspaces;
  return (
    <div
      className="flex items-start gap-3 px-3 py-3"
      style={{ borderTop: '1px solid var(--border-muted)' }}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>{rule.title}</span>
        <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{rule.description}</span>
        <div className="flex items-center gap-3 text-[10px] tabular-nums mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
          <span style={{ color: partial ? 'var(--intent-warn-fg)' : 'var(--fg-subtle)' }}>
            {rule.appliedToWorkspaces} / {rule.totalWorkspaces} workspaces
            {partial && ' · some have local overrides'}
          </span>
          <span>·</span>
          <span>last changed {rule.whenChanged}</span>
        </div>
      </div>
      <SeverityPicker value={rule.severity} onChange={onSetSeverity} />
    </div>
  );
}

function SeverityPicker({
  value, onChange,
}: { value: Severity; onChange: (v: Severity) => void }) {
  const opts: { id: Severity; label: string; bg: string; fg: string; border: string }[] = [
    { id: 'block', label: 'Block', bg: 'var(--intent-danger-bg)',  fg: 'var(--intent-danger-fg)',  border: 'var(--intent-danger-fg)'  },
    { id: 'warn',  label: 'Warn',  bg: 'var(--intent-warn-bg)',    fg: 'var(--intent-warn-fg)',    border: 'var(--intent-warn-fg)'    },
    { id: 'off',   label: 'Off',   bg: 'var(--bg-surface-muted)',  fg: 'var(--fg-muted)',          border: 'var(--border-muted)'      },
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
            className="h-7 px-2.5 text-[10px] uppercase tracking-[0.14em] font-semibold transition-colors"
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
      <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>{label}</span>
      <span
        className="text-[18px] font-semibold tabular-nums"
        style={{ color: tone === 'warn' ? 'var(--intent-warn-fg)' : 'var(--fg-strong)' }}
      >
        {value}
      </span>
      {sub && <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{sub}</span>}
    </div>
  );
}

