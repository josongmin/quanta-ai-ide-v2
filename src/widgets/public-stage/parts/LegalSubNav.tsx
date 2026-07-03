import { Link } from '@tanstack/react-router';

type LegalKey = 'terms' | 'privacy' | 'dpa' | 'subprocessors';

const TABS: { id: LegalKey; label: string; to: string }[] = [
  { id: 'terms',          label: 'Terms of Service',  to: '/legal/terms'         },
  { id: 'privacy',        label: 'Privacy Policy',    to: '/legal/privacy'       },
  { id: 'dpa',            label: 'DPA',               to: '/legal/dpa'           },
  { id: 'subprocessors',  label: 'Subprocessors',     to: '/legal/subprocessors' },
];

// Shared tab strip for all 4 legal pages. Active tab uses background tint +
// bottom-border underline; never a left-edge stripe.
export function LegalSubNav({ active }: { active: LegalKey }) {
  return (
    <div
      className="flex items-center gap-1 mb-8 -mx-1 overflow-x-auto"
      style={{ borderBottom: '1px solid var(--border-muted)' }}
    >
      {TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <Link
            key={t.id}
            to={t.to as never}
            className="relative px-3 py-2 text-base font-medium whitespace-nowrap transition-colors rounded-t-md"
            style={{
              color: isActive ? 'var(--fg-strong)' : 'var(--fg-muted)',
              background: isActive ? 'var(--bg-active)' : 'transparent',
            }}
          >
            {t.label}
            {isActive && (
              <span
                aria-hidden
                className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full"
                style={{ background: 'var(--fg-accent)' }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
