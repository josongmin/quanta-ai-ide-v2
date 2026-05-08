import type { ReactNode } from 'react';

// One vertical block in the settings dialog: tiny uppercase label on top,
// content underneath. Keeps spacing/typography consistent across all
// sections so the dialog reads as one document, not four widgets glued
// together.

type Props = {
  label: string;
  description?: string;
  children: ReactNode;
  /** When true, the label sits inline with the content (right-aligned content). */
  inline?: boolean;
};

export function SettingsSection({ label, description, children, inline = false }: Props) {
  if (inline) {
    return (
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <div
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-default)' }}
          >
            {label}
          </div>
          {description && (
            <div
              className="text-[10px] mt-0.5"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {description}
            </div>
          )}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    );
  }

  return (
    <section className="space-y-2.5">
      <div>
        <div
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-muted)' }}
        >
          {label}
        </div>
        {description && (
          <div
            className="text-[10px] mt-1"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {description}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
