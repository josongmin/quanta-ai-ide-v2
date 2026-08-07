import { useParams } from '@tanstack/react-router';

export function useWorkspaceRouteParams(): { orgSlug: string; wsSlug: string } {
  const params = useParams({ strict: false });
  const wsSlug = 'ws' in params && typeof params.ws === 'string' ? params.ws : 'monorepo';
  return { orgSlug: params.org ?? 'acme', wsSlug };
}
