# May 9 Feature Plan

이 폴더는 `/intelligence`를 2026년 기준의 AI-native 코드 인텔리전스 화면으로 끌어올리기 위한 기능별 3pager 모음이다.

원칙:

- 기존 정적 엔진이 이미 강하다는 전제에서 출발한다.
- 단순 시각화가 아니라 "분석 -> 판단 -> 행동"까지 닫힌 루프를 만든다.
- 검증된 기존 패턴(CodeScene, Sentry, Datadog, GitHub, Sourcegraph, Graphite)을 가져오되, 우리 강점인 정적/증거 기반을 moat로 만든다.
- 모든 기능은 `exact / overapprox / unknown`, `fresh / stale`, `interactive / background`를 명시하는 honesty layer를 깔고 간다.

문서 목록:

1. `01-hotspot-code-health-temporal-coupling.md`
2. `02-suspect-commit-incident-traceback.md`
3. `03-blast-radius-safe-change-planner.md`
4. `04-ai-investigation-workspace.md`
5. `05-ownership-routing-refactor-stack.md`
6. `06-ai-verified-fix-pipeline.md`

권장 구현 순서:

1. Hotspot / code health / temporal coupling
2. Blast radius / safe change planner
3. Suspect commit / incident traceback
4. Ownership / routing / refactor stack
5. AI investigation workspace
6. AI verified fix pipeline

이 순서를 추천하는 이유:

- 1~3번이 먼저 있어야 맵의 "신뢰 가능한 근거층"이 생긴다.
- 4번이 붙어야 조직 단위 액션으로 이어진다.
- 5번은 가장 강력하지만, 앞선 근거층이 없으면 그저 AI 요약 UI가 되기 쉽다.
