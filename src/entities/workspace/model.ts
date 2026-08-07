import { z } from 'zod';
import { api, apiErrorMessage, type ApiResult } from '@shared/api';
import { env } from '@shared/config/env';
import { useAsyncResource } from '@shared/lib';

const RecordSchema = z.record(z.string(), z.unknown());
const WORKSPACE_NOT_FOUND = 'Workspace not found.';

export type WorkspacePayload = Record<string, unknown>;

export type WorkspaceRecord = {
  id: string | null;
  name: string | null;
  slug: string | null;
  orgName: string | null;
  orgSlug: string | null;
  defaultBranch: string | null;
  description: string | null;
  archived: boolean | null;
  raw: WorkspacePayload;
};

export type WorkspacePatch = Record<string, unknown>;

export type WorkspaceActionResult =
  | { ok: true }
  | { ok: false; error: string };

type WorkspaceReadResult =
  | { ok: true; data: WorkspaceRecord }
  | { ok: false; error: string };

type WorkspaceState = {
  detail: WorkspaceRecord | null;
  isPending: boolean;
  error: string | null;
  refetch: () => void;
};

const NOOP_REFETCH = () => undefined;

function asRecord(value: unknown): WorkspacePayload | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as WorkspacePayload
    : null;
}

function readValue(value: unknown, keys: string[]): unknown {
  const record = asRecord(value);
  if (!record) return undefined;
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

export function workspaceObject(value: unknown, ...keys: string[]): WorkspacePayload | null {
  const picked = keys.length === 0 ? value : readValue(value, keys);
  return asRecord(picked);
}

export function workspaceArray(value: unknown, ...keys: string[]): unknown[] | null {
  const picked = keys.length === 0 ? value : readValue(value, keys);
  return Array.isArray(picked) ? picked : null;
}

export function workspaceString(value: unknown, ...keys: string[]): string | null {
  const picked = keys.length === 0 ? value : readValue(value, keys);
  return typeof picked === 'string' ? picked : null;
}

export function workspaceNumber(value: unknown, ...keys: string[]): number | null {
  const picked = keys.length === 0 ? value : readValue(value, keys);
  return typeof picked === 'number' && Number.isFinite(picked) ? picked : null;
}

export function workspaceBoolean(value: unknown, ...keys: string[]): boolean | null {
  const picked = keys.length === 0 ? value : readValue(value, keys);
  return typeof picked === 'boolean' ? picked : null;
}

function uniqueRefs(...refs: (string | null | undefined)[]): string[] {
  return Array.from(new Set(refs.filter((ref): ref is string => typeof ref === 'string' && ref.length > 0)));
}

function matchesWorkspace(candidate: WorkspacePayload, workspaceSlug: string): boolean {
  return workspaceString(candidate, 'slug') === workspaceSlug
    || workspaceString(candidate, 'name') === workspaceSlug;
}

function toWorkspaceRecord(
  raw: WorkspacePayload,
  fallback: { orgSlug: string; workspaceSlug: string },
): WorkspaceRecord {
  return {
    id: workspaceString(raw, 'id'),
    name: workspaceString(raw, 'name'),
    slug: workspaceString(raw, 'slug') ?? fallback.workspaceSlug,
    orgName: workspaceString(raw, 'org_name', 'orgName'),
    orgSlug: workspaceString(raw, 'org_slug', 'orgSlug') ?? fallback.orgSlug,
    defaultBranch: workspaceString(raw, 'default_branch', 'defaultBranch'),
    description: workspaceString(raw, 'description'),
    archived: workspaceBoolean(raw, 'archived'),
    raw,
  };
}

async function getWorkspacePayload(ref: string): Promise<ApiResult<WorkspacePayload>> {
  return api.get<WorkspacePayload>(`/v1/workspaces/${encodeURIComponent(ref)}`, RecordSchema);
}

async function listWorkspacePayloads(): Promise<ApiResult<WorkspacePayload[]>> {
  const res = await api.get<WorkspacePayload>('/v1/workspaces', RecordSchema);
  if (!res.ok) return res;
  const data = workspaceArray(res.data, 'data') ?? [];
  return { ok: true, data: data.map((item) => asRecord(item)).filter((item): item is WorkspacePayload => item !== null) };
}

async function resolveWorkspaceCandidate(workspaceSlug: string): Promise<WorkspacePayload | null> {
  const res = await listWorkspacePayloads();
  if (!res.ok) return null;
  return res.data.find((candidate) => matchesWorkspace(candidate, workspaceSlug)) ?? null;
}

export async function getWorkspace(orgSlug: string, workspaceSlug: string): Promise<WorkspaceReadResult> {
  const direct = await getWorkspacePayload(workspaceSlug);
  if (direct.ok) {
    return { ok: true, data: toWorkspaceRecord(direct.data, { orgSlug, workspaceSlug }) };
  }
  if (!(direct.error.kind === 'http' && direct.error.status === 404)) {
    return { ok: false, error: apiErrorMessage(direct.error, 'workspace') };
  }

  const candidate = await resolveWorkspaceCandidate(workspaceSlug);
  if (!candidate) return { ok: false, error: WORKSPACE_NOT_FOUND };

  const candidateId = workspaceString(candidate, 'id');
  if (candidateId && candidateId !== workspaceSlug) {
    const byId = await getWorkspacePayload(candidateId);
    if (byId.ok) {
      return { ok: true, data: toWorkspaceRecord(byId.data, { orgSlug, workspaceSlug }) };
    }
    if (!(byId.error.kind === 'http' && byId.error.status === 404)) {
      return { ok: false, error: apiErrorMessage(byId.error, 'workspace') };
    }
  }

  return { ok: true, data: toWorkspaceRecord(candidate, { orgSlug, workspaceSlug }) };
}

export function useWorkspace(orgSlug: string, workspaceSlug: string): WorkspaceState {
  const { data, isPending, error, refetch } = useAsyncResource<WorkspaceRecord>(
    async () => {
      if (!env.useRealApi) return { ok: false, error: '__mock__' };
      return getWorkspace(orgSlug, workspaceSlug);
    },
    [orgSlug, workspaceSlug],
    `${orgSlug}/${workspaceSlug}`,
  );
  if (!env.useRealApi) return { detail: null, isPending: false, error: null, refetch: NOOP_REFETCH };
  return { detail: data, isPending, error, refetch };
}

async function patchWorkspaceRef(ref: string, data: WorkspacePatch): Promise<ApiResult<unknown>> {
  return api.patch(`/v1/workspaces/${encodeURIComponent(ref)}`, data);
}

export async function updateWorkspace(input: {
  orgSlug: string;
  workspaceSlug: string;
  workspaceId?: string | null;
  data: WorkspacePatch;
}): Promise<WorkspaceActionResult> {
  const resolved = input.workspaceId ? null : await resolveWorkspaceCandidate(input.workspaceSlug);
  const refs = uniqueRefs(
    input.workspaceId,
    workspaceString(resolved, 'id'),
    input.workspaceSlug,
    workspaceString(resolved, 'slug'),
    workspaceString(resolved, 'name'),
  );

  let saw404 = false;
  for (const ref of refs) {
    const res = await patchWorkspaceRef(ref, input.data);
    if (res.ok) return { ok: true };
    if (res.error.kind === 'http' && res.error.status === 404) {
      saw404 = true;
      continue;
    }
    return { ok: false, error: apiErrorMessage(res.error, 'workspace') };
  }

  return { ok: false, error: saw404 ? WORKSPACE_NOT_FOUND : 'Workspace update failed.' };
}
