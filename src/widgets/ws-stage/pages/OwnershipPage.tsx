import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, Plus, Trash2, ShieldCheck, FileWarning, CheckCircle2, X,
} from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Section, Button, SaveBar } from '@shared/ui/forms';
import { InlineError, SkeletonText } from '@shared/ui';
import { workspaceArray, workspaceObject, workspaceString } from '@entities/workspace';
import { useWorkspaceSettingsForm } from '../lib/useWorkspaceSettingsForm';

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
  const { t } = useTranslation('ws');
  const [validate, setValidate] = useState<'idle' | 'checking' | 'ok'>('idle');
  const {
    actionError,
    clearActionError,
    detail,
    dirty,
    discard,
    form: rules,
    isPending,
    isReal,
    loadError,
    retryLoad,
    save,
    saving,
    setForm: setRules,
    shell,
  } = useWorkspaceSettingsForm<Rule[]>({
    initial: SEED_RULES,
    fromDetail: (workspace) => {
      const ownership = workspaceObject(workspace.raw, 'ownership', 'ownershipRules') ?? {};
      const loaded = workspaceArray(ownership, 'rules')
        ?? workspaceArray(workspace.raw, 'ownership_rules', 'ownershipRules', 'codeowners')
        ?? [];
      const rules = loaded
        .map((item, index) => {
          const rule = workspaceObject(item);
          return rule ? {
            id: workspaceString(rule, 'id') ?? `r${index.toString(36)}`,
            pattern: workspaceString(rule, 'pattern') ?? '',
            owners: (workspaceArray(rule, 'owners') ?? [])
              .map((owner) => workspaceString(owner))
              .filter((owner): owner is string => owner !== null),
          } : null;
        })
        .filter((rule): rule is Rule => rule !== null && rule.pattern.trim().length > 0);
      return rules.length > 0 ? rules : SEED_RULES;
    },
    toPatch: (next) => ({
      ownership: {
        rules: next.map((rule) => ({
          id: rule.id,
          pattern: rule.pattern,
          owners: rule.owners,
        })),
      },
    }),
  });

  const codeowners = useMemo(() => {
    const header = `${t('ownership.generatedHeader.line1')}\n${t('ownership.generatedHeader.line2')}\n\n`;
    const body = rules
      .filter((r) => r.pattern.trim())
      .map((r) => {
        const pad = Math.max(2, 32 - r.pattern.length);
        return `${r.pattern}${' '.repeat(pad)}${r.owners.join(' ')}`;
      })
      .join('\n');
    return header + body + '\n';
  }, [rules, t]);

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

  const runValidate = () => {
    setValidate('checking');
    setTimeout(() => {
      setValidate('ok');
      setTimeout(() => { setValidate('idle'); }, 2000);
    }, 700);
  };

  const coveragePct = Math.round(((TOTAL_FILES - UNCOVERED_FILES) / TOTAL_FILES) * 100);

  if (isReal && loadError) {
    return (
      <WsShell
        orgName={shell.orgName}
        orgSlug={shell.orgSlug}
        wsName={shell.wsName}
        wsSlug={shell.wsSlug}
        title={t('ownership.title')}
        subtitle={t('ownership.subtitle')}
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
        title={t('ownership.title')}
        subtitle={t('ownership.subtitle')}
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
      title={t('ownership.title')}
      subtitle={t('ownership.subtitle')}
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
          {validate === 'checking' ? t('ownership.validating') : validate === 'ok' ? t('ownership.allResolve') : t('ownership.validate')}
        </Button>
      }
    >
      {actionError && (
        <div className="mb-3">
          <InlineError message={actionError} onRetry={clearActionError} />
        </div>
      )}

      {/* Coverage status band */}
      <div
        className="grid grid-cols-3 gap-3 p-4 rounded-md mb-6"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <Stat label={t('ownership.coverage')} value={`${coveragePct}%`} sub={t('ownership.coverageSub', { covered: TOTAL_FILES - UNCOVERED_FILES, total: TOTAL_FILES })} />
        <Stat label={t('ownership.unownedFiles')} value={t('ownership.unownedValue', { count: UNCOVERED_FILES, total: TOTAL_FILES })} sub={t('ownership.unownedSub')} tone="warn" />
        <Stat label={t('ownership.activeRules')} value={`${rules.length}`} sub={t('ownership.activeRulesSub', { count: rules.filter((r) => r.owners.length > 0).length })} />
      </div>

      <Section
        title={t('ownership.codeowners.title')}
        hint={t('ownership.codeowners.hint')}
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
                {t('ownership.generatedReadOnly')}
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
              <span>{t('ownership.colPattern')}</span>
              <span>{t('ownership.colOwners')}</span>
              <span />
            </div>
            {rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
                <Users className="w-5 h-5" style={{ color: 'var(--fg-subtle)' }} />
                <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {t('ownership.emptyTitle')}
                </span>
                <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
                  {t('ownership.emptySub')}
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
                {t('ownership.orderMatters')}
              </span>
              <Button leading={<Plus className="w-3 h-3" />} onClick={addRule}>
                {t('ownership.addRule')}
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <p className="text-sm mt-4 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <FileWarning className="w-3 h-3 mt-0.5 shrink-0" />
        <span>{t('ownership.savingNote', { path: '.github/CODEOWNERS' })}</span>
      </p>

      <SaveBar
        visible={dirty || saving !== 'idle'}
        dirty={dirty}
        savingState={saving}
        onSave={() => { void save(); }}
        onDiscard={discard}
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
  const { t } = useTranslation('ws');
  const [picking, setPicking] = useState(false);
  const empty = rule.owners.length === 0;
  const remaining = pool.filter((owner) => !rule.owners.includes(owner));

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
        placeholder={t('ownership.patternPlaceholder')}
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
              aria-label={t('ownership.removeOwnerAria', { owner: o })}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {empty && (
          <span className="text-sm" style={{ color: 'var(--intent-warn-fg)' }}>
            {t('ownership.noOwners')}
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
          aria-label={t('ownership.addOwnerAria')}
          disabled={remaining.length === 0}
        >
          <Plus className="w-3 h-3" />
        </button>

        {picking && remaining.length > 0 && (
          <>
            <button type="button" aria-label={t('ownership.dismissMenuAria')} className="fixed inset-0 z-30 bg-transparent border-0 p-0 cursor-default" onClick={() => { setPicking(false); }} />
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
          aria-label={t('ownership.removeRuleAria')}
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
