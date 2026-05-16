# Feature 10: Investigation Pinning + Replay

## One-liner

조사 세션을 한 번 끝내고 버리지 않는다. "Pin"으로 스냅샷을 박아두고, 몇 주 뒤 같은 incident이 다시 떠오르면 같은 질의를 현재 코드에 다시 돌려서 무엇이 변했는지 evidence 단위로 diff한다.

## Problem Statement

조사가 끝나면 보통 두 가지 중 하나가 일어난다.

- 답을 PR에 붙이고 잊는다 → 같은 incident이 6주 뒤 재발하면 처음부터 다시 조사
- Slack/Notion에 "이 함수가 문제였다"고 적어둔다 → 코드는 그 사이 5번 변했고, 그 노트는 더 이상 사실이 아니다

문제는 조사 결과의 **시간 축**이 없다는 것이다.

- "이 답이 언제 만들어졌는가"를 누구도 추적하지 않는다
- "그때 evidence와 지금 evidence가 같은가"를 사람이 손으로 다시 읽는다
- "이 답을 무효화시킨 PR이 무엇인가"를 아무도 모른다

채팅 기반 도구(Cody, Cursor)가 이 문제를 풀지 못하는 이유는 단순하다 — 그쪽 history는 **대화 로그**다. 답이 만들어진 시점의 evidence schema가 없고, 그래서 "그때 vs 지금"을 코드 수준으로 비교할 방법이 없다.

우리는 evidence가 typed라서 시간 축을 붙일 수 있다.

## Why This Matters

조사 결과를 시간 축에 박아두는 순간 제품 가치가 한 단계 올라간다.

- before: 조사 = 1회성 Q&A
- after: 조사 = 코드와 함께 살아 있는 long-running artifact

특히 incident response에서 효과가 크다. 같은 시스템이 비슷한 모양으로 두 번 깨지는 경우가 흔한데, 두 번째에 first 5분을 "지난번 답이 아직 유효한가"로 시작할 수 있으면 MTTR이 통째로 줄어든다.

또한 pin은 자연스러운 **regression detector**가 된다 — pin한 답이 invalidate되는 순간이 곧 risky change가 들어왔다는 신호다.

## Moat

LLM chat history는 conversation log다. 스크롤은 되지만 비교는 안 된다.

우리는 evidence가 schema를 가진 typed payload(EvidenceItem)이기 때문에, 두 시점의 ContextBundle을 **set diff**처럼 비교할 수 있다.

> Chat history scrolls. Pinned investigations diff.

구체적으로:

1. EvidenceItem이 `{ kind, sourceTool, payload, confidence, staleness, whyPartial }`로 schema가 박혀 있다 → 두 EvidenceItem이 같은지/다른지 deterministic하게 판정 가능.
2. payload가 discriminated union이라 같은 kind 안에서도 "callers count가 변했다", "taint hops가 줄었다"를 분 단위로 본다.
3. confidence/staleness가 시간에 따라 변한 것 자체를 evidence delta로 본다 ("같은 답이지만 그때는 stale, 지금은 fresh" → 답의 신뢰도가 강해진 사건).
4. delta를 PR/author에 attribute할 수 있다 — incremental_analysis가 어떤 commit에서 어떤 function_summary가 바뀌었는지 알기 때문.

generic chat history 도구가 이걸 흉내내려면 결국 우리가 가진 typed evidence layer를 다시 만들어야 한다. 그게 moat다.

## 기술 배경

핵심 엔진 자산 (Feature 04와 공유):

- `incremental_analysis` — 두 시점 사이 어떤 함수의 summary가 바뀌었는지 cheap하게 알려줌. pin replay의 cost 절감 핵심.
- `function_summary` diff — 같은 심볼의 두 시점 summary가 의미 단위로 달라졌는지 (signature, side-effect class, taint shape) 비교.
- `taint_flow` re-run — pinned taint path가 아직 유효한가, 새 sink가 추가되었는가, source가 막혔는가.
- `change_impact_analysis` — pin과 현재 사이 들어온 PR 중 pinned target에 영향을 준 것만 추리는 데 사용.
- `index_status` — pin 시점과 replay 시점의 freshness 비교 (stale → fresh 같은 변화도 evidence delta).
- `find_references` 재실행 — caller/callee 카운트가 변했는지.

replay 작동 모델은 단순하다:

1. pin 시점 ContextBundle.snapshot을 보존
2. replay 요청이 들어오면, 같은 InvestigationTarget으로 `gatherContext()`를 다시 실행
3. 두 ContextBundle을 EvidenceItem 단위로 set-diff → `EvidenceDelta[]` 생성
4. delta를 incremental_analysis가 알려주는 PR/author 메타에 join → 책임 attribution
5. delta를 자연어 narrative로 합성 ("지난번 이후 callers가 3 → 11로 늘었고, taint hops가 2 → 4로 길어졌다")

## 제안 기능

### 1. Pin / Snapshot

조사 세션이 끝났을 때 (4슬롯 답변이 나온 직후) 우상단 "Pin this investigation" 버튼.

pin이 만들어내는 것:

- `InvestigationPin` — target, question, pin 시점 ContextBundle 전체, InvestigationAnswer 전체, pin 메타 (사용자, pin 시점 commit SHA, 메모)
- pin은 **불변**. 재조사가 필요하면 새 replay를 만든다 (덮어쓰지 않음).

저장 위치 (Phase 1): localStorage. (Phase 3에서 backend로 이전)

### 2. Replay Execution

pin을 열면 "Replay now" 버튼. 누르면:

- 같은 target, 같은 question type으로 `gatherContext`를 다시 호출
- 새 ContextBundle을 `InvestigationReplay` 안에 박아둠 (pin이 1개여도 replay는 N개)
- replay마다 timestamp + 그 시점 commit SHA가 붙음

Replay 비용은 incremental_analysis 덕에 full re-investigation보다 싸다 (pinned bundle의 evidence 중 변하지 않은 부분은 재계산 skip).

### 3. Evidence Diff

두 ContextBundle을 비교해서 `EvidenceDelta[]` 생성.

- `added` — pin 시점에는 없던 evidence (e.g. 새 caller, 새 incident)
- `removed` — pin 시점에는 있었지만 지금은 사라진 evidence (e.g. 함수 삭제, taint sink 막힘)
- `changed` — 같은 evidence id이지만 payload/confidence/staleness가 변함

UI는 side-by-side. left = pin 시점, right = replay 시점. delta type별로 stripe가 아닌 **chip + icon**으로 마킹 (memory rule: left stripe 금지).

### 4. Narrative Synthesis

evidence delta는 raw 데이터로는 읽기 힘들다. 그래서 자연어 한 단락을 함께 만든다.

- 입력: `EvidenceDelta[]`, pin meta, replay meta
- 출력: 한 단락 (≤ 5 문장) + 책임 attribution row (PR / author / 변화 종류)

narrative는 **새 사실만** 다룬다. "evidence X가 그대로 유효함"은 narrative에 안 넣음 — 노이즈.

### 5. Watch / Subscribe

pin에 "Watch this pin" 토글. 켜면:

- 백그라운드 incremental_analysis가 pinned target 관련 commit을 감지
- 변화량이 threshold를 넘으면 (= delta count ≥ N, 또는 confidence가 high → low로 떨어지는 evidence 발생) "Pinned answer may be invalid" 알림
- 알림 클릭 → 자동 replay 실행

## AI-native 설계

이 기능은 단순 history 저장이 아니다.

AI-native 조건:

1. pin은 free-text 메모가 아니라 **typed snapshot** — 자동으로 구조 비교 가능
2. replay는 매번 같은 prompt를 다시 돌리는 게 아니라 incremental_analysis로 cheap하게 swap
3. delta를 보여줄 때 사용자에게 "이게 의미 있는 변화인가" 판단을 다시 시키지 않음 — 시스템이 narrative와 attribution까지 채워서 보여줌
4. 변화가 답을 invalidate한다고 시스템이 판단하면 자동으로 알림

좋은 흐름:

- 6주 전: "왜 paymentSettle이 risky해?" → answer pin
- 오늘: 같은 incident 재발
- 사용자가 pin 열기 → "Replay now" 1클릭
- 5초 안에 evidence diff + narrative ("지난번 이후 paymentSettle의 caller가 3 → 11로 늘었음. PR #4421(@kim)에서 dispatch가 새로 추가됨. 지난번 답의 unknown이었던 'dispatch overapprox'가 이제 confirmed로 강해짐.")
- 새 답 surface로 점프 (4슬롯 답변 + delta-aware actions)

## 리팩토링 / 아키텍처 영향

신규 슬라이스:

- `entities/investigation-pin/` — `InvestigationPin`, `InvestigationReplay`, `EvidenceDelta`, `PinId`, `ReplayId` 타입과 fixture. localStorage adapter 포함 (Phase 1).
- `features/investigation-replay/model/` — replay store, watch subscription state, threshold config
- `features/investigation-replay/diff/` — `diffBundles(a, b): EvidenceDelta[]`, `attributeDeltas(deltas, prMeta): AttributedDelta[]`
- `features/investigation-replay/narrative/` — `composeNarrative(deltas, attrib): NarrativeBlock`
- `features/investigation-replay/ui/` — PinList, PinDetail, ReplayDiffView, NarrativeBlock, WatchToggle

재사용 (절대 새로 만들지 않음):

- `entities/investigation/model/types`의 `EvidenceItem`, `ContextBundle`, `InvestigationAnswer`, `EvidenceTriple`, `UnknownTag` 그대로 import
- `features/investigation/planner/gatherContext`를 그대로 호출 (replay = 같은 함수 재실행)
- BudgetContext (Feature 04 amendment)를 재사용 — replay도 LLM 비용을 소모하므로 같은 미터에 잡힘
- `TokensContext` (chat-agent)는 **금지** — Feature 04가 명시적으로 끊은 경계를 지킨다

Provider 위치:

- `<InvestigationReplayProvider>`를 **AppProviders에 올리지 않는다**. `/intelligence` 라우트 안쪽 IntelligenceLayout에 마운트한다 — 이유는 Feature 04와 동일 (라우트 unmount = state cleanup, lazy split 보존).
- 정확하게는 InvestigationProvider 바로 아래에 nest. Replay는 Investigation 컨텍스트를 dependency로 가짐.

저장 backend 진화:

- Phase 1: localStorage (`pin:<userId>:<pinId>` key)
- Phase 2: 동일하게 localStorage이지만 schema versioning 추가 (`schemaVersion: 1`)
- Phase 3: backend swap. localStorage adapter는 그대로 두되 fallback으로만 동작.

## UI/UX 코멘트

이 섹션은 [00-uiux-science-guide.md](docs/plans/may-9-feature-plan/00-uiux-science-guide.md)를 인용한다. pin/replay의 핵심 도전: **시간을 1차원으로 시각화하면서 evidence diff는 2차원(좌/우)으로** 둘 다 양립.

### 1. Timeline ribbon — position is king (가이드 §1.1)

pin detail 상단 horizontal ribbon. 왼쪽 끝 = pin 시점, 오른쪽 끝 = 현재 시각. 사이에 replay tick이 dot으로 박힘.

- *position*은 가장 강력한 preattentive 채널 (Treisman; Ware 2012). 시간을 좌→우 spatial mapping으로 (서구권 standard reading direction). 첫 응시 즉시 "왼=옛, 오=지금" 인지.
- ribbon line thickness 1px, dot diameter **최대 8px** (stripe로 오인되지 않을 한도).
- left vertical stripe 0% (memory rule + 가이드 §3.3).
- tick hover → preview tooltip (replay date + delta count). click → diff view.

### 2. Side-by-side diff view — symmetric attention split (가이드 §7.1)

좌우 동일 width column. position-locked scroll (한쪽 scroll → 다른 쪽 동기) — counterfactual의 lock-step과 동일 원칙.

- 좌: pin 시점 EvidenceCard.
- 우: replay 시점 EvidenceCard.
- 가운데 8px gutter + 1px hairline (alpha 0.18). 굵은 separator는 비교 흐름을 끊음.
- delta marker: gutter 위 **icon + text chip** — added (`+`), removed (`−`), changed (`∼`). hue 사용 안 함 (가이드 §3.1).
- EvidenceCard는 Feature 04 컴포넌트 *동일 인스턴스* 재사용 (component family 유지 — 사용자가 다시 학습할 필요 없음).

### 3. Glass 제약 (가이드 §4)

- pin list / pin detail / diff view / NarrativeBlock — 모두 [src/features/investigation/ui/InvestigatePanel.tsx](src/features/investigation/ui/InvestigatePanel.tsx)의 GlassCard 모듈 (memory × 20+).
- alpha 0.30–0.45 dark / 0.50–0.70 light. 가독성 부족 시 alpha 안 올리고 typography로 (가이드 §4.1, §6).
- backdrop-filter ancestor: PinDetail wrapper에 `transition: transform` 금지. 슬라이드 진입은 SVG/canvas 좌표 또는 width transition으로 (memory rule + 가이드 §4.2).

### 4. Cognitive load (가이드 §2.1)

- 한 화면 동시 노출 evidence delta는 **5개**까지 (Cowan 4±1 상한). 그 이상은 fold + "show N more" — Feature 12 (hypothesis market)와 동일 정책.
- delta 카테고리 3개 (added / removed / changed) — Miller 한도 안.
- pin list 한 viewport에 **5개**까지 보이고 그 이상은 scroll.

### 5. NarrativeBlock — banner, not card

attribution row 1개 + narrative paragraph 1–2줄. 카드 형태로 만들면 evidence cards와 시각적 경합 (가이드 §1.2 동시 motion 1개 원칙처럼, 시각적 weight 동시 1개).
우측 상단 "regenerate narrative" 텍스트 버튼 (icon + text, 가이드 §3.1). cost numeric 표시 (BudgetContext에서 끌어옴).

### 6. WatchToggle (가이드 §1, §3)

pin detail 우상단. switch shape — on/off가 *position*으로 인코딩 (preattentive, 가이드 §1.1). 활성 시 작은 4px dot 추가 (Bartram 2001 — 작아서 attention noise 최소). stripe 0%.

### 7. Empty states — product value 진술 (가이드 §7.2)

- pin 0개일 때: "Investigations you pin will live here. They diff themselves when code changes."
- delta 0개일 때: "No evidence has shifted since you pinned this. The answer still holds."

이 메시지는 product moat 자체. typography는 본문보다 한 단계 위 (17px regular). 가볍게 처리하지 않음.

### 8. Motion 표 (가이드 §5)

| 이벤트 | duration | easing |
|---|---|---|
| pin list item hover lift | 80ms | ease-out |
| timeline tick highlight on hover | 120ms | ease-out |
| diff view enter | 240ms | ease-out (0, 0, 0.2, 1) |
| WatchToggle dot fade-in | 120ms | ease-out |
| narrative regenerate spinner | 1200ms loop | linear (spinner 예외) |

`prefers-reduced-motion: reduce` (가이드 §5.3, WCAG 2.3.3): hover lift 제거, slide 전환 → fade only. 정보 손실 0.

### 9. Surface cheat (가이드 §8)

| 채널 | 사용 |
|---|---|
| Primary preattentive | position (timeline 좌/우, diff 좌/우) + opacity (older replay 약간 dim) |
| Cognitive load | 5 delta / 5 pin / 3 카테고리 |
| 색 사용 | none — 시간/카테고리 모두 모양·텍스트 |
| Motion | 1 surface 1 motion |

### 10. 검증 (가이드 §9)

- color-blind sim: added/removed/changed icon shape 보존.
- WCAG AA: glass 위 attribution row, narrative paragraph 4.5:1.
- time-to-first-glance: 사용자가 timeline ribbon 본 후 *몇 번 replay 됐는지* 인지 <1.5s.
- prefers-reduced-motion ON에서도 timeline / diff / watch 정보 손실 0.

## 검증된 외부 패턴과 차이점

**vs Sentry replay**

- Sentry는 *runtime* 세션의 시각적 replay. 마우스 움직임, DOM 변경.
- 우리 replay는 *static analysis evidence* 수준의 replay. 같은 질의 → 다른 시점 코드 → evidence 단위 diff.
- 공통점: "그때 vs 지금"을 사용자가 손으로 비교하지 않게 만든다는 정신.
- 차이: Sentry는 사람의 행동을 재생, 우리는 코드 사실을 재생.

**vs Datadog notebooks**

- Datadog notebook은 query를 박아두면 시간이 지나도 같은 query를 재실행 가능.
- 비슷한 정신이지만, Datadog은 metric/log query 결과의 시계열 diff. 우리는 typed evidence set의 diff.
- Datadog은 attribution이 시계열 anomaly에 머무름. 우리는 PR/author까지 join.

**vs Cody chat history / Cursor chat history**

- 둘 다 conversation log. 스크롤은 되지만 비교는 안 됨.
- "지난번에 우리가 뭐라고 결론냈지" → 직접 읽어야 함. 그동안 코드가 바뀌었으면 그 결론이 아직 맞는지 인간이 다시 판단.
- 우리는 결론(=InvestigationAnswer)이 evidence와 함께 typed로 박혀 있어서, 시스템이 자동으로 "아직 맞다 / 깨졌다 / 더 확실해졌다"를 말해줌.

이 차이가 moat의 실체다 — schema가 있는 한 diff/attribution/notify가 자연스럽고, schema가 없는 한 그것들은 모두 사람 일이다.

## 성공 지표

- pin 만든 investigation 비율 (조사 세션 중 % pinned)
- pin 1개당 평균 replay 횟수 (1.0 이상이 목표 — pin이 죽은 데이터가 아님)
- replay 후 narrative read-through rate
- watch 알림 → 실제 action click 전환율 (alert fatigue 안 만들었는지의 지표)
- recurring incident에서 "pin 열기 → 새 답 도출"까지의 first useful answer latency

## 출시 순서

### Phase 1 — Pin + manual replay on demand

핵심: pin 만들고, "Replay now" 한 번 누르면 새 ContextBundle이 나오는 것. diff는 이 phase에서는 **나란히 보여주기만** (자동 narrative/attribution 없음).

- localStorage adapter
- PinList + PinDetail UI
- "Replay now" 버튼 → `gatherContext` 재실행 → 두 bundle을 side-by-side로 표시
- delta marker는 **client-side naive diff** (id 기반 added/removed; payload diff는 Phase 2)

### Phase 2 — Evidence diff + narrative

- payload-level diff (callers count, taint hops, confidence, staleness 변화)
- `EvidenceDelta` discriminated union 정착
- attribution: incremental_analysis(mock)가 알려주는 PR/author 메타와 join
- NarrativeBlock 합성 (deterministic template; 실제 LLM 통합은 백엔드 트랙)

### Phase 3 — Subscribe + auto-notify + backend

- WatchToggle UI + threshold config
- background watcher (mock setInterval; 실제 스케줄러는 backend)
- 알림 → auto-replay → "answer may be invalid" surface
- localStorage → backend swap (adapter pattern)

## Frontend 구현계획

백엔드는 별도 트랙. 모든 phase를 frontend feature slice 단위로 paste-ready TS로 푼다. mock data는 `entities/investigation-pin/model/fixtures.ts`에 모아둔다 — 실제 백엔드 응답으로 교체할 때 schema만 매칭되면 dead code화 가능.

### 0. 사전 정리 (모든 phase 공통)

- [src/entities/](src/entities/) 아래 새 entity 1개: `investigation-pin`
- [src/features/](src/features/) 아래 새 슬라이스 1개: `investigation-replay/{model,diff,narrative,ui}`
- Feature 04의 [src/entities/investigation/](src/entities/investigation/), [src/features/investigation/](src/features/investigation/)은 손대지 않음. import만 한다.
- chat-agent는 무시. TokensContext도 import 금지.

### Phase 1 — Pin + manual replay

#### 1.1 entity 정의 — [src/entities/investigation-pin/](src/entities/investigation-pin/)

`model/types.ts` — paste-ready TS. Feature 04 타입을 import해서 사용한다.

```ts
import type {
  ContextBundle,
  EvidenceItem,
  EvidenceId,
  InvestigationAnswer,
  InvestigationTarget,
} from '@/entities/investigation/model/types';

// branded ids — 문자열 혼용 방지 (Feature 04와 동일 패턴)
export type PinId = string & { readonly __brand: 'PinId' };
export type ReplayId = string & { readonly __brand: 'ReplayId' };

export interface PinMeta {
  pinnedAt: string;        // ISO timestamp
  pinnedBy: string;        // user id (Phase 1: 'local')
  commitSha: string | null; // 'unknown'이면 null (Phase 1 mock에서 종종 null)
  note: string;            // free text, max 280 chars
}

export interface InvestigationPin {
  id: PinId;
  schemaVersion: 1;        // Phase 2에서 bump
  target: InvestigationTarget;
  questionType: string;    // Feature 04의 questionTypes.ts와 호환되는 string
  question: string;        // 사용자가 입력한 자연어 질문
  bundle: ContextBundle;   // pin 시점 snapshot. 불변.
  answer: InvestigationAnswer;
  meta: PinMeta;
  watching: boolean;       // Phase 1은 false 고정
}

export interface ReplayMeta {
  replayedAt: string;
  commitSha: string | null;
  triggeredBy: 'user' | 'watch'; // Phase 1은 'user' 고정
}

export interface InvestigationReplay {
  id: ReplayId;
  pinId: PinId;
  bundle: ContextBundle;          // replay 시점 snapshot
  answer: InvestigationAnswer;    // 새로 합성된 답 (replay 시점)
  meta: ReplayMeta;
  // deltas는 Phase 1은 빈 배열도 허용 (naive id-diff만). Phase 2에서 채움.
  deltas: EvidenceDelta[];
}

// discriminated union — 모든 delta 종류는 .kind로 narrowing
export type EvidenceDelta =
  | {
      kind: 'added';
      replayEvidenceId: EvidenceId;
      summary: string;             // EvidenceItem.summary mirror, ≤140
    }
  | {
      kind: 'removed';
      pinEvidenceId: EvidenceId;
      summary: string;
    }
  | {
      kind: 'changed';
      pinEvidenceId: EvidenceId;
      replayEvidenceId: EvidenceId;
      // changed가 무엇인지 phase 2에서 더 좁힘. Phase 1은 'shape_only'만.
      changeSet: ReadonlyArray<
        | 'confidence'
        | 'staleness'
        | 'whyPartial'
        | 'payload_shape'
      >;
      summary: string;
    };

// type guards (paste-ready)
export const isAdded = (d: EvidenceDelta): d is Extract<EvidenceDelta, { kind: 'added' }> =>
  d.kind === 'added';
export const isRemoved = (d: EvidenceDelta): d is Extract<EvidenceDelta, { kind: 'removed' }> =>
  d.kind === 'removed';
export const isChanged = (d: EvidenceDelta): d is Extract<EvidenceDelta, { kind: 'changed' }> =>
  d.kind === 'changed';

// brand cast helpers
export const asPinId = (s: string): PinId => s as PinId;
export const asReplayId = (s: string): ReplayId => s as ReplayId;
```

`model/storage.ts` — localStorage adapter. Phase 3에서 backend로 swap할 수 있도록 인터페이스만 박아둠.

```ts
import type { InvestigationPin, PinId } from './types';

export interface PinStore {
  list(): Promise<InvestigationPin[]>;
  get(id: PinId): Promise<InvestigationPin | null>;
  put(pin: InvestigationPin): Promise<void>;   // 불변. id 충돌 시 throw.
  remove(id: PinId): Promise<void>;
}

const KEY_PREFIX = 'inv-pin:v1:';

export const localPinStore: PinStore = {
  async list() {
    const out: InvestigationPin[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(KEY_PREFIX)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        out.push(JSON.parse(raw) as InvestigationPin);
      } catch {
        // 손상된 row는 스킵. 운영 backend로 가면 sentry에 보냄.
      }
    }
    return out.sort((a, b) => b.meta.pinnedAt.localeCompare(a.meta.pinnedAt));
  },
  async get(id) {
    const raw = localStorage.getItem(KEY_PREFIX + id);
    return raw ? (JSON.parse(raw) as InvestigationPin) : null;
  },
  async put(pin) {
    const key = KEY_PREFIX + pin.id;
    if (localStorage.getItem(key)) {
      throw new Error(`pin id collision: ${pin.id}`);
    }
    localStorage.setItem(key, JSON.stringify(pin));
  },
  async remove(id) {
    localStorage.removeItem(KEY_PREFIX + id);
  },
};
```

`model/fixtures.ts` — 두 개의 demo pin (각각 다른 questionType). naive id collision을 피하려고 brand cast helper 사용.

`index.ts` — types + storage + fixtures re-export.

#### 1.2 replay store + diff (Phase 1 naive 버전) — [src/features/investigation-replay/model/](src/features/investigation-replay/model/)

`ReplayContext.tsx` — provider + hook (`useReplay`).

```ts
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  asPinId,
  asReplayId,
  localPinStore,
  type InvestigationPin,
  type InvestigationReplay,
  type PinId,
} from '@/entities/investigation-pin';
import { useInvestigation } from '@/features/investigation';
import { gatherContext } from '@/features/investigation/planner/gatherContext';
import { naiveDiff } from '../diff/naive';

type ReplayState = {
  pins: InvestigationPin[];
  activePinId: PinId | null;
  replays: Record<PinId, InvestigationReplay[]>;
  loading: 'idle' | 'list' | 'replay';
};

type ReplayApi = ReplayState & {
  refresh: () => Promise<void>;
  pinCurrent: (note: string) => Promise<PinId | null>;
  openPin: (id: PinId) => void;
  closePin: () => void;
  replayNow: (id: PinId) => Promise<void>;
};

const Ctx = createContext<ReplayApi | null>(null);

export function ReplayProvider({ children }: { children: ReactNode }) {
  const inv = useInvestigation(); // pinCurrent가 의존하는 현재 investigation 상태
  const [state, set] = useState<ReplayState>({
    pins: [],
    activePinId: null,
    replays: {},
    loading: 'idle',
  });

  const refresh = useCallback(async () => {
    set((s) => ({ ...s, loading: 'list' }));
    const pins = await localPinStore.list();
    set((s) => ({ ...s, pins, loading: 'idle' }));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pinCurrent = useCallback<ReplayApi['pinCurrent']>(
    async (note) => {
      if (!inv.activeTarget || !inv.bundle || !inv.answer) return null;
      const id = asPinId(`pin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      const pin: InvestigationPin = {
        id,
        schemaVersion: 1,
        target: inv.activeTarget,
        questionType: inv.questionType ?? 'why_risky',
        question: inv.questionText ?? '',
        bundle: inv.bundle,
        answer: inv.answer,
        meta: {
          pinnedAt: new Date().toISOString(),
          pinnedBy: 'local',
          commitSha: null,
          note: note.slice(0, 280),
        },
        watching: false,
      };
      await localPinStore.put(pin);
      await refresh();
      return id;
    },
    [inv, refresh]
  );

  const openPin = useCallback((id: PinId) => set((s) => ({ ...s, activePinId: id })), []);
  const closePin = useCallback(() => set((s) => ({ ...s, activePinId: null })), []);

  const replayNow = useCallback<ReplayApi['replayNow']>(
    async (id) => {
      set((s) => ({ ...s, loading: 'replay' }));
      const pin = await localPinStore.get(id);
      if (!pin) {
        set((s) => ({ ...s, loading: 'idle' }));
        return;
      }
      // 같은 target/questionType으로 다시 모은다.
      const replayBundle = await gatherContext(pin.target, pin.questionType);
      // Phase 1: id 기반 naive diff만. Phase 2에서 payload-level로 확장.
      const deltas = naiveDiff(pin.bundle, replayBundle);
      const replay: InvestigationReplay = {
        id: asReplayId(`replay_${Date.now()}`),
        pinId: pin.id,
        bundle: replayBundle,
        answer: pin.answer, // Phase 1은 답 재합성 안 함; Phase 2에서 composeAnswer 재실행
        meta: {
          replayedAt: new Date().toISOString(),
          commitSha: null,
          triggeredBy: 'user',
        },
        deltas,
      };
      set((s) => ({
        ...s,
        loading: 'idle',
        replays: {
          ...s.replays,
          [pin.id]: [...(s.replays[pin.id] ?? []), replay],
        },
      }));
    },
    []
  );

  const api = useMemo<ReplayApi>(
    () => ({ ...state, refresh, pinCurrent, openPin, closePin, replayNow }),
    [state, refresh, pinCurrent, openPin, closePin, replayNow]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useReplay(): ReplayApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useReplay must be inside <ReplayProvider>');
  return v;
}
```

#### 1.3 naive diff — [src/features/investigation-replay/diff/naive.ts](src/features/investigation-replay/diff/naive.ts)

```ts
import type { ContextBundle, EvidenceId } from '@/entities/investigation/model/types';
import type { EvidenceDelta } from '@/entities/investigation-pin';

// Phase 1: id-only set diff. payload-level diff는 Phase 2.
export function naiveDiff(
  pinBundle: ContextBundle,
  replayBundle: ContextBundle
): EvidenceDelta[] {
  const pinMap = new Map<EvidenceId, (typeof pinBundle.evidence)[number]>();
  pinBundle.evidence.forEach((e) => pinMap.set(e.id, e));
  const replayMap = new Map<EvidenceId, (typeof replayBundle.evidence)[number]>();
  replayBundle.evidence.forEach((e) => replayMap.set(e.id, e));

  const out: EvidenceDelta[] = [];

  for (const [id, ev] of replayMap) {
    if (!pinMap.has(id)) {
      out.push({ kind: 'added', replayEvidenceId: id, summary: ev.summary });
    }
  }
  for (const [id, ev] of pinMap) {
    if (!replayMap.has(id)) {
      out.push({ kind: 'removed', pinEvidenceId: id, summary: ev.summary });
    }
  }
  // Phase 1은 'changed'를 만들지 않는다. 같은 id면 같다고 본다.
  return out;
}
```

#### 1.4 UI — [src/features/investigation-replay/ui/](src/features/investigation-replay/ui/)

- `PinList.tsx` — InvestigatePanel 안의 보조 탭. pin 0개면 empty state.
- `PinDetail.tsx` — pin 1개 열림 상태. 위에 question + meta, 아래 "Replay now" 버튼.
- `ReplayDiffView.tsx` — side-by-side. 좌측 pin EvidenceCard 리스트, 우측 replay EvidenceCard 리스트. 가운데 gutter에 delta chip.
  - **EvidenceCard는 features/investigation/evidence에서 import** — 새로 만들지 않는다.
- `TimelineRibbon.tsx` — pin detail 상단의 가로 timeline. dot + label, stripe 금지.
- `PinButton.tsx` — InvestigatePanel 답변 surface 우상단에 붙는 작은 pin 버튼.

스타일 가드:

- 모든 카드/패널은 GlassCard 공유 (memory rule, 20+ warnings)
- 좌측 stripe / accent bar 절대 금지 (memory rule, 3+ warnings)
- alpha는 0.3–0.45 dark / 0.5–0.7 light (memory rule)
- backdrop-filter 깨질 ancestor transform 주의 (memory rule)

#### 1.5 라우팅 / providers

- `<ReplayProvider>`를 [src/app/router/intelligence/IntelligenceLayout.tsx](src/app/router/intelligence/IntelligenceLayout.tsx) 안쪽, `<InvestigationProvider>` 바로 아래에 마운트.
- AppProviders에 올리지 **않는다** — Feature 04 결정과 동일 이유 (라우트 cleanup, lazy split, leak 방지).
- PinList/PinDetail은 InvestigatePanel 안의 보조 surface로만 등장. 별도 라우트 추가 안 함 (Phase 1).

#### 1.6 Pin 액션 wiring

- "Pin this investigation" 버튼은 `inv.answer != null && inv.bundle?.status === 'complete'` 일 때만 enabled.
- pin 성공 시 toast + PinList로 자동 스크롤.
- pin 실패(localStorage quota 등) → unknown 슬롯과 같은 톤의 inline error.

#### Phase 1 완료 조건

- [ ] 답변 surface에서 "Pin" 클릭 시 localStorage에 pin 1개 추가됨
- [ ] PinList가 시간순으로 pin을 표시
- [ ] PinDetail에서 "Replay now" 클릭 시 새 ContextBundle이 생기고 side-by-side 렌더
- [ ] added/removed delta chip이 정확하게 표시됨 (id-only diff)
- [ ] EvidenceCard는 Feature 04 컴포넌트를 그대로 재사용
- [ ] 모든 surface가 GlassCard 공유 + stripe 금지

---

### Phase 2 — Evidence diff + narrative

#### 2.1 deep diff — [src/features/investigation-replay/diff/deep.ts](src/features/investigation-replay/diff/deep.ts)

```ts
import type { ContextBundle, EvidenceItem } from '@/entities/investigation/model/types';
import type { EvidenceDelta } from '@/entities/investigation-pin';

type ChangeKey = 'confidence' | 'staleness' | 'whyPartial' | 'payload_shape';

function diffSingle(a: EvidenceItem, b: EvidenceItem): ChangeKey[] {
  const out: ChangeKey[] = [];
  if (a.confidence !== b.confidence) out.push('confidence');
  if (a.staleness !== b.staleness) out.push('staleness');
  if (a.whyPartial !== b.whyPartial) out.push('whyPartial');
  // payload는 discriminated union이라 kind부터 다르면 changed가 아니라 added+removed로 봄.
  // 같은 kind 안에서만 shape diff를 본다.
  if (a.payload.kind === b.payload.kind) {
    if (JSON.stringify(a.payload) !== JSON.stringify(b.payload)) {
      out.push('payload_shape');
    }
  }
  return out;
}

export function deepDiff(pin: ContextBundle, replay: ContextBundle): EvidenceDelta[] {
  const pinMap = new Map(pin.evidence.map((e) => [e.id, e] as const));
  const replayMap = new Map(replay.evidence.map((e) => [e.id, e] as const));
  const out: EvidenceDelta[] = [];

  for (const [id, ev] of replayMap) {
    const prev = pinMap.get(id);
    if (!prev) {
      out.push({ kind: 'added', replayEvidenceId: id, summary: ev.summary });
      continue;
    }
    const changeSet = diffSingle(prev, ev);
    if (changeSet.length > 0) {
      out.push({
        kind: 'changed',
        pinEvidenceId: prev.id,
        replayEvidenceId: ev.id,
        changeSet,
        summary: ev.summary,
      });
    }
  }
  for (const [id, ev] of pinMap) {
    if (!replayMap.has(id)) {
      out.push({ kind: 'removed', pinEvidenceId: id, summary: ev.summary });
    }
  }
  return out;
}
```

ReplayProvider의 `replayNow`가 Phase 2에서 `naiveDiff` → `deepDiff`로 swap.

#### 2.2 attribution — [src/features/investigation-replay/diff/attribute.ts](src/features/investigation-replay/diff/attribute.ts)

```ts
import type { EvidenceDelta } from '@/entities/investigation-pin';

export interface PrMeta {
  prNumber: number;
  author: string;
  mergedAt: string;
  touchedSymbols: string[];
}

export interface AttributedDelta {
  delta: EvidenceDelta;
  attributedTo: PrMeta | null; // null = 책임 PR을 못 찾음 (UI에서 'unknown'로 표기)
}

export function attributeDeltas(
  deltas: EvidenceDelta[],
  prs: PrMeta[],
  // Phase 2 mock: incremental_analysis가 알려주는 symbol-level mapping
  symbolFor: (delta: EvidenceDelta) => string | null
): AttributedDelta[] {
  return deltas.map((d) => {
    const sym = symbolFor(d);
    if (!sym) return { delta: d, attributedTo: null };
    const candidate =
      prs.find((p) => p.touchedSymbols.includes(sym)) ?? null;
    return { delta: d, attributedTo: candidate };
  });
}
```

#### 2.3 narrative — [src/features/investigation-replay/narrative/compose.ts](src/features/investigation-replay/narrative/compose.ts)

```ts
import type { AttributedDelta } from '../diff/attribute';
import type { InvestigationPin, InvestigationReplay } from '@/entities/investigation-pin';

export interface NarrativeBlock {
  paragraph: string;            // ≤ 5문장
  highlights: ReadonlyArray<{
    code: 'callers_grew' | 'taint_extended' | 'unknown_resolved' | 'staleness_fresh' | 'evidence_lost';
    label: string;
  }>;
  attributions: ReadonlyArray<AttributedDelta>;
}

// deterministic template; LLM 통합은 백엔드 트랙에서 swap
export function composeNarrative(
  pin: InvestigationPin,
  replay: InvestigationReplay,
  attributed: AttributedDelta[]
): NarrativeBlock {
  const added = attributed.filter((a) => a.delta.kind === 'added').length;
  const removed = attributed.filter((a) => a.delta.kind === 'removed').length;
  const changed = attributed.filter((a) => a.delta.kind === 'changed').length;

  const sentences: string[] = [];
  sentences.push(
    `pin 시점(${pin.meta.pinnedAt.slice(0, 10)}) 이후 evidence ${added}건 추가, ${removed}건 소실, ${changed}건 변경되었다.`
  );
  if (added > 0) sentences.push(`새로 잡힌 evidence는 같은 영역의 영향이 넓어졌음을 시사한다.`);
  if (removed > 0) sentences.push(`사라진 evidence는 코드 경로가 닫혔거나 심볼이 제거되었을 가능성이 높다.`);
  if (changed > 0) sentences.push(`변경된 evidence는 confidence/staleness가 흔들린 항목이다.`);
  if (added + removed + changed === 0) {
    sentences.push('pin 이후 evidence 변화가 없다. 답은 여전히 유효하다.');
  }

  return {
    paragraph: sentences.join(' '),
    highlights: [], // Phase 2 후반부에서 deltas → highlight 매핑
    attributions: attributed,
  };
}
```

#### 2.4 UI 추가

- `NarrativeBlock.tsx` — diff view 상단 banner. paragraph + attribution row.
- delta chip 클릭 → 해당 attribution row가 highlight (scrollIntoView).
- EvidenceCard 안에서 `confidence/staleness` 변화는 작은 arrow chip으로 표시 (medium → high). stripe 금지.

#### Phase 2 완료 조건

- [ ] deepDiff가 confidence/staleness/whyPartial/payload_shape 변화를 잡음
- [ ] attributedDeltas가 mock PR list와 join하여 PR 번호/저자를 보여줌
- [ ] NarrativeBlock이 diff view 상단에 렌더, paragraph가 5문장 이하
- [ ] 변화 0개일 때 "pin 이후 evidence 변화가 없다" 메시지가 정확히 출력

---

### Phase 3 — Subscribe + auto-notify + backend

#### 3.1 watch — [src/features/investigation-replay/model/watch.ts](src/features/investigation-replay/model/watch.ts)

```ts
import type { PinId } from '@/entities/investigation-pin';

export interface WatchConfig {
  thresholdDeltaCount: number;       // 이만큼 이상이면 invalidate 알림
  invalidateOnConfidenceDrop: boolean; // high → low/unknown 발생 시 즉시 알림
  pollMs: number;                    // Phase 3 mock: setInterval, 실제는 backend push
}

export const defaultWatch: WatchConfig = {
  thresholdDeltaCount: 3,
  invalidateOnConfidenceDrop: true,
  pollMs: 60_000,
};

export type WatchEvent =
  | { kind: 'invalidated'; pinId: PinId; reason: string }
  | { kind: 'shifted'; pinId: PinId; deltaCount: number };

export type WatchSubscriber = (e: WatchEvent) => void;
```

`WatchManager.tsx` — pin 중 `watching: true`인 것들에 대해 polled replay를 돌리고, threshold 위반 시 WatchEvent를 emit. UI는 IntelligenceLayout의 toast surface로 받아 띄움.

#### 3.2 auto-replay flow

- WatchEvent → 해당 pin detail로 deeplink + 자동 replay 1회 실행 + NarrativeBlock 즉시 표시
- 답변 surface 상단에 "Pinned answer may be invalid" 배너 (stripe 아니라 chip + icon)

#### 3.3 backend swap

- `localPinStore`를 `httpPinStore`로 교체할 수 있도록 ReplayProvider가 `PinStore`를 prop으로 받도록 리팩터.
- localStorage는 fallback으로만 (offline 시).

#### 3.4 polish

- pin detail 키보드 nav (j/k로 timeline tick 이동)
- aria labels: PinList rows, delta chips, narrative paragraph (`role="region"`)
- empty/error/cancel 상태

#### Phase 3 완료 조건

- [ ] WatchToggle on 시 pin이 백그라운드에서 monitor됨 (mock interval)
- [ ] threshold 위반 시 toast → 자동 replay → invalidate 배너 노출
- [ ] PinStore 인터페이스가 backend adapter로 swap 가능 (코드 변화 1곳)

---

### 모듈 의존성 그래프

```
entities/investigation                     (Feature 04 — 변경 없음)
  ↑
entities/investigation-pin                 (NEW — types, storage, fixtures)
  ↑
features/investigation-replay/model        ← BudgetContext (재사용; chat-agent와 공유 안 함)
  ↑                ↑                  ↑
  diff             narrative          ui
       ↑                ↑                  ↑
       └────────────────┴── ReplayProvider ┘
  ↑
features/investigation                      (Feature 04 — gatherContext만 호출)
  ↑
app/router/intelligence/IntelligenceLayout  (← provider 마운트, AppProviders 아님)
```

ChatAgent는 이 그래프 밖. TokensContext도 import 안 함. Feature 04가 박은 경계를 그대로 지킨다.

### 손대지 않을 것

- [src/features/chat-agent/](src/features/chat-agent/) — 그대로
- [src/features/investigation/](src/features/investigation/) — gatherContext / EvidenceCard만 import. 내부 수정 없음.
- [src/entities/investigation/](src/entities/investigation/) — 타입만 import. 변경 없음.
- AppProviders — 절대 안 건드림. Replay/Watch provider는 IntelligenceLayout 안쪽.
- 좌측 FilterBar, InspectPanel — GlassCard 공유만 확인. 코드 수정 없음.

### 백엔드 트랙과의 contract

- `InvestigationPin`, `InvestigationReplay`, `EvidenceDelta` schema가 boundary
- `PinStore` 인터페이스가 swap point — local ↔ http
- `gatherContext(target, questionType)`은 Feature 04와 공유. replay가 별도로 만들지 않는다.
- `attributeDeltas`의 `symbolFor` mapping은 incremental_analysis 응답으로 채워진다 — backend가 EvidenceItem.id ↔ symbol을 알려줘야 함. 이게 contract의 가장 미묘한 지점.
- narrative의 LLM swap은 `composeNarrative` 함수 1개. deterministic template ↔ LLM 호출.

## Why Developers Will Care

이 기능이 잘 되면 조사 결과가 시간이 지나도 죽지 않는다.

- 같은 incident이 재발했을 때 첫 5분이 "지난번 답이 아직 맞는가?"로 시작 → 5초로 줄어든다.
- "이 PR이 우리가 6주 전에 결론 낸 답을 깨뜨렸다"를 시스템이 먼저 알려준다 — 사람이 알아채기 전에.
- 노트, 문서, 슬랙 메시지가 stale해지는 고질적 문제를 typed evidence가 자동으로 해결한다.

다른 LLM 도구는 이걸 못 한다. 그쪽은 conversation을 저장하지만 우리는 evidence를 저장한다. 그게 단지 storage 차이가 아니라 **시간을 다루는 방식**의 차이다.
