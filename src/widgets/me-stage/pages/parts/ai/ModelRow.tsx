import { MODELS, SURFACE_META, type Model, type Surface } from './types';
import { ModelMeta } from './ModelMeta';

// ─────────────────────────────────────────────────────────────────────────
// Per-surface model picker

export function ModelRow({
  surface, model, onChange,
}: {
  surface: Surface;
  model: Model;
  onChange: (id: string) => void;
}) {
  const meta = SURFACE_META[surface];
  const Icon = meta.icon;
  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-md"
      style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
    >
      <span
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
          border: '1px solid var(--fg-accent)',
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
      </span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {meta.label}
        </span>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{meta.sub}</span>
      </div>
      <select
        value={model.id}
        onChange={(e) => { onChange(e.target.value); }}
        className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
          minWidth: 220,
        }}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.vendor} · {m.name}
          </option>
        ))}
      </select>
      <ModelMeta model={model} />
    </div>
  );
}
