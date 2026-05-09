import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  recordHandoffBreadcrumb,
  setPendingHandoff,
  type FixHandoffPayload,
} from './fixHandoff';

export function useFixHandoff() {
  const navigate = useNavigate();
  return useCallback(
    (payload: FixHandoffPayload) => {
      setPendingHandoff(payload);
      recordHandoffBreadcrumb(payload);
      void navigate({ to: '/fix-pipeline' });
    },
    [navigate],
  );
}
