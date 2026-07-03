import { useMemo, useRef } from 'react';
import { Check, Loader2, X, Upload } from 'lucide-react';
import { Field } from '@widgets/auth-stage';
import { useAvailability } from '../../../lib/availability';
import type { OrgStepProps } from './types';
import { INDUSTRIES, SIZES } from './data';
import type { Industry, CompanySize } from '../../wizard';

// Create org branch.
export function CreateOrg({
  value, onChange, onSlugTouch,
}: OrgStepProps & { onSlugTouch: () => void }) {
  const slugCheck = useAvailability(value.slug, 'slug');

  return (
    <div className="flex flex-col gap-5 onb-stagger">
      <div className="grid grid-cols-[80px_1fr] gap-4 items-start">
        <LogoUpload value={value} onChange={onChange} />
        <div className="flex flex-col gap-3 pt-1">
          <Field
            label="Organization name"
            value={value.name}
            onChange={(e) => { onChange({ ...value, name: e.target.value }); }}
            placeholder="ACME, Inc."
            required
          />
          <SlugField
            value={value.slug}
            check={slugCheck}
            onChange={(s) => { onSlugTouch(); onChange({ ...value, slug: s }); }}
          />
        </div>
      </div>

      <UrlPreview slug={value.slug || 'acme'} state={slugCheck.state} />

      <IndustryGrid
        value={value.industry}
        onChange={(industry) => { onChange({ ...value, industry }); }}
      />

      <SizeRow
        value={value.size}
        onChange={(size) => { onChange({ ...value, size }); }}
      />
    </div>
  );
}

// Logo upload — circle, drag/drop, fallback initials.
function LogoUpload({ value, onChange }: OrgStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initials = useMemo(() => {
    const parts = value.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'AC';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [value.name]);

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1024 * 1024) return;
    if (value.logoUrl) URL.revokeObjectURL(value.logoUrl);
    onChange({ ...value, logoUrl: URL.createObjectURL(file) });
  };

  const remove = () => {
    if (value.logoUrl) URL.revokeObjectURL(value.logoUrl);
    onChange({ ...value, logoUrl: null });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
        Logo
      </span>
      <button
        type="button"
        onClick={() => { inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); accept(e.dataTransfer.files[0]); }}
        className="relative w-16 h-16 rounded-md overflow-hidden flex items-center justify-center text-xl font-bold tracking-tight transition-colors"
        style={{
          background: value.logoUrl ? 'transparent' : 'var(--fg-strong)',
          color: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
        aria-label="Upload organization logo"
      >
        {value.logoUrl
          ? <img src={value.logoUrl} alt={`${value.name || 'Organization'} logo`} className="w-full h-full object-cover" />
          : <span className="onb-stagger" key={initials}>{initials}</span>}
        <span
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <Upload className="w-4 h-4" style={{ color: 'white' }} />
        </span>
      </button>
      {value.logoUrl && (
        <button
          type="button"
          onClick={remove}
          className="text-xs inline-flex items-center gap-1 onb-stagger self-start"
          style={{ color: 'var(--fg-muted)' }}
        >
          <X className="w-2.5 h-2.5" />
          Remove
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

// Slug field with availability indicator.
function SlugField({
  value, onChange, check,
}: {
  value: string;
  onChange: (v: string) => void;
  check: ReturnType<typeof useAvailability>;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-xs uppercase tracking-eyebrow font-medium flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>URL slug</span>
        <span
          style={{
            color: check.state === 'available' ? 'var(--intent-success-fg)'
              : check.state === 'taken' || check.state === 'reserved' || check.state === 'invalid' ? 'var(--intent-danger-fg)'
              : 'var(--fg-muted)',
          }}
        >
          {check.message}
        </span>
      </span>
      <div
        className="flex items-center h-9 rounded-md transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          border: `1px solid ${
            check.state === 'taken' || check.state === 'reserved' || check.state === 'invalid' ? 'var(--intent-danger-fg)'
            : check.state === 'available' ? 'var(--intent-success-fg)'
            : 'var(--border-default)'
          }`,
        }}
      >
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32)); }}
          placeholder="acme"
          required
          className="flex-1 bg-transparent outline-none px-3 text-base tabular-nums"
          style={{ color: 'var(--fg-strong)' }}
        />
        <span className="text-sm font-mono" style={{ color: 'var(--fg-subtle)' }}>
          .se-field.app
        </span>
        <div className="px-2.5">
          {check.state === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--fg-muted)' }} />}
          {check.state === 'available' && <Check className="w-3.5 h-3.5 onb-tick" style={{ color: 'var(--intent-success-fg)' }} />}
          {(check.state === 'taken' || check.state === 'reserved' || check.state === 'invalid') && (
            <X className="w-3.5 h-3.5" style={{ color: 'var(--intent-danger-fg)' }} />
          )}
        </div>
      </div>
    </label>
  );
}

function UrlPreview({ slug, state }: { slug: string; state: ReturnType<typeof useAvailability>['state'] }) {
  return (
    <div
      key={slug}
      className="flex items-center gap-2 px-3 py-2 rounded-md font-mono text-base tabular-nums onb-stagger"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
        color: 'var(--fg-muted)',
      }}
    >
      <span style={{ color: 'var(--fg-subtle)' }}>https://</span>
      <span
        style={{
          color: state === 'taken' || state === 'reserved' ? 'var(--intent-danger-fg)' : 'var(--fg-strong)',
          textDecoration: state === 'taken' || state === 'reserved' ? 'line-through' : 'none',
        }}
      >
        {slug}
      </span>
      <span style={{ color: 'var(--fg-subtle)' }}>.se-field.app</span>
    </div>
  );
}

function IndustryGrid({
  value, onChange,
}: { value: Industry | ''; onChange: (v: Industry) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend
        className="text-xs uppercase tracking-eyebrow font-medium pb-1"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Industry
      </legend>
      <div className="grid grid-cols-4 gap-1.5">
        {INDUSTRIES.map((ind) => {
          const active = value === ind.id;
          return (
            <button
              key={ind.id}
              type="button"
              onClick={() => { onChange(ind.id); }}
              className="h-8 rounded-md text-sm font-medium transition-colors"
              style={{
                background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--bg-surface-muted)';
              }}
            >
              {ind.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SizeRow({
  value, onChange,
}: { value: CompanySize | ''; onChange: (v: CompanySize) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend
        className="text-xs uppercase tracking-eyebrow font-medium pb-1"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Team size
      </legend>
      <div className="grid grid-cols-5 gap-1.5">
        {SIZES.map((s) => {
          const active = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => { onChange(s.id); }}
              className="flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-md text-left transition-colors"
              style={{
                background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--bg-surface-muted)';
              }}
            >
              <span
                className="text-base font-semibold tabular-nums"
                style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-default)' }}
              >
                {s.label}
              </span>
              <span className="text-2xs" style={{ color: 'var(--fg-subtle)' }}>
                {s.sub}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
