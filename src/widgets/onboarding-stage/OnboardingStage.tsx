import { useCallback, useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { ArrowRight, Sparkles } from 'lucide-react';
import { OnboardingShell } from './parts/OnboardingShell';
import { STEPS, INITIAL_DATA, type WizardData } from './parts/wizard';
import { StepProfile } from './parts/steps/StepProfile';
import { StepOrg } from './parts/steps/StepOrg';
import { StepWorkspace } from './parts/steps/StepWorkspace';
import { StepInvite } from './parts/steps/StepInvite';
import { StepPlan } from './parts/steps/StepPlan';
import { DonePage } from './parts/DonePage';

// Single-route wizard. We keep step state in URL search params so the
// progress survives a refresh and back/forward buttons jump steps. The
// data lives in component state (in-memory demo) — wiring it to a
// persistence layer is a one-line replacement of `setData`.
export default function OnboardingStage() {
  // Search params aren't registered on this route's schema, so the loose-mode
  // result is untyped ({}); narrow it in `select` to the fields we read.
  const search = useSearch({
    strict: false,
    select: (s) => s as { step?: string; done?: string },
  });
  const stepFromUrl = clampStep(parseInt(search.step ?? '0', 10) || 0);
  const isDone = search.done === '1';

  const [current, setCurrent] = useState(stepFromUrl);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);

  const setProfile   = useCallback((v: WizardData['profile'])   => { setData((d) => ({ ...d, profile: v })); }, []);
  const setOrg       = useCallback((v: WizardData['org'])       => { setData((d) => ({ ...d, org: v })); }, []);
  const setWorkspace = useCallback((v: WizardData['workspace']) => { setData((d) => ({ ...d, workspace: v })); }, []);
  const setInvite    = useCallback((v: WizardData['invite'])    => { setData((d) => ({ ...d, invite: v })); }, []);
  const setPlan      = useCallback((v: WizardData['plan'])      => { setData((d) => ({ ...d, plan: v })); }, []);

  if (isDone) return <DonePage data={data} />;

  const next = () => {
    if (current < STEPS.length - 1) {
      setCurrent((c) => c + 1);
      // Sync URL — best-effort. We avoid useNavigate() round-trip overhead
      // and just rewrite the search query directly.
      const u = new URL(window.location.href);
      u.searchParams.set('step', String(current + 1));
      window.history.replaceState(null, '', u.toString());
    } else {
      // Finish — flip to done view.
      const u = new URL(window.location.href);
      u.searchParams.set('done', '1');
      u.searchParams.delete('step');
      window.history.replaceState(null, '', u.toString());
      // Force re-read of URL
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const prev = () => {
    setCurrent((c) => Math.max(0, c - 1));
    const u = new URL(window.location.href);
    u.searchParams.set('step', String(Math.max(0, current - 1)));
    window.history.replaceState(null, '', u.toString());
  };

  const stepValid = isStepValid(current, data);
  const isLast = current === STEPS.length - 1;

  return (
    <OnboardingShell
      steps={STEPS}
      current={current}
      onPrev={current > 0 ? prev : undefined}
      topRight={
        <span>
          Signed in as <span style={{ color: 'var(--fg-default)' }}>sora@acme.com</span>
          <span className="mx-2" style={{ color: 'var(--border-muted)' }}>·</span>
          <Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>Sign out</Link>
        </span>
      }
      actions={
        <>
          {!isLast && current >= 3 && (
            <button
              type="button"
              onClick={next}
              className="text-[12px] font-medium px-2.5 py-1.5 rounded-md transition-colors"
              style={{ color: 'var(--fg-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={next}
            disabled={!stepValid}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold tracking-tight transition-opacity hover:opacity-90"
            style={{
              background: 'var(--fg-strong)',
              color: 'var(--bg-canvas)',
              opacity: stepValid ? 1 : 0.5,
              cursor: stepValid ? 'pointer' : 'not-allowed',
            }}
          >
            {isLast ? (
              <>
                Finish setup
                <Sparkles className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </>
      }
    >
      {current === 0 && <StepProfile   value={data.profile}   onChange={setProfile} />}
      {current === 1 && <StepOrg       value={data.org}       onChange={setOrg} />}
      {current === 2 && <StepWorkspace value={data.workspace} onChange={setWorkspace} />}
      {current === 3 && <StepInvite    value={data.invite}    onChange={setInvite} />}
      {current === 4 && <StepPlan      value={data.plan}      onChange={setPlan} />}
    </OnboardingShell>
  );
}

function clampStep(n: number) {
  return Math.max(0, Math.min(STEPS.length - 1, Number.isFinite(n) ? n : 0));
}

// Per-step "can advance?" gate. Mirrors what the back end would enforce.
function isStepValid(step: number, d: WizardData): boolean {
  switch (step) {
    case 0: return d.profile.name.trim().length > 0 && d.profile.handle.length >= 2;
    case 1: return d.org.mode === 'create'
      ? d.org.name.trim().length > 0 && d.org.slug.length >= 2
      : d.org.inviteCode.length >= 8;
    case 2: return d.workspace.connected && d.workspace.repo.length > 0;
    case 3: return true; // invite is skippable
    case 4: return Boolean(d.plan.id);
    default: return false;
  }
}
