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
  const tone = direct
    ? 'text-zinc-800 dark:text-zinc-100 ring-emerald-400/30'
    : 'text-zinc-500 dark:text-zinc-400 ring-zinc-400/20';
  const handle = () => onClick?.(id);
  const className = `text-left font-mono text-[11px] px-2 py-1 rounded-md ring-1 ring-inset bg-white/30 dark:bg-white/[0.03] ${tone} ${
    typeof onClick === 'function'
      ? 'cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
      : ''
  }`;
  if (typeof onClick === 'function') {
    return (
      <button type="button" onClick={handle} className={className}>
        {id}
      </button>
    );
  }
  return <span className={className}>{id}</span>;
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
          className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
            emphasis === 'direct'
              ? 'text-zinc-800 dark:text-zinc-200'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          {title}
        </span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{caption}</span>
        <span className="ml-auto font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
          {String(ids.length)}
        </span>
      </div>
      {ids.length === 0 ? (
        <p className="px-1 text-[11px] text-zinc-400 dark:text-zinc-500 italic">None.</p>
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
    <div className="rounded-2xl px-3 py-3 backdrop-blur bg-white/40 dark:bg-white/[0.04] ring-1 ring-inset ring-black/5 dark:ring-white/5 flex flex-col gap-3">
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
