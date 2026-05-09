import type { CSSProperties, ComponentType } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  GitCommit,
  User,
  Shield,
  AlertTriangle,
  History,
  Copy,
  FileWarning,
  Code,
  type LucideProps,
} from 'lucide-react';
import type { EvidenceKind } from '@entities/investigation';

type Props = {
  kind: EvidenceKind;
  size?: number;
};

const ICONS: Record<EvidenceKind, ComponentType<LucideProps>> = {
  symbol: Code,
  caller: ArrowDownLeft,
  callee: ArrowUpRight,
  taint_path: Zap,
  recent_change: GitCommit,
  owner: User,
  test_coverage: Shield,
  incident: AlertTriangle,
  similar_incident: History,
  similar_code: Copy,
  docs_mismatch: FileWarning,
};

export function EvidenceKindIcon({ kind, size = 14 }: Props) {
  const Icon = ICONS[kind];
  const style: CSSProperties = { color: 'var(--fg-muted)' };
  return <Icon size={size} style={style} aria-hidden="true" />;
}
