import { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import type { AgentRule } from '../types';
import { SOURCE_BADGE, type TranslateFn } from './types';

export function RulesTab({
  rules, onRulesChange, isDark, t,
}: {
  rules: AgentRule[];
  onRulesChange: (next: AgentRule[]) => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | AgentRule['source']>('all');

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (filter !== 'all' && r.source !== filter) return false;
      if (query.length === 0) return true;
      const q = query.toLowerCase();
      return r.name.toLowerCase().includes(q)
        || r.body.toLowerCase().includes(q)
        || r.globs.some((g) => g.toLowerCase().includes(q));
    });
  }, [rules, query, filter]);

  function patchRule(id: string, patch: Partial<AgentRule>) {
    onRulesChange(rules.map((r) => r.id === id ? { ...r, ...patch, updatedAtMs: Date.now() } : r));
  }
  function deleteRule(id: string) {
    onRulesChange(rules.filter((r) => r.id !== id));
  }
  function addRule() {
    const id = `r-${Date.now().toString(36)}`;
    const newRule: AgentRule = {
      id,
      name: t('agentProfile.rules.newName'),
      body: '',
      globs: ['**/*'],
      scope: 'always',
      enabled: true,
      source: 'authored',
      updatedAtMs: Date.now(),
    };
    onRulesChange([newRule, ...rules]);
  }

  const sources: { id: 'all' | AgentRule['source']; label: string }[] = [
    { id: 'all',          label: t('agentProfile.rules.filterAll') },
    { id: 'authored',     label: t('agentProfile.rules.sourceAuthored') },
    { id: 'pain-point',   label: t('agentProfile.rules.sourcePainPoint') },
    { id: 'diff-pattern', label: t('agentProfile.rules.sourceDiffPattern') },
    { id: 'marketplace',  label: t('agentProfile.rules.sourceMarketplace') },
  ];

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-[var(--bg-elevated)] border-[var(--border-default)]`}>
          <Search className={`w-3.5 h-3.5 text-[var(--fg-subtle)]`} />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            placeholder={t('agentProfile.rules.searchPlaceholder')}
            className={`flex-1 bg-transparent text-[12px] outline-none text-[var(--fg-strong)]`}
          />
        </div>
        <button
          type="button"
          onClick={addRule}
          className={`shrink-0 px-2.5 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-colors bg-[var(--bg-elevated)] text-[var(--fg-strong)] hover:[background:var(--bg-active-strong)]`}
        >
          <Plus className="w-3.5 h-3.5" />
          {t('agentProfile.rules.add')}
        </button>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {sources.map((s) => {
          const active = filter === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => { setFilter(s.id); }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors ${
                active
                  ? ('bg-[var(--bg-active-strong)] text-[var(--fg-on-active-strong)]')
                  : ('text-[var(--fg-muted)] hover:text-[var(--fg-default)]')
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filtered.map((r) => (
          <RuleRow
            key={r.id}
            rule={r}
            onPatch={(p) => { patchRule(r.id, p); }}
            onDelete={() => { deleteRule(r.id); }}
            isDark={isDark}
            t={t}
          />
        ))}
        {filtered.length === 0 && (
          <div className={`text-[12px] text-[var(--fg-muted)] py-8 text-center`}>
            {t('agentProfile.rules.empty')}
          </div>
        )}
      </div>
    </div>
  );
}

function RuleRow({
  rule, onPatch, onDelete, isDark, t,
}: {
  rule: AgentRule;
  onPatch: (p: Partial<AgentRule>) => void;
  onDelete: () => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  void isDark;
  const [expanded, setExpanded] = useState(false);
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  const heading = 'text-[var(--fg-strong)]';
  const surface = 'bg-[var(--bg-surface-muted)] border-[var(--border-default)]';

  const badge = SOURCE_BADGE[rule.source];
  const badgeTone =
    badge.tone === 'amber'   ? ('border-[var(--intent-warn-fg)] bg-[var(--intent-warn-bg)] text-[var(--intent-warn-fg)]')
    : badge.tone === 'violet'? ('border-[var(--fg-accent)] bg-[var(--bg-elevated)] text-[var(--fg-accent)]')
    : badge.tone === 'sky'   ? ('border-sky-400/30 bg-sky-400/10 text-[var(--fg-link)]')
    : ('border-[var(--border-strong)] bg-[var(--bg-active)] text-[var(--fg-muted)]');

  return (
    <div className={`rounded-lg border ${surface}`}>
      <div className="px-3.5 py-2.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => { onPatch({ enabled: !rule.enabled }); }}
          aria-pressed={rule.enabled}
          aria-label={rule.enabled ? t('agentProfile.rules.disable') : t('agentProfile.rules.enable')}
          className={`shrink-0 inline-flex items-center w-7 h-3.5 rounded-full transition-colors ${
            rule.enabled
              ? ('bg-[var(--intent-success-vivid)]')
              : ('bg-[var(--bg-active-strong)]')
          }`}
        >
          <span className={`block w-3 h-3 rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-[14px]' : 'translate-x-px'}`} />
        </button>

        <button
          type="button"
          onClick={() => { setExpanded((v) => !v); }}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[12px] font-semibold truncate ${heading} ${rule.enabled ? '' : 'opacity-55'}`}>
              {rule.name}
            </span>
            <span className={`shrink-0 text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-px rounded border ${badgeTone}`}>
              {badge.label}
            </span>
            <span className={`shrink-0 text-[9px] font-mono ${faint}`}>
              {rule.scope}
            </span>
          </div>
          <div className={`flex items-center gap-1.5 flex-wrap text-[10px] font-mono ${muted}`}>
            {rule.globs.length === 0 ? (
              <span className={faint}>{t('agentProfile.rules.alwaysOn')}</span>
            ) : rule.globs.map((g) => (
              <span
                key={g}
                className={`px-1.5 py-px rounded bg-[var(--bg-active)]`}
              >
                {g}
              </span>
            ))}
          </div>
        </button>

        <button
          type="button"
          onClick={onDelete}
          aria-label={t('agentProfile.rules.delete')}
          className={`shrink-0 p-1.5 rounded transition-colors text-[var(--fg-muted)] hover:[background:var(--intent-danger-bg)] hover:text-[var(--intent-danger-fg)]`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className={`px-3.5 py-3 border-t border-[var(--border-muted)] space-y-2.5`}>
          <div>
            <div className={`text-[10px] uppercase tracking-[0.18em] font-bold mb-1 ${faint}`}>
              {t('agentProfile.rules.body')}
            </div>
            <textarea
              value={rule.body}
              onChange={(e) => { onPatch({ body: e.target.value }); }}
              rows={4}
              placeholder={t('agentProfile.rules.bodyPlaceholder')}
              className={`w-full text-[11px] leading-relaxed resize-none rounded-md px-2 py-1.5 outline-none transition-colors bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--fg-strong)] focus:border-[var(--border-strong)]`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className={`text-[10px] uppercase tracking-[0.18em] font-bold mb-1 ${faint}`}>
                {t('agentProfile.rules.globs')}
              </div>
              <input
                type="text"
                value={rule.globs.join(', ')}
                onChange={(e) => {
                  const globs = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                  onPatch({ globs });
                }}
                placeholder="src/**/*.ts, **/*.test.tsx"
                className={`w-full text-[11px] font-mono rounded-md px-2 py-1.5 outline-none transition-colors bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--fg-strong)] focus:border-[var(--border-strong)]`}
              />
            </div>
            <div>
              <div className={`text-[10px] uppercase tracking-[0.18em] font-bold mb-1 ${faint}`}>
                {t('agentProfile.rules.scope')}
              </div>
              <div className="flex items-center gap-px">
                {(['always', 'requested', 'manual'] as AgentRule['scope'][]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { onPatch({ scope: s }); }}
                    className={`flex-1 px-2 py-1.5 text-[11px] font-mono transition-colors ${
                      rule.scope === s
                        ? ('bg-[var(--bg-active-strong)] text-[var(--fg-on-active-strong)]')
                        : ('text-[var(--fg-muted)] hover:text-[var(--fg-default)]')
                    } ${s === 'always' ? 'rounded-l-md' : s === 'manual' ? 'rounded-r-md' : ''} border border-[var(--border-default)]`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {rule.fromTurnId != null && (
            <div className={`text-[10px] font-mono ${faint}`}>
              {t('agentProfile.rules.derivedFrom', { id: rule.fromTurnId })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
