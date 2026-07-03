// IssueCodeOverlay — Phase 1 stand-in for the eventual graph overlay.
//
// The plan calls for a glowing-node overlay over the intelligence map with
// stack-hits brighter and transitive suspects muted. Drawing that graph is
// Phase 2; for Phase 1 we render the same data as a sectioned list so the
// information is on-screen and the wiring contract (props in, click out)
// is already correct when the canvas renderer lands.
//
// Direct vs transitive separation is the core UX rule from the plan: never
// blend the two — that's the fastest way to lose reviewer trust.

type Props = {
  stackHits: string[];
  transitiveHits: string[];
  onNodeClick?: (id: string) => void;
};

function NodeButton({
  id,
  emphasis,
  onClick,
}: {
  id: string;
  emphasis: 'direct' | 'transitive';
  onClick?: (id: string) => void;
}) {
  const direct = emphasis === 'direct';
  const style: React.CSSProperties = direct
    ? { boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--intent-success-vivid) 30%, transparent)' }
    : { boxShadow: 'inset 0 0 0 1px var(--border-default)' };
  const tone = direct
    ? 'text-[var(--fg-strong)]'
    : 'text-[var(--fg-muted)]';
  const handle = () => onClick?.(id);
  const className = `text-left font-mono text-sm px-2 py-1 rounded-md bg-[var(--bg-surface-muted)] ${tone} ${
    typeof onClick === 'function'
      ? 'cursor-pointer hover:bg-[var(--bg-active)]'
      : ''
  }`;
  if (typeof onClick === 'function') {
    return (
      <button type="button" onClick={handle} style={style} className={className}>
        {id}
      </button>
    );
  }
  return <span style={style} className={className}>{id}</span>;
}

function Section({
  title,
  caption,
  ids,
  emphasis,
  onNodeClick,
}: {
  title: string;
  caption: string;
  ids: string[];
  emphasis: 'direct' | 'transitive';
  onNodeClick?: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5 px-1">
        <span
          className={`text-xs font-bold uppercase tracking-eyebrow ${
            emphasis === 'direct'
              ? 'text-[var(--fg-default)]'
              : 'text-[var(--fg-muted)]'
          }`}
        >
          {title}
        </span>
        <span className="text-xs text-[var(--fg-subtle)]">{caption}</span>
        <span className="ml-auto font-mono text-xs text-[var(--fg-subtle)]">
          {String(ids.length)}
        </span>
      </div>
      {ids.length === 0 ? (
        <p className="px-1 text-sm text-[var(--fg-subtle)] italic">None.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 px-1">
          {ids.map((id) => (
            <NodeButton key={id} id={id} emphasis={emphasis} onClick={onNodeClick} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function IssueCodeOverlay({
  stackHits,
  transitiveHits,
  onNodeClick,
}: Props) {
  return (
    <div className="rounded-2xl px-3 py-3 bg-[var(--bg-hover)] dark:backdrop-blur ring-1 ring-inset ring-[var(--border-muted)] flex flex-col gap-3">
      <Section
        title="Stack hits"
        caption="direct evidence"
        ids={stackHits}
        emphasis="direct"
        onNodeClick={onNodeClick}
      />
      <Section
        title="Transitive"
        caption="inferred evidence"
        ids={transitiveHits}
        emphasis="transitive"
        onNodeClick={onNodeClick}
      />
    </div>
  );
}
