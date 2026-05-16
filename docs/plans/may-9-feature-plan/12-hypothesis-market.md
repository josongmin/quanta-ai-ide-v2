# Feature 12: Hypothesis Market

## One-liner
같은 incident/타깃을 두고 여러 조사자(사람 또는 AI 에이전트)가 경쟁적으로 가설을 게시하고, 시스템이 typed evidence 가중치로 자동 채점해 "지금 가장 설명력 높은 가설"이 자연스럽게 떠오르도록 만드는 public board.

## Problem Statement

디버깅은 본질적으로 **경쟁하는 이론들의 게임**이다. 한 incident에 대해 보통 3~5개의 그럴듯한 가설이 동시에 살아있다.

오늘날 그 가설들이 사는 곳은 다음 중 하나다.

- Slack 스레드 — 시간순으로 휘발, 누가 무엇을 주장했는지 잊힘
- Jira 코멘트 — 본문이 한 사람 것이 되고 나머지는 reply로 묻힘
- Notion incident doc — 한 명이 합의된 결론만 적고 끝
- Cody / Cursor 채팅 — 1:1 대화, 다른 사람의 가설을 보지 못함

문제는 세 가지다.

1. 가설이 **attributed**되지 않는다. 누가 처음 제시했는지 사라진다.
2. 가설이 **scored**되지 않는다. 새 PR이 들어오거나 replay가 돌아도, 누군가 수동으로 "어 이거 X 가설을 강화하네"라고 외치지 않으면 아무것도 안 일어난다.
3. 가설이 **refuted**되지 않는다. 틀린 가설은 조용히 사라지고, 같은 incident가 재발하면 또 처음부터 다시 한다.

2026년 기준으로 AI 에이전트가 조사를 거들기 시작하면서 이 문제가 더 커진다. 사람 조사자 + AI 조사자가 동시에 같은 incident를 보는데, 둘의 결론이 따로 흘러간다.

## Why This Matters

Feature 04 (AI Investigation Workspace)는 이미 **하나의** investigation에 대해 evidence-first 답변을 만든다. 하지만 그건 한 명(또는 한 에이전트)의 시점이다.

실제 incident는 여러 시점이 동시에 살아있어야 한다.

- "auth middleware의 race condition이다" — A가 주장
- "최근 config parser 변경의 부작용이다" — B가 주장
- "downstream redis timeout의 증상이다" — C가 주장

세 가설은 각각 다른 evidence를 강화/약화한다. 그리고 새 evidence가 들어올 때마다 (새 PR, 새 incident, replay 결과) **점수가 자동으로 갱신**되어야 한다.

지금 이걸 자동으로 해주는 도구는 없다. moat가 있는 자리다.

## Moat

남들이 못 하는 이유는 명확하다 — **typed supporting/refuting을 first-class로 가진 Hypothesis schema가 없기 때문**이다.

generic chat은 "evidence"를 free-text로만 다룬다. supporting인지 refuting인지, 가중치가 얼마인지, freshness가 얼마인지 schema에 박혀 있지 않다. 그래서 점수를 낼 수가 없다.

우리는 다르다.

1. Feature 04에서 이미 `EvidenceItem`이 `confidence`, `staleness`, `whyPartial`을 schema로 갖는다.
2. Hypothesis가 `supporting: EvidenceLink[]`와 `refuting: EvidenceLink[]`를 first-class로 갖는다 — 단순 free-text reference가 아니라 weight 0..1이 붙은 typed link다.
3. 따라서 score = sum(supporting weight × confidence × freshness) - sum(refuting weight × confidence × freshness)가 **결정론적으로** 계산된다.
4. 새 evidence가 들어오면 자동 re-score. 사람이 가설마다 "어 이게 맞나?" 다시 생각하지 않아도 된다.

> 우리는 가설을 더 많이 모으지 않는다. 가설을 *typed evidence로 채점*한다.

이게 Linear sub-issue, Slack thread, Cody chat이 흉내 못 내는 자리다. 그쪽은 schema가 없어서 score를 못 낸다.

## 기술 배경

이 feature가 의존하는 자산:

- Feature 04의 `EvidenceItem` schema (kind, sourceTool, confidence, staleness, whyPartial, payload)
- Feature 04의 `Hypothesis` 타입 — Phase 1에서는 `{ id, statement, supporting: EvidenceId[], refuting: EvidenceId[] }`만 있음. **이걸 확장한다.**
- Feature 02의 suspect ranking — incident 단위 조사에서 "후보 변경"이 곧 "후보 가설"의 seed가 된다.
- Feature 04의 `InvestigationContext` — investigation 단위로 hypothesis market이 살아 있어야 한다.

핵심 결정:

1. Hypothesis는 investigation **scope** 안에서 산다. 한 incident/target에 대해 hypothesis가 누적된다.
2. evidence는 hypothesis를 **공유**할 수 있다. 같은 EvidenceItem이 가설 A를 강화하고 가설 B를 약화하는 게 가능해야 한다.
3. score는 **snapshot**이다 — 매번 계산하지 않고 evidence 변경 이벤트에 반응해서 갱신.
4. dominance 판정은 **시간 누적**으로 한다. 한순간의 score gap은 노이즈일 수 있다.

## 제안 기능

### 1. Post Hypothesis

investigation panel 안에서 "Post Hypothesis" 버튼.

- statement (1~2줄) 입력
- proposer는 자동 (현재 사용자 또는 active agent)
- 초기 supporting evidence를 0개 이상 attach 가능 (현재 bundle의 EvidenceItem 중 선택)
- 게시 즉시 score 계산되어 market view에 등장

### 2. Evidence Linking

기존 가설에 evidence를 붙이는 동작.

- "Support this with..." / "Refute this with..." 두 버튼
- 현재 ContextBundle의 EvidenceItem 또는 새로 gather한 item을 link
- weight는 0.1 / 0.3 / 0.7 / 1.0 4단계로 시작 (slider 아님 — 정밀도 환상 방지)
- link는 attribution 보존 (누가 link했는지, 언제)

### 3. Scoring Engine

```
score(h) = Σ link.weight × evidence.confidenceFactor × evidence.freshnessFactor   (over supporting)
        − Σ link.weight × evidence.confidenceFactor × evidence.freshnessFactor   (over refuting)
```

- `confidenceFactor`: high=1.0, medium=0.6, low=0.3, unknown=0.1
- `freshnessFactor`: fresh=1.0, stale=0.5, unknown=0.4
- 결과는 [-N, +N] 범위. 0 근처면 "undecided"로 표시.
- engine은 pure function. evidence 변경이나 link 변경이 발생할 때마다 호출.

### 4. Refutation Flow

남의 가설을 반증하는 건 first-class 액션이다.

- "Refute" 버튼 → counter-evidence 선택 모달
- 본인이 게시한 가설도 반증 가능 (자기 가설을 죽이는 게 가능해야 정직한 시장이 된다)
- refute가 들어오면 가설 카드에 작은 "contested" 마커 (붉은 점이나 stripe 절대 아님 — neutral chip + count)

### 5. Dominance Detection

한 가설이 한참 동안 압도적이면 watcher에게 알림.

- gap = topScore - secondScore
- gap > threshold (예: 1.5)이 N분(예: 3분) 이상 지속되면 `status: 'dominant'`로 전환
- 지속 시간 조건이 있어야 한다. 일시적인 spike로 alert 보내면 신뢰가 깨진다.
- dominant가 되면 watcher들에게 toast (chat-agent 위치와 안 겹치는 곳)

### 6. Agent Participation

AI 에이전트가 가설을 직접 게시할 수 있다.

- Feature 04의 `composeAnswer()` 결과를 paraphrase해서 hypothesis statement로 변환
- `proposer.kind = 'agent'`로 구분
- agent 가설은 작은 robot glyph + agent label로 시각적으로 구분 (색 stripe 아님)
- 사람이 agent 가설을 refute하거나 support하는 게 가능 — 즉 agent와 human이 같은 시장에서 경쟁한다

## AI-native 설계

이 기능이 그냥 "공유 노트북"이 아닌 이유:

1. **에이전트가 시장 참여자다**. 사람만 보는 게 아니라 AI가 가설을 게시하고, 사람이 그 가설을 typed evidence로 검증한다. 사람 ↔ 에이전트의 단방향이 아닌 양방향 검증 루프.
2. **새 evidence가 들어오면 점수가 자동 재계산된다**. 사람이 "이거 A 가설을 약화시키는데?"라고 외치지 않아도 된다. evidence schema가 가중치를 알기 때문에 reactive하게 갱신된다.
3. **unknown 슬롯과 연결된다**. Feature 04의 unknowns가 곧 "이 가설을 반증/강화할 수 있는 다음 분석 후보"가 된다. PendingUnknownsBlock에서 곧장 "이 unknown으로 hypothesis X를 검증" 액션이 나간다.
4. **cross-incident recall**. 같은 시장에서 검증된 dominant hypothesis가 비슷한 다음 incident에서 seed로 다시 등장한다 (Phase 3).

## 리팩토링 / 아키텍처 영향

새 슬라이스:

- `features/hypothesis-market/model` — store, scoring snapshot, dominance state machine, watcher subscription
- `features/hypothesis-market/scoring` — pure scoring functions, dominance detector, freshness/confidence factor 정의
- `features/hypothesis-market/ui` — MarketPanel, HypothesisCard, ScoreBar, RefuteModal, EvidenceLinkPicker

`entities/investigation/model/types.ts`의 Hypothesis는 **확장**한다 (replace 아님, breaking 아님 — Phase 1 시점의 `supporting: EvidenceId[]`은 deprecated 표시 후 마이그레이션).

```ts
// entities/investigation/model/types.ts (확장)

export type ProposerKind = 'user' | 'agent';

export interface Proposer {
  kind: ProposerKind;
  id: string;            // userId 또는 agentId
  label: string;         // UI 표시용 (e.g. 'Jo', 'investigation-agent-v1')
}

export interface EvidenceLink {
  evidenceId: EvidenceId;
  weight: 0.1 | 0.3 | 0.7 | 1.0;   // 정밀도 환상 방지 — slider 아님
  linkedBy: Proposer;
  linkedAt: string;                 // ISO timestamp
}

export interface HypothesisScore {
  value: number;                    // 결정론적 합
  confidence: 'high' | 'medium' | 'low';   // gap 기반 파생 표시
  lastUpdated: string;              // ISO timestamp — re-score 트리거 추적용
}

export type HypothesisStatus = 'open' | 'dominant' | 'refuted' | 'archived';

export interface Hypothesis {
  id: HypothesisId;
  statement: string;
  proposer: Proposer;
  supporting: EvidenceLink[];       // 이전: EvidenceId[] — 마이그레이션 필요
  refuting: EvidenceLink[];
  score: HypothesisScore;           // computed snapshot
  status: HypothesisStatus;
  createdAt: string;
  // dominance 판정용 — store 내부에서 관리
  dominantSince?: string;
  refutedAt?: string;
}
```

마이그레이션 노트 (Feature 04 Phase 2 시점에 같이):

- 기존 `supporting: EvidenceId[]`를 `EvidenceLink[]`로 lift. weight 기본값 0.7, linkedBy는 placeholder system proposer.
- 기존 fixture가 있다면 helper `liftEvidenceIds(ids: EvidenceId[], by: Proposer): EvidenceLink[]`로 일괄 변환.

Provider scope:

- `<HypothesisMarketProvider>`는 **AppProviders에 올리지 않는다**. Feature 04의 `<InvestigationProvider>`와 같은 자리, 즉 `IntelligenceLayout` 내부에 마운트한다.
- investigation이 unmount되면 market도 unmount된다. 시장은 investigation의 lifetime을 따른다.
- watcher subscription도 layout-scoped. 라우트를 떠나면 subscription cleanup.

## UI/UX 코멘트

이 섹션은 [00-uiux-science-guide.md](docs/plans/may-9-feature-plan/00-uiux-science-guide.md)를 인용한다. hypothesis market의 핵심 도전: **score를 색 없이 시각화**해서 베팅 시장의 직관을 주는 것.

### 1. Notebook 사이드 패널로 — IA 일관성 (가이드 §7.1)

Feature 04 Notebook의 별도 컬럼 추가가 아니라 **toggle 가능한 side panel**. 노트북이 "이번 조사의 작업물"이라면 market은 "이번 조사 위 경쟁 이론들" — 같은 layer 안의 다른 view. spatial mapping 일관성.

### 2. Compact card list (가이드 §2.1, §6)

가설 카드 1장 = 4행: statement (1줄, 65자 이내) / proposer chip / score bar / supporting·refuting count.
한 화면에 **5개**까지 보임 (Cowan 4±1 상한). 그 이상은 fold + "show N more" — Feature 11 ticker와 같은 정책.
typography (가이드 §6): statement 14px medium / proposer 12px / count 12px monospace.

### 3. Score = bar **width** (가이드 §1.1, §3)

ScoreBar는 neutral chip 안의 가로 fill width를 0–100%로 mapping.
- *Length*는 가장 정확한 quantitative preattentive 채널 (Cleveland & McGill 1984; Ware 2012; 가이드 §1.1) — 사용자가 "어느 게 1등인가"를 ms 단위로 인지.
- color stripe 0% (memory rule × 3+, 가이드 §3.3). bar 색은 **단일 neutral tone** (alpha 0.35).
- score 갱신 시 width transition 200ms ease-out (가이드 §5).
- 음수 score → width 0%로 clamp + statement 옆 `contested` pill (가이드 §1.1 — text 채널로 음수 표현).

### 4. Dominance 시각화 — width thickness 변화

`status === 'dominant'` → score bar **height +2px** (4px → 6px). 모양 변화로만 시각적 emphasis. **카드 배경색 변경 금지** — glass 깨짐 + 가이드 §3.3 위반.
추가로 statement 옆 `leading` text pill (redundant 채널).

### 5. Refuted 가설 — strikethrough + opacity (가이드 §1.1)

archive하지 않음. statement strikethrough + opacity 0.5 → 시장 하단 sink. 정직한 market은 죽은 가설도 보여줘야 함 (Norman 2013 — affordance + history). 색 변경 없음.

### 6. Proposer 구분 — shape (가이드 §1.1, §3)

| Proposer | Chip glyph |
|---|---|
| user | filled circle + monogram |
| agent | rounded square + sparkle glyph |

shape diff는 preattentive. stripe 0%. chip 배경 alpha 동일.

### 7. Glass 제약 (가이드 §4)

- HypothesisCard는 Notebook이 쓰는 GlassCard 모듈 (memory × 20+).
- alpha 0.30–0.45 dark / 0.50–0.70 light. 가독성 부족 시 alpha 안 올림 — typography로 (가이드 §4.1).
- backdrop-filter ancestor transform 금지 (memory + 가이드 §4.2). MarketPanel slide-in 효과는 width transition으로 (transform 금지).

### 8. Hick / Fitts (가이드 §2.2, §2.3)

- card 액션 row: `link evidence` / `refute` / `watch` 3개 — Hick 한도.
- click 타겟 최소 width 32px (Fitts: 모바일 minimum). chip 자체가 액션이라 mouse 거리 짧음.

### 9. Motion 표 (가이드 §5)

| 이벤트 | duration | easing |
|---|---|---|
| score bar width 갱신 | 200ms | ease-out (0, 0, 0.2, 1) |
| dominance bar thickness +2px | 240ms | ease-out |
| MarketPanel toggle slide | 240ms | ease-out (width transition) |
| card hover lift (translateY -1px) | 80ms | ease-out |
| refute → strikethrough fade | 200ms | ease-out |

`prefers-reduced-motion: reduce` (가이드 §5.3, WCAG 2.3.3): width transition 즉시 jump (정보 손실 0). hover lift 제거. 정보 손실 0.

### 10. Surface cheat (가이드 §8)

| 채널 | 사용 |
|---|---|
| Primary preattentive | bar **width** (length) + position (sort order) |
| Cognitive load | 5 hypothesis 동시, 3 action |
| 색 사용 | none — score / dominance / refuted 모두 모양·텍스트·opacity |
| Motion | width animation 1개 (한 번에 한 카드만) |

### 11. 검증 (가이드 §9)

- color-blind sim: dominance / refuted / contested 상태가 보존되는지.
- WCAG AA: glass 위 statement 4.5:1, count 3:1 (subtle metadata).
- time-to-first-glance: market 첫 응시 후 *어떤 hypothesis가 1등인지* 인지 <1s. length-based ranking은 인간 인지에서 가장 빠른 quantitative judgment (Cleveland & McGill 1984).
- prefers-reduced-motion ON에서도 score / dominance 정보 손실 0.

## 검증된 외부 패턴과 차이점

### vs Linear sub-issues
- Linear: 한 issue 아래 여러 sub-issue, 각각 독립 상태. 점수 없음, 경쟁 없음.
- 우리: hypothesis끼리 같은 evidence pool을 공유하며 점수로 경쟁.

### vs Slack threads
- Slack: 시간순 메시지. attribution은 있지만 score 없음, refutation도 없음. 메시지가 묻힘.
- 우리: 가설이 first-class 객체. 새 evidence가 들어오면 자동 re-score. 시간이 지나도 가설이 묻히지 않는다.

### vs Cody chat
- Cody: 1:1 대화. 다른 사람이 같은 repo에 대해 무엇을 물었고 어떤 답을 받았는지 안 보임.
- 우리: investigation 단위 public board. 사람과 에이전트가 같은 시장에서 가설을 경쟁.

### vs Sentry suspect commit
- Sentry: 한 incident에 대해 단일 ranking. 사람이 "아니 이건 다른 변경 같은데"라고 말할 surface가 없다.
- 우리: 동일 incident에 대해 multiple ranked hypotheses. suspect commit이 가설 하나의 evidence가 되는 구조.

## 성공 지표

- per-investigation 평균 hypothesis 수 (>= 2가 healthy — 단일 가설은 시장이 아님)
- evidence linking 비율 (게시된 가설 중 evidence ≥ 1개 attach된 비율)
- refutation rate (게시된 가설 중 refute 받은 비율; 너무 낮으면 시장이 echo chamber)
- dominance latency (게시 → dominant 판정까지 평균 시간; 짧을수록 빠른 합의)
- agent vs user dominance ratio (agent 가설이 너무 자주 이기면 사람 참여 incentive 낮음, 너무 적으면 agent가 약함)

## 출시 순서

### Phase 1 — Post + manual evidence link + naive score
범위를 좁힌다. 목표: **한 investigation에 가설 여러 개를 게시하고, 수동으로 evidence를 link하고, naive score가 계산되어 정렬되는 것**.

- Hypothesis 타입 확장 (위 schema)
- MarketPanel UI (notebook 안에 side panel 토글)
- HypothesisCard, ScoreBar (width animation, 색 아님)
- 수동 evidence link / unlink
- naive score 계산 (re-score는 link 시점에만)

### Phase 2 — Auto re-score + dominance alert
- evidence가 외부에서 갱신되면 (새 PR로 인한 confidence/staleness 변경) 시장이 reactive하게 re-score
- dominance state machine (gap × duration 조건)
- watcher subscription (사용자가 watch한 hypothesis가 dominant되면 toast)
- refutation flow + contested 표시

### Phase 3 — Agent participation + cross-incident recall
- AI 에이전트가 hypothesis 게시 (`proposer.kind = 'agent'`)
- 비슷한 과거 incident의 dominant hypothesis를 새 investigation seed로 추천
- Feature 04의 PendingUnknownsBlock과 연결 (unknown → hypothesis 검증 액션)
- Feature 02 suspect ranking과 연결 (suspect commit → seed hypothesis)

## Frontend 구현계획

백엔드는 별도 트랙. 모든 phase는 frontend feature slice 단위. mock data는 `entities/investigation/model/fixtures.ts`에 누적 (Feature 04 fixture와 같은 파일).

### 0. 사전 정리 (모든 phase 공통)

- `src/features/hypothesis-market/{model,scoring,ui}` 슬라이스 신설
- `entities/investigation/model/types.ts`에 위 schema 확장 적용
- Feature 04 Phase 2 fixture에 hypothesis 2~3개 시드 추가
- `<HypothesisMarketProvider>`는 `IntelligenceLayout` 내부에 마운트 (Feature 04의 InvestigationProvider 안쪽)

### Phase 1 — Post + manual link + naive score

#### 1.1 entity 확장 — `src/entities/investigation/model/types.ts`

위 "리팩토링 / 아키텍처 영향" 섹션의 Hypothesis schema를 그대로 적용. helper 함수 추가:

```ts
// entities/investigation/model/helpers.ts

import type {
  EvidenceId, EvidenceLink, Hypothesis, HypothesisId,
  Proposer, HypothesisScore, HypothesisStatus,
} from './types';

export const asHypothesisId = (s: string) => s as HypothesisId;

export function liftEvidenceIds(
  ids: readonly EvidenceId[],
  by: Proposer,
  weight: EvidenceLink['weight'] = 0.7,
): EvidenceLink[] {
  const linkedAt = new Date().toISOString();
  return ids.map(evidenceId => ({ evidenceId, weight, linkedBy: by, linkedAt }));
}

export function emptyScore(): HypothesisScore {
  return { value: 0, confidence: 'low', lastUpdated: new Date().toISOString() };
}

export const SYSTEM_PROPOSER: Proposer = {
  kind: 'agent', id: 'system', label: 'system',
};
```

#### 1.2 scoring 엔진 — `src/features/hypothesis-market/scoring/`

순수 함수들. test 가능해야 함.

```ts
// scoring/factors.ts

import type { Confidence, Staleness } from '@/entities/investigation/model/types';

export const confidenceFactor = (c: Confidence): number =>
  c === 'high' ? 1.0 : c === 'medium' ? 0.6 : c === 'low' ? 0.3 : 0.1;

export const freshnessFactor = (s: Staleness): number =>
  s === 'fresh' ? 1.0 : s === 'stale' ? 0.5 : 0.4;
```

```ts
// scoring/score.ts

import type {
  EvidenceItem, EvidenceLink, Hypothesis, HypothesisScore,
} from '@/entities/investigation/model/types';
import { confidenceFactor, freshnessFactor } from './factors';

function linkContribution(
  link: EvidenceLink,
  evidenceById: ReadonlyMap<string, EvidenceItem>,
): number {
  const ev = evidenceById.get(link.evidenceId);
  if (!ev) return 0; // 끊긴 link는 0 (silent — UI에서 별도 표기)
  return link.weight * confidenceFactor(ev.confidence) * freshnessFactor(ev.staleness);
}

export function computeScore(
  h: Pick<Hypothesis, 'supporting' | 'refuting'>,
  evidenceById: ReadonlyMap<string, EvidenceItem>,
): HypothesisScore {
  const sup = h.supporting.reduce((s, l) => s + linkContribution(l, evidenceById), 0);
  const ref = h.refuting.reduce((s, l) => s + linkContribution(l, evidenceById), 0);
  const value = sup - ref;
  const total = sup + ref;
  // confidence는 절대값 + supporting/refuting 합의 정도로 파생
  const confidence: HypothesisScore['confidence'] =
    total >= 2.0 && Math.abs(value) >= 1.0 ? 'high'
    : total >= 1.0 ? 'medium'
    : 'low';
  return { value, confidence, lastUpdated: new Date().toISOString() };
}
```

```ts
// scoring/dominance.ts

import type { Hypothesis } from '@/entities/investigation/model/types';

export interface DominanceConfig {
  gapThreshold: number;     // 기본 1.5
  sustainedMs: number;      // 기본 180_000 (3분)
}

export const DEFAULT_DOMINANCE: DominanceConfig = {
  gapThreshold: 1.5,
  sustainedMs: 180_000,
};

// pure: 정렬된 가설 리스트와 현재 시각을 받아 dominance 상태 변환을 return.
// store가 이 결과를 받아서 hypothesis.status를 업데이트.
export function detectDominance(
  hypotheses: readonly Hypothesis[],
  nowMs: number,
  cfg: DominanceConfig = DEFAULT_DOMINANCE,
): { id: string; nextStatus: 'open' | 'dominant' }[] {
  if (hypotheses.length < 2) return [];
  const sorted = [...hypotheses].sort((a, b) => b.score.value - a.score.value);
  const top = sorted[0];
  const second = sorted[1];
  const gap = top.score.value - second.score.value;
  const result: { id: string; nextStatus: 'open' | 'dominant' }[] = [];

  if (gap >= cfg.gapThreshold) {
    if (top.status === 'open' && top.dominantSince) {
      const since = Date.parse(top.dominantSince);
      if (nowMs - since >= cfg.sustainedMs) {
        result.push({ id: top.id, nextStatus: 'dominant' });
      }
    }
    // 첫 진입은 store가 dominantSince를 찍어주는 책임
  } else {
    if (top.status === 'dominant') {
      result.push({ id: top.id, nextStatus: 'open' });
    }
  }
  return result;
}
```

#### 1.3 store — `src/features/hypothesis-market/model/`

```tsx
// model/HypothesisMarketContext.tsx

import { createContext, useContext, useMemo, useReducer, useCallback } from 'react';
import type {
  Hypothesis, HypothesisId, EvidenceLink, EvidenceItem, Proposer,
} from '@/entities/investigation/model/types';
import { asHypothesisId, emptyScore } from '@/entities/investigation/model/helpers';
import { computeScore } from '../scoring/score';

interface State { byId: Record<string, Hypothesis>; order: HypothesisId[]; }

type Action =
  | { type: 'post'; h: Hypothesis }
  | { type: 'link'; id: HypothesisId; side: 'supporting' | 'refuting'; link: EvidenceLink }
  | { type: 'unlink'; id: HypothesisId; side: 'supporting' | 'refuting'; evidenceId: string }
  | { type: 'rescore'; evidenceById: ReadonlyMap<string, EvidenceItem> }
  | { type: 'setStatus'; id: HypothesisId; status: Hypothesis['status']; at?: string };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'post':
      return { byId: { ...s.byId, [a.h.id]: a.h }, order: [...s.order, a.h.id] };
    case 'link': {
      const cur = s.byId[a.id]; if (!cur) return s;
      const next = { ...cur, [a.side]: [...cur[a.side], a.link] };
      return { ...s, byId: { ...s.byId, [a.id]: next } };
    }
    case 'unlink': {
      const cur = s.byId[a.id]; if (!cur) return s;
      const filtered = cur[a.side].filter(l => l.evidenceId !== a.evidenceId);
      return { ...s, byId: { ...s.byId, [a.id]: { ...cur, [a.side]: filtered } } };
    }
    case 'rescore': {
      const next: Record<string, Hypothesis> = {};
      for (const id of s.order) {
        const h = s.byId[id];
        next[id] = { ...h, score: computeScore(h, a.evidenceById) };
      }
      return { ...s, byId: next };
    }
    case 'setStatus': {
      const cur = s.byId[a.id]; if (!cur) return s;
      const next: Hypothesis = { ...cur, status: a.status };
      if (a.status === 'dominant' && a.at) next.dominantSince = a.at;
      if (a.status === 'refuted' && a.at) next.refutedAt = a.at;
      return { ...s, byId: { ...s.byId, [a.id]: next } };
    }
  }
}

interface Ctx {
  hypotheses: Hypothesis[];
  post: (statement: string, by: Proposer, supporting?: EvidenceLink[]) => HypothesisId;
  link: (id: HypothesisId, side: 'supporting' | 'refuting', link: EvidenceLink) => void;
  unlink: (id: HypothesisId, side: 'supporting' | 'refuting', evidenceId: string) => void;
  rescore: (evidenceById: ReadonlyMap<string, EvidenceItem>) => void;
}

const HypothesisMarketContext = createContext<Ctx | null>(null);

export function HypothesisMarketProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { byId: {}, order: [] });

  const post = useCallback<Ctx['post']>((statement, by, supporting = []) => {
    const id = asHypothesisId(`h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
    const h: Hypothesis = {
      id, statement, proposer: by,
      supporting, refuting: [],
      score: emptyScore(), status: 'open',
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'post', h });
    return id;
  }, []);

  const link = useCallback<Ctx['link']>((id, side, l) => dispatch({ type: 'link', id, side, link: l }), []);
  const unlink = useCallback<Ctx['unlink']>((id, side, evidenceId) =>
    dispatch({ type: 'unlink', id, side, evidenceId }), []);
  const rescore = useCallback<Ctx['rescore']>((m) => dispatch({ type: 'rescore', evidenceById: m }), []);

  const hypotheses = useMemo(() => state.order.map(id => state.byId[id]), [state]);
  const value = useMemo<Ctx>(() => ({ hypotheses, post, link, unlink, rescore }),
    [hypotheses, post, link, unlink, rescore]);

  return <HypothesisMarketContext.Provider value={value}>{children}</HypothesisMarketContext.Provider>;
}

export function useHypothesisMarket(): Ctx {
  const v = useContext(HypothesisMarketContext);
  if (!v) throw new Error('useHypothesisMarket must be used inside HypothesisMarketProvider');
  return v;
}
```

#### 1.4 UI primitives — `src/features/hypothesis-market/ui/`

```tsx
// ui/ScoreBar.tsx

import { useMemo } from 'react';

interface Props { value: number; min?: number; max?: number; }

export function ScoreBar({ value, min = -3, max = 3 }: Props) {
  const pct = useMemo(() => {
    const clamped = Math.max(min, Math.min(max, value));
    // 음수는 0%로 clamp (좌측 색띠 금지 — width가 줄어드는 방향만 사용)
    if (clamped <= 0) return 0;
    return (clamped / max) * 100;
  }, [value, min, max]);

  // 색 stripe 절대 금지. 단일 neutral tone의 width animation.
  return (
    <div className="hm-scorebar" aria-label={`score ${value.toFixed(2)}`}>
      <div
        className="hm-scorebar__fill"
        style={{ width: `${pct}%`, transition: 'width 200ms ease-out' }}
      />
    </div>
  );
}
```

```tsx
// ui/HypothesisCard.tsx

import { GlassCard } from '@/shared/ui/GlassCard'; // 노트북과 공유
import type { Hypothesis } from '@/entities/investigation/model/types';
import { ScoreBar } from './ScoreBar';
import { ProposerChip } from './ProposerChip';
import { StatusPill } from './StatusPill';

interface Props {
  h: Hypothesis;
  onSupport: () => void;
  onRefute: () => void;
}

export function HypothesisCard({ h, onSupport, onRefute }: Props) {
  const isRefuted = h.status === 'refuted';
  return (
    <GlassCard
      className={`hm-card${isRefuted ? ' hm-card--refuted' : ''}`}
      // 카드 배경색 변경 금지 (memory rule). refuted는 opacity로만 표현.
      style={isRefuted ? { opacity: 0.5 } : undefined}
    >
      <div className="hm-card__row hm-card__row--top">
        <ProposerChip p={h.proposer} />
        <StatusPill status={h.status} />
      </div>
      <p className={`hm-card__statement${isRefuted ? ' hm-card__statement--strike' : ''}`}>
        {h.statement}
      </p>
      <ScoreBar value={h.score.value} />
      <div className="hm-card__row hm-card__row--counts">
        <span>support {h.supporting.length}</span>
        <span>refute {h.refuting.length}</span>
      </div>
      <div className="hm-card__row hm-card__row--actions">
        <button onClick={onSupport}>Support with…</button>
        <button onClick={onRefute}>Refute with…</button>
      </div>
    </GlassCard>
  );
}
```

```tsx
// ui/MarketPanel.tsx

import { useMemo } from 'react';
import { useHypothesisMarket } from '../model/HypothesisMarketContext';
import { HypothesisCard } from './HypothesisCard';
import { PostHypothesisForm } from './PostHypothesisForm';
import { EvidenceLinkPicker } from './EvidenceLinkPicker';

export function MarketPanel() {
  const { hypotheses } = useHypothesisMarket();

  const sorted = useMemo(() => {
    const live = hypotheses.filter(h => h.status !== 'refuted');
    const dead = hypotheses.filter(h => h.status === 'refuted');
    live.sort((a, b) => b.score.value - a.score.value);
    return [...live, ...dead];
  }, [hypotheses]);

  return (
    <section className="hm-panel" aria-label="hypothesis market">
      <PostHypothesisForm />
      <div className="hm-panel__list">
        {sorted.map(h => (
          <HypothesisCard
            key={h.id}
            h={h}
            onSupport={() => /* open EvidenceLinkPicker side='supporting' */ undefined}
            onRefute={() => /* open EvidenceLinkPicker side='refuting' */ undefined}
          />
        ))}
      </div>
      <EvidenceLinkPicker />
    </section>
  );
}
```

#### 1.5 Notebook 통합

- Feature 04의 Notebook UI 안에 `<MarketPanel />`을 토글 가능한 side section으로 마운트
- toggle 버튼은 Notebook 헤더 우측 (HypothesisBlock과 별도; HypothesisBlock은 single hypothesis detail용, MarketPanel은 multiple competing list용)
- IntelligenceLayout에서 `<InvestigationProvider>` 안쪽에 `<HypothesisMarketProvider>`를 wrap

#### Phase 1 완료 조건

- [ ] investigation panel에서 Post Hypothesis 버튼 클릭 → form → 가설 카드 등장
- [ ] EvidenceLinkPicker로 현재 bundle의 evidence를 supporting/refuting으로 link
- [ ] score가 link 시점에 재계산되어 ScoreBar의 width가 200ms 애니메이션
- [ ] 음수 score는 width 0%로 표시되고 statement 옆 contested pill
- [ ] glass surface, 색 stripe 없음, refuted는 opacity 0.5로 시장 하단

---

### Phase 2 — Auto re-score + dominance + refute

#### 2.1 reactive re-score

- `InvestigationContext`의 evidence 변경(staleness 갱신, 새 evidence 추가)을 `HypothesisMarketProvider`가 구독
- `useEffect`로 evidence map 변경 시 `rescore()` 호출
- 비용 측정: investigation 하나당 hypothesis 5~10, evidence 20~30 가정 → O(n×m) ≈ 300 multiply, 수ms 이내

#### 2.2 dominance state machine

- `HypothesisMarketProvider`에 내부 timer (setInterval 30s)
- 매 tick마다 `detectDominance` 호출 → `setStatus` dispatch
- 첫 gap 진입 시점에 `dominantSince`를 찍어둠
- gap이 깨지면 `dominantSince` clear + status open 복귀

#### 2.3 watcher subscription

- `useWatchHypothesis(id)` hook — store에 watcher set 추가
- 해당 hypothesis가 dominant 전환 시 toast (chat-agent 위치 회피)
- toast component는 `shared/ui/Toast` 재사용 (있다면) 또는 `features/hypothesis-market/ui/MarketToast`

#### 2.4 refute UI

- HypothesisCard의 Refute 버튼 → EvidenceLinkPicker open with `side='refuting'`
- counter-evidence 게시 후 카드에 contested marker (neutral chip + count)
- 본인 가설도 refute 가능

#### Phase 2 완료 조건

- [ ] evidence가 외부에서 갱신되면 시장이 reactive하게 re-score
- [ ] gap × duration 조건이 충족되면 dominant 전환 + toast
- [ ] watcher subscribe / unsubscribe
- [ ] refute가 첫-class 액션으로 동작

---

### Phase 3 — Agent participation + cross-incident recall

#### 3.1 agent posting

- Feature 04의 `composeAnswer()` 결과를 받아서 statement 변환하는 `agentPostAdapter`
- agent proposer는 investigation context에 등록된 active agent id
- agent 가설은 자동으로 supporting evidence 1~3개 attach (composeAnswer가 사용한 evidence 그대로)

#### 3.2 cross-incident recall

- `entities/investigation/model/fixtures.ts`에 과거 dominant hypothesis fixture 추가
- 새 investigation 시작 시 target similarity로 과거 dominant hypothesis를 seed 후보로 제시
- "Use as seed" 버튼 → 새 hypothesis로 post (proposer는 system 또는 recall agent)

#### 3.3 Feature 02 / 04 wiring

- Feature 02의 suspect commit ranking에서 top suspect → seed hypothesis ("commit X가 incident Y의 원인")
- Feature 04의 PendingUnknownsBlock에서 unknown → "이 unknown이 hypothesis Z를 검증할 수 있음" 표시 + 클릭 시 deep scan job으로 evidence 생성

#### Phase 3 완료 조건

- [ ] agent가 가설을 게시하고 카드가 agent chip으로 구분됨
- [ ] 비슷한 과거 incident의 dominant hypothesis가 seed로 추천됨
- [ ] Feature 02 suspect commit이 시장의 첫 가설을 자동 시드
- [ ] Feature 04 unknown이 hypothesis 검증 액션으로 연결

---

### 모듈 의존성 그래프

```
entities/investigation (Hypothesis, EvidenceLink, Proposer 확장)
  ↑
features/hypothesis-market/scoring  (pure, no react deps)
  ↑
features/hypothesis-market/model    (HypothesisMarketContext)
  ↑                  ↑
  ui/MarketPanel + HypothesisCard + ScoreBar + EvidenceLinkPicker + RefuteModal
  ↑
features/investigation/ui/Notebook  (← MarketPanel embed)
  ↑
app/router/intelligence/IntelligenceLayout (← HypothesisMarketProvider 마운트, InvestigationProvider 안쪽)
```

ChatAgent와 의존 없음. AppProviders와 의존 없음.

### 손대지 않을 것

- `src/features/chat-agent/` — 그대로
- `src/features/inspect-target/` — 그대로
- Feature 04의 `EvidenceItem`, `ContextBundle`, `InvestigationAnswer` schema — 변경 없음
- Feature 04의 `Hypothesis` 중 `id`, `statement` 필드 — backward 호환. `supporting`/`refuting`만 lift.

### 백엔드 트랙과의 contract

- `Hypothesis`, `EvidenceLink`, `Proposer`, `HypothesisScore` schema가 boundary
- scoring은 frontend pure function으로 완결됨 — 백엔드는 같은 공식을 별도 검증 가능 (server-side score는 audit용으로만 사용)
- dominance detection도 frontend에서 완결 — 백엔드는 watcher notification fan-out만 담당
- agent posting endpoint: `POST /investigations/{id}/hypotheses` with body `{ statement, supporting: EvidenceLink[] }`. `proposer`는 서버가 인증 토큰으로부터 채움.
- realtime evidence 갱신은 SSE 또는 polling. 클라이언트는 `rescore(evidenceById)`만 호출하면 됨.

## Why Developers Will Care

지금까지 디버깅에서 가장 답답한 순간은 "내 가설이 맞는지 모르겠다"가 아니다. **"옆 사람이 다른 가설로 이미 한 시간을 썼는지 모르겠다"**이다.

Hypothesis Market은 그 비용을 0으로 만든다. 같은 incident를 보는 모든 조사자(사람과 에이전트)의 가설이 한 시장에 누적되고, evidence가 들어올 때마다 점수가 갱신된다. 누가 무엇을 주장했는지, 무엇이 반증되었는지, 지금 어떤 가설이 가장 설명력 높은지가 항상 떠 있다.

조사가 슬랙 스레드에서 죽지 않는다. evidence-typed 시장에서 산다. 이게 AI 시대 디버깅의 새 baseline이다.
