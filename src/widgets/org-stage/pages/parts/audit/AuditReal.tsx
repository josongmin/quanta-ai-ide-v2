import { useEffect, useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { EmptyState, InlineError, SkeletonText } from '@shared/ui';
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';
import { useOrg } from '@entities/org';

// Real audit trail over `GET /v1/audit/:orgId`. Thinner than the mock: the
// accounts store records actor/action/target/payload/ip/at (no success-failure
// flag or structured before/after), so we render those honestly and expand the
// raw payload. Requires the `audit.read` permission — a 403 is surfaced as such.
//
// NOTE: response shape mirrors accounts' audit contract; replace with codegen
// from `<accountsUrl>/openapi.json` once the accounts server is reachable.
type AuditEntryDTO = {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  payload: unknown;
  ip: string | null;
  at: string;
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function AuditReal() {
  const { org = '' } = useParams({ strict: false });
  const { detail, error: orgError, refetch: refetchOrg } = useOrg(org);
  const orgId = detail?.org.id ?? '';

  const [entries, setEntries] = useState<AuditEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    /* eslint-disable react-hooks/set-state-in-effect -- loading/reset before the orgId/nonce fetch */
    if (!orgId) {
      // Org not resolved yet (or slug switched) — clear stale rows, show loading.
      setEntries([]);
      setLoading(true);
      return () => { active = false; };
    }
    setLoading(true);
    setLoadError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    void accountsApi
      .get<{ entries?: AuditEntryDTO[] }>(`/v1/audit/${orgId}`)
      .then((res) => {
        if (!active) return;
        // Defensive: backend could return {} or a bare array.
        if (res.ok) setEntries(Array.isArray(res.data.entries) ? res.data.entries : []);
        else setLoadError(apiErrorMessage(res.error, 'the audit log'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orgId, nonce]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) =>
      `${e.actor} ${e.action} ${e.target ?? ''} ${e.ip ?? ''}`.toLowerCase().includes(needle));
  }, [entries, q]);

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title="Audit log"
      subtitle="Privileged actions across the org. Retained per the Retention policy."
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 min-w-[220px]"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
        >
          <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); }}
            placeholder="Search actor, action, target, IP…"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--fg-strong)' }}
          />
        </div>
      </div>

      {orgError ? (
        <InlineError message={orgError} onRetry={refetchOrg} />
      ) : loadError ? (
        <InlineError message={loadError} onRetry={() => { setNonce((n) => n + 1); }} />
      ) : loading ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={6} />
        </div>
      ) : (
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
          <div
            className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
            style={{
              gridTemplateColumns: '20px 190px 160px 1fr 130px',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span />
            <span>When</span>
            <span>Actor</span>
            <span>Action / target</span>
            <span>IP</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={q ? `No matches for "${q}"` : 'No audit events yet'}
              subtitle={q ? 'Try a different keyword.' : 'Privileged actions will appear here.'}
            />
          ) : filtered.map((e) => {
            const open = expanded === e.id;
            return (
              <div key={e.id} className="[&:not(:first-child)]:border-t" style={{ borderColor: 'var(--border-muted)' }}>
                <button
                  type="button"
                  onClick={() => { setExpanded(open ? null : e.id); }}
                  className="grid items-center px-3 h-12 text-base w-full text-left transition-colors"
                  style={{ gridTemplateColumns: '20px 190px 160px 1fr 130px', gap: 12 }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}
                >
                  {open
                    ? <ChevronDown className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
                    : <ChevronRight className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />}
                  <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{fmtWhen(e.at)}</span>
                  <span className="truncate text-sm" style={{ color: 'var(--fg-strong)' }}>{e.actor}</span>
                  <span className="font-mono text-sm truncate" style={{ color: 'var(--fg-default)' }}>
                    {e.action}{e.target ? ` · ${e.target}` : ''}
                  </span>
                  <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{e.ip ?? '—'}</span>
                </button>
                {open && (
                  <div className="px-10 pb-3 pt-1" style={{ background: 'var(--bg-surface-muted)' }}>
                    <pre
                      className="font-mono text-sm p-2.5 rounded-md overflow-x-auto whitespace-pre-wrap"
                      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-muted)', color: 'var(--fg-strong)' }}
                    >
                      {e.payload != null ? JSON.stringify(e.payload, null, 2) : '— no payload —'}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!orgError && !loadError && !loading && (
        <p className="text-sm mt-3 px-1" style={{ color: 'var(--fg-subtle)' }}>
          {filtered.length} {filtered.length === 1 ? 'event' : 'events'}.
        </p>
      )}
    </OrgShell>
  );
}
