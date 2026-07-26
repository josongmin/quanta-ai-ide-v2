import { FolderClosed } from 'lucide-react';
import { getSurfaceMeta } from '@shared/config/surfaces';
import { HERO_COPY } from './addTabData';

export function HeroTile({
  surfaceId,
  onPick,
}: {
  surfaceId: string;
  onPick: (surfaceId: string) => void;
}) {
  const meta = getSurfaceMeta(surfaceId);
  const copy = HERO_COPY[surfaceId] ?? { title: meta?.title ?? surfaceId, sub: '' };
  return (
    <button
      type="button"
      onClick={() => { onPick(surfaceId); }}
      className="text-left rounded-lg p-3 transition-colors hover:[background:var(--bg-hover)]"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="w-7 h-7 rounded-md inline-flex items-center justify-center mb-2.5"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-muted)',
          color: 'var(--fg-default)',
        }}
      >
        <FolderClosed className="w-3.5 h-3.5" />
      </div>
      <div
        className="text-base font-semibold mb-0.5"
        style={{ color: 'var(--fg-default)' }}
      >
        {copy.title}
      </div>
      <div
        className="text-xs leading-[1.4]"
        style={{ color: 'var(--fg-muted)' }}
      >
        {copy.sub}
      </div>
    </button>
  );
}
