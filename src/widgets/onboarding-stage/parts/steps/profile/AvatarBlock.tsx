import { useMemo, useRef, useState } from 'react';
import { Camera, AlertTriangle, X, Upload } from 'lucide-react';
import type { WizardData } from '../../wizard';

type Props = {
  value: WizardData['profile'];
  onChange: (v: WizardData['profile']) => void;
};

// Avatar — drag/drop + click-to-upload, crop-circle preview, remove.
export function AvatarBlock({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => initialsOf(value.name), [value.name]);

  const accept = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Avatar must be an image (PNG, JPG, GIF, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image is over 2 MB. Compress and try again.');
      return;
    }
    if (value.avatarUrl) URL.revokeObjectURL(value.avatarUrl);
    const url = URL.createObjectURL(file);
    onChange({ ...value, avatarUrl: url, avatarBlob: file });
  };

  const remove = () => {
    if (value.avatarUrl) URL.revokeObjectURL(value.avatarUrl);
    onChange({ ...value, avatarUrl: null, avatarBlob: null });
    setError(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => { inputRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => { setDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) accept(file);
          }}
          className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold tracking-tight cursor-pointer transition-[outline-color]"
          style={{
            background: value.avatarUrl
              ? 'transparent'
              : 'linear-gradient(135deg, var(--fg-accent), var(--fg-link))',
            color: 'var(--bg-canvas)',
            outline: dragging ? '2px solid var(--fg-accent)' : '2px solid transparent',
            outlineOffset: '2px',
            font: 'inherit',
          }}
          aria-label="Upload avatar"
        >
          {value.avatarUrl ? (
            <img src={value.avatarUrl} alt={`${value.name || 'Your'} avatar`} className="w-full h-full object-cover" />
          ) : (
            <span key={initials} className="onb-stagger">{initials}</span>
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: value.avatarUrl
                ? 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.45) 100%)'
                : 'radial-gradient(120% 60% at 30% 0%, rgba(255,255,255,0.35), transparent 60%)',
            }}
            aria-hidden
          />
          {/* Hover overlay with camera icon */}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <Camera className="w-5 h-5" style={{ color: 'white' }} />
          </div>
        </button>

        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { inputRef.current?.click(); }}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-sm font-medium transition-colors"
              style={{
                background: 'var(--bg-surface-muted)',
                color: 'var(--fg-default)',
                border: '1px solid var(--border-default)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-muted)'; }}
            >
              <Upload className="w-3 h-3" />
              {value.avatarUrl ? 'Replace photo' : 'Upload photo'}
            </button>
            {value.avatarUrl && (
              <button
                type="button"
                onClick={remove}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-sm font-medium transition-colors onb-stagger"
                style={{ color: 'var(--fg-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            )}
          </div>
          <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
            JPG · PNG · GIF · WebP. Max 2 MB. Drop a file on the circle.
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) accept(f);
          e.target.value = '';
        }}
      />

      {error && (
        <div
          className="flex items-start gap-2 text-sm onb-stagger"
          style={{ color: 'var(--intent-danger-fg)' }}
          role="alert"
        >
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SK';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
