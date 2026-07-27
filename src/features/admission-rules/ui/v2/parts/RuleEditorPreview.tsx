import { Activity, Eye, Clock } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { RepoData } from '@entities/repo';
import { SEVERITY_COLOR, type V2Theme } from './tokens';
import { V2Card } from './primitives';
import { timeAgo } from './retrospective';
import type { previewRule } from '@entities/admission';
import type { RuleVersion } from '../../../model/store';

type PreviewResult = ReturnType<typeof previewRule>;
type RetroImpact = { block: number; warn: number; pass: number; total: number };

// Live preview card: match count, confidence mix, first matched files.
export function LivePreviewCard({
  preview, repo, t,
}: {
  preview: PreviewResult;
  repo: RepoData;
  t: V2Theme;
}) {
  return (
    <V2Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-3 h-3" style={{ color: t.textMuted }} />
        <span
          className="text-xs font-bold uppercase tracking-eyebrow"
          style={{ color: t.textBody }}
        >
          live preview
        </span>
        <span
          className="ml-auto text-2xs font-mono"
          style={{ color: t.textSubtle }}
        >
          {preview.elapsedMs.toFixed(1)}ms · {preview.cost}
        </span>
      </div>
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="text-3xl font-black tabular-nums leading-none"
          style={{ color: t.textHi }}
        >
          {preview.matches.length}
        </span>
        <span
          className="text-xs font-bold uppercase tracking-eyebrow"
          style={{ color: t.textSubtle }}
        >
          matches{preview.truncated ? ' (capped)' : ''}
        </span>
      </div>
      <div
        className="text-xs font-mono mb-2"
        style={{ color: t.textSubtle }}
      >
        exact {preview.confidenceMix.exact} · over {preview.confidenceMix.overapprox} · unk {preview.confidenceMix.unknown}
      </div>
      {preview.matches.length === 0 ? (
        <div
          className="text-sm font-mono"
          style={{ color: t.textSubtle }}
        >
          No files match. Rule is ready to enable.
        </div>
      ) : (
        <ul className="space-y-px">
          {preview.matches.slice(0, 6).map((m) => {
            const f = repo.files[m.fileId];
            return (
              <li
                key={m.fileId}
                className="flex items-center gap-2 text-xs font-mono px-2 py-1 rounded-md"
                style={{ background: t.inset }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: t.textMuted }}
                />
                <span
                  className="truncate flex-1"
                  style={{ color: t.textBody }}
                >
                  {f ? `${f.folderPath}.${f.name}` : `#${m.fileId}`}
                </span>
                <span
                  className="truncate max-w-[10rem]"
                  style={{ color: t.textSubtle }}
                >
                  {m.evidenceText}
                </span>
              </li>
            );
          })}
          {preview.matches.length > 6 && (
            <li
              className="text-xs font-mono px-2"
              style={{ color: t.textSubtle }}
            >
              … {preview.matches.length - 6} more
            </li>
          )}
        </ul>
      )}
    </V2Card>
  );
}

// Retroactive impact card: block / warn / pass over the last-30d simulation.
export function RetroImpactCard({ retroImpact, t }: { retroImpact: RetroImpact; t: V2Theme }) {
  return (
    <V2Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-3 h-3" style={{ color: t.textMuted }} />
        <span
          className="text-xs font-bold uppercase tracking-eyebrow"
          style={{ color: t.textBody }}
        >
          if enabled (last 30d sim)
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <RetroBadge label="block" value={retroImpact.block} color={SEVERITY_COLOR.block} t={t} />
        <RetroBadge label="warn"  value={retroImpact.warn}  color={SEVERITY_COLOR.warn} t={t} />
        <RetroBadge label="pass"  value={retroImpact.pass}  color={t.ok} t={t} />
      </div>
    </V2Card>
  );
}

function RetroBadge({ label, value, color, t }: { label: string; value: number; color: string; t: V2Theme }) {
  return (
    <div
      className="px-3 py-2 rounded-md"
      style={{
        background: `${color}11`,
        border: `1px solid ${color}33`,
      }}
    >
      <div className="text-[20px] font-black tabular-nums leading-none" style={{ color }}>
        {value}
      </div>
      <div
        className="text-2xs font-bold uppercase tracking-eyebrow mt-1"
        style={{ color: t.textSubtle }}
      >
        {label}
      </div>
    </div>
  );
}

// Version history card: recent revisions with summary + relative time.
export function VersionHistoryCard({ versions, t }: { versions: RuleVersion[]; t: V2Theme }) {
  const { t: tA } = useTranslation('admission');
  return (
    <V2Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-3 h-3" style={{ color: t.textMuted }} />
        <span
          className="text-xs font-bold uppercase tracking-eyebrow"
          style={{ color: t.textBody }}
        >
          history
        </span>
        <span
          className="ml-auto text-2xs font-mono"
          style={{ color: t.textSubtle }}
        >
          {tA('gate.card.revisions', { count: versions.length })}
        </span>
      </div>
      <ul className="space-y-1.5">
        {versions.slice().reverse().slice(0, 6).map((v) => (
          <li key={v.version} className="flex items-center gap-2 text-xs font-mono">
            <span
              className="px-1.5 py-px rounded-md"
              style={{
                color: t.accent,
                background: `${t.accent}15`,
                border: `1px solid ${t.accent}33`,
              }}
            >
              v{v.version}
            </span>
            <span
              className="truncate flex-1"
              style={{ color: t.textMuted }}
            >
              {v.summary}
            </span>
            <span style={{ color: t.textFaint }}>{timeAgo(v.changedAt)}</span>
          </li>
        ))}
      </ul>
    </V2Card>
  );
}
