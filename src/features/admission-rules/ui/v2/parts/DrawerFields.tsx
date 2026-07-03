import { useV2, type V2Theme } from './tokens';

// ── Field + drawer inputs (also used by the override modal in GatePage and
// by the per-kind SignalEditor registry). Kept in their own module so the
// RuleEditorOverlay container and the SignalEditor registry can share them
// without forming an eval-time import cycle through the overlay.

export function Field({ label, children, t }: { label: string; children: React.ReactNode; t?: V2Theme }) {
  const tv = useV2();
  const tt = t ?? tv;
  return (
    <div>
      <div
        className="mb-1.5 text-2xs font-bold uppercase tracking-eyebrow"
        style={{ color: tt.textSubtle }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export function DrawerInput({
  value, onChange, placeholder, multiline, mono, numeric, t,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  mono?: boolean;
  numeric?: boolean;
  t?: V2Theme;
}) {
  const tv = useV2();
  const tt = t ?? tv;
  const cls = `w-full px-3 py-2 rounded-md text-sm outline-none transition-colors ${mono ? 'font-mono' : ''}`;
  const style: React.CSSProperties = {
    background: tt.inset,
    border: `1px solid ${tt.border}`,
    color: tt.textBody,
  };
  if (multiline) {
    return (
      <textarea
        rows={2}
        className={cls}
        style={style}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.currentTarget.value); }}
      />
    );
  }
  return (
    <input
      type={numeric ? 'number' : 'text'}
      className={cls}
      style={style}
      value={value}
      placeholder={placeholder}
      onChange={(e) => { onChange(e.currentTarget.value); }}
    />
  );
}

export function DrawerSelect<T extends string>({
  value, onChange, options, accent, t,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  accent?: string;
  t?: V2Theme;
}) {
  const tv = useV2();
  const tt = t ?? tv;
  return (
    <select
      className="w-full px-3 py-2 rounded-md text-sm font-mono outline-none"
      style={{
        background: tt.inset,
        border: `1px solid ${tt.border}`,
        color: accent ?? tt.textBody,
      }}
      value={value}
      // The native <select> can only emit one of the rendered `options`, so
      // the DOM string value is one of T; narrowed once here at the boundary.
      onChange={(e) => { onChange(e.currentTarget.value as T); }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
