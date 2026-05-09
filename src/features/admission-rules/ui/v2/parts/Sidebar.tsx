import { ShieldCheck, Activity, ListChecks, Gavel } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { AdmissionRule, evaluateAdmission } from '@entities/admission';
import { SEVERITY_COLOR, useV2 } from './tokens';
import { NavGroup, NavItem } from './primitives';

// Page identifiers for the v2 IA — Health / Rules / Gate.
export type V2Page = 'health' | 'rules' | 'gate';

// ─────────────────────────────────────────────────────────────────────────
// SIDEBAR — vertical glass nav, 220px. Each item shows a live counter
// derived from the current ruleset / decision so the nav itself doubles
// as a status indicator.
// ─────────────────────────────────────────────────────────────────────────

export function Sidebar({
  active, onChange, decision, rules,
}: {
  active: V2Page;
  onChange: (p: V2Page) => void;
  decision: ReturnType<typeof evaluateAdmission>;
  rules: AdmissionRule[];
}) {
  const t = useV2();
  const { t: tr } = useTranslation('app');
  const enabled = rules.filter((r) => r.enabled).length;
  const verdict = decision.outcome;
  const verdictColor = verdict === 'block' ? SEVERITY_COLOR.block
    : verdict === 'warn' ? SEVERITY_COLOR.warn : '#5fa86c';

  // Verdict short-form for the nav badge — full word is too long for the
  // 18px badge slot. We use a single glyph + tooltip via the page title.
  const verdictGlyph = verdict === 'block' ? '✕' : verdict === 'warn' ? '!' : '✓';

  const items: {
    id: V2Page;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    shortcut?: string;
    badge?: { text: string; color?: string };
  }[] = [
    {
      id: 'health',
      label: 'Health',
      icon: Activity,
      shortcut: '⌘1',
    },
    {
      id: 'rules',
      label: 'Rules',
      icon: ListChecks,
      badge: { text: String(enabled) },
    },
    {
      id: 'gate',
      label: 'Gate',
      icon: Gavel,
      badge: { text: verdictGlyph, color: verdictColor },
    },
  ];

  return (
    <aside
      className="shrink-0 w-[224px] flex flex-col relative z-10"
      style={{
        borderRight: `1px solid ${t.border}`,
        // Glass chrome — same recipe as the AppShell GNB so the top
        // header and the rail read as one continuous L-shape. Strong
        // blur kills any grid bleed-through behind the surface.
        backgroundColor: t.sidebar,
        backdropFilter: t.sidebarBlur,
        WebkitBackdropFilter: t.sidebarBlur,
      }}
    >
      {/* Workspace switcher — top dense row, mirrors Linear's project picker */}
      <button type="button"
        className="group flex items-center gap-2 px-3 h-12 border-b transition-colors"
        style={{ borderColor: t.borderSoft }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = t.hoverSubtle; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: `${t.accent}1f`,
            border: `1px solid ${t.accent}55`,
          }}
        >
          <ShieldCheck className="w-3 h-3" style={{ color: t.accent }} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div
            className="text-[12px] font-semibold leading-tight truncate"
            style={{ color: t.textBody }}
          >
            Admission
          </div>
          <div
            className="text-[10px] leading-tight truncate"
            style={{ color: t.textSubtle }}
          >
            acme-monorepo
          </div>
        </div>
        <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0" style={{ color: t.textSubtle }}>
          <path d="M3 4 L5 6 L7 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 6 L5 4 L7 6" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>
      </button>

      {/* Nav body */}
      <div className="flex-1 min-h-0 overflow-y-auto py-3">
        <NavGroup label="Workspace">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.id;
            return (
              <NavItem
                key={it.id}
                icon={Icon}
                label={it.label}
                shortcut={it.shortcut}
                badge={it.badge}
                active={isActive}
                onClick={() => { onChange(it.id); }}
              />
            );
          })}
        </NavGroup>

        <NavGroup label="Status">
          <div className="px-3 py-1.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px]" style={{ color: t.textMuted }}>{tr('admission.sidebar.verdict')}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: verdictColor }}
                />
                <span
                  className="text-[11px] font-mono uppercase tracking-[0.18em]"
                  style={{ color: verdictColor }}
                >
                  {verdict}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px]" style={{ color: t.textMuted }}>{tr('admission.sidebar.activeRules')}</span>
              <span className="text-[11px] font-mono tabular-nums" style={{ color: t.textBody }}>
                {enabled}
                <span style={{ color: t.textFaint }}> / {rules.length}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: t.textMuted }}>{tr('admission.sidebar.engine')}</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.ok }} />
                <span className="text-[11px]" style={{ color: t.textMuted }}>{tr('admission.sidebar.engineReady')}</span>
              </div>
            </div>
          </div>
        </NavGroup>
      </div>

      {/* Footer — sync status, mirrors Notion's bottom utilities row */}
      <div
        className="shrink-0 px-3 h-9 flex items-center gap-2 border-t"
        style={{ borderColor: t.borderSoft }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.ok }} />
        <span className="text-[11px] flex-1 min-w-0 truncate" style={{ color: t.textMuted }}>
          {tr('admission.sidebar.syncedJustNow')}
        </span>
        <span className="text-[10px] font-mono" style={{ color: t.textFaint }}>v2</span>
      </div>
    </aside>
  );
}
