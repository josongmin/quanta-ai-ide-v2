import { Check, Star } from 'lucide-react';
import { ITEM_ICONS, tintFor, type Item } from './types';

export function ListItem({
  item, active, bulkOn, onSelect, onToggleBulk, onStar,
}: {
  item: Item;
  active: boolean;
  bulkOn: boolean;
  onSelect: () => void;
  onToggleBulk: () => void;
  onStar: () => void;
}) {
  const Icon = ITEM_ICONS[item.type];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors"
      style={{
        background: active ? 'var(--bg-active)' : 'transparent',
        borderTop: '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Bulk select checkbox — hidden until row hover or selected */}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onToggleBulk(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggleBulk(); } }}
        className="w-4 h-4 rounded shrink-0 mt-0.5 inline-flex items-center justify-center transition-all"
        style={{
          background: bulkOn ? 'var(--fg-accent)' : 'transparent',
          border: `1.5px solid ${bulkOn ? 'var(--fg-accent)' : 'var(--border-strong)'}`,
          opacity: bulkOn || active ? 1 : 0,
        }}
      >
        {bulkOn && <Check className="w-2.5 h-2.5" style={{ color: 'var(--bg-canvas)' }} />}
      </span>

      <Icon
        className="w-3.5 h-3.5 shrink-0 mt-0.5"
        style={{ color: tintFor(item.type) }}
      />

      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        <div className="flex items-center gap-1.5">
          {item.status === 'unread' && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: 'var(--fg-accent)' }}
              aria-label="Unread"
            />
          )}
          <span
            className={`text-[11px] truncate ${item.status === 'unread' ? 'font-semibold' : ''}`}
            style={{ color: 'var(--fg-strong)' }}
          >
            {item.title}
          </span>
        </div>
        <span className="text-[10px] truncate" style={{ color: 'var(--fg-muted)' }}>
          {item.preview}
        </span>
        <div className="flex items-center gap-2 text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
          <span>{item.who}</span>
          <span>·</span>
          <span>{item.where}</span>
          <span>·</span>
          <span>{item.at}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onStar(); }}
        className="p-1 rounded transition-colors shrink-0"
        style={{ color: item.starred ? 'var(--intent-warn-fg)' : 'var(--fg-subtle)' }}
        aria-label={item.starred ? 'Unstar' : 'Star'}
      >
        <Star className="w-3 h-3" fill={item.starred ? 'currentColor' : 'none'} />
      </button>
    </button>
  );
}
