import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { setPendingHandoff, type FixHandoffPayload } from './fixHandoff';

export function useFixHandoff() {
  const navigate = useNavigate();
  return useCallback(
    (payload: FixHandoffPayload) => {
      setPendingHandoff(payload);
      void navigate({ to: '/fix-pipeline' });
    },
    [navigate],
  );
}
