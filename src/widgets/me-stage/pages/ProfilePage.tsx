import { useState } from 'react';
import { Globe, Eye, EyeOff } from 'lucide-react';
import { GithubIcon, TwitterIcon, LinkedinIcon } from '@shared/ui/brand-icons';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Field, Textarea, Toggle, Button, SaveBar, Divider } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';
import { INITIAL } from './parts/profile/types';
import { AvatarBig } from './parts/profile/AvatarBig';
import { SocialField } from './parts/profile/SocialField';
import { PublicPreview } from './parts/profile/PublicPreview';

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
              <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>
                {draft.avatarUrl ? 'Custom photo' : 'Generated avatar'}
              </span>
              <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
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
