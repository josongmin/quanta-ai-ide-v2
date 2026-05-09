import { useEffect, useState } from 'react';
import { Sparkles, X, RefreshCw, FileText, Bug, Code2, ChevronDown, ChevronRight } from 'lucide-react';
import { GlassCard, IconButton } from '@shared/ui';
import {
  FIXTURE_TARGETS,
  type ActionRecommendation,
  type InvestigationTarget,
  type QuestionType,
} from '@entities/investigation';
import { useInvestigation } from '../model/InvestigationContext';
import { AnswerView } from '../evidence/AnswerView';
import { EvidenceCard } from '../evidence/EvidenceCard';
import { GatheringIndicator } from '../evidence/GatheringIndicator';
import { useStack } from '@features/inspect-target';

const QUESTION_TABS: { value: QuestionType; label: string }[] = [
  { value: 'why_risky', label: 'Why risky?' },
  { value: 'blast_of_change', label: 'Blast of change?' },
  { value: 'incident_suspect', label: 'Suspect for incident?' },
];

const TARGET_KIND_ICON: Record<InvestigationTarget['kind'], React.ComponentType<{ className?: string }>> = {
  file: FileText,
  symbol: Code2,
  incident: Bug,
};

function TargetKindBadge({ kind }: { kind: InvestigationTarget['kind'] }) {
  const Icon = TARGET_KIND_ICON[kind];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.16em] border"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <Icon className="w-3 h-3" />
      {kind}
    </span>
  );
}

function QuestionTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:[background:var(--bg-hover)]"
      style={{
        background: active ? 'var(--bg-active)' : 'transparent',
        color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function FixtureRow({
  target,
  onClick,
}: {
  target: InvestigationTarget;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors hover:[background:var(--bg-hover)]"
      style={{ background: 'transparent', cursor: 'pointer' }}
    >
      <TargetKindBadge kind={target.kind} />
      <span className="flex-1 min-w-0">
        <span
          className="block truncate text-[11px] font-semibold"
          style={{ color: 'var(--fg-default)' }}
        >
          {target.label}
        </span>
        {target.subtitle && (
          <span
            className="block truncate text-[10px]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {target.subtitle}
          </span>
        )}
      </span>
    </button>
  );
}

function SkeletonBlock() {
  return (
    <div
      className="h-12 rounded-md border animate-pulse"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-muted)',
      }}
    />
  );
}

function EmptyState({ onPick }: { onPick: (target: InvestigationTarget) => void }) {
  return (
    <div className="flex flex-col items-stretch text-left gap-3 py-2">
      <div className="flex flex-col items-center text-center gap-2 py-4">
        <Sparkles
          className="w-7 h-7"
          style={{ color: 'var(--intent-success-vivid)' }}
        />
        <div>
          <div
            className="text-[12px] font-bold"
            style={{ color: 'var(--fg-default)' }}
          >
            No investigation in progress
          </div>
          <div
            className="text-[10px] mt-1"
            style={{ color: 'var(--fg-subtle)' }}
          >
            Pick a demo target below — files, symbols, or incidents.
          </div>
        </div>
      </div>
      <div>
        <div
          className="text-[10px] font-black uppercase tracking-[0.18em] mb-1 px-0.5"
          style={{ color: 'var(--fg-muted)' }}
        >
          Demo targets ({FIXTURE_TARGETS.length})
        </div>
        <div className="flex flex-col">
          {FIXTURE_TARGETS.map((t) => (
            <FixtureRow key={t.id} target={t} onClick={() => onPick(t)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AllEvidenceSection({
  evidence,
  pickedId,
  onPick,
}: {
  evidence: import('@entities/investigation').EvidenceItem[];
  pickedId: string | null;
  onPick: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  if (evidence.length === 0) return null;
  return (
    <div
      className="py-3"
      style={{ borderTop: '1px solid var(--border-default)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 mb-2"
        style={{
          color: 'var(--fg-subtle)',
          fontSize: '10px',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
        aria-expanded={open}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="font-mono uppercase tracking-wider">
          All evidence ({evidence.length})
        </span>
      </button>
      {open ? (
        <div className="flex flex-col gap-1.5">
          {evidence.map((ev) => (
            <div
              key={ev.id}
              onClick={() => onPick(ev.id === pickedId ? null : ev.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick(ev.id === pickedId ? null : ev.id);
                }
              }}
              style={{
                outline: ev.id === pickedId
                  ? '2px solid var(--intent-success-vivid)'
                  : 'none',
                outlineOffset: ev.id === pickedId ? '-2px' : 0,
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <EvidenceCard
                evidence={ev}
                expanded={ev.id === pickedId}
                onToggle={() => onPick(ev.id === pickedId ? null : ev.id)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function InvestigatePanel() {
  const {
    activeTarget,
    bundle,
    answer,
    status,
    questionType,
    panelOpen,
    pickedEvidenceId,
    start,
    regenerate,
    setQuestionType,
    clear,
    closePanel,
    pickEvidence,
  } = useInvestigation();
  const stack = useStack();

  // Track mount for slide animation: keep mounted briefly after close so the
  // exit transition runs, then unmount.
  const [mounted, setMounted] = useState(panelOpen);
  useEffect(() => {
    if (panelOpen) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(t);
  }, [panelOpen]);

  // ESC closes the panel.
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, closePanel]);

  if (!mounted && !panelOpen) return null;

  const handleAction = (action: ActionRecommendation) => {
    if (action.kind === 'open_focus') {
      const folderPath = action.payload?.['folderPath'];
      const fileId = action.payload?.['fileId'];
      if (typeof folderPath === 'string') {
        stack.open({ kind: 'folder', path: folderPath });
        return;
      }
      if (typeof fileId === 'number') {
        stack.open({ kind: 'file', id: fileId });
        return;
      }
      console.warn('open_focus action missing payload:', action);
      return;
    }
    console.warn('action not wired:', action.kind);
  };

  // setQuestionType already triggers a re-run when activeTarget exists, so do
  // NOT call regenerate() here — that would double-fire and race.
  const handleQuestionChange = (qt: QuestionType) => {
    setQuestionType(qt);
  };

  const evidenceCount = bundle?.evidence.length ?? 0;

  // Outer wrapper is plain (no transform) so backdrop-filter keeps working on
  // GlassCard. Slide-in is via `right` only.
  const outerStyle: React.CSSProperties = {
    right: panelOpen ? 0 : -480,
    transition: 'right 200ms ease-out, opacity 200ms ease-out',
    opacity: panelOpen ? 1 : 0,
  };

  return (
    <div
      className="fixed top-0 bottom-0 w-[480px] max-w-[90vw] z-40 pointer-events-auto"
      style={outerStyle}
      aria-hidden={!panelOpen}
    >
      <GlassCard className="h-full flex flex-col rounded-l-2xl rounded-r-none">
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 shrink-0"
          style={{
            height: 40,
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <Sparkles
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--intent-success-vivid)' }}
          />
          <span
            className="font-mono font-bold text-[12px] shrink-0"
            style={{ color: 'var(--fg-default)' }}
          >
            Investigation
          </span>
          <div className="flex-1 min-w-0 flex flex-col items-start ml-2">
            {activeTarget ? (
              <>
                <span
                  className="block truncate text-[11px] font-semibold w-full"
                  style={{ color: 'var(--fg-default)' }}
                >
                  {activeTarget.label}
                </span>
                {activeTarget.subtitle && (
                  <span
                    className="block truncate text-[10px] w-full"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    {activeTarget.subtitle}
                  </span>
                )}
              </>
            ) : null}
          </div>
          {activeTarget ? (
            <button
              type="button"
              onClick={clear}
              className="text-[10px] font-mono uppercase tracking-[0.12em] px-1.5 py-1 rounded-md transition-colors hover:[background:var(--bg-hover)]"
              style={{
                background: 'transparent',
                color: 'var(--fg-subtle)',
                cursor: 'pointer',
              }}
              title="Clear current target — back to demo list"
            >
              Reset
            </button>
          ) : null}
          <IconButton icon={X} label="Close investigation" size="sm" onClick={closePanel} />
        </div>

        {/* Question type tabs — only relevant once a target is active */}
        {activeTarget ? (
          <div
            className="flex items-center gap-1 px-3 shrink-0"
            style={{
              height: 36,
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            {QUESTION_TABS.map((tab) => (
              <QuestionTab
                key={tab.value}
                label={tab.label}
                active={questionType === tab.value}
                onClick={() => handleQuestionChange(tab.value)}
              />
            ))}
          </div>
        ) : null}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {!activeTarget && (
            <EmptyState onPick={(t) => start(t)} />
          )}

          {activeTarget && (status === 'gathering' || status === 'partial') && (
            <>
              <GatheringIndicator status={status} count={evidenceCount} />
              <SkeletonBlock />
              <SkeletonBlock />
              <SkeletonBlock />
            </>
          )}

          {activeTarget && status === 'complete' && answer && bundle && (
            <>
              <AnswerView
                answer={answer}
                bundle={bundle}
                onAction={handleAction}
                onPickEvidence={(id) => pickEvidence(id)}
                pickedEvidenceId={pickedEvidenceId}
              />
              <AllEvidenceSection
                evidence={bundle.evidence}
                pickedId={pickedEvidenceId}
                onPick={pickEvidence}
              />
            </>
          )}

          {activeTarget && status === 'error' && (
            <div className="flex flex-col items-start gap-2">
              <div
                className="text-[11px]"
                style={{ color: 'var(--intent-danger-vivid)' }}
              >
                Investigation failed.
              </div>
              <button
                type="button"
                onClick={() => regenerate()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.16em] border transition-colors hover:[background:var(--bg-hover)]"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-default)',
                  borderColor: 'var(--border-muted)',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-3 shrink-0"
          style={{
            height: 36,
            borderTop: '1px solid var(--border-default)',
            color: 'var(--fg-subtle)',
            fontSize: 10,
          }}
        >
          <span>
            {activeTarget
              ? `${evidenceCount.toString()} evidence · ${status}`
              : `${FIXTURE_TARGETS.length.toString()} demo targets · pick one above`}
          </span>
          {activeTarget ? (
            <button
              type="button"
              onClick={() => regenerate()}
              disabled={status === 'gathering'}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors hover:[background:var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'transparent',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate
            </button>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}
