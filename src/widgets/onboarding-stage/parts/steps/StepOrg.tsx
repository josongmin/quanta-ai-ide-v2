import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2, KeyRound, Check, Loader2, X, Upload, AlertTriangle, Sparkles,
} from 'lucide-react';
import { Field } from '@widgets/auth-stage';
import { useAvailability } from '../../lib/availability';
import type { Industry, CompanySize, WizardData } from '../wizard';

type Props = {
  value: WizardData['org'];
  onChange: (v: WizardData['org']) => void;
};

const INDUSTRIES: { id: Industry; label: string }[] = [
  { id: 'software',      label: 'Software & SaaS' },
  { id: 'finance',       label: 'Finance & FinTech' },
  { id: 'healthcare',    label: 'Healthcare & BioTech' },
  { id: 'retail',        label: 'Retail & E-commerce' },
  { id: 'media',         label: 'Media & Gaming' },
  { id: 'gov-edu',       label: 'Government & Education' },
  { id: 'manufacturing', label: 'Manufacturing & Logistics' },
  { id: 'other',         label: 'Other' },
];

const SIZES: { id: CompanySize; label: string; sub: string }[] = [
  { id: '1-4',     label: '1–4',     sub: 'Just starting' },
  { id: '5-19',    label: '5–19',    sub: 'Small team' },
  { id: '20-99',   label: '20–99',   sub: 'Growing' },
  { id: '100-499', label: '100–499', sub: 'Mid-size' },
  { id: '500+',    label: '500+',    sub: 'Enterprise' },
];

export function StepOrg({ value, onChange }: Props) {
  // Auto-derive slug from name (live), unless touched.
  const [slugTouched, setSlugTouched] = useState(false);
  useEffect(() => {
    if (slugTouched || value.mode !== 'create') return;
    const guess = value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
    if (guess && guess !== value.slug) onChange({ ...value, slug: guess });
  }, [value.name, slugTouched, value, onChange]);

  return (
    <div className="flex flex-col gap-6">
      <ModeToggle mode={value.mode} onChange={(mode) => { onChange({ ...value, mode }); }} />

      {value.mode === 'create' ? (
        <CreateOrg
          value={value}
          onChange={onChange}
          onSlugTouch={() => { setSlugTouched(true); }}
        />
      ) : (
        <JoinOrg value={value} onChange={onChange} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Mode toggle

function ModeToggle({
  mode, onChange,
}: { mode: 'create' | 'join'; onChange: (m: 'create' | 'join') => void }) {
  const opts: { id: 'create' | 'join'; title: string; sub: string; icon: React.ReactNode }[] = [
    { id: 'create', title: 'Create new',     sub: "I'm starting fresh.",        icon: <Building2 className="w-4 h-4" /> },
    { id: 'join',   title: 'Join existing',  sub: 'I have an invite code.',     icon: <KeyRound  className="w-4 h-4" /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-px rounded-md overflow-hidden"
      style={{ background: 'var(--border-muted)' }}
    >
      {opts.map((o) => {
        const active = mode === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => { onChange(o.id); }}
            className="flex flex-col items-start gap-1 p-4 transition-colors text-left"
            style={{ background: active ? 'var(--bg-active)' : 'var(--bg-canvas)' }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-canvas)'; }}
          >
            <div className="flex items-center gap-2">
              <span style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-muted)' }}>
                {o.icon}
              </span>
              <span
                className="text-[12px] font-semibold"
                style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-default)' }}
              >
                {o.title}
              </span>
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full onb-tick"
                  style={{ background: 'var(--brand-vivid)' }}
                  aria-hidden
                />
              )}
            </div>
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
              {o.sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Create org branch

function CreateOrg({
  value, onChange, onSlugTouch,
}: Props & { onSlugTouch: () => void }) {
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

// ─────────────────────────────────────────────────────────────────────────
// Join org branch

function JoinOrg({ value, onChange }: Props) {
  const codeCheck = useAvailability(value.inviteCode, 'invite-code');

  return (
    <div className="flex flex-col gap-4 onb-stagger">
      <InviteCodeField
        value={value.inviteCode}
        onChange={(c) => { onChange({ ...value, inviteCode: c }); }}
        check={codeCheck}
      />

      {codeCheck.state === 'available' && <RecognizedOrg code={value.inviteCode} />}

      <p className="text-[11px] leading-snug" style={{ color: 'var(--fg-subtle)' }}>
        Don&apos;t have a code? Ask an admin in your org. Codes look like{' '}
        <span className="font-mono">XXXXX-XXXX-XXXX</span> and are case-insensitive.{' '}
        <span style={{ color: 'var(--fg-default)' }}>
          Demo: try <span className="font-mono">ACME-7HQF-TEAM</span>.
        </span>
      </p>
    </div>
  );
}

function RecognizedOrg({ code }: { code: string }) {
  const meta =
    code.startsWith('ACME')    ? { name: 'ACME, Inc.',          plan: 'Team',     members: 18 }
    : code.startsWith('GLOBEX') ? { name: 'Globex Industries',  plan: 'Business', members: 47 }
    : code.startsWith('INITECH')? { name: 'Initech',            plan: 'Free',     members: 4  }
    : { name: 'Unknown', plan: '—', members: 0 };

  return (
    <div
      className="flex items-start gap-3 px-3 py-3 rounded-md onb-stagger"
      style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-vivid)' }}
    >
      <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--brand-fg)' }} />
      <div className="flex flex-col gap-0.5 text-[11px] leading-snug">
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          You&apos;ll join {meta.name}
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          Plan: {meta.plan} · {meta.members} members · You&apos;ll be added as Member by default
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Logo upload — circle, drag/drop, fallback initials

function LogoUpload({ value, onChange }: Props) {
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
      <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
        Logo
      </span>
      <button
        type="button"
        onClick={() => { inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); accept(e.dataTransfer.files[0]); }}
        className="relative w-16 h-16 rounded-md overflow-hidden flex items-center justify-center text-[16px] font-bold tracking-tight transition-colors"
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
          className="text-[10px] inline-flex items-center gap-1 onb-stagger self-start"
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

// ─────────────────────────────────────────────────────────────────────────
// Slug field with availability indicator

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
        className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between"
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
          className="flex-1 bg-transparent outline-none px-3 text-[12px] tabular-nums"
          style={{ color: 'var(--fg-strong)' }}
        />
        <span className="text-[11px] font-mono" style={{ color: 'var(--fg-subtle)' }}>
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
      className="flex items-center gap-2 px-3 py-2 rounded-md font-mono text-[12px] tabular-nums onb-stagger"
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

// ─────────────────────────────────────────────────────────────────────────
// Invite code field

function InviteCodeField({
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
        <span>Invite code</span>
        <span
          style={{
            color: check.state === 'available' ? 'var(--intent-success-fg)'
              : check.state === 'taken' || check.state === 'invalid' ? 'var(--intent-danger-fg)'
              : 'var(--fg-muted)',
          }}
        >
          {check.message}
        </span>
      </span>
      <div
        className="flex items-center h-10 rounded-md transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          border: `1px solid ${
            check.state === 'taken' || check.state === 'invalid' ? 'var(--intent-danger-fg)'
            : check.state === 'available' ? 'var(--intent-success-fg)'
            : 'var(--border-default)'
          }`,
        }}
      >
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32)); }}
          placeholder="ACME-7HQF-TEAM"
          required
          autoFocus
          className="flex-1 bg-transparent outline-none px-3 text-[15px] font-mono tabular-nums tracking-wider"
          style={{ color: 'var(--fg-strong)' }}
        />
        <div className="pr-3">
          {check.state === 'checking' && <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fg-muted)' }} />}
          {check.state === 'available' && <Check className="w-4 h-4 onb-tick" style={{ color: 'var(--intent-success-fg)' }} />}
          {(check.state === 'taken' || check.state === 'invalid') && <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />}
        </div>
      </div>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Industry grid + size row

function IndustryGrid({
  value, onChange,
}: { value: Industry | ''; onChange: (v: Industry) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend
        className="text-[10px] uppercase tracking-[0.14em] font-medium pb-1"
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
              className="h-8 rounded-md text-[11px] font-medium transition-colors"
              style={{
                background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                border: `1px solid ${active ? 'var(--brand-vivid)' : 'var(--border-muted)'}`,
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
        className="text-[10px] uppercase tracking-[0.14em] font-medium pb-1"
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
                border: `1px solid ${active ? 'var(--brand-vivid)' : 'var(--border-muted)'}`,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--bg-surface-muted)';
              }}
            >
              <span
                className="text-[12px] font-semibold tabular-nums"
                style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-default)' }}
              >
                {s.label}
              </span>
              <span className="text-[9px]" style={{ color: 'var(--fg-subtle)' }}>
                {s.sub}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
