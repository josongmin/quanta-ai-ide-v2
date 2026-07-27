import { FolderClosed } from 'lucide-react';

// Hero copy (title/sub) travels with the surface metadata SoT (HERO_SURFACES in
// @shared/config/surfaces); the tile renders whatever the caller passes.
export function HeroTile({
  surfaceId,
  title,
  sub,
  onPick,
}: {
  surfaceId: string;
  title: string;
  sub: string;
  onPick: (surfaceId: string) => void;
}) {
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
        {title}
      </div>
      <div
        className="text-xs leading-[1.4]"
        style={{ color: 'var(--fg-muted)' }}
      >
        {sub}
      </div>
    </button>
  );
}
