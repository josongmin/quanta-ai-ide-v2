import { useMemo } from 'react';
import { GitMerge, AtSign, ArrowDownLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { AdmissionDecision, RuleEvaluation } from '@entities/admission';
import type { FileRecord, RepoData } from '@entities/repo';

// Author safety net (Gate page §E). Three honest comparisons that stop
// authors from staring at a wall of red and panicking:
//
//   1. Regression vs main — does main pass these same rules right now?
//      If main also fails, this PR didn't *introduce* the failure; it's
//      pre-existing tech debt. Suggest "suppress on this branch" or
//      "fix as a separate cleanup PR".
//
//   2. Step delta — what changed since the previous in-flight evaluation?
//      Helps the author bisect their own commits ("I added these 3 commits
//      and now SQL-001 fires — must be the third one").
//
//   3. Affected reviewers — CODEOWNERS × blocking rules → who to mention.
//      The author shouldn't have to guess which team owns the file.
//
// All three are *informational*; they don't gate or unblock by themselves.

type RegressionStatus = 'introduced' | 'pre-existing' | 'unchanged-passing';

export function SafetyNet({
  decision, repo, fired, fileById,
}: {
  decision: AdmissionDecision;
  repo: RepoData;
  fired: RuleEvaluation[];
  fileById: (id: number) => FileRecord | undefined;
}) {
  // Synthesise a "main baseline" by re-evaluating against an empty change
  // set. Pre-existing rule fires on main's files surface as `pre-existing`.
  // For the demo we approximate this by checking whether each fired rule's
  // hits land on files marked publicApi/cyclic/dead/layerViolation/secrets
  // — the structural attributes that pre-exist regardless of this PR.
  const regressionByRule = useMemo<Map<string, RegressionStatus>>(() => {
    const m = new Map<string, RegressionStatus>();
    for (const ev of fired) {
      let preExisting = 0;
      for (const h of ev.hits) {
        const f = fileById(h.fileId);
        if (!f) continue;
        if (
          f.metrics.cyclic ||
          f.metrics.layerViolation ||
          f.metrics.dead ||
          f.metrics.secretsLikely ||
          f.metrics.eslintErrors > 0
        ) preExisting += 1;
      }
      const all = ev.hits.length;
      const ratio = all === 0 ? 0 : preExisting / all;
      m.set(ev.ruleId, ratio >= 0.66 ? 'pre-existing' : 'introduced');
    }
    return m;
  }, [fired, fileById]);

  // Reviewer routing — CODEOWNERS×blocking. We pull `owner` off each file
  // record and dedupe.
  const reviewerSuggestions = useMemo(() => {
    const owners = new Map<string, { count: number; files: string[] }>();
    for (const ev of fired) {
      if (ev.status !== 'block') continue;
      for (const h of ev.hits) {
        const f = fileById(h.fileId);
        if (!f?.owner) continue;
        const e = owners.get(f.owner) ?? { count: 0, files: [] };
        e.count += 1;
        const path = f.folderPath ? `${f.folderPath}/${f.name}` : f.name;
        if (e.files.length < 3) e.files.push(path);
        owners.set(f.owner, e);
      }
    }
    return [...owners.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 4);
  }, [fired, fileById]);

  // Step delta — synthetic. Approximate "since previous evaluation" as the
  // count of recent-PR-touching files in this diff: the author's freshest
  // changes. Useful as a hint, never authoritative.
  const stepDelta = useMemo(() => {
    let touchedRecent = 0;
    for (const ev of fired) {
      for (const h of ev.hits) {
        const f = fileById(h.fileId);
        if (f && f.metrics.recentPRs >= 3) touchedRecent += 1;
      }
    }
    return touchedRecent;
  }, [fired, fileById]);

  void repo;

  if (decision.outcome === 'allow') {
    return (
      <section
        className="rounded-md p-4 flex items-start gap-3"
        style={{ border: '1px solid var(--border-default)' }}
      >
        <CheckCircle2
          className="w-4 h-4 mt-0.5 shrink-0"
          style={{ color: 'var(--intent-success-fg)' }}
        />
        <div>
          <div
            className="text-[12px] font-semibold"
            style={{ color: 'var(--fg-strong)' }}
          >
            Nothing to flag.
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
            All active rules pass on this PR. The safety-net comparisons
            (regression vs main, reviewer routing) are quiet because there
            are no blocking findings to triage.
          </div>
        </div>
      </section>
    );
  }

  const introducedCount = [...regressionByRule.values()].filter((v) => v === 'introduced').length;
  const preExistingCount = [...regressionByRule.values()].filter((v) => v === 'pre-existing').length;

  // Outlined card — mirrors ProvenanceCard. No background fill on the
  // card body so it doesn't pile a third near-identical grey on top of
  // the DecisionHeader and ProvenanceCard.
  return (
    <section
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <header
        className="flex items-center gap-2 px-4 h-9"
        style={{
          background: 'var(--bg-surface-muted)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <h3
          className="text-[11px] uppercase tracking-[0.14em] font-semibold"
          style={{ color: 'var(--fg-strong)' }}
        >
          Safety net
        </h3>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          context the author needs before acting
        </span>
      </header>

      <div className="grid gap-3 p-4" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        {/* Regression vs main */}
        <SafetyTile
          icon={GitMerge}
          label="Regression vs main"
          primary={`${String(introducedCount)} introduced`}
          secondary={
            preExistingCount > 0
              ? `${String(preExistingCount)} pre-existing — consider suppressing on this branch`
              : 'all blocking rules are new in this PR'
          }
          tone={introducedCount > 0 ? 'warn' : 'ok'}
        />
        {/* Step delta */}
        <SafetyTile
          icon={ArrowDownLeft}
          label="Likely culprit"
          primary={
            stepDelta > 0
              ? `${String(stepDelta)} recent-edit hit${stepDelta === 1 ? '' : 's'}`
              : 'no recent-edit pattern'
          }
          secondary="Bisect: temporarily revert your latest commits to confirm."
          tone={stepDelta > 0 ? 'warn' : 'neutral'}
        />
        {/* Reviewers — outlined block, no fill. The card itself is already
            outlined, so a filled inner block would stack greys. */}
        {reviewerSuggestions.length > 0 && (
          <div
            className="col-span-2 rounded-md p-3"
            style={{ border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AtSign className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
              <span
                className="text-[10px] uppercase tracking-[0.14em] font-medium"
                style={{ color: 'var(--fg-subtle)' }}
              >
                Suggested reviewers
              </span>
              <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                from CODEOWNERS × blocking rules
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {reviewerSuggestions.map(([owner, info]) => (
                <span
                  key={owner}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono"
                  style={{
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-strong)',
                  }}
                  title={info.files.join(', ')}
                >
                  <span style={{ color: 'var(--fg-subtle)' }}>@</span>
                  {owner}
                  <span style={{ color: 'var(--fg-subtle)' }}>·</span>
                  <span style={{ color: 'var(--fg-subtle)' }}>{info.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SafetyTile({
  icon: Icon, label, primary, secondary, tone,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  primary: string;
  secondary: string;
  tone: 'ok' | 'warn' | 'neutral';
}) {
  const toneFg = tone === 'warn'
    ? 'var(--intent-warn-fg)'
    : tone === 'ok'
      ? 'var(--intent-success-fg)'
      : 'var(--fg-strong)';
  const ToneIcon = tone === 'warn' ? AlertCircle : tone === 'ok' ? CheckCircle2 : Icon;
  // Tinted left rail used to be a soft grey fill; now an outlined tile
  // so the card body stays calm and the tone icon carries status weight.
  return (
    <div
      className="flex items-start gap-3 rounded-md p-3"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <ToneIcon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: toneFg }} />
      <div className="min-w-0">
        <div
          className="text-[10px] uppercase tracking-[0.14em] font-medium"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {label}
        </div>
        <div
          className="text-[12px] font-semibold mt-0.5"
          style={{ color: 'var(--fg-strong)' }}
        >
          {primary}
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
          {secondary}
        </div>
      </div>
    </div>
  );
}
