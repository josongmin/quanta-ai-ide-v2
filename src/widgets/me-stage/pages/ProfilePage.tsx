import { useMemo, useRef, useState } from 'react';
import {
  Camera, X, Globe, Eye, EyeOff,
} from 'lucide-react';
import { GithubIcon, TwitterIcon, LinkedinIcon } from '@shared/ui/brand-icons';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Field, Textarea, Toggle, Button, SaveBar, Divider } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';

type ProfileData = {
  name: string;
  handle: string;
  pronouns: string;
  bio: string;
  jobTitle: string;
  location: string;
  social: {
    github:   string;
    twitter:  string;
    linkedin: string;
    website:  string;
  };
  publicProfile: boolean;     // exposed on a public /u/{handle} page
  showEmail: boolean;
  avatarUrl: string | null;
};

const INITIAL: ProfileData = {
  name: 'Sora Kim',
  handle: 'sora',
  pronouns: 'she/her',
  bio: 'Frontend engineer working on dot-field intelligence. Coffee, k-pop, and very long type signatures.',
  jobTitle: 'Senior Software Engineer',
  location: 'Seoul, South Korea',
  social: {
    github:   'sora',
    twitter:  'sora',
    linkedin: 'sora-kim',
    website:  'sora.dev',
  },
  publicProfile: true,
  showEmail: false,
  avatarUrl: null,
};

export default function ProfilePage() {
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <MeShell
      title="Profile"
      subtitle="How you appear to teammates in mentions, reviews, and the dot field."
      topRight={
        <Button
          variant="secondary"
          size="md"
          leading={previewOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          onClick={() => { setPreviewOpen((v) => !v); }}
        >
          {previewOpen ? 'Hide preview' : 'Preview public profile'}
        </Button>
      }
    >
      {previewOpen && <PublicPreview data={draft} />}

      <Section title="Photo" hint="A square image works best. PNG, JPG, GIF, or WebP up to 2 MB.">
        <div
          className="flex items-start justify-between gap-6 py-3"
          style={{ borderTop: '1px solid var(--border-muted)' }}
        >
          <div className="flex items-center gap-4">
            <AvatarBig data={draft} setDraft={setDraft} />
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>
                {draft.avatarUrl ? 'Custom photo' : 'Generated avatar'}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                {draft.avatarUrl
                  ? 'Will be cropped to a circle in mentions and member lists.'
                  : 'Initials are derived from your name. Upload a photo to override.'}
              </span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Identity" hint="Your name and handle appear together throughout the product.">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Full name"
            value={draft.name}
            onChange={(e) => { setDraft({ ...draft, name: e.target.value }); }}
            placeholder="Sora Kim"
          />
          <Field
            label="Pronouns"
            value={draft.pronouns}
            onChange={(e) => { setDraft({ ...draft, pronouns: e.target.value }); }}
            placeholder="she/her"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Handle"
            value={draft.handle}
            onChange={(e) => {
              setDraft({ ...draft, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32) });
            }}
            hint={`@${draft.handle || 'handle'}`}
            placeholder="sora"
          />
          <Field
            label="Job title"
            value={draft.jobTitle}
            onChange={(e) => { setDraft({ ...draft, jobTitle: e.target.value }); }}
            placeholder="Senior Software Engineer"
          />
        </div>
        <Field
          label="Location"
          value={draft.location}
          onChange={(e) => { setDraft({ ...draft, location: e.target.value }); }}
          placeholder="Seoul, South Korea"
        />
      </Section>

      <Section title="Bio" hint="Up to 280 characters. Markdown supported.">
        <Textarea
          label="Short bio"
          value={draft.bio}
          onChange={(bio) => { setDraft({ ...draft, bio }); }}
          placeholder="A line or two about you, your role, and what you work on."
          maxLength={280}
          rows={3}
        />
      </Section>

      <Section title="Social links" hint="Shown on your public profile if enabled. Empty fields are hidden.">
        <SocialField
          icon={<GithubIcon className="w-3.5 h-3.5" />}
          prefix="github.com/"
          value={draft.social.github}
          onChange={(v) => { setDraft({ ...draft, social: { ...draft.social, github: v } }); }}
        />
        <SocialField
          icon={<TwitterIcon className="w-3.5 h-3.5" />}
          prefix="x.com/"
          value={draft.social.twitter}
          onChange={(v) => { setDraft({ ...draft, social: { ...draft.social, twitter: v } }); }}
        />
        <SocialField
          icon={<LinkedinIcon className="w-3.5 h-3.5" />}
          prefix="linkedin.com/in/"
          value={draft.social.linkedin}
          onChange={(v) => { setDraft({ ...draft, social: { ...draft.social, linkedin: v } }); }}
        />
        <SocialField
          icon={<Globe className="w-3.5 h-3.5" />}
          prefix="https://"
          value={draft.social.website}
          onChange={(v) => { setDraft({ ...draft, social: { ...draft.social, website: v } }); }}
        />
      </Section>

      <Section title="Visibility" hint="Control what your public-facing profile exposes.">
        <Row
          label="Public profile"
          sub={
            <>
              Anyone with the link can view your profile at{' '}
              <span className="font-mono">se-field.app/u/{draft.handle || 'me'}</span>.
            </>
          }
        >
          <Toggle
            checked={draft.publicProfile}
            onChange={(v) => { setDraft({ ...draft, publicProfile: v }); }}
            label="Public profile"
          />
        </Row>
        <Row
          label="Show email on public profile"
          sub="Anyone viewing your public profile can see your work email."
        >
          <Toggle
            checked={draft.showEmail}
            onChange={(v) => { setDraft({ ...draft, showEmail: v }); }}
            disabled={!draft.publicProfile}
            label="Show email"
          />
        </Row>
      </Section>

      <Divider />

      <SaveBar
        visible={true}
        dirty={dirty}
        savingState={savingState}
        onSave={save}
        onDiscard={discard}
      />
    </MeShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Avatar — drag/drop + initials fallback (matches the onboarding pattern but
// scaled for settings).

function AvatarBig({ data, setDraft }: { data: ProfileData; setDraft: (v: ProfileData) => void }) {
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
        className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-[24px] font-bold tracking-tight transition-colors"
        style={{
          background: data.avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--brand-vivid), var(--fg-link))',
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

// ─────────────────────────────────────────────────────────────────────────
// Social field — icon + prefix + input

function SocialField({
  icon, prefix, value, onChange,
}: { icon: React.ReactNode; prefix: string; value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center h-9 rounded-md transition-colors"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      <span className="px-3 flex items-center gap-2 border-r"
        style={{ borderColor: 'var(--border-muted)', color: 'var(--fg-muted)' }}
      >
        {icon}
        <span className="text-[12px] font-mono">{prefix}</span>
      </span>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder="username"
        className="flex-1 bg-transparent outline-none px-3 text-[12px] tabular-nums"
        style={{ color: 'var(--fg-strong)' }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Public preview — what other people see

function PublicPreview({ data }: { data: ProfileData }) {
  const initials = data.name.split(/\s+/).filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'SK';
  return (
    <div
      className="mb-6 p-5 rounded-md onb-stagger"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-3 inline-flex items-center gap-1.5"
        style={{ color: 'var(--brand-fg)' }}
      >
        <Eye className="w-3 h-3" />
        Public preview · how others see you
      </div>
      <div
        className="flex items-start gap-4 p-5 rounded-md"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-muted)' }}
      >
        <div
          className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-[20px] font-bold shrink-0"
          style={{
            background: data.avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--brand-vivid), var(--fg-link))',
            color: 'var(--bg-canvas)',
          }}
        >
          {data.avatarUrl
            ? <img src={data.avatarUrl} alt={`${data.name || 'Profile'} avatar`} className="w-full h-full object-cover" />
            : initials}
        </div>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              {data.name || 'Unnamed'}
            </span>
            {data.pronouns && (
              <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                ({data.pronouns})
              </span>
            )}
          </div>
          <span className="text-[12px] font-mono" style={{ color: 'var(--fg-muted)' }}>
            @{data.handle || 'me'}
            {data.jobTitle && <span className="font-sans"> · {data.jobTitle}</span>}
          </span>
          {data.location && (
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
              {data.location}
            </span>
          )}
          {data.bio && (
            <p className="text-[12px] mt-1.5 leading-snug" style={{ color: 'var(--fg-default)' }}>
              {data.bio}
            </p>
          )}
          {(data.social.github || data.social.twitter || data.social.linkedin || data.social.website) && (
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--fg-link)' }}>
              {data.social.github   && <button type="button" className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'inherit', font: 'inherit' }}><GithubIcon   className="w-3 h-3" />{data.social.github}</button>}
              {data.social.twitter  && <button type="button" className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'inherit', font: 'inherit' }}><TwitterIcon  className="w-3 h-3" />{data.social.twitter}</button>}
              {data.social.linkedin && <button type="button" className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'inherit', font: 'inherit' }}><LinkedinIcon className="w-3 h-3" />{data.social.linkedin}</button>}
              {data.social.website  && <button type="button" className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'inherit', font: 'inherit' }}><Globe    className="w-3 h-3" />{data.social.website}</button>}
            </div>
          )}
          {data.showEmail && data.publicProfile && (
            <span className="text-[11px] font-mono mt-1" style={{ color: 'var(--fg-muted)' }}>
              sora@acme.com
            </span>
          )}
        </div>
      </div>
      {!data.publicProfile && (
        <div
          className="mt-3 px-3 py-2 rounded-md text-[11px]"
          style={{
            background: 'var(--intent-warn-bg)',
            border: '1px solid var(--intent-warn-fg)',
            color: 'var(--fg-strong)',
          }}
        >
          Public profile is currently disabled. The preview above is what people would see if you turn it on.
        </div>
      )}
    </div>
  );
}
