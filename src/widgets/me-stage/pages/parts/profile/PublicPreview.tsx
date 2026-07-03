import { Globe, Eye } from 'lucide-react';
import { GithubIcon, TwitterIcon, LinkedinIcon } from '@shared/ui/brand-icons';
import type { ProfileData } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Public preview — what other people see

export function PublicPreview({ data }: { data: ProfileData }) {
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
        className="text-xs uppercase tracking-eyebrow font-semibold mb-3 inline-flex items-center gap-1.5"
        style={{ color: 'var(--fg-accent)' }}
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
            background: data.avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--fg-accent), var(--fg-link))',
            color: 'var(--bg-canvas)',
          }}
        >
          {data.avatarUrl
            ? <img src={data.avatarUrl} alt={`${data.name || 'Profile'} avatar`} className="w-full h-full object-cover" />
            : initials}
        </div>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              {data.name || 'Unnamed'}
            </span>
            {data.pronouns && (
              <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
                ({data.pronouns})
              </span>
            )}
          </div>
          <span className="text-base font-mono" style={{ color: 'var(--fg-muted)' }}>
            @{data.handle || 'me'}
            {data.jobTitle && <span className="font-sans"> · {data.jobTitle}</span>}
          </span>
          {data.location && (
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
              {data.location}
            </span>
          )}
          {data.bio && (
            <p className="text-base mt-1.5 leading-snug" style={{ color: 'var(--fg-default)' }}>
              {data.bio}
            </p>
          )}
          {(data.social.github || data.social.twitter || data.social.linkedin || data.social.website) && (
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm" style={{ color: 'var(--fg-link)' }}>
              {data.social.github   && <button type="button" className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'inherit', font: 'inherit' }}><GithubIcon   className="w-3 h-3" />{data.social.github}</button>}
              {data.social.twitter  && <button type="button" className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'inherit', font: 'inherit' }}><TwitterIcon  className="w-3 h-3" />{data.social.twitter}</button>}
              {data.social.linkedin && <button type="button" className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'inherit', font: 'inherit' }}><LinkedinIcon className="w-3 h-3" />{data.social.linkedin}</button>}
              {data.social.website  && <button type="button" className="inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'inherit', font: 'inherit' }}><Globe    className="w-3 h-3" />{data.social.website}</button>}
            </div>
          )}
          {data.showEmail && data.publicProfile && (
            <span className="text-sm font-mono mt-1" style={{ color: 'var(--fg-muted)' }}>
              sora@acme.com
            </span>
          )}
        </div>
      </div>
      {!data.publicProfile && (
        <div
          className="mt-3 px-3 py-2 rounded-md text-sm"
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
