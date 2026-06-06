import { useEffect } from 'react';

// Window event bridge from Blocks (plan auto-advance + inline line edit).
// Registers both listeners and tears them down together. Kept as a single
// hook so the two related bridges share one mount/cleanup cycle.
export function useCodingBlockEvents(setDraft: (value: string) => void) {
  useEffect(() => {
    function onPlanAdvance(e: Event) {
      const detail = (e as CustomEvent<{ nextText: string }>).detail;
      if (detail?.nextText == null) return;
      setDraft(`다음 단계: ${detail.nextText} `);
    }
    function onLineRewrite(e: Event) {
      const detail = (e as CustomEvent<{ original: string; instruction: string }>).detail;
      if (detail?.instruction == null) return;
      const orig = detail.original.length > 80 ? `${detail.original.slice(0, 80)}…` : detail.original;
      setDraft(`이 줄을 다시 작성: \`${orig}\` — ${detail.instruction}`);
    }
    window.addEventListener('coding:plan-advance', onPlanAdvance);
    window.addEventListener('coding:line-rewrite', onLineRewrite);
    return () => {
      window.removeEventListener('coding:plan-advance', onPlanAdvance);
      window.removeEventListener('coding:line-rewrite', onLineRewrite);
    };
  }, [setDraft]);
}
