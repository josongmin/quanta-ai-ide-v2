# Feature 07: Evidence Decay Monitor

## One-liner
Investigation 답변에 "이 답이 X시간 안에 썩는다"는 반감기를 박고, 정적 분석 이벤트가 발생하면 답을 자동으로 unknown 상태로 끌어내리는 evidence half-life monitor를 추가한다.

## Problem Statement

Investigation은 답을 잘 만들어주지만, 그 답이 **언제까지 유효한지**를 모른다.

- taint_path는 시그니처가 바뀌면 즉시 무효
- recent_change는 시간만 지나도 늙음
- owner는 팀 이동/PR 활동으로 흔들림
- test_coverage는 머지 한 번이면 갈아엎힘

현재 [src/entities/investigation/model/types.ts](src/entities/investigation/model/types.ts)의 `EvidenceItem`에는 `staleness: 'fresh' | 'stale' | 'unknown'`이 있지만 **반감기 모델이 없다**. 즉 fresh가 언제 stale이 되는지, 어떤 이벤트가 staleness를 깨는지 schema에 없다.

그 결과:

1. 어제 만든 조사 답을 오늘도 그대로 신뢰한다 (signature가 바뀌었는데도)
2. 백그라운드 잡이 끝난 뒤 evidence가 늙는데 답변은 그대로다
3. "regenerate" 버튼이 항상 켜져 있어서 의미가 없다 (눌러야 할 타이밍을 모른다)

## Why This Matters

AI-native 조사 도구의 두 번째 약점은 **stale answer**다.
첫 번째는 hallucination, 두 번째는 어제는 맞았던 답을 오늘 그대로 들고 있는 것.

generic RAG는 이 문제를 못 푼다. 텍스트 chunk에는 "이 chunk가 언제까지 유효한가"가 없다.
우리는 evidence kind마다 **무효화 조건이 다르다는 걸** 타입으로 알고 있다.

- before: 답변이 한 번 나오면 끝
- after: 답변이 살아 있는 동안 underlying 시그니처/PR/index 이벤트를 구독, decay threshold 넘으면 알아서 unknown으로 강등

이게 되면 "AI 답변을 캐시해도 되나?"라는 사용자 의심이 사라진다.

## Moat

> Generic RAG can't model evidence half-life. We can — because our evidence is **typed** and our engine emits **index_status** events.

구체적으로:

1. EvidenceItem에는 `kind`, `sourceTool`이 있다 → kind별 decay model을 쓸 수 있다.
2. 우리 엔진은 `index_status`, `incremental_analysis`, `function_summary` diff 이벤트를 emit한다 → "어떤 변경이 어떤 evidence를 깼는가"를 정확히 안다.
3. Investigation 답변은 evidence triple로 구성된다 → 어떤 evidence가 깨졌는지 → 답변 어떤 슬롯이 흔들렸는지 직접 추적 가능.
4. 즉 reactivity가 chunk text similarity가 아니라 **typed event subscription**으로 동작한다.

generic chat은 답변 + timestamp 정도밖에 못 한다. 우리는 "이 답이 살아 있는 evidence 3개에 의존하고, 그중 taint_path는 signature change에 즉사한다"까지 schema에 박는다.

## 기술 배경

핵심 엔진 자산 (이 feature가 의존하는 것):

- `index_status` — 현재 인덱싱 상태/마지막 incremental 시각/dirty file 목록
- `incremental_analysis` — 변경된 파일/심볼에 대한 분석 갱신 이벤트
- `function_summary` diff — 함수 시그니처/요약 변경 이벤트
- `change_impact_analysis` — PR/커밋 단위 영향 범위
- `taint_flow` — taint path 재계산 트리거
- `find_references` — caller/callee 갱신

decay는 두 축이 있다.

1. **time-based decay** (단순 노화)
   - recent_change, incident — 시간만 지나면 stale
2. **event-based invalidation** (구조 변경)
   - taint_path → signature change
   - owner → team move / new PR activity
   - test_coverage → merge to main
   - symbol → function_summary diff
   - caller/callee → graph edge change

이 둘은 같이 돈다. evidence마다 "어떤 이벤트가 invalidate시키는지"가 schema에 박혀 있어야 답변 레벨에서 decay를 합산할 수 있다.

내부 단위 (신규):

- `DecayModel` — kind별 half-life + invalidation event mask
- `DecayState` — 현재 evidence가 얼마나 살아 있는지 (0..1)
- `Subscription` — investigation이 watch 중인 invalidation 이벤트 list
- `InvalidationEvent` — 엔진이 emit하는 atomic event
- `RegenerateEstimate` — 재생성 시 예상 cost (BudgetContext와 묶음)

## 제안 기능

### 1. Per-EvidenceKind Decay Model

각 `EvidenceKind`에 1:1 대응되는 decay model을 둔다.

- taint_path → half-life 무한대, but signature change 시 즉시 dead
- recent_change → half-life 72h (window이 이미 시간이라 시간만 본다)
- owner → half-life 14d, but team move event / new PR by other team 시 즉시 stale
- test_coverage → half-life 7d, but merge to main 시 즉시 dead
- symbol → half-life 무한대, but function_summary diff 시 즉시 stale
- caller/callee → half-life 24h, graph edge change 시 즉시 dead
- incident → half-life 30d (incident는 늙어도 학습 가치가 있다)

decay function은 **kind별 다른 형태**다 (linear / step / exponential). 한 함수로 묶지 않는다.

### 2. "Rots in Xh" Pill on InvestigationAnswer

[src/features/investigation/evidence/AnswerView.tsx](src/features/investigation/evidence/AnswerView.tsx) 헤더에 작은 pill을 띄운다.

- "fresh · rots in 6h"
- "stale · regenerate recommended"
- "dead · taint_path invalidated by signature change"

답변 단위 decay = `min(evidence[i].decayState)` (가장 빨리 썩는 evidence에 답이 묶임).
이 pill이 답변 신뢰도의 first-glance signal이다.

### 3. Auto-injection of `analysis_stale` UnknownTag

decay threshold가 넘는 순간:

- AnswerView의 unknowns 슬롯에 `{ code: 'analysis_stale', label: '...' }`를 자동 push
- 이미 있던 unknowns는 그대로 둔다 (덮어쓰지 않음)
- 답변 본문은 그대로 보여주되, 헤더는 stale로 전환

이건 04 doc의 unknowns slot 강제 정책과 정합한다 — unknowns는 "no_known_unknowns" sentinel을 포함해 비워둘 수 없으므로, decay가 unknown을 **추가**하는 건 안전하다.

### 4. Subscription Model + Watcher

investigation은 close 후에도 "watched" 상태로 남을 수 있다.

- 답변이 의존하는 evidence 각각에 대해 invalidation event subscription 등록
- 엔진이 매칭 이벤트 emit → 답변이 stale로 전환 + watcher 알림
- 알림은 우하단 JobsTray 옆 작은 inline notice (modal 금지 — focus 흐름 끊김)

watch 자체는 명시적 opt-in. "Watch this answer" 버튼이 답변 footer에 있고, 누르지 않으면 답변은 close 시점에 그냥 해제된다 (메모리 leak 방지).

### 5. Regenerate CTA + Budget-aware Estimate

기존 regenerate 버튼은 항상 켜져 있어 의미가 흐릿했다. 이번 feature 후:

- decay가 fresh일 땐 disabled + "fresh · rots in Xh"
- stale 진입 시 highlighted + "regenerate (~480 tokens, ~0.4¢)"
- estimate는 BudgetContext (04 doc의 investigation-local context)에서 끌어옴
- 비용은 evidence kind별 re-gather cost를 합산 (taint_path 재계산이 가장 비싸다)

이게 곧 "재생성 가치 ≥ 재생성 비용"을 frontend에서 판단할 수 있게 만든다.

## AI-native 설계

이 feature는 답변 생성 모델을 더 똑똑하게 만들지 않는다. 대신 **답변의 수명을 관리**한다.

AI-native 조건:

1. 답변이 정적 텍스트가 아니라 **typed evidence dependency tree**다.
2. 엔진 이벤트가 답변 슬롯을 직접 흔든다 (text re-embed 같은 우회로 없음).
3. 사용자가 "regenerate?"를 결정하는 데 필요한 모든 정보(decay 상태, 비용, 어떤 evidence가 깨졌는지)가 답변 바로 옆에 있다.
4. AI가 답변을 만들 때 자기가 어떤 이벤트에 묶여 있는지 declare해야 한다 (subscribe descriptor를 답변과 함께 emit).

좋은 흐름:

- 어제 만든 "왜 이 노드가 위험해?" 답변
- 오늘 아침 누군가 같은 함수 시그니처를 바꿈 (function_summary diff)
- watcher가 그 evidence의 taint_path가 죽은 걸 감지
- 답변 헤더가 "dead · regenerate"로 바뀜, unknowns에 `analysis_stale` 추가
- regenerate 비용 표시 → 클릭 한 번에 새 답변

즉 답변은 **시간을 인식하는 객체**가 된다.

## 리팩토링 / 아키텍처 영향

기존 [src/features/investigation/](src/features/investigation/)는 evidence 기반 답변 생성에 집중되어 있다. decay는 그 위에 얹는 **얇은 reactive layer**여야 한다 — investigation 코어를 침범하면 안 된다.

신규 슬라이스:

- `features/evidence-decay/model` — DecayModel, DecayState, InvalidationEvent 타입과 store
- `features/evidence-decay/subscriptions` — investigation answer ↔ engine event 매칭 정책 (mock first)
- `features/evidence-decay/ui` — DecayPill, RegenerateCTA, WatchToggle, StaleNotice 같은 렌더링 primitives

investigation 슬라이스는 다음만 변경한다:

1. [src/features/investigation/evidence/AnswerView.tsx](src/features/investigation/evidence/AnswerView.tsx) — DecayPill 슬롯 1개 추가 (props로 주입; AnswerView 자체는 decay를 모른다)
2. [src/features/investigation/evidence/UnknownTag.tsx](src/features/investigation/evidence/UnknownTag.tsx) — `analysis_stale` 케이스 이미 있음 (04 doc UnknownTag union), 별도 변경 없음
3. [src/features/investigation/model/InvestigationContext.tsx](src/features/investigation/model/InvestigationContext.tsx) — `regenerate()` 액션이 BudgetContext의 estimate API를 호출하도록 wiring (API surface만, 내부는 별도)

### evidence-decay와 investigation의 경계 (결정)

decay는 **investigation의 다른 모드가 아니라 직교 layer**다.

- decay store는 investigation store에 의존한다 (answer + evidence 목록을 읽는다)
- 반대 방향 의존은 금지 — investigation이 decay를 import하면 evidence-decay가 죽었을 때 investigation도 같이 죽는다
- AnswerView는 `decayPill?: ReactNode` slot prop으로 주입받는다 — AnswerView 자체는 evidence-decay를 모른다
- subscription store는 investigation provider unmount 시 자동 cleanup (구독 leak 금지)

이 경계는 04 doc의 "ChatAgent와의 경계" 결정과 같은 형태다 — coupling을 type/import 방향으로 막는다.

### Provider 위치

- `<EvidenceDecayProvider>`를 **AppProviders에 올리지 않는다**.
- decay는 investigation surface 안에서만 의미가 있으므로 [src/app/router/intelligence/IntelligenceLayout.tsx](src/app/router/intelligence/IntelligenceLayout.tsx) 안쪽, `<InvestigationProvider>` **바로 아래**에 마운트한다.
- 마운트 순서가 중요하다: decay가 investigation answer를 읽어야 하므로 InvestigationProvider가 먼저 와야 한다.
- BudgetContext는 04 doc 결정대로 investigation-local; decay는 BudgetContext도 read-only로 consume한다 (write는 regenerate가 호출될 때 investigation이 한다).

### TokensContext 재사용 금지

04 doc의 boundary lesson을 그대로 따른다 — `features/chat-agent/model/TokensContext`를 import하지 않는다. regenerate 비용 estimate는 investigation-local BudgetContext에서만 가져온다.

## UI/UX 코멘트

이 섹션은 [00-uiux-science-guide.md](docs/plans/may-9-feature-plan/00-uiux-science-guide.md)를 ground truth로 인용한다. evidence decay surface의 핵심 과제는 **"시간이 흐른다"는 것을 색 없이 시각화**하는 것이다.

### 1. 시간을 인코딩하는 채널 선택

가이드 §1.1, §3에 따라 staleness는 **opacity + clock icon + numeric "Xh"** 3채널로 *redundant encoding*. hue는 보조에도 안 쓴다.

- `fresh`: opacity 1.0, clock icon (filled), "rots in 6h 12m"
- `stale`: opacity 0.55, clock icon (half-filled, 시침이 더 기울어진 변형 아이콘), "stale · 2h ago"
- `dead`: opacity 0.35, clock icon (broken — strikethrough), "dead · regenerate"

opacity decay는 preattentive (가이드 §1, Treisman 1985)라 사용자가 200ms 안에 "이건 죽었다"를 인지. text "Xh"는 post-attentive verification 채널.

색맹 시뮬레이션(가이드 §9.2)에서도 의미가 보존된다 — 정보를 hue에 안 실었기 때문.

### 2. DecayPill 형태 — left stripe 영구 금지

가이드 §3.3 + memory rule (3+ warnings). DecayPill은:
- **inline chip** 모양. height 24px, horizontal padding 10px.
- 좌측 컬러 stripe 0%. 대신 **clock icon (좌)** + **label (가운데)** + **right-side dot 0.5%로 미세 강조** (dot은 Bartram 2001의 motion + size 결합 — 작아서 attention noise 최소).
- border-color는 *neutral glass border* 한 가지만 (alpha 0.18). state별로 변하지 않음.

### 3. Glass 제약 (가이드 §4)

- DecayPill / StaleNotice / WatchToggle 모두 [src/features/investigation/ui/InvestigatePanel.tsx](src/features/investigation/ui/InvestigatePanel.tsx)와 동일 GlassCard 모듈 import (memory rule × 20+).
- alpha: dark 0.30–0.45 / light 0.50–0.70. 가독성 부족 시 alpha를 올리지 않고 **text weight + size + letter-spacing**으로 해결 (가이드 §4.1).
- DecayPill을 답변 헤더에 띄우기 위해 부모 체인에 `transform`/`filter`/`perspective` 금지 (memory rule + 가이드 §4.2). 대신 flex row + gap 12px.
- WCAG AA: pill 텍스트는 glass 위에서 4.5:1 contrast. dev tooling으로 실측 (가이드 §9.3).

### 4. Cognitive load — Cowan 4±1 (가이드 §2.1)

답변 1개당 동시 노출되는 decay 시각 신호는 **2개**까지: DecayPill(L1) + WatchToggle(L1). decay history graph 같은 건 L3 (progressive disclosure, 가이드 §7.2).

evidence strip은 04 정책 그대로 정확히 3개. pill이 여기에 4번째 chunk로 추가되지 *않도록* 답변 헤더가 아닌 답변 footer에 배치 (아래 §6).

### 5. Hick / Fitts (가이드 §2.2, §2.3)

- regenerate 액션은 DecayPill 자체를 클릭 타겟으로 — pill = 정보 + 액션 동시 (Fitts: 거리 0).
- pill의 클릭 가능성은 hover 시 cursor + 미세 lift (translateY -1px, 80ms ease-out)로 signifier 제공 (Norman 2013, 가이드 §7.3).
- pill이 stale 상태일 때만 클릭 가능. fresh 상태는 정보 표시 전용 (Hick: 의미 없는 선택지 제거).

### 6. regenerate CTA 배치

답변 footer 우측 정렬, "Regenerate (~480 tokens)" 형태. fresh 상태에서는 텍스트 "fresh · rots in 6h 12m" — 같은 자리, 다른 라벨. 위치 일관성으로 사용자가 "이 자리는 답변의 시간 상태를 보는 곳"이라는 spatial mapping 학습.

cost는 항상 noun으로 노출 (`~480 tokens`). 가이드 §3 — 비용도 색이 아닌 numeric.

### 7. WatchToggle

footer 좌측, switch 한 개. 가이드 §1.1의 "shape + text" 원칙 — switch는 *form*이 분명한 control, on/off가 위치(왼/오른)로 인코딩되어 preattentive.
활성화 시 답변 헤더에 작은 4px dot 추가 — Bartram 2001의 motion 원칙 (한 surface 내 동시 motion 1개)에 따라 dot은 정적, motion은 stale 진입 시점에만 1회 fade-in.

### 8. StaleNotice — modal 금지

가이드 §10 안티패턴: toast로 critical info 전달 금지. StaleNotice는 우하단 JobsTray 영역에 *영속 inline notice*. 사라지지 않으며, 클릭 → 해당 investigation으로 spatial transition (가이드 §5 morph easing 200–300ms).

### 9. Motion (가이드 §5)

| 이벤트 | duration | easing |
|---|---|---|
| pill state 전환 (fresh → stale) | 200ms | ease-out (0, 0, 0.2, 1) |
| WatchToggle dot fade-in | 120ms | ease-out |
| StaleNotice slide-in | 240ms | ease-out |
| regenerate spinner | 1200ms loop | linear *only here* (spinner 예외) |

`prefers-reduced-motion: reduce`에서 모든 motion → fade only (가이드 §5.3, WCAG 2.3.3).

### 10. Surface cheat (가이드 §8)

| 채널 | 사용 |
|---|---|
| Primary preattentive | opacity (decay 강도) + clock icon (변형 모양) |
| Cognitive load | 2 신호 (pill + watch), 답변당 |
| 색 사용 | none — staleness는 모양·텍스트로 |
| Motion | 한 번에 1개 (stale 진입 fade) |

### 11. 검증 (가이드 §9)

- color-blind sim 4종에서 fresh/stale/dead 모두 구별 가능해야 함 (icon shape diff로).
- WCAG AA contrast 측정: glass 위 pill 텍스트, glass 위 numeric "Xh ago".
- time-to-first-glance: 사용자가 답변을 처음 본 후 *이 답변의 freshness*를 인지하는 데 <1.5s (eye-tracking 또는 click-test).
- prefers-reduced-motion ON 상태에서도 모든 staleness 정보 손실 0.

## 검증된 외부 패턴과 차이점

검증된 패턴:

- Sourcegraph Cody의 "indexed at X minutes ago" — 인덱스 freshness만 표시
- Cursor의 background agent stale notice — 잡 단위 staleness
- LSP의 file-level diagnostics invalidation — 파일 단위만, evidence 단위 아님

우리가 더 가야 하는 부분:

- **evidence kind별 decay model** — 외부엔 없음
- **답변 단위 decay aggregation** — 외부엔 답변 자체를 객체로 보지 않음
- **typed invalidation event subscription** — chunk text가 아니라 schema 단위
- **regenerate cost estimate 통합** — fresh/stale 판단 + 비용을 같은 surface에서

요약: 외부 도구는 "인덱스가 늙었다"까지. 우리는 "이 답변의 3번째 evidence가 signature change로 죽었으니 unknown 추가"까지 간다.

## 성공 지표

- watched answer 중 invalidation event 도달까지의 median latency
- stale 진입 후 regenerate click-through rate
- regenerate 후 답변 conclusion delta가 의미 있게 바뀐 비율 (decay model이 false-positive가 아닌지)
- "rots in Xh" pill 표시 후 사용자 답변 신뢰 행동 변화 (action click-through rate)
- subscription leak 0건 (investigation unmount 후 살아있는 구독 0개)

## 출시 순서

### Phase 1 — Decay model + DecayPill on existing AnswerView

목표: **하나의 답변**에 "fresh · rots in Xh" pill이 뜨는 것.

- DecayModel kind별 정의 (8개 EvidenceKind 전부)
- DecayState 계산기 (time-based만; event-based는 Phase 2)
- DecayPill 컴포넌트 + AnswerView slot prop 추가
- regenerate CTA가 stale 시 highlighted + cost estimate (mock fixed value)

### Phase 2 — Event subscription + auto-stale

- InvalidationEvent 타입 + mock event source (setInterval 기반 fake event)
- subscription store: answer ↔ event mask 매칭
- decay threshold 넘는 순간 `analysis_stale` UnknownTag 자동 push
- StaleNotice (우하단 inline)
- WatchToggle (opt-in subscription)

### Phase 3 — Engine hooks + budget integration + multi-answer dashboard

- 실제 엔진 hook: `index_status`, `incremental_analysis`, `function_summary` diff (백엔드 트랙과 contract만)
- BudgetContext에서 kind별 re-gather cost 끌어와 정확한 estimate
- watched answers dashboard (notebook 외에서도 watched 답변 list 보기)
- decay history (이 답변이 지난 24h 동안 어떻게 늙었는가) — debug용

## Frontend 구현계획 (백엔드 제외)

백엔드는 별도 트랙. 모든 phase를 frontend feature slice 단위로 풀어 쓴다. mock event는 [src/entities/investigation/model/fixtures.ts](src/entities/investigation/model/fixtures.ts) 옆에 `decayFixtures.ts`를 추가하지 않고 **evidence-decay 자체 fixture**로 둔다 — investigation entity를 오염시키지 않기 위해.

### 0. 사전 정리 (모든 phase 공통)

- [src/features/](src/features/) 아래 새 슬라이스 3개 생성: `evidence-decay/{model,subscriptions,ui}`
- [src/entities/investigation/model/types.ts](src/entities/investigation/model/types.ts)는 **건드리지 않는다** — EvidenceItem schema는 04 doc 그대로. decay는 그 위에 derived state로 올린다.
- AnswerView에 slot prop 1개 (`decayPill?: ReactNode`) 추가만 허용. 그 외 investigation 코어 손대지 않음.

### Phase 1 — Decay model + DecayPill

#### 1.1 model 정의 — [src/features/evidence-decay/model/](src/features/evidence-decay/model/)

`types.ts` — paste-ready TypeScript. 04 doc의 `EvidenceItem` / `EvidenceKind` / `EvidenceId` / `InvestigationAnswer` 타입을 그대로 import한다 (`entities/investigation/model/types`).

```ts
import type {
  EvidenceId,
  EvidenceKind,
  InvestigationAnswer,
} from 'entities/investigation/model/types';

// branded id types
export type DecayModelId = string & { readonly __brand: 'DecayModelId' };
export type SubscriptionId = string & { readonly __brand: 'SubscriptionId' };
export type InvalidationEventId = string & {
  readonly __brand: 'InvalidationEventId';
};

// answer 자체에도 id가 필요하다 (decay state lookup key).
// investigation 쪽에서 InvestigationAnswerId를 export하지 않으므로
// evidence-decay 내부에서 별도 brand로 매핑한다 (string composite: target.id + '@' + gatheredAt).
export type AnswerKey = string & { readonly __brand: 'AnswerKey' };

// ---- DecayModel: kind별 정책 ----

// 시간 함수의 모양. linear=노화 일정, step=특정 임계 후 stale, exp=초기 fresh 길고 후반 급락
export type DecayShape = 'linear' | 'step' | 'exponential';

// 어떤 엔진 이벤트가 이 evidence를 죽이는가
export type InvalidationTrigger =
  | 'signature_change'      // function_summary diff
  | 'graph_edge_change'     // find_references / call graph delta
  | 'merge_to_main'         // PR merged
  | 'team_move'             // ownership rotation
  | 'index_dirty'           // index_status: dirty
  | 'incremental_diff'      // incremental_analysis emitted change
  | 'pr_activity'           // new PR touches symbol
  | 'time_only';            // 노화 외 trigger 없음

export interface DecayModel {
  readonly id: DecayModelId;
  readonly kind: EvidenceKind;
  readonly halfLifeMs: number;          // Infinity 가능 (signature 기반)
  readonly shape: DecayShape;
  readonly killers: readonly InvalidationTrigger[]; // emit되면 decayState=0 (dead)
  readonly softeners: readonly InvalidationTrigger[]; // emit되면 stale (0.3 정도로 강등)
}

// ---- DecayState: 살아있는 정도 ----

export type DecayLevel = 'fresh' | 'stale' | 'dead';

export interface EvidenceDecayState {
  readonly evidenceId: EvidenceId;
  readonly kind: EvidenceKind;
  readonly level: DecayLevel;
  readonly aliveRatio: number;          // 0..1, 1=fresh, 0=dead
  readonly rotsInMs: number | null;     // null = 무한 / 즉시 dead
  readonly lastEvalAt: number;          // epoch ms
  readonly killedBy: InvalidationTrigger | null;
}

// 답변 단위 aggregate. min(aliveRatio of evidence) 채택.
export interface AnswerDecayState {
  readonly answerKey: AnswerKey;
  readonly level: DecayLevel;
  readonly aliveRatio: number;
  readonly rotsInMs: number | null;
  readonly weakestEvidence: EvidenceId; // 가장 빨리 썩는 evidence (UI 설명용)
  readonly perEvidence: readonly EvidenceDecayState[];
}

// ---- Subscription ----

export interface InvalidationEvent {
  readonly id: InvalidationEventId;
  readonly trigger: InvalidationTrigger;
  readonly at: number;                  // epoch ms
  // 이벤트가 영향 주는 대상. trigger별 discriminated union.
  readonly target:
    | { kind: 'symbol'; symbol: string; file: string }
    | { kind: 'file'; file: string }
    | { kind: 'team'; team: string }
    | { kind: 'pr'; prId: string }
    | { kind: 'index'; dirtyFiles: readonly string[] };
}

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface AnswerSubscription {
  readonly id: SubscriptionId;
  readonly answerKey: AnswerKey;
  readonly evidenceIds: readonly EvidenceId[]; // 답변이 의존하는 evidence
  readonly triggerMask: readonly InvalidationTrigger[]; // 합집합
  readonly createdAt: number;
  readonly status: SubscriptionStatus;
}

// ---- Regenerate estimate ----

export interface RegenerateEstimate {
  readonly tokens: number;
  readonly cents: number;
  readonly perEvidenceCost: ReadonlyMap<EvidenceKind, number>; // tokens
  readonly source: 'mock' | 'budget_context';
}

// ---- helpers (구현은 별도 파일) ----

export type DecayInputs = Readonly<{
  answer: InvestigationAnswer;
  answerKey: AnswerKey;
  now: number;
  events: readonly InvalidationEvent[]; // 이 답변과 매칭 끝난 이벤트만
}>;

export type ComputeAnswerDecay = (inputs: DecayInputs) => AnswerDecayState;
```

`models.ts` — kind별 DecayModel 정적 table. 외부 mutation 금지 (`as const`).

```ts
import type { DecayModel } from './types';

// kind별 정책. halfLifeMs = Infinity는 시간만으로는 안 늙음을 의미.
export const DECAY_MODELS: Readonly<Record<string, DecayModel>> = Object.freeze({
  symbol: {
    id: 'm.symbol' as DecayModel['id'],
    kind: 'symbol',
    halfLifeMs: Number.POSITIVE_INFINITY,
    shape: 'step',
    killers: ['signature_change'],
    softeners: ['incremental_diff'],
  },
  caller: {
    id: 'm.caller' as DecayModel['id'],
    kind: 'caller',
    halfLifeMs: 24 * 60 * 60 * 1000,
    shape: 'linear',
    killers: ['graph_edge_change'],
    softeners: ['incremental_diff'],
  },
  callee: {
    id: 'm.callee' as DecayModel['id'],
    kind: 'callee',
    halfLifeMs: 24 * 60 * 60 * 1000,
    shape: 'linear',
    killers: ['graph_edge_change'],
    softeners: ['incremental_diff'],
  },
  recent_change: {
    id: 'm.recent_change' as DecayModel['id'],
    kind: 'recent_change',
    halfLifeMs: 72 * 60 * 60 * 1000,
    shape: 'linear',
    killers: [],
    softeners: ['time_only'],
  },
  owner: {
    id: 'm.owner' as DecayModel['id'],
    kind: 'owner',
    halfLifeMs: 14 * 24 * 60 * 60 * 1000,
    shape: 'step',
    killers: ['team_move'],
    softeners: ['pr_activity'],
  },
  taint_path: {
    id: 'm.taint_path' as DecayModel['id'],
    kind: 'taint_path',
    halfLifeMs: Number.POSITIVE_INFINITY,
    shape: 'step',
    killers: ['signature_change', 'graph_edge_change'],
    softeners: ['incremental_diff'],
  },
  test_coverage: {
    id: 'm.test_coverage' as DecayModel['id'],
    kind: 'test_coverage',
    halfLifeMs: 7 * 24 * 60 * 60 * 1000,
    shape: 'exponential',
    killers: ['merge_to_main'],
    softeners: ['pr_activity'],
  },
  incident: {
    id: 'm.incident' as DecayModel['id'],
    kind: 'incident',
    halfLifeMs: 30 * 24 * 60 * 60 * 1000,
    shape: 'exponential',
    killers: [],
    softeners: ['time_only'],
  },
});
```

`computeDecay.ts` — `ComputeAnswerDecay` 구현. 입력이 immutable이고 출력도 immutable. 외부 시간 의존성은 `now: number`로만 받는다 (Date.now 직접 호출 금지 — 테스트성).

`fixtures.ts` — Phase 1 demo용 mock InvalidationEvent. setTimeout 기반 emit은 Phase 2의 source가 책임짐 — Phase 1에선 빈 배열로 시작.

`index.ts` export.

#### 1.2 ui — [src/features/evidence-decay/ui/](src/features/evidence-decay/ui/)

- `DecayPill.tsx`
  ```ts
  type DecayPillProps = Readonly<{
    state: AnswerDecayState;
    compact?: boolean;
  }>;
  ```
  - **left stripe 금지** — pill 전체 border-color로만 색 표시
  - GlassCard 안 (memory rule)
  - 표시: `fresh · rots in 6h` / `stale · regenerate recommended` / `dead · taint_path invalidated`
- `RegenerateCTA.tsx`
  ```ts
  type RegenerateCTAProps = Readonly<{
    state: AnswerDecayState;
    estimate: RegenerateEstimate;
    onRegenerate: () => void;
  }>;
  ```
  - fresh일 때 disabled + half-life 텍스트
  - stale/dead일 때 highlighted + estimate
- `parts/RotsInLabel.tsx` — `rotsInMs` → `"6h 12m"` 포맷터 (분 단위 + 모래시계 아이콘)
- `parts/DecayDot.tsx` — 3색 dot primitives (teal / amber / rose)
- `index.ts` export

#### 1.3 AnswerView slot wiring — [src/features/investigation/evidence/AnswerView.tsx](src/features/investigation/evidence/AnswerView.tsx)

기존 prop signature에 다음 추가:

```ts
type AnswerViewProps = Readonly<{
  // ... existing
  decayPill?: React.ReactNode;       // header right-align
  regenerateCTA?: React.ReactNode;   // footer right-align
}>;
```

AnswerView 자체는 evidence-decay를 import하지 않는다. 호출자(InvestigatePanel)가 두 노드를 만들어 주입.

#### 1.4 InvestigatePanel wiring — [src/features/investigation/ui/InvestigatePanel.tsx](src/features/investigation/ui/InvestigatePanel.tsx)

```ts
const decayState = useAnswerDecay(answer);     // evidence-decay hook
const estimate = useRegenerateEstimate(answer); // BudgetContext + per-kind cost
return (
  <AnswerView
    /* ... */
    decayPill={<DecayPill state={decayState} />}
    regenerateCTA={
      <RegenerateCTA
        state={decayState}
        estimate={estimate}
        onRegenerate={regenerate}
      />
    }
  />
);
```

#### 1.5 provider — [src/app/router/intelligence/IntelligenceLayout.tsx](src/app/router/intelligence/IntelligenceLayout.tsx)

```tsx
<InvestigationProvider>
  <EvidenceDecayProvider>   {/* 새로 추가, InvestigationProvider 안쪽 */}
    {/* ... */}
  </EvidenceDecayProvider>
</InvestigationProvider>
```

`<EvidenceDecayProvider>`는 AppProviders에 올리지 않는다 (04 doc 결정 그대로).

#### Phase 1 완료 조건

- [ ] AnswerView 헤더에 DecayPill이 표시됨
- [ ] kind별 DecayModel 8개가 모두 정의되어 있음 (`DECAY_MODELS`)
- [ ] time-based decay만으로 fresh → stale 전이가 시뮬레이트됨 (now 인자만 흘려도 동작)
- [ ] regenerate CTA가 stale 시 highlighted + mock estimate 표시
- [ ] AnswerView 자체는 evidence-decay import 0건 (slot 주입만)

---

### Phase 2 — Event subscription + auto-stale

#### 2.1 subscriptions slice — [src/features/evidence-decay/subscriptions/](src/features/evidence-decay/subscriptions/)

- `SubscriptionStore.tsx` — context + reducer
  ```ts
  type SubscriptionState = Readonly<{
    byAnswerKey: ReadonlyMap<AnswerKey, AnswerSubscription>;
    pendingEvents: readonly InvalidationEvent[];
  }>;

  type SubscriptionAction =
    | { type: 'subscribe'; subscription: AnswerSubscription }
    | { type: 'cancel'; answerKey: AnswerKey }
    | { type: 'event'; event: InvalidationEvent };
  ```
- `matchEvent.ts` — `(event, subscription) => boolean`. trigger mask + target 매칭.
  - signature_change ↔ symbol kind, taint_path kind
  - graph_edge_change ↔ caller/callee/taint_path
  - merge_to_main ↔ test_coverage
  - team_move / pr_activity ↔ owner
- `mockEventSource.ts` — Phase 2 demo용. setInterval로 fake InvalidationEvent emit. 실제 엔진 hook은 Phase 3.
- `useAnswerDecay.ts` — Phase 1의 hook을 확장. pendingEvents 중 매칭된 것만 모아 `computeAnswerDecay`에 전달.

#### 2.2 auto-inject `analysis_stale` UnknownTag

investigation 코어를 건드리지 않기 위해, AnswerView가 받는 `answer.unknowns`를 wrapping하는 derived selector를 evidence-decay 안에 둔다.

```ts
// features/evidence-decay/model/deriveAnswer.ts
export const deriveAnswerWithDecay = (
  answer: InvestigationAnswer,
  decay: AnswerDecayState,
): InvestigationAnswer => {
  if (decay.level === 'fresh') return answer;
  const already = answer.unknowns.some((u) => u.code === 'analysis_stale');
  if (already) return answer;
  // sentinel('no_known_unknowns')만 있으면 교체, 아니면 push
  const filtered = answer.unknowns.filter(
    (u) => u.code !== 'no_known_unknowns',
  );
  return {
    ...answer,
    unknowns: [
      ...filtered,
      {
        code: 'analysis_stale',
        label:
          decay.killedBy === null
            ? 'analysis stale'
            : `analysis stale: ${decay.weakestEvidence} killed by ${decay.killedBy}`,
      },
    ],
  };
};
```

InvestigatePanel은 AnswerView에 derived answer를 넘긴다. investigation store는 변하지 않는다.

#### 2.3 StaleNotice — [src/features/evidence-decay/ui/StaleNotice.tsx](src/features/evidence-decay/ui/StaleNotice.tsx)

- 우하단 inline (modal 금지, memory rule)
- JobsTray와 위치 충돌 방지: y-axis offset 계산 (Jobs가 mount되어 있으면 +56px 위로)
- 클릭 → InvestigationContext의 `focusAnswer(answerKey)` 호출

#### 2.4 WatchToggle — [src/features/evidence-decay/ui/WatchToggle.tsx](src/features/evidence-decay/ui/WatchToggle.tsx)

- AnswerView footer 좌측 slot에 주입
- on/off만, 추가 옵션 없음 (의도적으로 simple)
- on 시 답변 헤더에도 작은 watch dot 표시

#### Phase 2 완료 조건

- [ ] mockEventSource가 emit한 이벤트가 매칭된 답변을 stale로 전환
- [ ] stale 진입 시 `analysis_stale` UnknownTag가 자동 추가됨 (기존 unknowns 보존)
- [ ] WatchToggle off → 답변 close 시 subscription 자동 cancel
- [ ] StaleNotice가 우하단에 표시되고, JobsTray와 위치 충돌 없음

---

### Phase 3 — Engine hooks + budget integration + dashboard

#### 3.1 engine hooks (frontend contract만) — [src/features/evidence-decay/subscriptions/engineHooks.ts](src/features/evidence-decay/subscriptions/engineHooks.ts)

- `useIndexStatus()` → `{ dirtyFiles: string[]; lastIncrementalAt: number }`
- `useFunctionSummaryDiff()` → AsyncIterable<InvalidationEvent>
- `useIncrementalAnalysisStream()` → AsyncIterable<InvalidationEvent>
- 모두 mock implementation으로 시작; 시그니처만 백엔드 트랙과 맞춤
- mockEventSource는 이 hook들 위로 흡수됨

#### 3.2 budget-aware estimate — [src/features/evidence-decay/model/estimate.ts](src/features/evidence-decay/model/estimate.ts)

```ts
const RE_GATHER_COST_TOKENS: ReadonlyMap<EvidenceKind, number> = new Map([
  ['symbol', 60],
  ['caller', 120],
  ['callee', 120],
  ['recent_change', 80],
  ['owner', 40],
  ['taint_path', 480],     // 가장 비쌈
  ['test_coverage', 200],
  ['incident', 60],
]);

export const estimateRegenerate = (
  answer: InvestigationAnswer,
  evidenceById: ReadonlyMap<EvidenceId, EvidenceItem>,
  budgetCents: (tokens: number) => number,
): RegenerateEstimate => { /* ... */ };
```

BudgetContext (investigation-local)에서 `budgetCents` 함수만 가져온다. TokensContext는 import 금지.

#### 3.3 watched answers dashboard — [src/features/evidence-decay/ui/WatchedDashboard.tsx](src/features/evidence-decay/ui/WatchedDashboard.tsx)

- IntelligenceLayout 우측 컬럼의 별도 surface (FocusScanStack / InvestigatePanel과 충돌 안 나는 진입점)
- 04 doc의 `activeRightSurface` enum에 `'watched'` 추가
- 정렬: rotsInMs ASC (가장 빨리 썩는 게 위)
- 각 row 클릭 → 해당 investigation re-open

#### 3.4 decay history (debug) — [src/features/evidence-decay/ui/DecayHistory.tsx](src/features/evidence-decay/ui/DecayHistory.tsx)

- 답변 footer expandable: 지난 24h aliveRatio sparkline
- 외부 사용자에게는 숨김 (dev-only flag)

#### 3.5 polish

- subscription cleanup audit (provider unmount 시 leak 0건)
- a11y: DecayPill에 aria-label `"answer freshness: stale, rots in 0 hours"`
- keyboard: WatchedDashboard 안에서 j/k row 이동
- empty/error state: subscription이 0개일 때 dashboard 안내 카피

#### Phase 3 완료 조건

- [ ] engine hook 시그니처가 백엔드 트랙과 정합 (mock 구현으로도 동일 contract)
- [ ] regenerate estimate가 BudgetContext와 결합되어 정확한 token/cent 표시
- [ ] WatchedDashboard에서 watched answer list가 rotsInMs 정렬로 표시
- [ ] decay history sparkline이 dev flag 뒤에 동작
- [ ] subscription leak 0건 (unmount cleanup 검증 테스트)

---

### 모듈 의존성 그래프

```
entities/investigation                ← 04 doc에서 정의됨, 이 feature는 read-only
  ↑
features/investigation/model          ← BudgetContext도 여기 (investigation-local)
  ↑
features/evidence-decay/model         ← computeDecay, models, derive
  ↑                ↑
  subscriptions    ui (DecayPill, RegenerateCTA, StaleNotice, WatchToggle, WatchedDashboard)
  ↑
features/investigation/ui/InvestigatePanel  ← slot 주입만 (AnswerView decayPill / regenerateCTA)
  ↑
app/router/intelligence/IntelligenceLayout  ← <EvidenceDecayProvider>를 InvestigationProvider 안쪽에
```

investigation/evidence/AnswerView는 evidence-decay를 import하지 않는다 (slot prop만 받는다 — 의존 방향이 한쪽).
chat-agent / TokensContext는 이 그래프 밖이다 (04 doc 결정 그대로).

### 손대지 않을 것

- [src/entities/investigation/](src/entities/investigation/) — 타입은 read-only로만 import. EvidenceItem schema 변경 금지.
- [src/features/investigation/model/InvestigationContext.tsx](src/features/investigation/model/InvestigationContext.tsx) — `regenerate()` 액션 시그니처는 그대로. 내부 구현이 BudgetContext의 estimate를 부르도록 wiring만.
- [src/features/investigation/evidence/AnswerView.tsx](src/features/investigation/evidence/AnswerView.tsx) — slot prop 2개 추가 외 변경 금지.
- [src/features/investigation/evidence/UnknownTag.tsx](src/features/investigation/evidence/UnknownTag.tsx) — `analysis_stale` 케이스는 04 doc UnknownTag union에 이미 있음. 손 안 댐.
- [src/features/chat-agent/](src/features/chat-agent/) — TokensContext import 금지.
- [src/features/inspect-target/](src/features/inspect-target/) — 직접 의존 없음.
- 기존 [src/features/investigation/jobs/](src/features/investigation/jobs/) — JobsTray 위치만 evidence-decay StaleNotice가 회피 (Jobs가 evidence-decay를 모름).

### 백엔드 트랙과의 contract

- `InvalidationEvent`, `AnswerSubscription`, `DecayModel` schema가 frontend-backend boundary
- 엔진 hook 시그니처:
  - `index_status()` → `{ dirtyFiles: string[]; lastIncrementalAt: number }`
  - `subscribeFunctionSummaryDiff(symbols: string[])` → `AsyncIterable<InvalidationEvent>`
  - `subscribeIncremental(files: string[])` → `AsyncIterable<InvalidationEvent>`
- mock event source가 그대로 백엔드 stream으로 교체될 수 있도록 `engineHooks.ts`만 swap point
- 모든 mock event fixture는 [src/features/evidence-decay/subscriptions/mockEventSource.ts](src/features/evidence-decay/subscriptions/mockEventSource.ts) 한 곳. 백엔드 붙으면 dead code화.
- `RegenerateEstimate.source`가 `'mock' | 'budget_context'`로 분기 — 백엔드가 정확한 cost를 emit하면 `'engine'` 케이스 추가 (union 확장).

## Why Developers Will Care

지금 AI 도구의 답변은 **시간을 모른다**. 어제 만든 답을 오늘 그대로 들고 있으면서 fresh인 척한다.

이 feature가 잘 되면, 답변은 자기가 언제 썩는지 안다. 시그니처 한 줄 바꾸면 답변 헤더가 dead로 전환된다. 누군가 같은 함수에 PR을 올리면 watcher가 알려준다. regenerate를 누르기 전에 비용이 보인다.

이게 evidence-native investigator의 진짜 차별점이다 — 답변이 **객체**가 되고, 객체에는 수명이 있다. generic chat은 절대 못 따라온다, 정적 분석 이벤트가 없으니까.
