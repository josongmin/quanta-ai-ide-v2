// Tiny lettermark fallbacks for providers that don't have a brand-icon.

export function GitLabMark() {
  return (
    <span className="w-4 h-4 rounded-sm inline-flex items-center justify-center text-[8px] font-black"
      style={{ background: 'var(--fg-default)', color: 'var(--bg-canvas)' }}>
      GL
    </span>
  );
}

export function BitbucketMark() {
  return (
    <span className="w-4 h-4 rounded-sm inline-flex items-center justify-center text-[8px] font-black"
      style={{ background: 'var(--fg-default)', color: 'var(--bg-canvas)' }}>
      BB
    </span>
  );
}
