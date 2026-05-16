import { useRef, type ReactNode, type ComponentType } from 'react';
import { useScrollRestoration } from '@shared/lib';
import { useTheme } from '@shared/theme';

// SideNavShell — generic two-pane layout shared by every settings-style
// surface (MeShell, AdmissionShell, future WsShell/OrgShell). Renders a
// 220px sticky left rail with sectioned nav + scrollable right body with
// a header area. Selection state is owned by the caller, which lets the
// same shell back both router-driven nav (e.g. /me/*) and local-tab nav
// (e.g. admission's gate/rules/calibration tabs).

export type SideNavItem<K extends string = string> = {
  key: K;
  label: string;
  icon: ComponentType<{ className?: string }>;
  // Optional trailing pill (counts, badges).
  badge?: ReactNode;
};

export type SideNavGroup<K extends string = string> = {
  id: string;
  title: string;
  items: SideNavItem<K>[];
};

type Props<K extends string> = {
  // Nav data.
  groups: SideNavGroup<K>[];
  selectedKey: K;
  onSelect: (key: K) => void;

  // Right pane.
  title: string;
  subtitle?: string;
  topRight?: ReactNode;
  children: ReactNode;

  // Optional sidebar header (e.g. user card, workspace switcher).
  sidebarHeader?: ReactNode;
  // Optional sidebar footer (e.g. wide toggle, sign-out).
  sidebarFooter?: ReactNode;
  // Optional breadcrumb above the title.
  breadcrumb?: ReactNode;

  // Scroll-restoration namespace; pass a stable key per shell instance.
  scrollKey?: string;
  // Constrain the body content width (default: 820px). Pass null for full-bleed.
  contentMaxWidth?: number | null;
};

export function SideNavShell<K extends string>({
  groups,
  selectedKey,
  onSelect,
  title,
  subtitle,
  topRight,
  children,
  sidebarHeader,
  sidebarFooter,
  breadcrumb,
  scrollKey = 'side-nav-shell',
  contentMaxWidth = 820,
}: Props<K>) {
  const { isDark } = useTheme();
  const scrollerRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollKey, scrollerRef);

  const bodyMaxClass = contentMaxWidth === null ? 'max-w-none' : '';
  const bodyMaxStyle = contentMaxWidth === null
    ? undefined
    : { maxWidth: `${contentMaxWidth.toString()}px` };

  return (
    <div
      className="absolute inset-0 flex"
      style={{ background: isDark ? 'var(--bg-canvas)' : '#ffffff' }}
    >
      <Sidebar
        groups={groups}
        selectedKey={selectedKey}
        onSelect={onSelect}
        header={sidebarHeader}
        footer={sidebarFooter}
      />

      <div ref={scrollerRef} className="flex-1 min-w-0 overflow-y-auto">
        <div
          className={`mx-auto px-10 pt-10 pb-32 ${bodyMaxClass}`}
          style={bodyMaxStyle}
        >
          <header className="flex items-end justify-between gap-4 mb-8">
            <div className="flex flex-col gap-1.5 min-w-0">
              {breadcrumb}
              <h1
                className="text-[22px] font-semibold tracking-tight leading-tight"
                style={{ color: 'var(--fg-strong)' }}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
            {topRight && <div className="shrink-0">{topRight}</div>}
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}

function Sidebar<K extends string>({
  groups, selectedKey, onSelect, header, footer,
}: {
  groups: SideNavGroup<K>[];
  selectedKey: K;
  onSelect: (key: K) => void;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <aside
      className="shrink-0 w-[220px] border-r overflow-y-auto flex flex-col"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <div className="px-4 py-6 flex flex-col gap-1 flex-1">
        {header && (
          <div className="px-2 mb-3">
            {header}
          </div>
        )}

        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-0.5 mb-3">
            <span
              className="px-2 mb-1 text-[9px] uppercase tracking-[0.14em] font-semibold"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {group.title}
            </span>
            {group.items.map(({ key, label, icon: Icon, badge }) => {
              const active = selectedKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { onSelect(key); }}
                  aria-current={active ? 'page' : undefined}
                  className="flex items-center gap-2 px-2 h-7 rounded-md text-[12px] font-medium transition-colors text-left focus-ring"
                  style={{
                    background: active ? 'var(--bg-active)' : 'transparent',
                    color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {badge != null && (
                    <span className="shrink-0 inline-flex items-center">{badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {footer && (
          <div className="mt-auto pt-4">
            {footer}
          </div>
        )}
      </div>
    </aside>
  );
}
