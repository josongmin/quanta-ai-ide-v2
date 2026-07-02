import { useState } from 'react';
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

const CATEGORIES: { id: Rule['category']; label: string; icon: React.ComponentType<{ className?: string; style?: CSSProperties }> }[] = [
  { id: 'secrets', label: 'Secrets',         icon: KeyRound },
  { id: 'review',  label: 'Review',          icon: ShieldCheck },
  { id: 'tests',   label: 'Tests & coverage',icon: TestTube2 },
  { id: 'deps',    label: 'Dependencies',    icon: FileWarning },
  { id: 'config',  label: 'Configuration',   icon: GitBranch },
];

export default function AdmissionPage() {
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
      title="Admission rules"
      subtitle="Workspace-scoped admission gates. Inherits org defaults; per-rule overrides shown below."
    >
      {/* Summary band */}
      <div
        className="grid grid-cols-3 gap-3 p-4 rounded-md mb-6"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <Stat label="Active rules"  value={`${totalActive} / ${rules.length}`} />
        <Stat label="Hard blocks"   value={String(totalBlocking)} tone="warn" />
        <Stat label="Inherited"     value={`${inheritedCount} / ${rules.length}`} sub={`${rules.length - inheritedCount} overridden`} />
      </div>

      <Section title="Rules" hint="Override an org default by changing severity. Use Reset to fall back to inheritance.">
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
                  onClick={() => { toggleCollapse(c.id); }}
                  className="w-full flex items-center gap-2 px-3 h-9 text-left"
                  style={{ background: 'var(--bg-surface-muted)' }}
                >
                  {open
                    ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
                    : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />}
                  <CatIcon className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
                  <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
                    {c.label}
                  </span>
                  <span className="ml-auto flex items-center gap-2 text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                    {overriddenInCat > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-[0.14em] font-semibold"
                        style={{
                          background: 'var(--intent-warn-bg)',
                          color: 'var(--intent-warn-fg)',
                          border: '1px solid var(--intent-warn-fg)',
                        }}
                      >
                        {overriddenInCat} overridden
                      </span>
                    )}
                    <span>{inCat.filter((r) => r.effective !== 'off').length} of {inCat.length} active</span>
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

      <p className="text-[11px] mt-4 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <ScrollText className="w-3 h-3 mt-0.5 shrink-0" />
        Org owners can lock a rule, which removes the override option for this workspace.
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
  const Icon = rule.icon;
  const overridden = rule.effective !== rule.orgDefault;

  return (
    <div
      className="flex items-start gap-3 px-3 py-3"
      style={{ borderTop: '1px solid var(--border-muted)' }}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>{rule.title}</span>
        <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{rule.description}</span>
        <div className="flex items-center gap-2 text-[10px] mt-0.5">
          <InheritanceBadge orgDefault={rule.orgDefault} overridden={overridden} />
          {overridden && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] transition-colors"
              style={{ color: 'var(--fg-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset to org default
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
  const label = orgDefault.toUpperCase();
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px]"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <span>Org default:</span>
      <span
        className="px-1 py-0.5 rounded text-[9px] uppercase tracking-[0.14em] font-semibold"
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
          className="px-1 py-0.5 rounded text-[9px] uppercase tracking-[0.14em] font-semibold"
          style={{
            background: 'var(--intent-warn-bg)',
            color: 'var(--intent-warn-fg)',
            border: '1px solid var(--intent-warn-fg)',
          }}
        >
          overridden
        </span>
      ) : (
        <span
          className="px-1 py-0.5 rounded text-[9px] uppercase tracking-[0.14em] font-semibold"
          style={{
            background: 'var(--intent-success-bg)',
            color: 'var(--intent-success-fg)',
            border: '1px solid var(--intent-success-fg)',
          }}
        >
          inherited
        </span>
      )}
    </span>
  );
}

function SeverityPicker({
  value, onChange,
}: { value: Severity; onChange: (v: Severity) => void }) {
  const opts: { id: Severity; label: string; bg: string; fg: string }[] = [
    { id: 'block', label: 'Block', bg: 'var(--intent-danger-bg)',  fg: 'var(--intent-danger-fg)'  },
    { id: 'warn',  label: 'Warn',  bg: 'var(--intent-warn-bg)',    fg: 'var(--intent-warn-fg)'    },
    { id: 'off',   label: 'Off',   bg: 'var(--bg-surface-muted)',  fg: 'var(--fg-muted)'          },
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
