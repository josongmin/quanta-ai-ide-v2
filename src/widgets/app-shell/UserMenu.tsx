import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { LogOut, Settings } from 'lucide-react';
import { useClickOutside, useRovingMenuFocus } from '@shared/lib';
import { useSession, signOut } from '@entities/session';

// Real-auth user affordance in the GNB: avatar button → dropdown with the
// signed-in identity, account link, and a working sign-out. Mounted only when
// real auth is wired (AppShell gates on env.useRealAuth); the mock demo keeps
// its static avatar.
export function UserMenu() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { onKeyDown: onRove } = useRovingMenuFocus(menuRef);

  // Click-outside via the shared primitive; Escape stays local (an inline GNB
  // dropdown is not a workbench-scoped shortcut nor a modal layer, so neither
  // useShortcut nor the layer system fits — see the keyboard triage).
  useClickOutside(ref, open, () => { setOpen(false); });
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); };
  }, [open]);

  const label = user?.name ?? user?.email ?? '';
  const initials = initialsOf(label);

  const onSignOut = () => {
    setOpen(false);
    void (async () => {
      await signOut();
      await navigate({ to: '/auth/login' as never });
    })();
  };

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); }}
        className="w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-black transition-shadow"
        style={{
          backgroundImage: 'linear-gradient(to bottom right, var(--fg-accent), var(--fg-link))',
          color: 'var(--bg-canvas)',
          boxShadow: open ? '0 0 0 3px color-mix(in srgb, var(--fg-accent) 22%, transparent)' : 'none',
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label ? `Account menu — ${label}` : 'Account menu'}
      >
        {initials || '·'}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={(e) => { if (onRove(e)) return; if (e.key === 'Escape') setOpen(false); }}
          className="absolute right-0 mt-2 w-56 rounded-lg py-1 z-50 flex flex-col"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.18))',
          }}
        >
          <div className="px-3 py-2 flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
              {user?.name ?? 'Signed in'}
            </span>
            {user?.email && (
              <span className="text-xs truncate" style={{ color: 'var(--fg-subtle)' }}>
                {user.email}
              </span>
            )}
          </div>
          <div className="h-px my-1" style={{ background: 'var(--border-muted)' }} />
          <Link
            to={'/me/account' as never}
            onClick={() => { setOpen(false); }}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm transition-colors"
            style={{ color: 'var(--fg-default)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Settings className="w-3.5 h-3.5" />
            Account settings
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
            style={{ color: 'var(--intent-danger-fg)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function initialsOf(label: string): string {
  const parts = label.trim().split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
