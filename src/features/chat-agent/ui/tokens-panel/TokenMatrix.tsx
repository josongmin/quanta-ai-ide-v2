import { Fragment } from 'react';
import type { SemanticTokens } from '@shared/tokens';
import { humanizeKey } from './colorUtils';
import { TokenField } from './TokenField';

export function SectionTitle({ title }: { title: string }) {
  return (
    <div
      className="text-[10px] font-black uppercase tracking-[0.18em]"
      style={{ color: 'var(--fg-subtle)' }}
    >
      {title}
    </div>
  );
}

export function ThemeTokenMatrix({
  title,
  keys,
  dark,
  light,
  onDarkChange,
  onLightChange,
}: {
  title: string;
  keys: readonly (keyof SemanticTokens)[];
  dark: SemanticTokens;
  light: SemanticTokens;
  onDarkChange: (key: keyof SemanticTokens, value: string) => void;
  onLightChange: (key: keyof SemanticTokens, value: string) => void;
}) {
  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-muted)' }}
      >
        {title}
      </div>

      <div className="grid grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] gap-2 items-start">
        <div />
        <ColumnHeader title="Dark" />
        <ColumnHeader title="Light" />

        {keys.map((key) => (
          <Fragment key={key}>
            <div
              className="text-[10px] font-mono pt-2"
              style={{ color: 'var(--fg-muted)' }}
            >
              {humanizeKey(key)}
            </div>
            <TokenField label={`${humanizeKey(key)} (Dark)`} value={dark[key]} onChange={(value) => { onDarkChange(key, value); }} />
            <TokenField label={`${humanizeKey(key)} (Light)`} value={light[key]} onChange={(value) => { onLightChange(key, value); }} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function ColumnHeader({ title }: { title: string }) {
  return (
    <div
      className="rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-center"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-muted)',
        color: 'var(--fg-default)',
      }}
    >
      {title}
    </div>
  );
}
