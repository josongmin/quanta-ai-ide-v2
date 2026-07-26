// Command port for the /agents fleet console.
//
// The stage renders controls (approve gate, adopt candidate, approve HITL,
// pause/resume routine, resolve conflict) that MUST perform a real backend
// state transition to be honest. In this demo build there is no such backend,
// so the port is absent and those controls render DISABLED with an accessible
// reason instead of faking success.
//
// A real build injects a `FleetCommandPort` via the `commandPort` prop; the
// controls then become live and delegate to it. This keeps the "does it do
// something real?" question answerable from a single boundary rather than
// scattered no-op handlers that lie about being functional.

export type FleetCommandPort = {
  approveGate: (runId: string, stepId: string) => void;
  adoptCandidate: (runId: string, candidateId: string) => void;
  approveHitl: (hitlItemId: string) => void;
  setRoutinePaused: (routineId: string, paused: boolean) => void;
  resolveConflict: (routineIdA: string, routineIdB: string, path: string) => void;
};

// When true, the caller supplied a real port and the control may act.
export function hasCommandPort(port: FleetCommandPort | undefined): port is FleetCommandPort {
  return port != null;
}
