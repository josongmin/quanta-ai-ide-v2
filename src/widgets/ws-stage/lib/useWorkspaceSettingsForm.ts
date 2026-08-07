import { useEffect, useRef, useState } from 'react';
import {
  type WorkspacePatch,
  type WorkspaceRecord,
  updateWorkspace,
  useWorkspace,
} from '@entities/workspace';
import { env } from '@shared/config/env';
import { shallowEqual } from '@shared/lib';
import { useWorkspaceRouteParams } from './useWorkspaceRouteParams';

type SavingState = 'idle' | 'saving' | 'saved';

type Options<T> = {
  initial: T;
  fromDetail: (detail: WorkspaceRecord) => T;
  toPatch: (form: T) => WorkspacePatch;
};

type Result<T> = {
  form: T;
  setForm: React.Dispatch<React.SetStateAction<T>>;
  dirty: boolean;
  saving: SavingState;
  save: () => Promise<void>;
  discard: () => void;
  isReal: boolean;
  isPending: boolean;
  loadError: string | null;
  actionError: string | null;
  clearActionError: () => void;
  retryLoad: () => void;
  detail: WorkspaceRecord | null;
  shell: {
    orgName: string;
    orgSlug: string;
    wsName: string;
    wsSlug: string;
  };
};

export function useWorkspaceSettingsForm<T>({
  initial,
  fromDetail,
  toPatch,
}: Options<T>): Result<T> {
  const { orgSlug, wsSlug } = useWorkspaceRouteParams();
  const { detail, isPending, error, refetch } = useWorkspace(orgSlug, wsSlug);

  const [form, setForm] = useState<T>(initial);
  const [committed, setCommitted] = useState<T>(initial);
  const [saving, setSaving] = useState<SavingState>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const seededKey = useRef<string | null>(null);

  useEffect(() => {
    if (!env.useRealApi) return;
    if (!detail) return;
    const key = detail.id ?? detail.slug ?? wsSlug;
    if (seededKey.current === key) return;
    seededKey.current = key;
    const next = fromDetail(detail);
    setForm(next);
    setCommitted(next);
  }, [detail, fromDetail, initial, wsSlug]);

  const dirty = !shallowEqual(form, committed);

  async function save() {
    setSaving('saving');
    setActionError(null);

    if (!env.useRealApi) {
      setTimeout(() => {
        setCommitted(form);
        setSaving('saved');
        setTimeout(() => { setSaving('idle'); }, 1200);
      }, 600);
      return;
    }

    const res = await updateWorkspace({
      orgSlug,
      workspaceSlug: wsSlug,
      workspaceId: detail?.id,
      data: toPatch(form),
    });
    if (!res.ok) {
      setSaving('idle');
      setActionError(res.error);
      return;
    }
    setCommitted(form);
    setSaving('saved');
    refetch();
    setTimeout(() => { setSaving('idle'); }, 1200);
  }

  return {
    form,
    setForm,
    dirty,
    saving,
    save,
    discard: () => {
      setActionError(null);
      setForm(committed);
    },
    isReal: env.useRealApi,
    isPending,
    loadError: error,
    actionError,
    clearActionError: () => { setActionError(null); },
    retryLoad: refetch,
    detail,
    shell: {
      orgName: detail?.orgName ?? orgSlug,
      orgSlug,
      wsName: detail?.name ?? detail?.slug ?? wsSlug,
      wsSlug,
    },
  };
}
