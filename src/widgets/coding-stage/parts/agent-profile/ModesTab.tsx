import { Check, Copy, Trash2 } from 'lucide-react';
import type { AgentMode, TrustLevel } from '../types';
import { MODE_ICON, ALL_TOOLS, ACCENT_HEX, type TranslateFn } from './types';

export function ModesTab({
  modes, activeId, onActiveChange, onModesChange, isDark, t,
}: {
  modes: AgentMode[];
  activeId: string;
  onActiveChange: (id: string) => void;
  onModesChange: (next: AgentMode[]) => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  function patchMode(id: string, patch: Partial<AgentMode>) {
    onModesChange(modes.map((m) => m.id === id ? { ...m, ...patch } : m));
  }
  function duplicateMode(m: AgentMode) {
    let n = 1;
    while (modes.some((x) => x.id === `${m.id}-copy${n === 1 ? '' : `-${n}`}`)) n += 1;
    const id = `${m.id}-copy${n === 1 ? '' : `-${n}`}`;
    onModesChange([
      ...modes,
      { ...m, id, name: `${m.name} · copy`, system: false },
    ]);
  }
  function deleteMode(id: string) {
    const next = modes.filter((m) => m.id !== id);
    if (id === activeId && next.length > 0) {
      onActiveChange(next[0].id);
    }
    onModesChange(next);
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <p className={`text-[11px] leading-relaxed text-[var(--fg-muted)]`}>
        {t('agentProfile.modes.intro')}
      </p>
      <div className="space-y-2">
        {modes.map((m) => (
          <ModeCard
            key={m.id}
            mode={m}
            active={m.id === activeId}
            onActivate={() => { onActiveChange(m.id); }}
            onPatch={(patch) => { patchMode(m.id, patch); }}
            onDuplicate={() => { duplicateMode(m); }}
            onDelete={() => { deleteMode(m.id); }}
            isDark={isDark}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function ModeCard({
  mode, active, onActivate, onPatch, onDuplicate, onDelete, isDark, t,
}: {
  mode: AgentMode;
  active: boolean;
  onActivate: () => void;
  onPatch: (p: Partial<AgentMode>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  const Icon = MODE_ICON[mode.icon];
  const accent = ACCENT_HEX[mode.accent];
  const heading = 'text-[var(--fg-strong)]';
  const muted   = 'text-[var(--fg-muted)]';
  const faint   = 'text-[var(--fg-subtle)]';
  const surface = active
    ? 'bg-[var(--bg-active)] border-[var(--border-strong)]'
    : 'bg-[var(--bg-surface-muted)] border-[var(--border-default)] hover:border-[var(--border-strong)]';

  return (
    <div className={`rounded-lg border ${surface} transition-colors`}>
      <div className="px-3.5 py-3 flex items-center gap-3">
        <span
          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md"
          style={{ background: `${accent}1f`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}33` }}
        >
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={mode.name}
              onChange={(e) => { onPatch({ name: e.target.value }); }}
              disabled={mode.system}
              className={`bg-transparent text-[12px] font-semibold outline-none border-b border-transparent focus:border-current min-w-0 max-w-[200px] truncate ${heading} ${
                mode.system ? 'cursor-default' : ''
              }`}
            />
            {mode.system && (
              <span className={`text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-px rounded border border-[var(--border-strong)] text-[var(--fg-muted)]`}>
                {t('agentProfile.modes.system')}
              </span>
            )}
            {active && (
              <span
                className="text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-px rounded"
                style={{ background: `${accent}28`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}55` }}
              >
                {t('agentProfile.modes.active')}
              </span>
            )}
          </div>
          <div className={`text-[11px] truncate ${muted}`}>
            {mode.blurb}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {!active && (
            <button
              type="button"
              onClick={onActivate}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors border border-[var(--border-strong)] text-[var(--fg-strong)] hover:[background:var(--bg-hover)]`}
            >
              {t('agentProfile.modes.use')}
            </button>
          )}
          <button
            type="button"
            onClick={onDuplicate}
            aria-label={t('agentProfile.modes.duplicate')}
            className={`p-1.5 rounded transition-colors text-[var(--fg-muted)] hover:[background:var(--bg-hover)] hover:text-[var(--fg-strong)]`}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {!mode.system && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={t('agentProfile.modes.delete')}
              className={`p-1.5 rounded transition-colors text-[var(--fg-muted)] hover:[background:var(--intent-danger-bg)] hover:text-[var(--intent-danger-fg)]`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Trust dial — the differentiating control. 5 explicit levels, each
          one a *specific* action the agent can take without asking. */}
      <div className={`px-3.5 py-3 border-t border-[var(--border-muted)]`}>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className={`text-[10px] uppercase tracking-[0.18em] font-bold ${faint}`}>
            {t('agentProfile.modes.trust.label')}
          </span>
          <span className={`text-[11px] font-mono ${muted}`}>
            {t(`agentProfile.modes.trust.level${mode.trust}`)}
          </span>
        </div>
        <TrustDial
          value={mode.trust}
          onChange={(v) => { onPatch({ trust: v }); }}
          isDark={isDark}
          t={t}
        />
      </div>

      {/* Allowed tools — checkbox row. Mode locked tools = grey out. */}
      <div className={`px-3.5 py-3 border-t border-[var(--border-muted)]`}>
        <div className={`text-[10px] uppercase tracking-[0.18em] font-bold mb-1.5 ${faint}`}>
          {t('agentProfile.modes.tools.label')}
        </div>
        <div className="flex flex-wrap gap-1">
          {ALL_TOOLS.map((tool) => {
            const allowed = mode.allowedTools.includes(tool);
            return (
              <button
                key={tool}
                type="button"
                onClick={() => {
                  const next = allowed
                    ? mode.allowedTools.filter((x) => x !== tool)
                    : [...mode.allowedTools, tool];
                  onPatch({ allowedTools: next });
                }}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                  allowed
                    ? ('border-[var(--intent-success-fg)] bg-[var(--intent-success-bg)] text-[var(--intent-success-fg)]')
                    : ('border-[var(--border-default)] text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]')
                }`}
              >
                {allowed && <Check className="w-3 h-3 inline -mt-px mr-1" />}
                {tool}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`px-3.5 py-3 border-t border-[var(--border-muted)]`}>
        <div className={`text-[10px] uppercase tracking-[0.18em] font-bold mb-1.5 ${faint}`}>
          {t('agentProfile.modes.prompt.label')}
        </div>
        <textarea
          value={mode.systemPrompt}
          onChange={(e) => { onPatch({ systemPrompt: e.target.value }); }}
          rows={3}
          className={`w-full text-[11px] leading-relaxed resize-none rounded-md px-2 py-1.5 outline-none transition-colors bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--fg-strong)] focus:border-[var(--border-strong)]`}
        />
      </div>
    </div>
  );
}

// 5-step trust dial. Each pip is a button so the user can jump directly.
function TrustDial({
  value, onChange, isDark, t,
}: {
  value: TrustLevel;
  onChange: (v: TrustLevel) => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  void isDark;
  const trackBg = 'bg-[var(--bg-elevated)]';
  const tone = (lv: number): string => {
    if (lv <= 1) return 'bg-[var(--intent-success-vivid)]';
    if (lv <= 2) return 'bg-[var(--intent-success-vivid)]';
    if (lv <= 3) return 'bg-amber-400/85';
    if (lv <= 4) return 'bg-amber-400/70';
    return 'bg-[var(--intent-danger-vivid)]';
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {([1, 2, 3, 4, 5] as TrustLevel[]).map((lv) => {
          const active = lv <= value;
          return (
            <button
              key={lv}
              type="button"
              onClick={() => { onChange(lv); }}
              aria-label={t(`agentProfile.modes.trust.level${lv}`)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                active ? tone(value) : trackBg
              }`}
            />
          );
        })}
      </div>
      <div className={`text-[10px] leading-relaxed text-[var(--fg-muted)]`}>
        {t(`agentProfile.modes.trust.desc${value}`)}
      </div>
    </div>
  );
}
