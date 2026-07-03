import { useMemo, useState } from 'react';
import {
  Users, Plus, Trash2, ShieldCheck, FileWarning, CheckCircle2, X,
} from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Section, Button, SaveBar } from '@shared/ui/forms';
import { shallowEqual } from '@shared/lib';

// CODEOWNERS editor.
//
// SSOT = the `rules` array. The textarea on the left is generated from it
// (read-only) so we never have two divergent representations of the file.
// The right side is a structured row editor (glob + chips of teams).

type Rule = {
  id: string;
  pattern: string;
  owners: string[];
};

const TEAM_POOL = [
  '@platform',
  '@frontend',
  '@backend',
  '@security',
  '@infra',
  '@data',
  '@design',
  '@docs',
  '@release',
];

const SEED_RULES: Rule[] = [
  { id: 'r1', pattern: '*',                 owners: ['@platform'] },
  { id: 'r2', pattern: '/.github/',         owners: ['@platform', '@release'] },
  { id: 'r3', pattern: '/infra/',           owners: ['@infra', '@security'] },
  { id: 'r4', pattern: '/src/widgets/',     owners: ['@frontend'] },
  { id: 'r5', pattern: '/src/server/',      owners: ['@backend'] },
  { id: 'r6', pattern: '/docs/',            owners: ['@docs'] },
];

const UNCOVERED_FILES = 234;
const TOTAL_FILES = 1842;

export default function OwnershipPage() {
  const [rules, setRules] = useState<Rule[]>(SEED_RULES);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [validate, setValidate] = useState<'idle' | 'checking' | 'ok'>('idle');

  const dirty = !shallowEqual(rules, SEED_RULES);

  const codeowners = useMemo(() => {
    const header = '# CODEOWNERS — generated from rule editor\n# Last match wins. Add specific rules below the catch-all.\n\n';
    const body = rules
      .filter((r) => r.pattern.trim())
      .map((r) => {
        const pad = Math.max(2, 32 - r.pattern.length);
        return `${r.pattern}${' '.repeat(pad)}${r.owners.join(' ')}`;
      })
      .join('\n');
    return header + body + '\n';
  }, [rules]);

  const setRulePattern = (id: string, pattern: string) => {
    setRules((all) => all.map((r) => (r.id === id ? { ...r, pattern } : r)));
  };
  const toggleOwner = (id: string, owner: string) => {
    setRules((all) =>
      all.map((r) => {
        if (r.id !== id) return r;
        return r.owners.includes(owner)
          ? { ...r, owners: r.owners.filter((o) => o !== owner) }
          : { ...r, owners: [...r.owners, owner] };
      }),
    );
  };
  const addRule = () => {
    setRules((all) => [
      ...all,
      { id: `r${Date.now().toString(36)}`, pattern: '', owners: [] },
    ]);
  };
  const removeRule = (id: string) => {
    setRules((all) => all.filter((r) => r.id !== id));
  };

  const save = () => {
    setSaving('saving');
    setTimeout(() => {
      setSaving('saved');
      setTimeout(() => { setSaving('idle'); }, 1200);
    }, 600);
  };

  const runValidate = () => {
    setValidate('checking');
    setTimeout(() => {
      setValidate('ok');
      setTimeout(() => { setValidate('idle'); }, 2000);
    }, 700);
  };

  const coveragePct = Math.round(((TOTAL_FILES - UNCOVERED_FILES) / TOTAL_FILES) * 100);

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName="monorepo"
      wsSlug="monorepo"
      title="Ownership"
      subtitle="Map repo paths to owning teams. Rules generate the live CODEOWNERS file used by review automation."
      topRight={
        <Button
          size="md"
          leading={
            validate === 'ok'
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <ShieldCheck className="w-3.5 h-3.5" />
          }
          onClick={runValidate}
          disabled={validate !== 'idle'}
        >
          {validate === 'checking' ? 'Validating…' : validate === 'ok' ? 'All patterns resolve' : 'Validate'}
        </Button>
      }
    >
      {/* Coverage status band */}
      <div
        className="grid grid-cols-3 gap-3 p-4 rounded-md mb-6"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <Stat label="Coverage"     value={`${coveragePct}%`}                      sub={`${TOTAL_FILES - UNCOVERED_FILES} of ${TOTAL_FILES} files`} />
        <Stat label="Unowned files" value={`${UNCOVERED_FILES} of ${TOTAL_FILES}`} sub="lack an owner" tone="warn" />
        <Stat label="Active rules"  value={`${rules.length}`}                      sub={`${rules.filter((r) => r.owners.length > 0).length} have owners`} />
      </div>

      <Section
        title="CODEOWNERS"
        hint="Left: live preview generated from the rule editor. Right: structured edit surface."
      >
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Left: read-only generated file */}
          <div
            className="rounded-md overflow-hidden flex flex-col"
            style={{ border: '1px solid var(--border-muted)', minHeight: 360 }}
          >
            <div
              className="flex items-center justify-between px-3 h-8"
              style={{ background: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-muted)' }}
            >
              <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
                .github/CODEOWNERS
              </span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                generated · read-only
              </span>
            </div>
            <textarea
              value={codeowners}
              readOnly
              className="flex-1 w-full p-3 text-sm font-mono outline-none resize-none"
              style={{
                background: 'var(--bg-canvas)',
                color: 'var(--fg-default)',
                border: 'none',
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Right: structured rule editor */}
          <div
            className="rounded-md overflow-hidden flex flex-col"
            style={{ border: '1px solid var(--border-muted)' }}
          >
            <div
              className="grid items-center px-3 h-8 text-xs uppercase tracking-eyebrow font-semibold"
              style={{
                gridTemplateColumns: '1fr 1.4fr 56px',
                gap: 8,
                background: 'var(--bg-surface-muted)',
                color: 'var(--fg-subtle)',
                borderBottom: '1px solid var(--border-muted)',
              }}
            >
              <span>Pattern</span>
              <span>Owners</span>
              <span />
            </div>
            {rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
                <Users className="w-5 h-5" style={{ color: 'var(--fg-subtle)' }} />
                <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  No ownership rules yet
                </span>
                <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
                  Add a rule to start mapping paths to teams.
                </span>
              </div>
            ) : (
              rules.map((r) => (
                <RuleRow
                  key={r.id}
                  rule={r}
                  pool={TEAM_POOL}
                  onPatternChange={(p) => { setRulePattern(r.id, p); }}
                  onToggleOwner={(o) => { toggleOwner(r.id, o); }}
                  onRemove={() => { removeRule(r.id); }}
                />
              ))
            )}
            <div
              className="px-3 py-2 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
            >
              <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
                Order matters — last matching rule wins.
              </span>
              <Button leading={<Plus className="w-3 h-3" />} onClick={addRule}>
                Add rule
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <p className="text-sm mt-4 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <FileWarning className="w-3 h-3 mt-0.5 shrink-0" />
        Saving writes <span className="font-mono">.github/CODEOWNERS</span> on the default branch via the integration bot.
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

// ─────────────────────────────────────────────────────────────────────────

function RuleRow({
  rule, pool, onPatternChange, onToggleOwner, onRemove,
}: {
  rule: Rule;
  pool: string[];
  onPatternChange: (p: string) => void;
  onToggleOwner: (o: string) => void;
  onRemove: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const empty = rule.owners.length === 0;
  const remaining = pool.filter((t) => !rule.owners.includes(t));

  return (
    <div
      className="grid items-start px-3 py-2.5"
      style={{
        gridTemplateColumns: '1fr 1.4fr 56px',
        gap: 8,
        borderTop: '1px solid var(--border-muted)',
      }}
    >
      <input
        value={rule.pattern}
        onChange={(e) => { onPatternChange(e.target.value); }}
        placeholder="/path/glob/"
        className="h-7 px-2 rounded-md text-base font-mono outline-none"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      />

      <div className="relative flex flex-wrap items-center gap-1 min-h-[28px]">
        {rule.owners.map((o) => (
          <span
            key={o}
            className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full text-sm font-medium"
            style={{
              background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
              color: 'var(--fg-accent)',
              border: '1px solid var(--fg-accent)',
            }}
          >
            {o}
            <button
              type="button"
              onClick={() => { onToggleOwner(o); }}
              className="w-4 h-4 inline-flex items-center justify-center rounded-full"
              style={{ color: 'var(--fg-accent)' }}
              aria-label={`Remove ${o}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {empty && (
          <span className="text-sm" style={{ color: 'var(--intent-warn-fg)' }}>
            no owners — files will be flagged
          </span>
        )}
        <button
          type="button"
          onClick={() => { setPicking((v) => !v); }}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-base"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px dashed var(--border-default)',
            color: 'var(--fg-muted)',
          }}
          aria-label="Add owner"
          disabled={remaining.length === 0}
        >
          <Plus className="w-3 h-3" />
        </button>

        {picking && remaining.length > 0 && (
          <>
            <button type="button" aria-label="Dismiss menu" className="fixed inset-0 z-30 bg-transparent border-0 p-0 cursor-default" onClick={() => { setPicking(false); }} />
            <div
              className="absolute left-0 top-full mt-1 z-40 min-w-[160px] py-1 rounded-md"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {remaining.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { onToggleOwner(t); setPicking(false); }}
                  className="w-full flex items-center gap-2 px-2.5 h-7 text-base text-left transition-colors"
                  style={{ color: 'var(--fg-default)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="font-mono">{t}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Remove rule"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
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
