import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { env } from '@shared/config/env';
import { useSession, updateProfile } from '@entities/session';
import { createOrganization, setActiveOrg, inviteMember } from '@entities/org';
import { startCheckout } from '@entities/billing';
import { OnboardingShell } from './parts/OnboardingShell';
import { STEPS, INITIAL_DATA, type WizardData, type InviteRole } from './parts/wizard';
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

  const { user } = useSession();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(stepFromUrl);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  // Idempotency guards so a retry / reload never spawns a duplicate org,
  // re-sends succeeded invites, or opens a second checkout. The created org id
  // is persisted to sessionStorage (keyed by slug) so it survives a component
  // remount (page reload / navigation back into onboarding) too — refs alone
  // reset on unmount. invitedRef/invitesReportedRef are per-mount (a re-created
  // invite on reload just 400s harmlessly).
  const createdOrgRef = useRef<string | null>(null);
  const invitedRef = useRef<Set<string>>(new Set());
  const invitesReportedRef = useRef(false);

  const setProfile   = useCallback((v: WizardData['profile'])   => { setData((d) => ({ ...d, profile: v })); }, []);
  const setOrg       = useCallback((v: WizardData['org'])       => { setData((d) => ({ ...d, org: v })); }, []);
  const setWorkspace = useCallback((v: WizardData['workspace']) => { setData((d) => ({ ...d, workspace: v })); }, []);
  const setInvite    = useCallback((v: WizardData['invite'])    => { setData((d) => ({ ...d, invite: v })); }, []);
  const setPlan      = useCallback((v: WizardData['plan'])      => { setData((d) => ({ ...d, plan: v })); }, []);

  if (isDone) return <DonePage data={data} />;

  const flipToDone = () => {
    const u = new URL(window.location.href);
    u.searchParams.set('done', '1');
    u.searchParams.delete('step');
    window.history.replaceState(null, '', u.toString());
    // Force re-read of URL
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Real-mode finish: persist the wizard to the accounts backend. Create mode
  // provisions the org, applies invites, and (for a paid plan) redirects to
  // Stripe checkout. Join mode is handled via the emailed invite link, so here
  // we only save the profile. Mock mode keeps the in-memory demo (flipToDone).
  const finishReal = async () => {
    setFinishing(true);
    setFinishError(null);
    if (data.profile.name.trim().length > 0) {
      await updateProfile({ name: data.profile.name.trim() });
    }
    if (data.org.mode === 'create') {
      // Create the org exactly once; reuse it on a retry / reload (no duplicate
      // org). sessionStorage bridges a remount.
      const storeKey = `onboarding:org:${data.org.slug}`;
      let orgId = createdOrgRef.current ?? sessionStorage.getItem(storeKey);
      if (!orgId) {
        const created = await createOrganization({ name: data.org.name.trim(), slug: data.org.slug });
        if (!created.ok) { setFinishing(false); setFinishError(created.error); return; }
        orgId = created.org.id;
        sessionStorage.setItem(storeKey, orgId);
      }
      createdOrgRef.current = orgId;
      // Active org drives the JWT/entitlement claim — a swallowed failure here
      // would leave the user org-less (and unentitled) even after paying.
      const activated = await setActiveOrg({ organizationId: orgId });
      if (!activated.ok) { setFinishing(false); setFinishError(activated.error); return; }

      // Invites are best-effort but never silently dropped; already-sent ones
      // are skipped so a retry can't double-invite.
      const failed: string[] = [];
      for (const entry of data.invite.entries) {
        if (invitedRef.current.has(entry.email)) continue;
        const res = await inviteMember({ organizationId: orgId, email: entry.email, role: backendRole(entry.role) });
        if (res.ok) invitedRef.current.add(entry.email);
        else failed.push(entry.email);
      }
      // Surface invite failures once (usual cause: free-tier seat limit before
      // the plan upgrade). The org is provisioned — let the user press Finish
      // again to continue; they can resend from Members after upgrading.
      if (failed.length > 0 && !invitesReportedRef.current) {
        invitesReportedRef.current = true;
        setFinishError(
          `${failed.length.toString()} invite${failed.length === 1 ? '' : 's'} couldn't be sent — resend from Members after upgrading. Press Finish to continue.`,
        );
        setFinishing(false);
        return;
      }

      if (data.plan.id === 'team' || data.plan.id === 'business') {
        const checkout = await startCheckout(orgId, { plan: data.plan.id, cycle: data.plan.cycle });
        if (checkout.ok) { window.location.href = checkout.url; return; }
        // Checkout couldn't start — land in the app; they can upgrade in Billing.
      }
      // Clear the persisted bootstrap marker now that onboarding succeeded.
      sessionStorage.removeItem(`onboarding:org:${data.org.slug}`);
    }
    setFinishing(false);
    // Real onboarding is complete — go to the workspace, NOT the demo's scripted
    // "indexing" DonePage (which is fabricated). Mock mode keeps that screen.
    void navigate({ to: '/intelligence' });
  };

  const next = () => {
    if (current < STEPS.length - 1) {
      setCurrent((c) => c + 1);
      // Sync URL — best-effort. We avoid useNavigate() round-trip overhead
      // and just rewrite the search query directly.
      const u = new URL(window.location.href);
      u.searchParams.set('step', String(current + 1));
      window.history.replaceState(null, '', u.toString());
    } else if (env.useRealAuth) {
      void finishReal();
    } else {
      flipToDone();
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
          Signed in as <span style={{ color: 'var(--fg-default)' }}>{env.useRealAuth ? (user?.email ?? 'you') : 'sora@acme.com'}</span>
          <span className="mx-2" style={{ color: 'var(--border-muted)' }}>·</span>
          <Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>Sign out</Link>
        </span>
      }
      actions={
        <>
          {finishError && (
            <span className="text-sm mr-1" style={{ color: 'var(--intent-danger-fg)' }}>{finishError}</span>
          )}
          {!isLast && current >= 3 && (
            <button
              type="button"
              onClick={next}
              disabled={finishing}
              className="text-base font-medium px-2.5 py-1.5 rounded-md transition-colors"
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
            disabled={!stepValid || finishing}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold tracking-tight transition-opacity hover:opacity-90"
            style={{
              background: 'var(--fg-strong)',
              color: 'var(--bg-canvas)',
              opacity: stepValid && !finishing ? 1 : 0.5,
              cursor: stepValid && !finishing ? 'pointer' : 'not-allowed',
            }}
          >
            {isLast ? (
              finishing ? (
                <>
                  Finishing…
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </>
              ) : (
                <>
                  Finish setup
                  <Sparkles className="w-3.5 h-3.5" />
                </>
              )
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

// Wizard invite roles → backend org roles (accounts has no reviewer/viewer;
// reviewer collapses to member, viewer to the least-privileged guest).
function backendRole(r: InviteRole): 'admin' | 'member' | 'guest' {
  if (r === 'admin') return 'admin';
  if (r === 'viewer') return 'guest';
  return 'member';
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
