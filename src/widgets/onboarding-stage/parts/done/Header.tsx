import type { DoneProps } from './types';
import { firstName } from './data';

// Header — animated check + welcome message.
export function Header({ data }: DoneProps) {
  const first = firstName(data.profile.name);
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <SuccessGlyph />
      <div className="flex flex-col gap-1.5">
        <h1
          className="text-[28px] font-semibold tracking-tight leading-tight"
          style={{ color: 'var(--fg-strong)' }}
        >
          You&apos;re all set, {first}.
        </h1>
        <p className="text-[12px] leading-snug max-w-[440px]" style={{ color: 'var(--fg-muted)' }}>
          We&apos;re indexing <span className="font-mono">{data.workspace.repo || 'your repo'}</span> right now.
          You can jump in already — signals appear on the dot field as soon as the first parse pass finishes.
        </p>
      </div>
    </header>
  );
}

function SuccessGlyph() {
  return (
    <div
      className="relative w-16 h-16 rounded-full flex items-center justify-center"
      style={{
        background: 'var(--intent-success-bg)',
        border: '1px solid var(--intent-success-vivid)',
      }}
    >
      <span className="absolute inset-0 rounded-full onb-pulse-ring" aria-hidden />
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12 l5 5 l9 -10"
          stroke="var(--intent-success-fg)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="24"
          style={{ animation: 'onb-checkmark 600ms cubic-bezier(0.2,0.7,0.2,1) 200ms both' }}
        />
      </svg>
    </div>
  );
}
