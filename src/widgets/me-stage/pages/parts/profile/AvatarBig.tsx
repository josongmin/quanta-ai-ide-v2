import { useMemo, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import type { ProfileData } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Avatar — drag/drop + initials fallback (matches the onboarding pattern but
// scaled for settings).

export function AvatarBig({ data, setDraft }: { data: ProfileData; setDraft: (v: ProfileData) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initials = useMemo(() => {
    const parts = data.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'SK';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [data.name]);

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) return;
    if (data.avatarUrl) URL.revokeObjectURL(data.avatarUrl);
    setDraft({ ...data, avatarUrl: URL.createObjectURL(file) });
  };
  const remove = () => {
    if (data.avatarUrl) URL.revokeObjectURL(data.avatarUrl);
    setDraft({ ...data, avatarUrl: null });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); accept(e.dataTransfer.files[0]); }}
        className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold tracking-tight transition-colors"
        style={{
          background: data.avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--fg-accent), var(--fg-link))',
          color: 'var(--bg-canvas)',
        }}
        aria-label="Upload avatar"
      >
        {data.avatarUrl
          ? <img src={data.avatarUrl} alt={`${data.name || 'Your'} avatar`} className="w-full h-full object-cover" />
          : initials}
        <span
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <Camera className="w-5 h-5" style={{ color: 'white' }} />
        </span>
      </button>
      {data.avatarUrl && (
        <button
          type="button"
          onClick={remove}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full inline-flex items-center justify-center"
          style={{ background: 'var(--intent-danger-fg)', color: 'var(--bg-canvas)' }}
          aria-label="Remove photo"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}
