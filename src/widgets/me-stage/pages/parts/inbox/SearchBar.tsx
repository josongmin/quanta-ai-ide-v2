import { Search } from 'lucide-react';

export function SearchBar({ q, onChange }: { q: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center gap-2 h-9 px-3"
      style={{ borderBottom: '1px solid var(--border-muted)' }}
    >
      <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
      <input
        value={q}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder="Search inbox…"
        className="flex-1 bg-transparent outline-none text-base"
        style={{ color: 'var(--fg-strong)' }}
      />
    </div>
  );
}
