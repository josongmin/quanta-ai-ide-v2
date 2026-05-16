# Feature 11: Proof Obligation Whisperer

## One-liner
admission rule가 PR submit 직전이 아니라 keystroke 단위로, "이 한 줄이 어떤 obligation을 깨는지"를 미리 속삭여주는 in-editor preview surface — lint가 아니라 dependency-reasoning + taint를 입력 시점에 돌리는 것이 moat다.

## Problem Statement

2026년 기준으로 admission rules / policy gates는 거의 모든 조직에 있다.
문제는 **언제** 알려주냐다.

- ESLint: 파일 저장 → 빨간 줄
- 사내 policy: PR open → CI에서 ❌
- security scanner: PR merge 직전 → block
- delivery-gate (`features/admission-rules`): PR decision 패널에서 비로소 trip

이 시점들의 공통점은 단 하나, **이미 늦다**는 것이다.

개발자가 한 줄 짜는 데 5초 걸렸는데, 그게 layer 경계를 깨는지 / public API signature를 흔드는지 / taint sink로 새는지를 PR open 후에 알게 된다. 그러면 사용자는 두 가지 중 하나로 반응한다.

1. 다시 처음부터 머릿속에 컨텍스트를 로드해서 고친다 (비싸다)
2. override 사유를 적고 그냥 통과시킨다 (admission rule이 죽는 가장 흔한 경로)

특히 verified-fix pipeline이 candidate diff를 만든 직후, 그 diff가 admission을 깰 거라는 사실을 사용자가 PR을 만들고 나서야 알게 되는 건 명백한 워크플로 결함이다. fix candidate 단계에서 obligation 충돌은 후보 자체를 dismiss시킬 사유가 된다 (Feature 06의 `weakest_obligation` 신호와 겹친다).

따라서 필요한 것은 **admission engine을 keystroke latency로 끌어올리는 것**이다 — 단, 모든 룰을 매 keystroke에 돌릴 수는 없다 (cost가 폭발한다). 따라서 룰별 cost class와 incremental evaluation, 그리고 cost-aware UI가 동시에 필요하다.

## Why This Matters

이 기능이 잘 되면 admission rule의 의미가 달라진다.

- before: PR open 후의 reject 사유 → "또 막혔네"
- after: 입력 중 silent hint → "아, 이 import 위험하네 → 다른 utility로 갈아끼움"

조직 관점에서도 다르다. admission rule을 강하게 걸어두면 개발 속도가 느려진다는 게 가장 큰 도입 저항인데, whisperer가 깔리면 "강한 룰 = trip 0회 / 약한 룰 = trip 다수" 의 분포가 무너진다 (개발자가 trip이 나기 전에 알아서 피한다). 즉 strict policy + fast iteration이 동시 가능해진다.

verified-fix pipeline 입장에서는 candidate generator에 사실상 자동 self-critique가 한 layer 추가된다. 후보 diff가 admission을 깬다는 신호를 generator도 사용자도 같은 surface에서 본다.

## Moat

> Lint is syntactic. We evaluate dependency-reasoning + taint at keystroke.

ESLint, SonarLint, Copilot inline hints, JetBrains inspections — 입력 시점에 빨간 줄을 긋는 도구는 많다. 차별점은 **무엇을 보고 빨간 줄을 긋느냐**이다.

| 도구 | 입력 시점 평가 | dependency 추론 | taint flow | proof obligation | layer/import boundary | 비용 의식 UI |
| --- | --- | --- | --- | --- | --- | --- |
| ESLint / SonarLint | O | X (AST only) | X | X | partial (import rules) | X |
| JetBrains inspections | O | partial (project graph) | X | X | partial | X |
| Copilot inline | O | X (LLM hint) | X | X | X | X |
| Semgrep / CodeQL | save / CI | X | partial | X | X | X |
| **Proof Obligation Whisperer** | **O (debounced)** | **O** | **O (taint_flow)** | **O (proof_analysis)** | **O (graph_path)** | **O (BudgetContext)** |

이 조합 — keystroke latency + graph_path + taint_flow + proof_analysis + cost meter — 을 묶어서 보여주는 IDE/PR 도구는 2026년 기준으로 없다. 정적 엔진이 keystroke latency 안에 incremental 결과를 줄 수 있는 조직만이 이 라인을 그릴 수 있고, 우리 admission engine은 이미 SAMPLE_RULES와 evaluator를 가지고 있어서 frontend가 이 surface를 만들기만 하면 된다.

추가로, whisperer는 자기 자신이 비싼 분석을 함부로 돌리지 않는다는 점이 차별이다.

- `metric` 신호는 매 keystroke
- `graph` / `external`은 디바운스 후
- `taint` / `proof`는 명시적 trigger (또는 verified-fix candidate diff 도착 이벤트)

이 cost class는 admission entity의 `CostClass` (`'instant' | 'fast' | 'medium' | 'slow' | 'background'`)와 같은 enum을 그대로 사용한다.

## 기술 배경

핵심 자산:

- `features/admission-rules` — 룰 store, evaluator, sample rules. **whisperer가 import만 하고 수정하지 않는 SSOT.**
- `entities/admission` — `AdmissionRule`, `RuleSignal` (`metric` / `graph` / `taint` / `dsl` / `external`), `RulePreview`, `RuleMatch`, `EvidenceLevel`, `CostClass`.
- `features/verified-fix` — candidate diff 발행. whisperer는 이걸 read-only hook으로만 받는다.
- `features/fix-pipeline-permissions` — graduated permission. whisperer가 발견한 obligation 위반은 graduation을 깎거나 미루는 신호로 쓸 수 있음 (Phase 3).
- 정적 엔진 호출 (BE 계약): `graph_path`, `dependency_reasoning`, `taint_flow`, `proof_analysis`, `function_summary`.

whisperer 본체가 책임지는 것:

1. **incremental rule evaluation** — 파일 단위 cache, 변경된 라인 범위만 재평가.
2. **debouncing / cancellation** — keystroke 폭주에서 in-flight 평가를 cancel하고 latest input만 처리.
3. **per-cost-class scheduling** — `instant`는 sync, `fast`는 200ms debounce, `medium`은 800ms + cancellation, `slow`/`background`는 명시 trigger.
4. **whisper queue** — UI에 띄울 후보 큐. 같은 줄에 여러 rule이 trip되면 가장 강한 severity 1개 + "+N more" 표시.
5. **why-ask integration** — Feature 09 (admission self-explain) 모델을 통해 "왜 이게 trip 됐는지" 설명을 lazy fetch.
6. **suggested fix dispatch** — verified-fix와 같은 candidate generator를 호출하지만 scope가 다르다 (한 줄짜리 mechanical swap만).

whisperer가 책임지지 **않는** 것:

- admission rule 자체의 정의 / 편집 / 활성화 — `features/admission-rules`가 SSOT.
- verified-fix candidate 전체 검증 — Feature 06의 영역.
- PR-level 최종 decision — `evaluateAdmission`이 하는 것.

이 경계가 흐려지면 admission-rules 슬라이스가 다시 god-feature로 자란다. 그래서 whisperer는 **별도 슬라이스로 시작한다.**

## 제안 기능

### 1. Incremental Rule Evaluation

- `evaluateIncremental(fileId, dirtyLineRange, ruleSet) → WhisperHit[]`
- per-file cache: 파일별로 마지막 평가 결과를 메모리에 보존, dirtyLineRange가 닿지 않는 rule은 cache hit.
- rule 신호 종류별 invalidation 정책:
  - `metric` — 파일 metric 재계산 필요 시에만 invalidate.
  - `graph` — import graph가 닿는 파일이면 invalidate (호출 그래프 중심성 기준).
  - `taint` — source/sink 라인 범위와 dirty 범위가 겹칠 때만 invalidate.
  - `proof` — proof obligation이 걸린 함수의 signature line이 닿을 때만.
- cache key: `${fileId}::${ruleId}::${contentHash}` — contentHash는 파일 전체 해시가 아니라 rule이 본 라인 범위만 해시한다 (전체 해시는 한 글자 입력에도 무효화됨).

### 2. Whisper UI

- 위치: chat-agent 옆, 우상단 thin ticker. 이름: **WhisperTicker**.
- 1줄 row × 최대 3개 동시 표시. 더 많으면 "+N" chip.
- 컴포넌트: `<WhisperTicker>` → `<WhisperChip>` 리스트.
- `WhisperChip` 시각 룰:
  - **left stripe 절대 금지** (memory rule). severity는 chip 내부의 아이콘 + 텍스트로만 표현.
  - 글래스 chip — `rgba(255,255,255,0.5–0.7)` (light) / `rgba(20,20,20,0.3–0.45)` (dark) + `backdrop-filter: blur(...)`.
  - severity 표현: `info` = `(i)` 아이콘, `warn` = `!` 아이콘, `block` = `■` 아이콘 + bold 텍스트. **색 stripe 없음.**
  - kind 표현: 아이콘 옆 단어 라벨 (`layer`, `taint`, `proof`, `sig`, `eval`).
- expand 동작: chip 클릭 → small popover. 내용 = 룰 이름, 한 줄 설명, "왜?" 버튼, "fix 적용" 버튼.
- mute 버튼 (chip hover 시 노출): "이번 세션 동안 이 rule mute" → store에 muted set.

### 3. Why-Ask (admission self-explain hook)

- `WhisperChip` popover의 "왜?" 클릭 시 Feature 09 (admission self-explain)을 호출.
- whisperer는 self-explain 결과를 캐시만 함, 모델은 외부.
- explain 응답 schema: `{ ruleId, narrative, evidence: WhisperEvidence[], suggested: WhisperFixHint[] }`.
- explain은 `medium` cost class로 분류 — chip 자체는 `fast`인데 popover 열 때 추가 비용. cost meter에 명시적으로 출력.

### 4. Suggested Fix

- chip popover의 "fix 적용" 클릭 시 한 줄짜리 mechanical fix를 inline diff로 제안.
- 두 갈래:
  1. whisperer 자체가 보유한 micro-fix 룰 (예: `eval()` → `Function()` 금지 → 명시적 reject 메시지). LLM 호출 없음.
  2. verified-fix candidate generator의 sub-mode (단 한 줄 / 한 import / 한 signature) — Feature 06의 generator를 read-only hook으로 부른다 (whisperer가 generator를 소유하지 않음).
- 적용 결과: 사용자가 직접 한 줄 변경 또는 candidate diff replace. 적용 후 즉시 same-rule 재평가.

### 5. Mute / Snooze

- chip-level mute: 이 룰을 이 세션 동안 한 번 더 trip 안 시킴 (저장 안 함).
- file-level snooze: 이 파일에서 이 룰을 N분 동안 안 띄움 (저장 안 함).
- 영구 disable은 admission-rules 워크스페이스로 보내며, whisperer 안에서는 절대 영구 변경을 허용하지 않는다 (정책 회피 surface가 되지 않게).

### 6. Rule Confidence

- whisperer가 띄우는 hit는 `confidence: 'exact' | 'overapprox' | 'unknown'`을 항상 들고 있어야 함 (admission entity의 `EvidenceLevel`과 동일 enum).
- `unknown` hit는 chip에 흐릿한 보더 + `?` 아이콘으로 표시 (색 사용 금지).
- 정책: `unknown` confidence rule은 **block** severity로 띄우지 않는다 (warn 캡). overapprox는 그대로 trip 가능하지만 chip에 `(approx)` 라벨이 붙는다.

## AI-native 설계

이 feature는 LLM이 핵심이 아니다. **incremental analyzer + scheduler가 핵심**이고 LLM은 why-ask와 suggested-fix에만 들어온다. 그래서 AI-native 설계는 두 축이다.

1. **분석 결과의 schema가 LLM이 read하기 쉽게 typed payload로 박혀 있어야 함** — Feature 04의 typed evidence와 같은 원칙. whisper hit는 `WhisperHit` schema로 LLM에 직접 입력된다.
2. **LLM 호출은 cost class를 통과해야만 일어남** — popover의 "왜?" 버튼이 명시 trigger 역할. keystroke마다 LLM이 도는 일은 절대 없다.

bounded behavior:

- max in-flight analyses: 1 (latest input만, 이전은 모두 cancel).
- max LLM why-ask 동시 호출: 2 (popover가 빠르게 여러 개 열려도 두 개까지만).
- token budget: BudgetContext 한도를 넘으면 chip은 보이고 popover는 "예산 초과" 상태로 disable.

## 리팩토링 / 아키텍처 영향

새 슬라이스: `features/proof-whisperer/{model,scheduler,ui}`.

```
src/features/proof-whisperer/
  model/
    types.ts                # WhisperHit, WhisperKind, WhisperSeverity, ...
    WhisperContext.tsx      # provider + hook (useWhisperer)
    store.ts                # zustand or reducer; muted set, snoozed map, hits cache
    cache.ts                # per-file evaluation cache
  scheduler/
    debounce.ts             # cost-class-aware debounce + cancellation
    incremental.ts          # evaluateIncremental(fileId, dirtyRange, ruleSet)
    invalidation.ts         # which rules to invalidate per dirty range
  ui/
    WhisperTicker.tsx       # chat-agent 옆 ticker
    WhisperChip.tsx         # single chip
    WhisperPopover.tsx      # why-ask + fix 적용
    WhisperCostMeter.tsx    # BudgetContext 사용량 + per-class 비용 표시
  index.ts                  # WhisperProvider, WhisperTicker만 export
```

핵심 결정:

- **admission-rules core 손대지 않음** — whisperer는 `useAdmissionStore`에서 `rules`만 읽는다 (read-only). evaluator도 evaluator 함수만 호출하고 수정하지 않는다.
- **verified-fix는 read-only hook** — `features/verified-fix`가 발행하는 latest candidate diff에 구독한다. verified-fix store에 setter를 절대 박지 않는다.
- **Provider 스코프: only on `/coding` and `/fixes` routes** — 명시적으로 AppProviders에 넣지 **않는다**. 이유:
  - `/intelligence`에서는 keystroke 입력이 없음 (조사 surface). whisperer가 거기 떠 있으면 무의미한 mount cost.
  - `/admission` 워크스페이스에서는 사용자가 룰 자체를 편집 중이라 trip 메시지가 의미 없음 (오히려 산만).
  - global mount는 chat-agent의 ChatAgent god-component 사례와 같은 함정이다. 라우트 단위로 격리한다.
- **IntelligenceLayout 안에 마운트하지 않음** — Feature 04의 InvestigationProvider와 같은 원칙이지만 다른 라우트.

라우트 매핑 (paste-ready):

```ts
// src/app/router/router.tsx (둘 다 lazy)
<Route path="/coding/*" element={
  <WhisperProvider scope="coding">
    <CodingLayout />
  </WhisperProvider>
} />
<Route path="/fixes/*" element={
  <WhisperProvider scope="fixes">
    <FixesLayout />
  </WhisperProvider>
} />
```

`AppProviders.tsx`에는 절대 들어가지 않음.

## UI/UX 코멘트

이 섹션은 [00-uiux-science-guide.md](docs/plans/may-9-feature-plan/00-uiux-science-guide.md)를 인용한다. whisperer의 핵심 도전: **사용자가 입력 중**이라는 맥락에서 *방해하지 않으면서* preattentive하게 인지되는 것.

### 1. WhisperTicker 위치 — peripheral attention only (가이드 §7.1)

사용자 시선은 입력 중 캐럿 주변. ticker는 **peripheral vision** 영역(우상단 thin row, 화면 1/8 분량)에 위치. chat-agent는 우하단 — 시선 jump 없이 두 surface가 다른 quadrant.
겹치면 ticker가 z-index 양보 (사용자 active 작업 우선).

### 2. Severity 인코딩 — icon shape + text + weight (가이드 §1.1, §3.1)

| Severity | Icon | Text | Weight |
|---|---|---|---|
| info | `(i)` outline | "info" | regular |
| warn | `!` filled triangle | "warn" | medium |
| block | `■` filled square | "block" | semibold |

shape escalation (outline → filled triangle → filled square) + weight escalation (regular → medium → semibold). 두 redundant 채널이라 색맹 sim에서도 보존 (가이드 §9.2). hue 사용 0%.
**좌측 stripe / accent bar 영구 금지** (memory rule × 3+, 가이드 §3.3).

### 3. Cognitive load — 동시 노출 3개 (가이드 §2.1)

Cowan 4±1. ticker에 동시 chip은 **최대 3개**. 그 이상은 numeric badge `+N` (가이드 §2.1). chip 클릭 시 popover로 full list (가이드 §7.2 progressive disclosure).

action row per chip은 **2개**까지 (`why?` / `apply fix`) — Hick's Law (가이드 §2.2).

### 4. Glass 제약 (가이드 §4)

- alpha 0.30–0.45 dark / 0.50–0.70 light. 가독성 부족 시 alpha 안 올림 — text weight + size로 (가이드 §4.1).
- backdrop-filter ancestor transform 금지 (memory + 가이드 §4.2). chat-agent 컨테이너가 transform 쓸 가능성 있어 **WhisperTicker는 별도 portal**로 띄움 (Phase 2부터 강제, Phase 1은 sibling).
- WCAG AA 4.5:1 (본문 chip text), 3:1 (icon glyph) 측정 (가이드 §9.3).

### 5. Cost meter — numeric, never hue (가이드 §3)

ticker 끝 `WhisperCostMeter`:
- 누적 토큰 (numeric).
- 마지막 평가 cost class (text label `instant` / `fast` / `medium`).
- "deep check 실행" 버튼 — 클릭 시 예상 토큰/시간 popover로 confirm (가이드 §7.3 signifier — 비용 사전 노출).

비용 위계는 numeric만 — color가 의미를 운반하지 않음.

### 6. Expand는 popover, panel 금지 (가이드 §10 안티패턴)

사용자가 입력 중이다. full panel은 화면을 가려서 mute 사유가 늘어남.
popover position: chip 우측 12px gap (Fitts's Law, 가이드 §2.3). viewport 우측 끝에 닿으면 좌측 flip. popover 진입 200ms ease-out scale 0.95→1.0 (가이드 §5).

### 7. Typing 중 chip 안정성 — Bartram 2001 motion 원칙

평가 in-flight 동안 chip 내용을 **유지**하고 dot 1개만 1.2초 pulse (가이드 §1.2 — 한 surface 한 motion). chip 자체가 깜빡이면 사용자 시야 분산 → mute.
debounce 끝나고 결과 갱신은 **160ms cross-fade** (linear motion 금지, ease-out).

### 8. Mute / Snooze (가이드 §7.3)

mute는 chip 우측 작은 `×` (Fitts: 클릭 가능 거리 즉시). snooze는 popover 안 (덜 자주 쓰는 액션 = 한 단계 깊이; Hick's).
mute된 rule은 ticker에 안 보이지만 우상단 corner에 작은 `muted N` 배지로 *영속 노출* (가이드 §10 — toast 금지, fact는 사라지면 안 됨).

### 9. Motion 표 (가이드 §5)

| 이벤트 | duration | easing |
|---|---|---|
| chip 추가 (slide-in from right) | 200ms | ease-out (0, 0, 0.2, 1) |
| chip 결과 갱신 cross-fade | 160ms | ease-out |
| in-flight dot pulse | 1200ms loop | ease-in-out (sin) |
| popover open | 200ms | ease-out scale 0.95→1.0 |
| chip dismiss | 160ms | ease-in (0.4, 0, 1, 1) |

`prefers-reduced-motion: reduce` (가이드 §5.3, WCAG 2.3.3): 모든 motion → fade 120ms only. dot pulse 제거하고 정적 dot. 정보 손실 0.

### 10. Surface cheat (가이드 §8)

| 채널 | 사용 |
|---|---|
| Primary preattentive | icon shape + text + weight |
| Cognitive load | 동시 3 chip, action 2 |
| 색 사용 | none — severity 모두 모양·텍스트·weight |
| Motion | 1 surface 1 motion (in-flight dot only) |

### 11. 검증 (가이드 §9)

- color-blind sim 4종: info/warn/block icon이 보존되는지.
- WCAG AA: glass 위 chip text 4.5:1, icon glyph 3:1.
- time-to-first-glance: chip 도착 후 사용자가 *severity*를 인지하는 데 <1s. peripheral vision에서 인식되는 것이 핵심 — eye-tracking으로 검증.
- prefers-reduced-motion ON에서도 severity / cost 정보 손실 0.
- mute rate per rule: 너무 높은 rule은 admission rule 자체 튜닝 대상 (가이드 §9.1 외 측정).

## 검증된 외부 패턴과 차이점

- **ESLint / SonarLint** — 검증된 inline hint UX. 한계: AST 기반, dependency / taint / proof를 못 본다.
- **JetBrains inspections** — 프로젝트 그래프를 보지만 taint와 proof는 외부 플러그인. 그리고 cost class라는 개념 자체가 UI에 없음 (사용자가 inspection 비용을 못 봄).
- **GitHub Copilot inline** — LLM hint가 keystroke에 가깝지만 정적 보장이 없고 admission rule과 묶이지 않음.
- **Semgrep / CodeQL local runner** — taint/graph는 보지만 keystroke latency가 아님 (save/CI). 그리고 admission rule UI가 없음.
- **Sourcegraph Cody** — repo 컨텍스트는 강하지만 inline policy whisper 기능 없음.

차별 지점:
- typed `WhisperHit` payload (rule kind + confidence + cost class).
- cost-class-aware 스케줄러 + UI 노출.
- admission rule SSOT을 그대로 사용 (별도 룰셋 아님 — admission rule을 만들면 자동으로 whisper로 흐른다).
- verified-fix candidate diff에 hook이 걸려서, 사람이 친 코드뿐 아니라 AI가 생성한 코드도 같은 surface에서 검사된다.

## 성공 지표

- **whisper trip → user-edit-before-save 비율** — chip이 뜨고 사용자가 라인을 고친 비율. 높을수록 whisperer가 admission trip을 사전에 흡수한 것.
- **PR-level admission block rate 감소** — whisper 도입 전후로 PR-decision 패널의 block 비율.
- **per-cost-class evaluation count / 시간** — `instant` 99% 안에 완료 / `fast` 95% 200ms / `medium` 95% 1s 등 SLO.
- **muted rule ratio** — 너무 자주 mute된 rule은 노이즈 신호 → admission rule 자체 튜닝 대상.
- **why-ask click-through** — popover까지 간 hit 비율. 너무 낮으면 chip이 노이즈, 너무 높으면 chip 메시지가 불충분.
- **suggested-fix accept rate** — fix 버튼이 적용된 비율. acceptance가 verified-fix candidate 본체와 비교 가능해야 함.
- **token spend per session** — BudgetContext에서 직접 측정. cost ceiling 위반 빈도.

## 출시 순서

원칙: keystroke에 비싼 분석을 켜는 건 위험하다. **save-time only → keystroke debounced → integration with verified-fix** 순서로 좁혀서 깐다.

### Phase 1 — 3 rules at save-time only

좁힌다. 목표: "save 직후 ticker가 1초 안에 chip 1~3개를 보여준다."

- 3개 룰만 평가:
  1. `unsafe_eval` (admission `external` / `eslint.no-eval` 매핑).
  2. `layer_violation` (admission `graph` / `'layer-violation'` pattern).
  3. `public_api_without_test` (admission `graph` / `'public-api-without-test'` — `signature_break`의 phase 1 형태).
- 트리거: 파일 save 이벤트.
- 디바운스 / 캐시 / 인크리멘털 없음 — full file evaluate, blocking 1초 내.
- UI: WhisperTicker, WhisperChip, mute (세션 단위), why 버튼은 disabled stub.
- AppProviders 진입 금지, `/coding` 라우트만 mount.
- BudgetContext: 평가 1회당 mock 토큰 차감 (LLM 미호출, telemetry용 placeholder).

### Phase 2 — keystroke debounced

- 인크리멘털 평가 + cost-class debounce + cancellation.
- 룰 5개로 확장 (위 3개 + `taint_obligation`, `proof_missing`).
- per-file cache + dirty line range invalidation.
- Why-ask popover (Feature 09 admission self-explain hook).
- snooze (file 단위, 시간 만료).
- WhisperCostMeter — 현재 세션 누적 + 마지막 cost class 라벨.

### Phase 3 — suggested fix + verified-fix integration

- WhisperChip popover에 "fix 적용".
- verified-fix candidate diff에 subscribe → AI 생성 diff도 같은 ticker로 흐름.
- whisperer hit의 `weakest_obligation`을 verified-fix candidate의 trust signal에 합산 (read-only — verified-fix store에는 안 박는다).
- fix-pipeline-permissions 통합: whisperer가 잡은 unfixed block-severity hit가 있는 동안 graduated 권한이 자동 차감 (graduation 진척 정지).
- mechanical fix micro-rule 4개 (eval→Function ban, layer import auto-relocate hint, missing test stub, signature backward-compat shim).

---

## Frontend 구현계획

백엔드는 별도 트랙. fixture는 `entities/proof-whisperer/`에 둔다. 백엔드 붙는 시점에 schema만 일치하면 fixture 파일만 dead code화된다.

### 0. 사전 정리 (모든 phase 공통)

- 새 슬라이스: `src/features/proof-whisperer/{model,scheduler,ui}`.
- 새 entity: `src/entities/proof-whisperer/` — `WhisperHit`, `WhisperKind`, `WhisperSeverity`, `WhisperEvidence`, `WhisperFixHint` 타입과 fixture.
- AppProviders: 손대지 않는다. WhisperProvider는 라우트 레이아웃 안.
- `features/admission-rules`: import만 하고 수정하지 않는다.
- `features/verified-fix`: Phase 3에서 read-only hook 추가, 그 외 손대지 않는다.

### Phase 1 — Save-time, 3 rules

#### 1.1 entity 정의 — `src/entities/proof-whisperer/`

`model/types.ts` (paste-ready, FE/BE contract 고정):

```ts
// branded ids — 문자열 혼용 방지. 다른 entity의 EvidenceId 등과 충돌 안 나게.
export type WhisperHitId = string & { readonly __brand: 'WhisperHitId' };
export type WhisperFixId = string & { readonly __brand: 'WhisperFixId' };

// hard constraint — 사용자 요청 schema. 절대 추가/삭제 시 backend contract 부수는 변경.
export type WhisperSeverity = 'info' | 'warn' | 'block';
export type WhisperKind =
  | 'layer_violation'
  | 'taint_obligation'
  | 'proof_missing'
  | 'signature_break'
  | 'unsafe_eval';

// admission entity의 CostClass와 동일 enum을 그대로 import해서 쓴다.
// 문자열 중복 정의 금지 — admission이 SSOT.
import type { CostClass, EvidenceLevel } from '@entities/admission';

// 어떤 admission rule이 trip 시켰는지 역참조. AdmissionRule.id를 그대로 사용.
export type WhisperRuleRef = {
  ruleId: string;          // = AdmissionRule['id']
  ruleName: string;        // 캐시된 표시명 (ruleStore lookup 비용 제거)
};

// 한 줄짜리 hint. why-ask 응답에서 사용.
export interface WhisperFixHint {
  id: WhisperFixId;
  kind: 'micro_swap' | 'add_import' | 'remove_import' | 'add_test_stub' | 'compat_shim';
  label: string;                      // <= 60 chars
  preview: string;                    // <= 200 chars, single-line diff text
  origin: 'whisperer_native' | 'verified_fix';   // LLM 호출 여부 추적
}

// chip이 들고 있는 단위. 한 줄 위반 = 1 WhisperHit.
export interface WhisperHit {
  id: WhisperHitId;
  kind: WhisperKind;
  severity: WhisperSeverity;
  rule: WhisperRuleRef;
  fileId: number;                     // entities/file과 동일 키
  range: { startLine: number; endLine: number };
  message: string;                    // <= 100 chars, chip에 그대로 표시
  confidence: EvidenceLevel;          // 'exact' | 'overapprox' | 'unknown'
  cost: CostClass;                    // 평가에 쓰인 비용 클래스
  // 'unknown' confidence는 'block' severity로 승격 금지 — composeHit에서 강제.
}
```

`model/fixtures.ts` — Phase 1 demo용 hit 6개 (rule 3개 × 2 파일).

`index.ts` — public export는 type 4개와 fixture 1개만.

#### 1.2 store + scheduler — `src/features/proof-whisperer/model/`, `scheduler/`

`WhisperContext.tsx`:

```ts
export interface WhisperState {
  hits: ReadonlyMap<number /* fileId */, ReadonlyArray<WhisperHit>>;
  muted: ReadonlySet<string>;         // ruleId
  snoozed: ReadonlyMap<string, number>; // ruleId -> expiresAt(ms)
  inFlight: ReadonlySet<number>;      // fileId 평가 중
  lastCost: CostClass | null;
}

export interface WhisperApi {
  evaluateOnSave(fileId: number): void;          // Phase 1 entry
  evaluateOnEdit(fileId: number, dirtyRange: { startLine: number; endLine: number }): void;  // Phase 2
  mute(ruleId: string): void;
  unmute(ruleId: string): void;
  snooze(ruleId: string, durationMs: number): void;
  applyFix(hitId: WhisperHitId, fixId: WhisperFixId): Promise<{ ok: boolean }>;  // Phase 3
}
```

`scheduler/debounce.ts` (paste-ready API — Phase 2에서 동작 활성화):

```ts
import type { CostClass } from '@entities/admission';

export type ScheduleHandle = { cancel(): void };

export interface CostAwareScheduler {
  // cost class에 따라 debounce window를 자동 선택.
  // instant   → 즉시 sync 실행 (Promise.resolve로 wrap).
  // fast      → 200ms trailing.
  // medium    → 800ms trailing + cancellation.
  // slow      → 명시 trigger only (schedule 호출이 그 자체로 trigger).
  // background → enqueue, UI는 pending 표시.
  schedule<T>(
    key: string,                        // 동일 key는 in-flight 1개만, 새 것이 오면 cancel.
    cost: CostClass,
    fn: (signal: AbortSignal) => Promise<T>,
  ): { handle: ScheduleHandle; result: Promise<T> };

  cancelAll(prefix?: string): void;     // 라우트 unmount 시 호출.
}

export function createScheduler(): CostAwareScheduler { /* impl */ }
```

`scheduler/incremental.ts` (Phase 1: full eval, Phase 2에서 incremental로 교체):

```ts
import type { AdmissionRule, RuleEvaluation } from '@entities/admission';
import type { WhisperHit } from '@entities/proof-whisperer';

export interface EvaluateInput {
  fileId: number;
  dirtyRange: { startLine: number; endLine: number } | 'full';
  rules: ReadonlyArray<AdmissionRule>;
  signal: AbortSignal;
}

// Phase 1: dirtyRange 무시하고 full evaluate. Phase 2에서 cache + range로 교체.
export async function evaluateIncremental(input: EvaluateInput): Promise<WhisperHit[]> {
  /* impl */
}
```

`model/cache.ts` (Phase 2 진입 시 채움; Phase 1은 빈 stub):

```ts
export interface PerFileCacheEntry {
  ruleId: string;
  contentHash: string;        // rule이 본 라인 범위만 해시
  hits: WhisperHit[];
  evaluatedAt: number;
}

export interface PerFileCache {
  get(fileId: number, ruleId: string, contentHash: string): WhisperHit[] | null;
  set(fileId: number, ruleId: string, contentHash: string, hits: WhisperHit[]): void;
  invalidate(fileId: number, ruleIds?: string[]): void;
  invalidateAll(): void;
}
```

`composeHit` 헬퍼 (런타임 강제):

```ts
export function composeHit(input: Omit<WhisperHit, 'id'>): WhisperHit {
  if (input.confidence === 'unknown' && input.severity === 'block') {
    // 정책: unknown confidence rule은 block 금지. warn으로 강등.
    input = { ...input, severity: 'warn' };
  }
  return { ...input, id: makeWhisperHitId() };
}
```

#### 1.3 UI — `src/features/proof-whisperer/ui/`

- `WhisperTicker.tsx` — 우상단 thin row. `useWhisperer()`에서 hit 리스트 구독, 최근 3개 (severity desc, then recent) 표시.
- `WhisperChip.tsx` — 글래스 chip. props: `WhisperHit + onMute + onWhy + onFix`. **left stripe 없음.** severity는 아이콘 + 텍스트.
- `WhisperPopover.tsx` — Phase 1은 stub (close 버튼만). Phase 2에서 채움.
- `WhisperCostMeter.tsx` — Phase 1은 lastCost label만 표시 (아이콘 + 텍스트).

#### 1.4 라우팅 / providers

- `<WhisperProvider scope="coding">`을 `/coding` 레이아웃에 마운트.
- `<WhisperProvider scope="fixes">`를 `/fixes` 레이아웃에 마운트.
- `AppProviders.tsx`에는 **추가하지 않는다**.
- `/intelligence`, `/admission`, `/onboarding`, `/`에는 mount 금지.

#### 1.5 wiring

- save 이벤트는 coding 라우트의 editor surface에서 `useWhisperer().evaluateOnSave(fileId)` 호출.
- mute는 chip에서 ruleId로 dispatch.
- 외부로의 부작용 없음 (admission 룰 변경 안 함, verified-fix store 안 건드림).

#### 1.6 스타일 가드 (memory rules 반영)

- 좌측 컬러 stripe 사용 절대 금지 (memory rule, 3+회 경고).
- glassmorphism alpha 범위 준수 (0.3–0.45 dark / 0.5–0.7 light).
- WhisperTicker ancestor에 transform/filter/perspective 없는지 확인 (없으면 portal로 분리).
- chat-agent ticker와 시각적으로 같은 reference grade의 GlassCard 모듈 위에서 동작.

#### Phase 1 완료 조건

- [ ] `/coding` 라우트에서 파일 save 시 1초 내에 ticker가 채워진다.
- [ ] 3개 룰 모두 fixture 기반으로 trip되고 chip에 표시된다.
- [ ] severity는 아이콘 + 텍스트로 구별되며 색 stripe가 어디에도 없다.
- [ ] mute 클릭이 동일 세션 내 재발생을 막는다.
- [ ] `/intelligence`, `/admission`에서 ticker가 mount되지 않는다 (provider scope 검증).
- [ ] WhisperCostMeter가 `fast` cost label을 표시한다 (mock).

---

### Phase 2 — keystroke debounced

#### 2.1 incremental evaluator

- `scheduler/incremental.ts`에서 dirtyRange 활용. rule별 invalidation 정책 (`invalidation.ts`)을 통과한 룰만 재평가.
- 룰 5개로 확장: `unsafe_eval`, `layer_violation`, `signature_break` (= public_api_without_test), `taint_obligation`, `proof_missing`.

#### 2.2 cost-aware scheduler 활성화

- `scheduler/debounce.ts`의 4 cost class 모두 동작.
- key 스킴: `${routeScope}::${fileId}::${ruleId}`.
- 라우트 unmount 시 `cancelAll(routeScope)`.

```ts
// 사용 예 (paste-ready)
const sched = useScheduler();
const { handle, result } = sched.schedule(
  `coding::${fileId}::${rule.id}`,
  costFor(rule),
  (signal) => evaluateIncremental({ fileId, dirtyRange, rules: [rule], signal }),
);
result
  .then((hits) => mergeHits(fileId, rule.id, hits))
  .catch(/* AbortError 무시 */);
```

#### 2.3 Why-ask popover

- `WhisperPopover.tsx`: rule narrative + evidence + why-button → Feature 09 admission self-explain hook.
- self-explain은 lazy fetch — popover open 시점에만.
- 응답 캐시: ruleId 단위 메모리.
- BudgetContext가 한도 초과면 popover에 "예산 초과" 상태 표시 + why-button disabled.

#### 2.4 snooze

- file-level snooze 추가. expire timestamp만 메모리에 보존.
- snoozed rule은 ticker에서 제외, count는 "+N (snoozed)"에 합산해서 노출.

#### 2.5 WhisperCostMeter 확장

- 누적 토큰, 마지막 cost class, deep-rule-check 버튼.
- deep-rule-check 클릭 시 confirm popover (예상 토큰/시간) → 명시 trigger로 `slow` 룰 평가.

#### Phase 2 완료 조건

- [ ] keystroke 입력 중 ticker가 깜빡이지 않고 in-flight 표시만 dot pulse.
- [ ] 동일 파일 빠른 입력 시 in-flight 평가가 cancel되고 latest만 결과 반영.
- [ ] cost class별 debounce window가 SLO를 만족 (instant 즉시 / fast 200ms / medium 800ms).
- [ ] popover의 why 버튼이 self-explain 응답을 보여준다.
- [ ] snooze가 chip을 사라지게 하고 expire 후 다시 나타난다.
- [ ] BudgetContext 한도 초과 시 LLM 호출이 차단된다.

---

### Phase 3 — suggested fix + verified-fix integration

#### 3.1 verified-fix candidate diff hook

- `features/verified-fix`의 latest candidate diff 이벤트에 subscribe. **단방향 read.**
- candidate diff가 도착하면 affected files에 대해 `evaluateIncremental` 한 번 더 실행 (cost class는 candidate diff 단위로 medium).
- 결과는 verified-fix UI 안의 작은 inline whisper strip으로도 노출 (verified-fix slice 안에 새 작은 컴포넌트, 그러나 컨텍스트는 whisperer의 것을 read-only로 사용).

#### 3.2 suggested-fix 적용

- `WhisperPopover.tsx`의 fix 버튼.
- whisperer-native 4개 micro-fix:
  1. `eval()` → 명시적 reject + 대체 시그니처 제안 (LLM 호출 없음).
  2. import path가 layer 경계 위반 → 허용된 경로로 substring swap (LLM 호출 없음).
  3. public-api-without-test → 빈 test stub 추가 (LLM 호출 없음).
  4. signature_break → backward-compat shim (deprecated alias) (LLM 호출 없음).
- 위 4개로 부족하면 verified-fix candidate generator를 호출 (sub-mode `single_line`). 호출 시 cost class는 `slow`, BudgetContext 차감.

```ts
// applyFix API (paste-ready)
export interface ApplyFixInput {
  hit: WhisperHit;
  fix: WhisperFixHint;
}
export interface ApplyFixResult {
  ok: boolean;
  reason?: 'budget_exceeded' | 'fix_no_longer_applicable' | 'user_canceled';
  appliedRange?: { startLine: number; endLine: number };
}

export async function applyFix(
  input: ApplyFixInput,
  ctx: { budget: BudgetSnapshot; verifiedFix: VerifiedFixHooks /* read-only */ },
): Promise<ApplyFixResult> { /* impl */ }
```

적용 후: 같은 rule을 즉시 재평가, hit이 사라지면 chip pop-out.

#### 3.3 fix-pipeline-permissions 통합

- `useFixPipelinePermissions().ledger`를 read.
- block-severity unfixed hit가 N개 이상이면 graduation 카운트 freeze.
- whisperer는 ledger를 mutate하지 않는다 (permission 슬라이스가 SSOT). graduation freeze는 permission 쪽이 whisperer의 unfixed-block 카운트를 read해서 결정.

#### 3.4 polish

- keyboard nav: `Alt+W` ticker 포커스, `j/k`로 chip 이동, `Enter`로 popover, `m`으로 mute, `s`로 snooze, `f`로 fix.
- aria role: ticker는 `role="status"`, chip은 `role="button" aria-label="..."`.
- empty state, error state, network 단절 (self-explain 호출 실패) 시 fallback.

#### Phase 3 완료 조건

- [ ] verified-fix candidate diff 도착 시 ticker가 자동 갱신된다.
- [ ] 4개 native micro-fix 모두 LLM 호출 없이 적용된다.
- [ ] graduation 카운트가 unfixed block hit 동안 멈춘다 (permission read-only).
- [ ] keyboard nav 전체 동작.
- [ ] verified-fix store / admission store에 whisperer가 write하지 않음을 grep으로 검증.

---

### 모듈 의존성 그래프

```
entities/admission                entities/proof-whisperer
       ↑                                    ↑
features/admission-rules (read-only)        |
       ↑                                    |
       └──────────────► features/proof-whisperer/model
                              ↑          ↑
                          scheduler    cache
                              ↑
                          ui/WhisperTicker, WhisperChip, WhisperPopover, WhisperCostMeter
                              ↑
        coding/CodingLayout, fixes/FixesLayout (← provider 마운트)
                              ↑
                         (read-only) features/verified-fix latest candidate
                              ↑
                         (read-only) features/fix-pipeline-permissions ledger
```

`AppProviders`, `IntelligenceLayout`, `chat-agent`는 이 그래프 밖이다.

### 손대지 않을 것

- `features/admission-rules` core (store, evaluator, UI workspace) — 그대로 둔다. import만.
- `features/verified-fix` — Phase 3에서 read-only hook 1개만 추가, store에 write 절대 금지.
- `features/fix-pipeline-permissions` — Phase 3에서 read-only consumer만, ledger에 write 금지.
- `features/chat-agent` — 손대지 않는다. ticker는 sibling으로 시작, 위치 충돌 시 ticker가 양보.
- `IntelligenceLayout`, `AppProviders` — 절대 추가 마운트하지 않는다.

### 백엔드 트랙과의 contract

- `WhisperHit`, `WhisperFixHint` schema가 frontend-backend boundary.
- `evaluateIncremental(EvaluateInput)`가 swap point — Phase 1/2는 admission evaluator를 직접 호출하는 mock, BE 붙으면 동일 시그니처로 incremental analyzer 호출로 교체.
- `WhisperRuleRef.ruleId`는 `AdmissionRule['id']`와 동일 string union — 별도 매핑 테이블 만들지 않음.
- `CostClass`, `EvidenceLevel`은 `entities/admission`의 enum 그대로 재사용. whisperer 전용 enum 만들지 않음 (의미 이중화 방지).
- self-explain 응답 schema는 Feature 09에서 정의, whisperer는 그 schema를 import만 함.

## Why Developers Will Care

이 기능이 잘 되면 admission rule이 "PR 마지막에 사람을 막는 것"에서 "코드 짜는 동안 옆에서 한 번씩 알려주는 것"으로 바뀐다.

룰을 강하게 걸어도 개발 속도가 안 죽는 이유는 trip 자체가 줄어서다. 사용자는 chip 한 개를 보고 한 줄을 다르게 짠다. 그 한 줄은 다시 PR open → CI block → 재작업의 비용을 0으로 만든다.

verified-fix가 만든 patch가 admission을 깨는지를 candidate 단계에서 같이 보는 것도 같은 가치다. AI가 만든 코드도 사람이 만든 코드와 같은 obligation을 받고, 같은 surface에서 검사된다.

lint는 syntactic이다. whisperer는 dependency-reasoning과 taint를 keystroke 단위로 본다. 이 조합은 2026년 시장에 아직 없고, 우리는 admission rule SSOT을 이미 가지고 있어서 이 surface 하나만 더 깔면 된다.
