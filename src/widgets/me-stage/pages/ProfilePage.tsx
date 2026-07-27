import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('me');
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <MeShell
      title={t('profile.title')}
      subtitle={t('profile.subtitle')}
      topRight={
        <Button
          variant="secondary"
          size="md"
          leading={previewOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          onClick={() => { setPreviewOpen((v) => !v); }}
        >
          {previewOpen ? t('profile.hidePreview') : t('profile.showPreview')}
        </Button>
      }
    >
      {previewOpen && <PublicPreview data={draft} />}

      <Section title={t('profile.photo.title')} hint={t('profile.photo.hint')}>
        <div
          className="flex items-start justify-between gap-6 py-3"
          style={{ borderTop: '1px solid var(--border-muted)' }}
        >
          <div className="flex items-center gap-4">
            <AvatarBig data={draft} setDraft={setDraft} />
            <div className="flex flex-col gap-1.5">
              <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>
                {draft.avatarUrl ? t('profile.photo.custom') : t('profile.photo.generated')}
              </span>
              <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
                {draft.avatarUrl
                  ? t('profile.photo.customSub')
                  : t('profile.photo.generatedSub')}
              </span>
            </div>
          </div>
        </div>
      </Section>

      <Section title={t('profile.identity.title')} hint={t('profile.identity.hint')}>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={t('profile.identity.fullName')}
            value={draft.name}
            onChange={(e) => { setDraft({ ...draft, name: e.target.value }); }}
            placeholder="Sora Kim"
          />
          <Field
            label={t('profile.identity.pronouns')}
            value={draft.pronouns}
            onChange={(e) => { setDraft({ ...draft, pronouns: e.target.value }); }}
            placeholder="she/her"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={t('profile.identity.handle')}
            value={draft.handle}
            onChange={(e) => {
              setDraft({ ...draft, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32) });
            }}
            hint={`@${draft.handle || 'handle'}`}
            placeholder="sora"
          />
          <Field
            label={t('profile.identity.jobTitle')}
            value={draft.jobTitle}
            onChange={(e) => { setDraft({ ...draft, jobTitle: e.target.value }); }}
            placeholder="Senior Software Engineer"
          />
        </div>
        <Field
          label={t('profile.identity.location')}
          value={draft.location}
          onChange={(e) => { setDraft({ ...draft, location: e.target.value }); }}
          placeholder="Seoul, South Korea"
        />
      </Section>

      <Section title={t('profile.bio.title')} hint={t('profile.bio.hint')}>
        <Textarea
          label={t('profile.bio.label')}
          value={draft.bio}
          onChange={(bio) => { setDraft({ ...draft, bio }); }}
          placeholder={t('profile.bio.placeholder')}
          maxLength={280}
          rows={3}
        />
      </Section>

      <Section title={t('profile.social.title')} hint={t('profile.social.hint')}>
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

      <Section title={t('profile.visibility.title')} hint={t('profile.visibility.hint')}>
        <Row
          label={t('profile.visibility.publicProfile')}
          sub={
            <>
              {t('profile.visibility.publicProfileSubPrefix')}
              <span className="font-mono">se-field.app/u/{draft.handle || 'me'}</span>.
            </>
          }
        >
          <Toggle
            checked={draft.publicProfile}
            onChange={(v) => { setDraft({ ...draft, publicProfile: v }); }}
            label={t('profile.visibility.publicProfile')}
          />
        </Row>
        <Row
          label={t('profile.visibility.showEmail')}
          sub={t('profile.visibility.showEmailSub')}
        >
          <Toggle
            checked={draft.showEmail}
            onChange={(v) => { setDraft({ ...draft, showEmail: v }); }}
            disabled={!draft.publicProfile}
            label={t('profile.visibility.toggleShowEmail')}
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
