import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { ModalBackdrop } from '@shared/ui';
import { SCOPE_OPTIONS, type Scope } from './types';

// NOTE: kept hand-rolled (not SettingsModal): this panel caps its height at
// `max-h-[80vh]`, but SettingsModal hardcodes `max-h-[85vh]` with no override.
// Migrating would change the scroll threshold / rendered max height.
export function CreatePatModal({
  onCancel, onCreate,
}: { onCancel: () => void; onCreate: (name: string, scopes: Scope[], expiresInDays: number | null) => void }) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Set<Scope>>(new Set(['org:read']));
  const [exp, setExp] = useState<number | null>(90);
  const valid = name.trim().length > 0 && scopes.size > 0;

  const toggle = (s: Scope) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} label="Close dialog" />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-h-[80vh] flex flex-col rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>New personal access token</span>
          <button type="button" onClick={onCancel} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>Token name</span>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); }}
              placeholder="e.g. CI deploy gate"
              className="h-9 rounded-md px-3 text-[12px] outline-none"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>Expires</span>
            <select
              value={exp == null ? 'never' : String(exp)}
              onChange={(e) => { setExp(e.target.value === 'never' ? null : Number(e.target.value)); }}
              className="h-9 rounded-md px-3 text-[12px] outline-none cursor-pointer"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="never">No expiration</option>
            </select>
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between" style={{ color: 'var(--fg-subtle)' }}>
              <span>Scopes</span>
              <span className="lowercase tracking-normal tabular-nums">{scopes.size} selected</span>
            </span>
            <div className="rounded-md overflow-hidden flex flex-col" style={{ border: '1px solid var(--border-muted)' }}>
              {SCOPE_OPTIONS.map((s) => {
                const on = scopes.has(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                    style={{
                      borderTop: '1px solid var(--border-muted)',
                      background: on ? 'var(--bg-active)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => { toggle(s.id); }}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                    <span
                      className="font-mono text-[11px] flex-1"
                      style={{ color: s.danger ? 'var(--intent-warn-fg)' : 'var(--fg-default)' }}
                    >
                      {s.id}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{s.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={() => { onCreate(name.trim(), Array.from(scopes), exp); }}>
            Generate token
          </Button>
        </div>
      </div>
    </>
  );
}
