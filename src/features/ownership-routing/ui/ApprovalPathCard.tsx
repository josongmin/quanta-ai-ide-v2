import type { CSSProperties } from 'react';
import type { ApprovalPath, ApprovalStep, Person } from '@entities/ownership';
import { EmptyHint, GlassCard, SectionHeader } from '@shared/ui';

export interface ApprovalPathCardProps {
  path: ApprovalPath | undefined;
  people: Person[];
}

function avatarStyle(person: Person | undefined, size: number): CSSProperties {
  if (!person) {
    return {
      width: size,
      height: size,
      background: 'var(--bg-surface-muted)',
      border: '1px solid var(--border-muted)',
      color: 'var(--fg-subtle)',
    };
  }
  const stale = !person.active;
  const sat = stale ? 14 : 58;
  const lightDark = stale ? 36 : 44;
  return {
    width: size,
    height: size,
    background: `hsl(${person.avatarHue} ${sat}% ${lightDark}% / ${stale ? 0.55 : 0.92})`,
    border: '1px solid var(--border-muted)',
    color: 'rgba(255,255,255,0.94)',
  };
}

function PersonAvatar({ person, size }: { person: Person | undefined; size: number }) {
  const initials = person?.initials ?? '??';
  const fontSize = Math.max(8, Math.round(size * 0.42));
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold tracking-[0.04em] shrink-0"
      style={{ ...avatarStyle(person, size), fontSize }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0 text-[11px] font-black tabular-nums"
      style={{
        width: 24,
        height: 24,
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-default)',
        border: '1px solid var(--border-default)',
      }}
      aria-hidden
    >
      {n}
    </span>
  );
}

function RequirementLabel({ required }: { required: boolean }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-[0.22em]"
      style={{
        background: 'var(--bg-surface-muted)',
        color: required ? 'var(--fg-default)' : 'var(--fg-subtle)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {required ? 'Required' : 'Optional'}
    </span>
  );
}

function StepRow({
  step,
  index,
  person,
  isLast,
}: {
  step: ApprovalStep;
  index: number;
  person: Person | undefined;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <StepNumber n={index + 1} />
        {!isLast && (
          <div
            className="w-px flex-1 mt-1"
            style={{ background: 'var(--border-muted)', minHeight: 24 }}
            aria-hidden
          />
        )}
      </div>

      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <PersonAvatar person={person} size={22} />
          <div className="flex flex-col min-w-0">
            <span
              className="text-[12px] font-bold leading-tight truncate"
              style={{ color: 'var(--fg-default)' }}
            >
              {person?.name ?? 'Unknown'}
            </span>
            <span
              className="text-[9px] font-mono uppercase tracking-[0.14em] truncate"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {person?.team ?? '—'}
            </span>
          </div>
          <div className="ml-auto shrink-0">
            <RequirementLabel required={step.required} />
          </div>
        </div>

        <div
          className="text-[9px] font-black uppercase tracking-[0.22em] mb-0.5"
          style={{ color: 'var(--fg-muted)' }}
        >
          {step.role}
        </div>
        <div
          className="text-[11px] leading-snug"
          style={{ color: 'var(--fg-muted)' }}
        >
          {step.reason}
        </div>
      </div>
    </div>
  );
}

export function ApprovalPathCard({ path, people }: ApprovalPathCardProps): JSX.Element {
  if (!path) {
    return (
      <GlassCard className="p-3 rounded-xl">
        <SectionHeader title="Approval path" />
        <EmptyHint text="No approval path available for this zone." />
      </GlassCard>
    );
  }

  const peopleById = new Map(people.map((p) => [p.id, p]));
  const approvers = path.steps.length;
  const badge = path.parallelizable ? 'PARALLEL' : 'SEQUENTIAL';

  return (
    <GlassCard className="p-3 rounded-xl">
      <SectionHeader title="Approval path" badge={badge} />

      <div className="flex items-stretch gap-3 mb-3">
        <div className="flex items-baseline gap-0.5">
          <span
            className="text-[26px] font-black leading-none tabular-nums tracking-tight font-mono"
            style={{ color: 'var(--fg-strong)' }}
          >
            ~{path.estimatedDurationHours}
          </span>
          <span
            className="text-[12px] font-bold leading-none"
            style={{ color: 'var(--fg-muted)' }}
          >
            h
          </span>
        </div>
        <span
          className="text-[10px] font-bold tabular-nums self-center"
          style={{ color: 'var(--fg-default)' }}
        >
          {approvers} approver{approvers === 1 ? '' : 's'}
        </span>
        <div
          className="ml-auto self-center px-2 py-1 rounded-md border flex items-center gap-1.5"
          style={
            path.parallelizable
              ? {
                  background: 'rgb(from var(--intent-success-vivid) r g b / 0.10)',
                  borderColor: 'rgb(from var(--intent-success-vivid) r g b / 0.32)',
                  color: 'var(--intent-success-fg)',
                }
              : {
                  background: 'rgb(from var(--intent-warn-vivid) r g b / 0.10)',
                  borderColor: 'rgb(from var(--intent-warn-vivid) r g b / 0.32)',
                  color: 'var(--intent-warn-fg)',
                }
          }
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: path.parallelizable
                ? 'var(--intent-success-vivid)'
                : 'var(--intent-warn-vivid)',
            }}
            aria-hidden
          />
          <span className="text-[9px] font-black uppercase tracking-[0.18em]">
            {path.parallelizable ? 'parallel · any order' : 'serial · must run in order'}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        {path.steps.map((step, i) => (
          <StepRow
            key={`${step.personId}-${i}`}
            step={step}
            index={i}
            person={peopleById.get(step.personId)}
            isLast={i === path.steps.length - 1}
          />
        ))}
      </div>

      {path.parallelizable && (
        <div
          className="mt-2 px-2.5 py-1.5 rounded-md text-[10px] leading-snug"
          style={{
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border-muted)',
          }}
        >
          Steps without explicit dependency can land in any order — sequence shown is recommended priority.
        </div>
      )}
    </GlassCard>
  );
}
