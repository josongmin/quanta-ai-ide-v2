import { ChevronRight } from 'lucide-react';

type Props = {
  orgName: string;
  breadcrumb: string[];
};

// Anchor nav for the single-page scroll. Order mirrors the section order in
// BillingStage.tsx — the IDs match the Section `anchor` props.
const ANCHORS: { id: string; label: string }[] = [
  { id: 'plan',      label: 'Plan' },
  { id: 'lineup',    label: 'Plans' },
  { id: 'usage',     label: 'Usage' },
  { id: 'invoices',  label: 'Invoices' },
  { id: 'payment',   label: 'Payment' },
  { id: 'profile',   label: 'Profile' },
  { id: 'tax',       label: 'Tax' },
  { id: 'contracts', label: 'Contracts' },
];

export function BillingHeader({ orgName, breadcrumb }: Props) {
  return (
    <header className="flex flex-col gap-3 mb-12">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {breadcrumb.map((crumb, i) => {
          const last = i === breadcrumb.length - 1;
          return (
            <span key={i} className="flex items-center gap-1">
              <span style={{ color: last ? 'var(--fg-default)' : 'var(--fg-subtle)' }}>
                {crumb}
              </span>
              {!last && <ChevronRight className="w-3 h-3 opacity-60" />}
            </span>
          );
        })}
      </nav>

      <div className="flex items-baseline gap-3">
        <h1
          className="text-3xl font-semibold tracking-tight leading-none"
          style={{ color: 'var(--fg-strong)' }}
        >
          Billing
        </h1>
        <span className="text-base" style={{ color: 'var(--fg-subtle)' }}>
          {orgName}
        </span>
      </div>

      <nav
        aria-label="Sections"
        className="flex items-center gap-1 mt-2 pb-2 -mx-1 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--border-muted)' }}
      >
        {ANCHORS.map((a) => (
          <AnchorLink key={a.id} href={`#${a.id}`} label={a.label} />
        ))}
      </nav>
    </header>
  );
}

function AnchorLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="px-2 h-7 inline-flex items-center rounded-md text-sm font-medium transition-colors whitespace-nowrap"
      style={{ color: 'var(--fg-muted)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
        e.currentTarget.style.color = 'var(--fg-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--fg-muted)';
      }}
    >
      {label}
    </a>
  );
}
