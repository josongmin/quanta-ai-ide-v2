import { useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Field, Button, Checkbox } from '@shared/ui/forms';
import { useDialogA11y } from '@shared/ui';
import { SCOPE_GROUPS, ALL_SCOPES, type ScopeId, type Token } from './types';

export function CreateModal({
  onClose, onCreate,
}: { onClose: () => void; onCreate: (t: Token) => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);
  const [name, setName] = useState('');
  const [expiresIn, setExpiresIn] = useState<'30' | '60' | '90' | '365' | 'never'>('90');
  const [scopes, setScopes] = useState<Set<ScopeId>>(new Set(['read:repo']));

  const valid = name.trim().length > 0 && scopes.size > 0;
  const dangerScopes = ALL_SCOPES.filter((s) => scopes.has(s.id) && s.danger);

  const create = () => {
    if (!valid) return;
    const expiresAt = expiresIn === 'never' ? null
      : new Date(Date.now() + Number(expiresIn) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const prefix = `sef_${Math.random().toString(36).slice(2, 6)}`;
    const token: Token = {
      id: `t_${Date.now()}`,
      name: name.trim(),
      scopes: Array.from(scopes),
      createdAt: new Date().toISOString().slice(0, 10),
      expiresAt,
      lastUsedAt: 'Never',
      prefix,
    };
    onCreate(token);
  };

  const toggleScope = (id: ScopeId) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-[520px] max-h-[90vh] rounded-md p-5 popover-panel-in flex flex-col gap-4 overflow-y-auto outline-none"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          New personal access token
        </h3>

        <Field
          label="Name"
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          placeholder='e.g. "ci · gh-actions"'
          autoFocus
          hint="Help your future self remember what this token is for."
        />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-[10px] uppercase tracking-[0.14em] font-medium pb-1" style={{ color: 'var(--fg-subtle)' }}>
            Expiration
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {(['30', '60', '90', '365', 'never'] as const).map((d) => {
              const active = expiresIn === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setExpiresIn(d); }}
                  className="h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
                  style={{
                    background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                    color: active ? 'var(--fg-strong)' : 'var(--fg-default)',
                    border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
                  }}
                >
                  {d === 'never' ? 'Never (not recommended)' : `${d} days`}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
            Scopes
          </legend>
          <div className="flex flex-col gap-3">
            {SCOPE_GROUPS.map((g) => (
              <div key={g.title} className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--fg-muted)' }}>
                  {g.title}
                </span>
                {g.scopes.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-start gap-2.5 cursor-pointer px-2.5 py-1.5 rounded-md transition-colors"
                    style={{
                      background: scopes.has(s.id) ? 'var(--bg-active)' : 'transparent',
                    }}
                  >
                    <Checkbox
                      checked={scopes.has(s.id)}
                      onChange={() => { toggleScope(s.id); }}
                      label={s.id}
                    />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code
                          className="text-[11px] font-mono"
                          style={{ color: s.danger ? 'var(--intent-warn-fg)' : 'var(--fg-strong)' }}
                        >
                          {s.label}
                        </code>
                        {s.danger && (
                          <span
                            className="text-[8px] uppercase tracking-[0.14em] font-semibold px-1 py-0.5 rounded"
                            style={{
                              background: 'var(--intent-warn-bg)',
                              color: 'var(--intent-warn-fg)',
                            }}
                          >
                            destructive
                          </span>
                        )}
                      </div>
                      <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                        {s.sub}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </fieldset>

        {dangerScopes.length > 0 && (
          <div
            className="flex items-start gap-2 px-2.5 py-2 rounded text-[11px] onb-stagger"
            style={{
              background: 'var(--intent-warn-bg)',
              border: '1px solid var(--intent-warn-fg)',
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
            <span style={{ color: 'var(--fg-strong)' }}>
              You&apos;re about to grant {dangerScopes.length} destructive scope{dangerScopes.length === 1 ? '' : 's'}.
              Anyone holding this token can act with these permissions.
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={create} disabled={!valid}>
            Generate token
          </Button>
        </div>
      </div>
    </div>
  );
}
