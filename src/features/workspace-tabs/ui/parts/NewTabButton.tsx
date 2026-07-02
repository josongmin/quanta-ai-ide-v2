import { Plus } from 'lucide-react';

type NewTabButtonProps = {
  onClick: () => void;
};

export function NewTabButton({ onClick }: NewTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open new tab"
      title="New tab"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:[background:var(--bg-hover)]"
      style={{ color: 'var(--fg-subtle)', opacity: 0.82 }}
    >
      <Plus className="w-3.5 h-3.5" />
    </button>
  );
}
