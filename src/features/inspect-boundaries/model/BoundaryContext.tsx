import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import type { EgressProtocol, IngressProtocol } from '@entities/repo';

type Ctx = {
  showEntry: boolean;
  setShowEntry: (v: boolean) => void;

  showIngress: boolean;
  setShowIngress: (v: boolean) => void;
  ingressProtocols: Set<IngressProtocol>;
  toggleIngressProtocol: (p: IngressProtocol) => void;

  showEgress: boolean;
  setShowEgress: (v: boolean) => void;
  egressProtocols: Set<EgressProtocol>;
  toggleEgressProtocol: (p: EgressProtocol) => void;

  anyActive: boolean;
  clearAll: () => void;
};

const ALL_INGRESS: IngressProtocol[] = ['http', 'webhook', 'queue', 'grpc'];
const ALL_EGRESS: EgressProtocol[] = ['http', 'db', 'fs', 'queue'];

const C = createContext<Ctx | null>(null);

export function BoundaryProvider({ children }: { children: ReactNode }) {
  const [showEntry, setShowEntry] = useState(false);
  const [showIngress, setShowIngress] = useState(false);
  const [showEgress, setShowEgress] = useState(false);
  const [ingressProtocols, setIngressProtocols] = useState<Set<IngressProtocol>>(
    () => new Set(ALL_INGRESS),
  );
  const [egressProtocols, setEgressProtocols] = useState<Set<EgressProtocol>>(
    () => new Set(ALL_EGRESS),
  );

  const toggleIngressProtocol = useCallback((p: IngressProtocol) => {
    setIngressProtocols((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }, []);

  const toggleEgressProtocol = useCallback((p: EgressProtocol) => {
    setEgressProtocols((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setShowEntry(false);
    setShowIngress(false);
    setShowEgress(false);
  }, []);

  const value = useMemo<Ctx>(() => ({
    showEntry, setShowEntry,
    showIngress, setShowIngress,
    ingressProtocols, toggleIngressProtocol,
    showEgress, setShowEgress,
    egressProtocols, toggleEgressProtocol,
    anyActive: showEntry || showIngress || showEgress,
    clearAll,
  }), [
    showEntry, showIngress, showEgress,
    ingressProtocols, toggleIngressProtocol,
    egressProtocols, toggleEgressProtocol,
    clearAll,
  ]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useBoundaries(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useBoundaries must be inside BoundaryProvider');
  return c;
}
