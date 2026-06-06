import type { ComponentType } from 'react';
import type {
  RuleSignal, MetricField, CompareOp, GraphPattern,
  TaintSource, TaintSink,
} from '@entities/admission';
import type { V2Theme } from './tokens';
import { DrawerInput, DrawerSelect } from './RuleEditorOverlay';

// Per-kind signal editor registry (Open/Closed): adding a new signal kind
// means adding one entry to SIGNAL_EDITORS instead of growing an if-chain.
// Each editor is typed against the narrowed signal variant; the dispatcher
// resolves the right one from `signal.kind`.

export type EditorProps<S extends RuleSignal = RuleSignal> = {
  signal: S;
  onChange: (s: RuleSignal) => void;
  t: V2Theme;
};

type SignalOfKind<K extends RuleSignal['kind']> = Extract<RuleSignal, { kind: K }>;

function MetricEditor({ signal, onChange, t }: EditorProps<SignalOfKind<'metric'>>) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <DrawerSelect
        value={signal.field}
        onChange={(v) => { onChange({ ...signal, field: v as MetricField }); }}
        options={['blastRadius', 'editSafety', 'sastFindings', 'cognitive', 'cyclomatic',
          'loc', 'fanIn', 'fanOut', 'churn', 'lineCoverage', 'maintainability',
          'eslintErrors', 'todoCount']}
        t={t}
      />
      <DrawerSelect
        value={signal.op}
        onChange={(v) => { onChange({ ...signal, op: v as CompareOp }); }}
        options={['>', '>=', '<', '<=', '=', '!=']}
        t={t}
      />
      <DrawerInput
        value={String(signal.value)}
        onChange={(v) => { onChange({ ...signal, value: Number(v) || 0 }); }}
        numeric
        t={t}
      />
    </div>
  );
}

function GraphEditor({ signal, onChange, t }: EditorProps<SignalOfKind<'graph'>>) {
  return (
    <DrawerSelect
      value={signal.pattern}
      onChange={(v) => { onChange({ kind: 'graph', pattern: v as GraphPattern }); }}
      options={['import-cycle', 'public-api-touched', 'public-api-without-test',
        'orphan-edit', 'blast-radius-spike', 'unknown-region-creep', 'layer-violation']}
      t={t}
    />
  );
}

function TaintEditor({ signal, onChange, t }: EditorProps<SignalOfKind<'taint'>>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <DrawerSelect
        value={signal.source}
        onChange={(v) => { onChange({ ...signal, source: v as TaintSource }); }}
        options={['env', 'http', 'user-input', 'config', 'secret']}
        t={t}
      />
      <DrawerSelect
        value={signal.sink}
        onChange={(v) => { onChange({ ...signal, sink: v as TaintSink }); }}
        options={['fs.write', 'exec', 'sql', 'network', 'log']}
        t={t}
      />
    </div>
  );
}

function DslEditor({ signal, onChange, t }: EditorProps<SignalOfKind<'dsl'>>) {
  return (
    <DrawerInput
      value={signal.expr}
      onChange={(v) => { onChange({ kind: 'dsl', expr: v }); }}
      placeholder="safety:<40 +publicApi !test"
      mono
      t={t}
    />
  );
}

function ExternalEditor({ signal, onChange, t }: EditorProps<SignalOfKind<'external'>>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <DrawerSelect
        value={signal.tool}
        onChange={(v) => { onChange({ ...signal, tool: v as 'eslint' | 'semgrep' | 'codeql' | 'bandit' | 'ruff' }); }}
        options={['eslint', 'semgrep', 'codeql', 'bandit', 'ruff']}
        t={t}
      />
      <DrawerInput
        value={signal.ruleId}
        onChange={(v) => { onChange({ ...signal, ruleId: v }); }}
        placeholder="rule id"
        mono
        t={t}
      />
    </div>
  );
}

const SIGNAL_EDITORS: {
  [K in RuleSignal['kind']]: ComponentType<EditorProps<SignalOfKind<K>>>;
} = {
  metric:   MetricEditor,
  graph:    GraphEditor,
  taint:    TaintEditor,
  dsl:      DslEditor,
  external: ExternalEditor,
};

export function SignalEditor({
  signal, onChange, t,
}: { signal: RuleSignal; onChange: (s: RuleSignal) => void; t: V2Theme }) {
  // Lookup is keyed on the discriminant; the cast bridges the per-kind
  // component prop type to the union `signal` we hold here.
  const Editor = SIGNAL_EDITORS[signal.kind] as ComponentType<EditorProps>;
  return <Editor signal={signal} onChange={onChange} t={t} />;
}

export function defaultSignalFor(kind: RuleSignal['kind']): RuleSignal {
  switch (kind) {
    case 'metric':   return { kind: 'metric', field: 'blastRadius', op: '>', value: 25 };
    case 'graph':    return { kind: 'graph', pattern: 'public-api-without-test' };
    case 'taint':    return { kind: 'taint', source: 'env', sink: 'fs.write', requireSanitizer: true };
    case 'dsl':      return { kind: 'dsl', expr: 'safety:<40 +publicApi' };
    case 'external': return { kind: 'external', tool: 'eslint', ruleId: 'no-eval' };
  }
}
