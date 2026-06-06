import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { DoneProps } from './types';

// CTA row — single dominant button + secondary action.
export function CtaRow({ data }: DoneProps) {
  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
        {data.invite.entries.length > 0 && data.invite.sent
          ? 'Teammates were notified by email.'
          : 'You can invite teammates any time from Organization → Members.'}
      </span>
      <Link
        to={'/intelligence'}
        className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-md text-[12px] font-semibold transition-opacity hover:opacity-90"
        style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
      >
        Open the dot field
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
