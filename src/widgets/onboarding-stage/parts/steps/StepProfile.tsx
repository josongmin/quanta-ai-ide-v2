import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Loader2, AlertTriangle, X, Upload, Globe } from 'lucide-react';
import { Field } from '@widgets/auth-stage';
import { useAvailability } from '../../lib/availability';
import {
  TIMEZONES, LOCALES, detectBrowserTimezone, detectBrowserLocale,
} from '../../lib/timezones';
import type { WizardData } from '../wizard';

type Props = {
  value: WizardData['profile'];
  onChange: (v: WizardData['profile']) => void;
};

export function StepProfile({ value, onChange }: Props) {
  // Auto-fill timezone + locale from browser the first time the step mounts,
  // unless the user has already touched them.
  const detectedTz = useMemo(() => detectBrowserTimezone(), []);
  const detectedLoc = useMemo(() => detectBrowserLocale(), []);
  const detectedRef = useRef(false);
  useEffect(() => {
    if (detectedRef.current) return;
    detectedRef.current = true;
    if (value.timezone === 'America/Los_Angeles' && detectedTz !== 'America/Los_Angeles') {
      onChange({ ...value, timezone: detectedTz, locale: detectedLoc });
    }
  }, [detectedTz, detectedLoc, value, onChange]);

  // Auto-derive handle from name; `handleTouched` stops the autofill once the
  // user starts typing in the handle field directly.
  const [handleTouched, setHandleTouched] = useState(false);
  useEffect(() => {
    if (handleTouched) return;
    const guess = value.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
    if (guess && guess !== value.handle) {
      onChange({ ...value, handle: guess });
    }
  }, [value.name, handleTouched, value, onChange]);

  const handleCheck = useAvailability(value.handle, 'handle');

  return (
    <div className="flex flex-col gap-6">
      <AvatarBlock value={value} onChange={onChange} />

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Full name"
          value={value.name}
          onChange={(e) => { onChange({ ...value, name: e.target.value }); }}
          placeholder="Sora Kim"
          autoFocus
          required
        />
        <HandleField
          value={value.handle}
          onChange={(h) => { setHandleTouched(true); onChange({ ...value, handle: h }); }}
          check={handleCheck}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TimezoneSelect
          value={value.timezone}
          onChange={(tz) => { onChange({ ...value, timezone: tz }); }}
          detected={detectedTz}
        />
        <LocaleSelect
          value={value.locale}
          onChange={(l) => { onChange({ ...value, locale: l }); }}
        />
      </div>

      <DetectionBanner detectedTz={detectedTz} detectedLoc={detectedLoc} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Avatar — drag/drop + click-to-upload, crop-circle preview, remove.

function AvatarBlock({ value, onChange }: Props) {
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
          className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-[22px] font-bold tracking-tight cursor-pointer transition-[outline-color]"
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
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
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
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium transition-colors onb-stagger"
                style={{ color: 'var(--fg-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            )}
          </div>
          <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
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
          className="flex items-start gap-2 text-[11px] onb-stagger"
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

// ─────────────────────────────────────────────────────────────────────────
// Handle field — wraps Field with availability indicator inline.

function HandleField({
  value, onChange, check,
}: {
  value: string;
  onChange: (v: string) => void;
  check: ReturnType<typeof useAvailability>;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>Handle</span>
        <span style={{ color: messageColor(check.state) }}>
          {check.message}
        </span>
      </span>
      <div
        className="flex items-center h-9 rounded-md transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          border: `1px solid ${
            check.state === 'taken' || check.state === 'invalid' ? 'var(--intent-danger-fg)'
            : check.state === 'available' ? 'var(--intent-success-fg)'
            : 'var(--border-default)'
          }`,
        }}
      >
        <span className="pl-3 text-[12px]" style={{ color: 'var(--fg-subtle)' }}>@</span>
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32)); }}
          placeholder="sora"
          required
          className="flex-1 bg-transparent outline-none px-1 text-[12px] tabular-nums"
          style={{ color: 'var(--fg-strong)' }}
        />
        <div className="pr-2.5">
          {check.state === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--fg-muted)' }} />}
          {check.state === 'available' && <Check className="w-3.5 h-3.5 onb-tick" style={{ color: 'var(--intent-success-fg)' }} />}
          {(check.state === 'taken' || check.state === 'invalid') && <X className="w-3.5 h-3.5" style={{ color: 'var(--intent-danger-fg)' }} />}
        </div>
      </div>
    </label>
  );
}

function messageColor(state: ReturnType<typeof useAvailability>['state']) {
  if (state === 'available') return 'var(--intent-success-fg)';
  if (state === 'taken' || state === 'invalid') return 'var(--intent-danger-fg)';
  if (state === 'checking') return 'var(--fg-muted)';
  return 'var(--fg-subtle)';
}

// ─────────────────────────────────────────────────────────────────────────
// Timezone & locale selects — searchable native selects with "detected" hint.

function TimezoneSelect({
  value, onChange, detected,
}: { value: string; onChange: (v: string) => void; detected: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}>
        <span>Time zone</span>
        {value === detected && (
          <span className="lowercase tracking-normal" style={{ color: 'var(--fg-accent)' }}>
            detected
          </span>
        )}
      </span>
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        className="h-9 rounded-md px-3 text-[12px] outline-none"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      >
        {TIMEZONES.map((tz) => (
          <option key={tz.id} value={tz.id}>
            {tz.label} · {tz.offset}
          </option>
        ))}
      </select>
    </label>
  );
}

function LocaleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
        Language
      </span>
      <div className="relative">
        <Globe
          className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--fg-subtle)' }}
        />
        <select
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          className="w-full h-9 rounded-md pl-7 pr-3 text-[12px] outline-none appearance-none"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        >
          {LOCALES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label} · {l.native}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function DetectionBanner({ detectedTz, detectedLoc }: { detectedTz: string; detectedLoc: string }) {
  return (
    <div
      className="flex items-start gap-2 text-[10px] leading-snug px-2.5 py-2 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px dashed var(--border-default)',
        color: 'var(--fg-subtle)',
      }}
    >
      <Globe className="w-3 h-3 mt-0.5 shrink-0" />
      <span>
        Detected from your browser:{' '}
        <span className="font-mono" style={{ color: 'var(--fg-default)' }}>{detectedTz}</span>
        {' '}·{' '}
        <span className="font-mono" style={{ color: 'var(--fg-default)' }}>{detectedLoc}</span>.
        These are pre-filled but you can change them.
      </span>
    </div>
  );
}
