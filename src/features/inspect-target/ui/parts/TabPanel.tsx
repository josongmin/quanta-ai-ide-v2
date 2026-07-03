// Generic tab-dispatch chrome shared by WorkspaceBody and FolderBody.
//
// Both inspect bodies render the identical shell — eyebrow + title + subtitle
// header, a chip row, a horizontal tab strip (with optional per-tab count
// badges), the selected tab's body, and a GlassCard footer — differing only
// in their data shape and the renderer for each tab. This component captures
// that shell once; the bodies now supply a config (tab definitions, header
// content, footer text resolver) and the per-tab renderers.
//
// `SubCard` is co-located here because both bodies wrap every section in the
// same `rounded-xl border` block on `bg-surface-muted` with the eyebrow label
// living *inside* the card — matching the FocusScanPanel box chrome.

import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { C, type Tone } from '@shared/lib';
import { GlassCard } from '@shared/ui';

export type TabDef<Id extends string> = {
  id: Id;
  label: string;
  icon: LucideIcon;
  badges?: { n: number; tone: Tone }[];
};

export type TabPanelProps<Id extends string> = {
  /** Eyebrow row: icon + uppercase label. */
  eyebrowIcon: LucideIcon;
  eyebrowLabel: string;
  /** Title heading + mono subtitle line. */
  title: string;
  subtitle: ReactNode;
  /** Chip row beneath the title (e.g. "main" / file counts). */
  chips: ReactNode;
  tabs: TabDef<Id>[];
  /** Renders the body for the currently-selected tab. */
  renderTab: (tab: Id) => ReactNode;
  /** Resolves the footer text for the currently-selected tab. */
  footer: (tab: Id) => string;
  /** Initial selected tab. */
  initialTab: Id;
};

// Tab-dispatch chrome. Header / chips / tab strip are flush with the outer
// InspectPanel shell — same shape as FocusScanPanel — so workspace, folder,
// and file selections all read as the same chrome.
export function TabPanel<Id extends string>({
  eyebrowIcon: EyebrowIcon,
  eyebrowLabel,
  title,
  subtitle,
  chips,
  tabs,
  renderTab,
  footer,
  initialTab,
}: TabPanelProps<Id>) {
  const [tab, setTab] = useState<Id>(initialTab);

  return (
    <>
      <div className="-mx-2 px-5 pt-4 pb-0">
        <div className="flex items-start gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <div
              className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-eyebrow"
              style={{ color: 'var(--fg-subtle)' }}
            >
              <EyebrowIcon className="w-3 h-3" /> {eyebrowLabel}
            </div>
            <h2 className="font-black text-md truncate tracking-tight mt-1">
              {title}
            </h2>
            <p
              className="text-xs font-mono truncate mt-0.5"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 mb-3 flex-wrap">
          {chips}
        </div>
        <nav
          className="-mx-5 overflow-x-auto scrollbar-hide border-t"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-stretch gap-3 px-4 min-w-max">
            {tabs.map(({ id, label, icon: Icon, badges }) => {
              const active = tab === id;
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => { setTab(id); }}
                  className="relative flex items-center gap-1.5 py-2.5 text-xs font-black uppercase tracking-eyebrow whitespace-nowrap transition-colors"
                  style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-subtle)' }}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{label}</span>
                  {badges && badges.length > 0 && (
                    <span className="ml-0.5 inline-flex items-center gap-0.5">
                      {badges.map((b, i) => {
                        const c = b.tone === 'critical' ? C.critical : b.tone === 'warn' ? C.warning : C.ok;
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-2xs font-black tabular-nums"
                            style={{ background: `${c}22`, color: c }}
                          >
                            {b.n}
                          </span>
                        );
                      })}
                    </span>
                  )}
                  {active && (
                    <span
                      className="absolute left-0 right-0 -bottom-px h-[1.5px]"
                      style={{ background: 'var(--fg-strong)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="text-sm">
        {renderTab(tab)}
      </div>

      <GlassCard
        tone="inner"
        className="px-5 py-2 text-2xs font-mono uppercase tracking-eyebrow"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {footer(tab)}
      </GlassCard>

      <div className="h-2" aria-hidden />
    </>
  );
}

// Subcard used by the inspect panel's tab body — mirrors the FocusScanPanel
// box style (IndexStateBox / AiContextBox / BlastRadiusBox): a flat
// `rounded-xl border` block on `bg-surface-muted`, with the eyebrow label
// living *inside* the card rather than floating above it. Keeps the visual
// grouping while matching the file-panel chrome across all three inspect
// modes (workspace / folder / file).
export function SubCard({
  title, subtitle, children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="flex items-baseline gap-2">
        <div
          className="text-2xs font-black uppercase tracking-eyebrow"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="text-2xs font-mono truncate"
            style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}
