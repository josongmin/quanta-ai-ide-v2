# Feature 09: Admission as Chat Participant

## One-liner
admission rule와 delivery gate, ownership router를 LLM의 tool call이 아니라 **채팅 스레드의 또 다른 발화자**로 끌어올린다. PR/diff/자연어 변경 설명에 대해 규칙들이 자기 목소리로 직접 chat turn을 게시한다.

## Problem Statement

거버넌스 신호는 항상 늦게 도착한다.

- admission rule은 PR 생성 시점에 한 번 평가되고, 결과는 별도 패널에 박힌다.
- delivery gate는 머지 직전에야 거부한다.
- ownership routing은 review 단계에서 reviewer 자동지정으로만 보인다.

대화 중에는 이 신호들이 보이지 않는다. 사용자는 chat에서 "이거 머지 가능?"을 물어보지만, 답은 LLM이 추측해서 만든다. 진짜 결정권자(admission engine, delivery gate)는 한참 뒤 PR 페이지에서 조용히 거부 메시지를 띄운다.

2026년 기준으로 가장 답답한 순간은 이것이다.

"AI가 머지된다고 했는데 admission이 차단했다."

LLM이 거버넌스 규칙을 paraphrase하는 한 정확도는 절대 100%가 안 된다. 그래서 필요한 것은 LLM이 규칙을 흉내내는 게 아니라, **규칙 자신이 chat에 발화하게 만드는 것**이다.

## Why This Matters

현재 `chat-agent`는 user vs llm-assistant 단 2명짜리 발화자 모델이다.
admission/delivery/ownership은 PR 시점에만 화면에 등장한다.

이 둘을 합치면 제품 포지션이 달라진다.

- before: chat은 "물어보면 답해주는 곳", 거버넌스는 "다 끝난 뒤 차단하는 곳"
- after: chat이 곧 거버넌스 합의 surface — user, LLM, 그리고 deterministic rule들이 같은 자리에서 발화한다

특히 AI-native 시대에는 "LLM이 모든 걸 paraphrase한다"는 가정이 깨지고 있다. deterministic 출력이 같이 흐르지 않으면 hallucination 비용이 너무 크다.

## Moat

Cody/Cursor류는 user vs LLM 2자 채팅이다. tool call 결과는 LLM이 요약해서 한 줄로 보여준다 — 즉 결정권자가 화면에 직접 발화하지 않는다.

GitHub Actions PR 코멘트, Linear 봇은 chat이 아니라 "thread에 끼어드는 알림"이다. 사람과 한 호흡으로 대화하지 않는다.

우리 진짜 moat는 **rules-as-speakers**다.

> We don't let the LLM speak *for* the rules.
> We let the rules speak *as* themselves — deterministic, cited, refusable —
> in the same chat thread.

구체적으로:

1. admission rule이 chat turn을 직접 만든다. 텍스트는 LLM이 아니라 rule evaluator가 결정한다 (rule_id, severity, evidence link 모두 deterministic).
2. delivery-gate는 chat에서 직접 머지를 거부한다. user가 "머지" 버튼을 누르려고 해도 gate가 turn으로 막는다.
3. ownership-router는 reviewer 후보를 chat turn으로 제안한다 — 사람처럼 추천하는 게 아니라, route table의 결과를 그대로 발화한다.
4. user가 "왜?"라고 물으면 그 rule이 자기 자신을 설명한다. 단 설명도 LLM이 아니라 rule의 evidence trail을 chat turn 형태로 렌더링한다. LLM은 paraphrase 요청이 명시적으로 들어왔을 때만 동작한다.

즉 generic LLM chat이 아니라, deterministic governance가 conversational surface에 1급 시민으로 들어온 chat이다.

## 기술 배경

핵심 엔진 자산 (이미 존재):

- `entities/admission/lib/evaluate.ts` — rule evaluator, RuleEvaluation 출력
- `entities/admission/model.ts` — AdmissionRule, AdmissionDecision, RuleMatch, RuleEvaluation, EvidenceLevel
- `features/admission-rules` — rule board UI (이번 기능에서 새로 import 안 함)
- `features/ownership-routing` — RoutingCard, ApprovalPathCard, ProofObligationsCard
- `features/verified-fix` — delivery gate 개념의 일부 (PolicyThresholds, GuardrailGate)
- `features/blast-radius`, `features/taint` — evidence link 대상

chat 발화자 모델은 최소 5명이 있어야 한다.

1. **user** — 사람. PR 링크 / diff / 자연어 변경 설명을 던진다.
2. **llm-assistant** — 기존 LLM. paraphrase, summarize, follow-up generation만 담당. 거버넌스 결정은 절대 안 한다.
3. **admission_rule** — `AdmissionRule` 단위. 한 turn = 한 rule이 한 번 발화. 같은 PR에 여러 rule이 발화하면 turn이 여러 개다.
4. **delivery_gate** — 머지 가능/불가 판정자. 단일 voice. chat에서 머지 버튼이 눌렸을 때 또는 user가 명시적으로 "머지 가능?"을 물었을 때 발화.
5. **ownership_router** — reviewer/approver 후보를 발화. ownership-routing 슬라이스의 RouteDecision을 chat turn 형태로 렌더링.

이걸 LLM이 매번 paraphrase하면 결정성이 사라지고 cited evidence가 흩어진다.
따라서 chat-participant abstraction이 필요하다.

추천 내부 단위:

- `ChatParticipant` — 발화자 등록 단위 (kind, voice, render)
- `ChatTurn` — discriminated union per speaker
- `ParticipantTrigger` — 어떤 user turn에 어떤 participant가 반응할지 결정하는 정책
- `RuleSelfExplain` — rule이 "왜?" 요청에 대해 deterministic 설명 turn을 생성하는 함수

## 제안 기능

### 1. Multi-speaker chat model

기존 `Msg = { role: 'user' | 'agent' }` 모델을 깨지 않으면서, **추가 speaker들을 별도 channel로 흘린다**.

- ChatAgent.tsx 내부의 `Session.msgs`는 그대로 둔다 (legacy 2-role 흐름).
- 새로 `participantTurns: ChatTurn[]`을 별도 store에 둔다.
- 렌더링 시 `Msg`와 `ChatTurn`을 timestamp 기준으로 인터리브 — 단 인터리브 로직은 chat-agent host가 아니라 새 `chat-participants/ui` 모듈이 맡는다.

ChatAgent 호스트는 한 가지만 안다: "renderParticipantTurns slot이 들어오면 그 slot의 출력을 turn 시퀀스에 끼워넣는다." 그게 전부다.

### 2. Rule-triggered turns

user가 chat에 PR 링크 / diff snippet / 변경 설명을 붙이면, participant registry가 trigger 정책을 돌린다.

- PR 링크 → admission engine 평가 → RuleEvaluation 별로 한 turn씩 발화
- diff snippet → 경량 평가 (metric/graph 기반 일부만) → 발화
- 자연어 설명 → 예측형 평가 (Phase 3)

각 turn은 다음을 deterministic하게 포함한다:

- rule_id (예: `'no-public-api-without-test'`)
- severity (block / warn / info)
- evidence link (`taint_path`, `blast_radius`, `ownership` 슬라이스로의 deep link)
- 1줄 reason — `RuleEvaluation.reason` 그대로
- override 가능 여부 (`override.allowAuthor`, `override.requiresApproverRole`)

여기서 핵심은 turn 텍스트가 LLM 출력이 아니라는 것. text는 rule evaluator의 deterministic 결과를 template에 박아 만든다. 같은 PR을 두 번 던지면 같은 텍스트가 나와야 한다.

### 3. Rule self-explain

user가 rule turn 아래에 "왜?"를 입력하면, **그 rule이 자기 자신의 follow-up turn을 만든다**.

self-explain turn은 다음을 포함한다:

- 매칭된 file/symbol 리스트 (`RuleMatch[]`)
- evidence level (exact / overapprox / unknown)
- 관련 ownership (어떤 owner가 이 file을 책임지는지 — `entities/ownership` join)
- 관련 blast (이 변경이 blast radius를 얼마나 늘리는지 — fixture 기반)
- 관련 taint (source/sink 경로)

LLM은 이 단계에 끼지 않는다. 대신 그 옆에 `[paraphrase]` 버튼이 떠 있어, user가 명시적으로 누르면 LLM이 self-explain turn의 raw evidence를 받아 자연어로 1번 요약한다 — 단, 그 요약은 rule turn 자체를 대체하지 않고 **그 아래에 별도 llm turn으로 추가**된다. paraphrase가 틀려도 원본 rule turn은 살아 있다.

### 4. Intervention / veto from chat

delivery_gate는 chat에서 직접 거부할 수 있다.

- user가 chat에서 "머지" 또는 "ship" 같은 의도를 입력 → ChatAgent host가 intent를 capture
- delivery_gate participant가 trigger → 현재 admission decision 기준으로 allow/warn/block turn을 게시
- `block`이면 user의 머지 액션 자체가 비활성화 (chat-level disable)
- `warn`이면 user가 한 번 더 confirm해야 함

이건 LLM tool call이 아니다. delivery_gate는 PR-level admission decision의 turn 형태 mirror일 뿐이다.

### 5. Predicted-rule-break preview

자연어 변경 설명에 대해 미리 어떤 rule이 깨질 가능성이 큰지 발화한다.

- user: "이 함수에 secret 로깅 추가하려고 하는데"
- predictor → taint signal `{ source: 'secret', sink: 'log' }`에 매칭되는 rule 검색
- admission_rule turn: "PII redaction 규칙이 깨질 가능성이 높아요. 코드 작성 전에 sanitizer를 먼저 정의하는 걸 권장합니다."

이 단계는 어쩔 수 없이 부분적으로 추측이 들어간다. 따라서 turn에는 명시적으로 `predicted` 배지가 붙고, evidence level은 항상 `overapprox` 이하로 강제된다. user가 실제 diff를 붙이면 동일 rule이 다시 deterministic하게 발화하면서 predicted turn을 dim 처리.

## AI-native 설계

이 기능은 그냥 챗봇에 알림을 끼워넣는 게 아니다.

AI-native 조건:

1. deterministic speaker가 LLM과 **같은 turn 시퀀스**에 1급 시민으로 등장해야 함
2. LLM 출력은 deterministic 출력의 paraphrase일 뿐 — 결정권을 가지면 안 됨
3. user가 "왜?"라고 물었을 때 LLM이 답하는 게 default가 아니라, **해당 rule이 자기 자신을 설명하는 게 default**
4. predicted turn은 항상 `overapprox` 또는 `unknown` 라벨이 강제됨

좋은 흐름:

- user: PR 링크 붙임
- admission_rule × 3 turns (block 1, warn 2)
- ownership_router turn: "이 PR은 platform-core team의 승인이 필요합니다"
- delivery_gate turn: "block 1개 — 머지 불가"
- user: rule 1번 turn 아래 "왜?"
- 같은 admission_rule turn (self-explain): matched files + evidence trail
- user: `[paraphrase]` 버튼
- llm-assistant turn: 자연어 요약 (turn type만 llm으로 다름)

즉 chat이 multi-speaker governance surface가 된다.

## 리팩토링 / 아키텍처 영향

`features/chat-agent/ui/ChatAgent.tsx`는 **747줄짜리 god component**다. 이걸 다시 갈아엎으면 또 다른 god이 자랄 뿐이다. 따라서 핵심 결정은:

> ChatAgent core에는 1개 prop만 추가한다. 그 외 변경 금지.

추가되는 prop:

```ts
participants?: ChatParticipantRenderer
```

`ChatParticipantRenderer`는 chat-agent가 아니라 **새 슬라이스 `features/chat-participants`** 가 만들어 외부에서 주입한다. chat-agent는 이 prop의 타입과 호출 시그니처만 알 뿐, 어떤 participant가 있는지는 모른다.

필요한 새 계층 (frontend feature slice):

- `features/chat-participants/registry` — ChatParticipant, ParticipantTrigger 타입과 등록 store. user 입력을 받아서 어떤 participant가 어떤 turn을 만들어야 하는지 결정하는 정책 (deterministic).
- `features/chat-participants/turns` — ChatTurn discriminated union, turn store, timestamp 기반 인터리브 로직.
- `features/chat-participants/voices` — 각 speaker의 텍스트 생성기. admission_rule, delivery_gate, ownership_router는 deterministic. llm-assistant voice는 chat-agent 기존 로직 그대로.
- `features/chat-participants/ui` — ParticipantTurnRow, RuleTurnCard, GateTurnCard, RouterTurnCard, ParaphraseButton 등 렌더링 primitives. ChatAgent host에 슬롯 1개로 주입.

### ChatAgent와의 경계 (결정)

chat-participants는 ChatAgent의 **다른 모드가 아니라, 같은 surface에 끼어드는 별도 슬라이스**다.

- `ChatAgent.tsx` core (747줄)는 손대지 않는다 — props 1개 추가만.
- chat-participants는 ChatAgent를 **import 하지 않는다**. host가 prop으로 renderer를 주입받는 단방향 의존.
- session/thread 객체는 공유하지 않는다. ChatAgent의 `Session.msgs`는 user + llm-assistant 2명만 담는 그대로의 구조. participant turns는 별도 store (`useParticipantTurns`).
- `TokensContext`는 import 하지 않는다. participant turn은 LLM token을 쓰지 않는다 (deterministic). paraphrase 버튼이 눌려서 실제로 LLM이 1번 호출될 때만 chat-agent 기존 token 회계가 동작한다.

이 경계가 흐려지면 ChatAgent는 다시 god component로 자라거나, participant 로직이 chat-agent 안으로 빨려들어가서 deterministic guarantee가 깨진다. 처음부터 별 슬라이스로 자라야 한다.

### Provider scope

- `<ChatParticipantsProvider>`를 **AppProviders에 올리지 않는다**. chat-agent 자체는 전역이지만, participant registry는 PR/diff context를 가진 surface (대체로 `/intelligence`나 chat이 떠 있는 라우트)에서만 살아 있어야 한다.
- 대신 chat-agent를 띄우는 layout 안쪽에 mount. 라우트 unmount = registry unmount.
- chat이 정말로 글로벌하게 떠 있어야 한다는 요구가 명확해지면 그때 AppProviders로 끌어올린다 — 이번 feature 범위 밖.

## UI/UX 코멘트

이 섹션은 [00-uiux-science-guide.md](docs/plans/may-9-feature-plan/00-uiux-science-guide.md)를 인용한다. multi-speaker chat의 핵심 UX 도전: **speaker가 늘어도 채팅이 시끄러워지지 않게** 하는 것.

### 1. Speaker 인코딩 — shape + position + chip text (가이드 §1.1, §3)

5명 speaker (user / llm / admission_rule / delivery_gate / ownership_router)를 구별하는 채널은 **avatar shape + chip text + 들여쓰기 위치** 3개. hue는 마지막 보조.

| Speaker | Avatar shape | Position |
|---|---|---|
| user | filled circle | right-aligned |
| llm | rounded square + sparkle | left-aligned |
| admission_rule | hexagonal shield | left, indent 16px |
| delivery_gate | locked square | left, indent 16px |
| ownership_router | branching diamond | left, indent 16px |

shape diff는 preattentive (Treisman 1985, 가이드 §1.1) — 사용자가 200ms 안에 "이건 user가 아니다"를 인지. 색맹 sim에서도 보존 (가이드 §9.2).

### 2. Left colored stripe 영구 금지 (가이드 §3.3)

memory rule 3+ 경고. 어떤 speaker도 left stripe로 구별하지 않음. 5명을 시각적으로 구별하려고 색을 쓰면 (a) 색맹에서 깨지고 (b) hue가 5단계로 나뉘면 가이드 §1 해상도 한계(~5단계) 직격이라 reliable 하지 않다.

대신 **avatar shape + chip text(speaker name)**로 인코딩. chip 배경 alpha는 0.18 동일, hue는 모든 speaker 같다.

### 3. Glass 제약 (가이드 §4)

- participant turn row 모두 ChatAgent 기존 GlassCard 모듈 (memory × 20+).
- alpha 0.30–0.45 dark / 0.50–0.70 light. 가독성 부족 시 alpha 안 올림 — text weight + size로 (가이드 §4.1).
- backdrop-filter는 ancestor transform/filter/perspective에 죽음. ChatAgent의 resize handle이 transform 사용하지 않는지 점검 (memory rule + 가이드 §4.2).

### 4. Cognitive load — 5 speaker는 한도 (가이드 §2.1)

Cowan 4±1 한도 경계. 따라서:
- 한 화면에 동시 노출되는 speaker 종류는 **3개까지**가 안전. 그 이상이면 같은 speaker끼리 grouping (consecutive turns merge into single bubble; 가이드 §7.2 progressive disclosure).
- evidence chip row는 turn당 **3개**까지 (Feature 04 EvidenceTriple과 동일).
- action button row는 turn당 **3개**까지 (`[왜?]` `[evidence]` `[paraphrase]`) — Hick's Law (가이드 §2.2).

### 5. rule turn은 메시지 아닌 **evidence card** (가이드 §7.2 progressive disclosure)

L1 (always): conclusion 1–2줄 + evidence chip 3개 + action 3개.
L2 (one click `evidence`): full evidence detail (Feature 04 EvidenceCard 동족).
L3 (one click `왜?`): rule self-explain (deterministic, LLM 아님).

### 6. delivery_gate ↔ 머지 버튼 spatial mapping (가이드 §7.1, §2.3)

block일 때 머지 버튼 disabled. disabled hover → gate turn으로 **scroll-into-view + 240ms ease-out highlight pulse** (Bartram 2001 motion attention; 가이드 §1.2 — 동시 motion 1개니까 다른 애니메이션 정지). 사용자가 "왜 막혔지?" 시선 이동을 강요당하지 않고 자동 도달.

Fitts's Law 보조: gate turn에 직접 `[Override]` 버튼 (관리자만 활성, 가이드 §7.3 disabled signifier).

### 7. ownership_router turn — role-first disclosure

가이드 §2.1. 사람 이름 5개 list 대신 **role+team** ("platform-core / approver") 1줄 먼저 노출. 클릭 시 expand → 실제 사람 후보. 정보 chunk 수 5 → 1로 줄어듦.

### 8. predicted turn — opacity로 불확실성 인코딩 (가이드 §3.1)

predicted (Phase 3, 자연어로부터 추측한 rule break) turn은 default turn보다 **opacity 0.7**. left stripe 금지 (memory). 추가로 chip에 `predicted overapprox` 텍스트 라벨. 두 redundant 채널.

### 9. paraphrase = stack, never replace

LLM paraphrase 버튼 누르면 원본 rule turn은 사라지지 않는다. 두 turn이 stack으로 살아있어야 deterministic evidence가 항상 화면에 존재 (메모리: god-component 패턴이 아니라 *trust* 패턴 — 사용자가 paraphrase가 거짓말일 때 즉시 원본을 본다).

### 10. chat-agent 기존 preset 4개 보존 (가이드 §2.1)

`lowSafety` / `unknownFlag` / `refactor` / `blastRadius` 4개는 Cowan 한도 정확히 4. participant 기능은 preset을 늘리지 않고 **input trigger 감지**(PR 링크, diff fence, 머지 의도 키워드)로만 발화. UI 새 widget 없음.

### 11. Motion 표 (가이드 §5)

| 이벤트 | duration | easing |
|---|---|---|
| participant turn slide-in | 200ms | ease-out (0, 0, 0.2, 1) |
| evidence chip expand | 160ms | ease-out |
| disabled merge → gate scroll-into-view | 240ms | ease-out + brief 1× highlight 80ms |
| paraphrase llm turn 추가 | 200ms | ease-out, 원본 turn은 변함없음 |

`prefers-reduced-motion: reduce` (가이드 §5.3, WCAG 2.3.3): 모든 motion → fade only. scroll-into-view는 즉시 jump.

### 12. Surface cheat (가이드 §8)

| 채널 | 사용 |
|---|---|
| Primary preattentive | shape (avatar) + position (들여쓰기) |
| Cognitive load | 동시 speaker 3, evidence/action 3-3 |
| 색 사용 | none — speaker는 모양·텍스트로 |
| Motion | 1 surface 1 motion 원칙 |

### 13. 검증 (가이드 §9)

- color-blind sim: 5 speaker 모두 shape + chip text로 구별 가능.
- WCAG AA: glass turn card 위 chip text, body text 모두 4.5:1.
- time-to-first-glance: chat에 새 turn 도착 후 *누가 말했는지* 인지 <1s (avatar shape 강도 검증).
- prefers-reduced-motion ON에서도 speaker 인식 손실 0.

## 검증된 외부 패턴과 차이점

검증된 패턴:

- GitHub Actions PR comments — bot이 PR thread에 코멘트로 등장. 단 별도 thread, chat과 분리.
- Linear AI bot — 이슈 thread에 자동 코멘트. 단 발화자가 1명, deterministic guarantee 없음.
- LLM tool use (OpenAI function calling, Anthropic tool use) — LLM이 tool 결과를 paraphrase. 즉 결정권은 LLM에.

우리가 더 가야 하는 부분:

- **multi-speaker chat with deterministic non-LLM voices** — 위 어느 패턴도 안 함
- **rule이 자기 자신을 self-explain** — 지금까지는 항상 LLM이 대신 설명
- **chat-level veto** — gate가 chat에서 직접 머지를 거부
- **predicted-break preview** — 코드 작성 *전에* 어떤 rule이 깨질지 발화

## 성공 지표

- "AI가 머지 가능하다고 했는데 admission이 막은" 케이스 0회 수렴 (LLM과 admission_rule turn이 같이 떠 있으면 기대치가 안 어긋남)
- rule turn의 evidence chip click-through (rule이 self-explain까지 도달한 비율)
- override 액션이 chat에서 일어나는 비율 (PR 페이지에서 다시 안 가도 됨)
- predicted-break turn이 실제 deterministic block과 일치한 비율 (predictor 정확도)
- paraphrase 버튼 사용 빈도 (LLM 의존도 — 낮을수록 deterministic 신뢰도 높음)

## 출시 순서

### Phase 1 — 1 speaker (delivery-gate) + PR-link trigger
범위를 좁힌다. 목표: **PR 링크 1개**를 chat에 붙이면 delivery_gate turn이 deterministic하게 게시되는 것.

- ChatTurn 타입 확정 (discriminated union, 단 admission_rule/delivery_gate/ownership_router 3개 중 delivery_gate만 구현)
- ChatAgent.tsx에 `participants` prop 1개 추가, 그 외 zero edit
- PR-link trigger 1개 (정규식 기반 fixture)
- delivery_gate voice — `entities/admission/lib/evaluate.ts`의 출력을 `AdmissionDecision` → 단일 ChatTurn으로 deterministic 변환
- ParticipantTurnRow + GateTurnCard 렌더링 (icon + chip, no left stripe, GlassCard)

### Phase 2 — 4 speakers + self-explain
- admission_rule, ownership_router voice 추가
- 한 PR 링크 → 여러 rule turn 인터리브
- "왜?" 입력 감지 → 직전 rule turn에 self-explain follow-up
- evidence chip click → blast/taint/ownership 슬라이스로 deep-link
- `[paraphrase]` 버튼 → 기존 chat-agent llm 흐름으로 1회 호출, 별도 llm turn으로 stack

### Phase 3 — predicted-break preview from natural language
- llm-assistant가 user의 자연어 변경 설명 → signal hint (taint source/sink, metric field 추정) 추출
- predictor가 hint와 매칭되는 rule을 찾아 admission_rule turn (predicted) 게시
- 실제 diff가 들어오면 predicted turn dim, deterministic turn으로 교체

## Frontend 구현계획

백엔드는 별도 트랙. 이 섹션은 모든 phase를 frontend feature slice 단위로 풀어쓴다. fixture는 `entities/admission`의 기존 sample을 재사용, 부족한 부분만 `entities/chat-participants` 새 entity에 추가.

### 0. 사전 정리 (모든 phase 공통)

- [src/features/](src/features/) 아래 새 슬라이스 `chat-participants/{registry,turns,voices,ui}` 생성
- [src/entities/](src/entities/) 아래 `chat-participants` entity 추가 — ChatTurn, ParticipantSpeaker, fixture
- `features/chat-agent/ui/ChatAgent.tsx`는 prop 1개 추가만. 그 외 변경 금지 (memory: god-component reuse 패턴).
- `entities/admission`은 import 가능. `entities/admission/lib/evaluate.ts`의 출력 타입(`AdmissionDecision`, `RuleEvaluation`, `RuleMatch`)을 그대로 ChatTurn 변환의 input으로 사용.

### Phase 1 — Speaker 1명 (delivery-gate) + PR-link trigger

#### 1.1 entity 정의 — [src/entities/chat-participants/](src/entities/chat-participants/)

`model/types.ts` — 핵심 타입. 그대로 옮겨붙일 수 있는 수준의 TypeScript로 고정한다.

```ts
// branded id types — chat-agent의 Msg.id (number)와 혼용 방지
export type ChatTurnId = string & { readonly __brand: 'ChatTurnId' };
export type ParticipantId = string & { readonly __brand: 'ParticipantId' };

// SpeakerKind — 발화자 종류. user/llm은 chat-agent 호환을 위해 유지하되,
// 실제로 user/llm turn은 chat-agent의 Session.msgs로 흐른다.
// participant store에는 admission_rule / delivery_gate / ownership_router만 들어간다.
export type SpeakerKind =
  | 'user'
  | 'llm'
  | 'admission_rule'
  | 'delivery_gate'
  | 'ownership_router';

// 모든 turn에 공통으로 들어가는 메타.
// timestamp는 chat-agent의 Msg와 인터리브하기 위해 ISO string으로 통일.
export interface ChatTurnBase {
  id: ChatTurnId;
  speaker: SpeakerKind;
  timestamp: string;            // ISO
  // turn이 어떤 user input에 의해 trigger되었는지 — self-explain follow-up
  // 같은 경우는 이 필드가 다른 turn의 id를 참조한다.
  triggeredBy: ChatTurnId | null;
  // predictor가 만든 turn이면 true. UI에서 dim 처리.
  predicted: boolean;
}

// admission_rule turn — RuleEvaluation 1개당 1 turn.
// reason은 RuleEvaluation.reason을 그대로 가져온다 (LLM 생성 금지).
export interface AdmissionRuleTurn extends ChatTurnBase {
  speaker: 'admission_rule';
  ruleId: string;
  ruleName: string;
  severity: 'block' | 'warn' | 'info';
  source: 'native' | 'eslint' | 'semgrep' | 'codeql' | 'custom';
  reason: string;               // RuleEvaluation.reason, deterministic
  hits: ReadonlyArray<{
    fileId: number;
    evidenceText: string;
    confidence: 'exact' | 'overapprox' | 'unknown';
  }>;
  // override 가능 여부 — turn 하단의 [override] 버튼 활성화 조건
  override: {
    allowAuthor: boolean;
    requiresApproverRole: string | null;
  };
}

// delivery_gate turn — AdmissionDecision 1개당 1 turn.
// PR 단위 결과의 mirror. 머지 버튼 disable과 직접 묶인다.
export interface DeliveryGateTurn extends ChatTurnBase {
  speaker: 'delivery_gate';
  outcome: 'allow' | 'warn' | 'block';
  blockingCount: number;
  warningCount: number;
  passingCount: number;
  // 어떤 rule turn id들이 이 결정의 근거인가 — UI에서 scroll-into-view에 사용
  groundedIn: ReadonlyArray<ChatTurnId>;
}

// ownership_router turn — reviewer/approver 후보.
// 사람 이름이 아니라 role+team 단위로 먼저 발화 (UI 코멘트 5번).
export interface OwnershipRouterTurn extends ChatTurnBase {
  speaker: 'ownership_router';
  roleHint: string;             // e.g. 'platform-core / approver'
  candidates: ReadonlyArray<{
    ownerId: string;
    teamId: string;
    role: 'author' | 'reviewer' | 'approver';
  }>;
  reasoning: string;            // RouteDecision의 deterministic 출력
}

// user/llm turn은 chat-agent의 Session.msgs에서 그대로 살린다.
// 단 timestamp 인터리브를 위해 view-only 어댑터가 필요하다 (turns/interleave.ts).
export interface UserTurnView extends ChatTurnBase {
  speaker: 'user';
  text: string;
}
export interface LlmTurnView extends ChatTurnBase {
  speaker: 'llm';
  text: string;
  paraphraseOf: ChatTurnId | null;  // paraphrase 모드면 원본 turn id
}

export type ChatTurn =
  | UserTurnView
  | LlmTurnView
  | AdmissionRuleTurn
  | DeliveryGateTurn
  | OwnershipRouterTurn;

// participant 등록 단위.
// kind === SpeakerKind. 같은 kind의 participant는 1명만 등록 가능 (registry가 강제).
export interface ChatParticipant {
  id: ParticipantId;
  kind: Exclude<SpeakerKind, 'user' | 'llm'>;
  // user input 1건이 들어왔을 때 이 participant가 turn을 만들어야 하는지 결정.
  // 결과는 0..N개의 ChatTurn. deterministic이어야 함 (LLM 호출 금지).
  trigger: (ctx: ParticipantTriggerCtx) => ChatTurn[];
}

// trigger의 input. user가 막 보낸 turn 1개 + 현재까지의 turn 시퀀스.
export interface ParticipantTriggerCtx {
  latest: UserTurnView;
  history: ReadonlyArray<ChatTurn>;
  // PR 링크 / diff fence / 머지 의도 키워드 등은 미리 parse해서 던져준다.
  intent: ParsedIntent;
}

export type ParsedIntent =
  | { kind: 'pr_link'; url: string; prFixtureId: string }
  | { kind: 'diff_block'; lang: string; body: string }
  | { kind: 'merge_intent' }
  | { kind: 'why_question'; targetTurnId: ChatTurnId | null }
  | { kind: 'change_description'; text: string }
  | { kind: 'unknown' };
```

#### 1.2 ChatAgent host 변경 — [src/features/chat-agent/ui/ChatAgent.tsx](src/features/chat-agent/ui/ChatAgent.tsx)

차이는 **prop 1개 추가**가 전부다.

```ts
// 호스트가 외부에서 주입받는 단 하나의 확장 슬롯.
// 호스트는 이 함수의 시그니처만 안다. 어떤 participant가 있는지, 어떻게
// 동작하는지는 chat-participants 슬라이스가 단방향으로 캡슐화한다.
export type ChatParticipantRenderer = (props: {
  // 현재 active session의 user/llm msgs를 view 형태로 (어댑터가 변환)
  hostMessages: ReadonlyArray<{ id: number; role: 'user' | 'agent'; text: string }>;
  // user가 직전에 보낸 입력. 새 입력일 때만 trigger 발화.
  latestUserInput: string | null;
  // user가 머지 의도를 누른 시점 콜백을 받기 위한 훅
  onParticipantBlock: (reason: string) => void;
}) => React.ReactNode;

// ChatAgent 본체 시그니처는 단 한 줄만 늘어난다.
export default function ChatAgent({
  maxWidth = 'calc(100vw - 820px)',
  participants,            // ← 신규. optional. 없으면 기존 동작 그대로.
}: {
  maxWidth?: number | string;
  participants?: ChatParticipantRenderer;
} = {}) { /* 기존 747줄 그대로, 단 메시지 list 영역 한 곳에 slot 1개 삽입 */ }
```

호스트 내부 변경 지점은 정확히 두 군데뿐이다:

1. props에 `participants?: ChatParticipantRenderer` 추가
2. 메시지 list가 그려지는 컴포넌트의 마지막 자식으로 `{participants?.({ hostMessages, latestUserInput, onParticipantBlock })}` 1줄 삽입

그 외 chat-agent의 session, suggestion, resize, token meter 모두 그대로다.

#### 1.3 registry — [src/features/chat-participants/registry/](src/features/chat-participants/registry/)

- `ChatParticipantsContext.tsx` — provider + hook (`useParticipants`)
  - state: `{ participants: Map<ParticipantId, ChatParticipant> }`
  - actions: `register(p)`, `unregister(id)`
- `intentParser.ts` — `parseIntent(input: string, history): ParsedIntent`. 정규식 + lookahead. PR 링크: `/github\.com\/.+\/pull\/\d+/`, merge intent: `/(머지|merge|ship|배포)/i`, why question: `/^(왜|why)\??$/i` (직전 turn 참조).
- `triggerLoop.ts` — `runTriggers(latest, history, participants): ChatTurn[]`. 모든 participant.trigger를 순차 실행, 결과를 timestamp 정렬해서 반환. 순서는 등록 순. LLM 호출 금지 (assertion으로 강제).

#### 1.4 turns store — [src/features/chat-participants/turns/](src/features/chat-participants/turns/)

- `TurnsContext.tsx` — `{ turns: ChatTurn[], append, clear }`. user/llm turn은 chat-agent에서 어댑터로 들어옴, participant turn은 trigger 결과로 들어옴.
- `interleave.ts` — `interleave(hostMsgs, participantTurns): ChatTurn[]`. timestamp 기준 stable sort. host msg는 timestamp가 없으면 sequence index로 fallback (chat-agent의 `Msg.id`가 단조 증가이므로 안전).

#### 1.5 voices — [src/features/chat-participants/voices/](src/features/chat-participants/voices/)

Phase 1에서는 deliveryGateVoice 1개만.

- `deliveryGateVoice.ts` — `(ctx) => ChatTurn[]`
  - intent.kind === 'pr_link'인 경우에만 발화
  - `entities/admission/lib/evaluate.ts`의 evaluator를 호출 (`evaluateAdmission(prFixture, rules)`) → `AdmissionDecision`
  - `decisionToGateTurn(decision): DeliveryGateTurn` — 1개의 turn으로 변환. `outcome`, `blockingCount` 등은 1:1 매핑.
  - groundedIn은 Phase 1에서 빈 배열 (admission_rule turn이 아직 없으니까). Phase 2에서 채움.
- LLM 호출 0회. 동일 input → 동일 output 보장.

#### 1.6 ui — [src/features/chat-participants/ui/](src/features/chat-participants/ui/)

- `ParticipantTurnsRoot.tsx` — `ChatParticipantRenderer` 구현체 1개. 호스트가 받는 prop은 결국 이 컴포넌트.
- `ParticipantTurnRow.tsx` — turn 1개를 그리는 row. discriminated union switch로 sub-card 선택.
- `GateTurnCard.tsx` — delivery_gate turn 전용. icon = lock, chip = `gate:delivery`, 본문 = "block 1 / warn 0 / pass 12 — 머지 불가". GlassCard 위에 렌더. **left stripe 절대 금지** (memory rule). chip 배경에만 outcome 색.
- `SpeakerChip.tsx`, `SpeakerIcon.tsx` — primitives. icon + chip + name 조합으로 speaker 구별 (UI 코멘트 1번).
- `MergeButtonGate.tsx` — chat 입력 영역 옆에 있는 "ship" 버튼의 disabled 상태를 delivery_gate turn outcome과 묶음. block이면 disabled, hover 시 gate turn으로 scroll-into-view.

#### 1.7 라우팅 / providers

- `<ChatParticipantsProvider>`를 **AppProviders에 올리지 않는다**. chat이 떠 있는 layout 안쪽에 mount.
- chat-agent가 `/intelligence`와 onboarding 양쪽에 떠 있으므로, 두 layout 모두에 provider 추가. 다른 라우트(`/`, `/admission` 등)에서는 mount 안 함.
- 이 결정의 근거: provider가 AppProviders로 올라가면 (a) admission/ownership 슬라이스가 모든 라우트에서 살아 있어 메모리 새고, (b) lazy split이 깨지고, (c) participant trigger가 chat이 안 보이는 라우트에서도 돌아 무용한 cycle 생긴다.

#### 1.8 스타일 가드 (memory rules 반영)

- 좌측 컬러 stripe 사용 금지 — 모든 turn card에 적용 (3+회 경고된 사항)
- glassmorphism 유지 (alpha 0.3–0.45 dark / 0.5–0.7 light)
- backdrop-filter ancestor에 transform 금지 — turn card는 chat-agent body 안에 들어가므로 chat-agent body의 ancestor chain 검토 (memory rule: backdrop-filter dies under ancestor transform)
- speaker 차이는 icon + chip + name으로만

#### Phase 1 완료 조건

- [ ] chat에 PR 링크 붙이면 1초 안에 delivery_gate turn 1개 게시
- [ ] 같은 PR 링크 두 번 붙이면 같은 turn text가 나옴 (deterministic 보장)
- [ ] block일 때 chat의 "ship" 버튼 disabled, hover 시 gate turn scroll-into-view
- [ ] ChatAgent.tsx의 git diff가 prop 1개 + slot 1줄로 한정되어 있음 (god component 회귀 방지)
- [ ] LLM 호출 0회 (deterministic guarantee)

---

### Phase 2 — Speaker 4명 + self-explain

#### 2.1 admission_rule voice — [src/features/chat-participants/voices/admissionRuleVoice.ts](src/features/chat-participants/voices/admissionRuleVoice.ts)

- intent.kind === 'pr_link' 또는 'diff_block'에 발화
- `entities/admission/lib/evaluate.ts`의 RuleEvaluation 배열 → `AdmissionRuleTurn[]`로 1:1 변환
- `RuleEvaluation.reason`을 turn.reason에 그대로 사용. paraphrase 금지.
- delivery_gate turn의 `groundedIn`을 채우기 위해 admission_rule turn 들의 id를 모아 같이 반환 (Phase 1에서 비웠던 부분 마무리).

#### 2.2 ownership_router voice — [src/features/chat-participants/voices/ownershipRouterVoice.ts](src/features/chat-participants/voices/ownershipRouterVoice.ts)

- intent.kind === 'pr_link'에 발화
- `features/ownership-routing`의 RouteDecision (또는 `entities/ownership`의 fixture lookup)을 deterministic하게 가져와 OwnershipRouterTurn으로 변환
- candidates는 role+team 단위로 정렬, role 우선순위는 author < reviewer < approver

#### 2.3 self-explain — [src/features/chat-participants/voices/selfExplain.ts](src/features/chat-participants/voices/selfExplain.ts)

- intent.kind === 'why_question'에 발화
- 직전 admission_rule turn 1개를 골라 follow-up turn 생성
- follow-up turn = AdmissionRuleTurn (같은 ruleId, severity), 단 hits 필드를 더 풍부하게 (matched files + ownership join + blast hint).
- 텍스트는 hits를 template에 박아 만든다. LLM 0회.

#### 2.4 paraphrase 버튼 — [src/features/chat-participants/ui/ParaphraseButton.tsx](src/features/chat-participants/ui/ParaphraseButton.tsx)

- rule turn 하단에 1개 버튼.
- 클릭 시 chat-agent의 기존 LLM 호출 흐름을 1회 invoke. context = `{ ruleId, reason, hits }` raw payload.
- 응답이 들어오면 LlmTurnView로 turn store에 append. `paraphraseOf = 원본 rule turn id`.
- 원본 rule turn은 절대 mutate 안 함 (UI 코멘트 7번).

#### 2.5 evidence chip click → deep link

- AdmissionRuleTurn의 hits 각각이 chip으로 렌더
- chip 클릭 → blast/taint/ownership 슬라이스로 deep-link (router state push)
- chat-agent를 unmount하지 않고 surface 전환 (SPA navigation)

#### Phase 2 완료 조건

- [ ] PR 링크 1개 → admission_rule × N + ownership_router × 1 + delivery_gate × 1 turn이 인터리브됨
- [ ] rule turn 아래 "왜?" 입력 → 같은 rule의 self-explain follow-up turn이 게시됨
- [ ] paraphrase 버튼 클릭 시 llm turn이 stack으로 추가, 원본 rule turn 유지
- [ ] evidence chip click → blast/taint/ownership 라우트로 이동, 돌아오면 chat 상태 보존

---

### Phase 3 — Predicted-break preview

#### 3.1 intent 확장 — [src/features/chat-participants/registry/intentParser.ts](src/features/chat-participants/registry/intentParser.ts)

- intent.kind === 'change_description' 추가 (자유 형식 자연어, fallback)
- llm-assistant가 description을 받아 hint 추출 (taint source/sink 추정, metric field 추정). 이 단계가 유일하게 LLM이 끼어드는 곳. 결과는 `SignalHint` 타입.

```ts
export type SignalHint =
  | { kind: 'taint_hint'; source: TaintSource; sink: TaintSink }
  | { kind: 'metric_hint'; field: MetricField; direction: 'up' | 'down' }
  | { kind: 'graph_hint'; pattern: GraphPattern };
```

#### 3.2 predictor — [src/features/chat-participants/voices/predictor.ts](src/features/chat-participants/voices/predictor.ts)

- input: SignalHint
- `entities/admission`의 모든 enabled rule을 대상으로 hint와 매칭되는 rule만 골라 AdmissionRuleTurn 생성. 단 turn.predicted = true, hits[].confidence는 'overapprox' 또는 'unknown'으로 강제.

#### 3.3 predicted ↔ deterministic 교체

- 같은 user 세션에서 user가 실제 diff/PR 링크를 마저 붙이면, 이전 predicted turn 들은 dim 처리 + `[deprecated by deterministic]` 칩 추가
- 새 deterministic turn이 같은 ruleId로 들어오면 1:1 대응. 다른 ruleId면 predicted turn 그대로 dim 유지.

#### 3.4 polish

- empty state, error state, cancellation
- accessibility pass (aria role="log" on turn list, aria-live="polite" on new participant turns)
- keyboard nav (j/k로 turn 이동, enter로 chip activate)

#### Phase 3 완료 조건

- [ ] "이 함수에 secret 로깅 추가하려고" → admission_rule turn (predicted, overapprox)
- [ ] 같은 세션에서 diff 붙이면 predicted turn dim, 새 deterministic turn 게시
- [ ] LLM은 hint 추출과 paraphrase에서만 호출됨 (감사 로그로 검증)

---

### 모듈 의존성 그래프

```
entities/admission           entities/ownership           entities/chat-participants
  ↑                             ↑                            ↑
features/chat-participants/registry  ← intentParser, triggerLoop
  ↑
features/chat-participants/voices    ← deliveryGate, admissionRule, ownershipRouter, selfExplain, predictor
  ↑                                    (deterministic; LLM은 paraphrase/hint 추출에서만)
features/chat-participants/turns     ← interleave, store
  ↑
features/chat-participants/ui        ← ParticipantTurnsRoot (= ChatParticipantRenderer)
  ↑
features/chat-agent/ui/ChatAgent     ← prop 1개 추가, slot 1줄 삽입. 그 외 zero edit.
```

ChatAgent는 chat-participants를 **import 하지 않는다**. 단방향이다. 호스트는 prop으로 renderer를 받을 뿐, 어떤 participant가 어떻게 동작하는지 모른다. chat-participants도 ChatAgent 내부 type을 import하지 않는다 — 둘 사이의 contract는 `ChatParticipantRenderer` 시그니처 1개.

### 손대지 않을 것

- [src/features/chat-agent/ui/ChatAgent.tsx](src/features/chat-agent/ui/ChatAgent.tsx) — props 1개 + slot 1줄 외 zero edit. 747줄 core 보존.
- [src/features/chat-agent/model/TokensContext.tsx](src/features/chat-agent/model/TokensContext.tsx) — import 안 함. participant turn은 LLM token을 안 쓰므로 token meter 의미가 다름.
- [src/features/chat-agent/model/suggestions.ts](src/features/chat-agent/model/suggestions.ts) — 4개 preset 그대로. participant 기능은 trigger 감지로 동작, suggestion preset 늘리지 않음.
- [src/features/admission-rules/](src/features/admission-rules/) — 보드 UI는 그대로. evaluate.ts만 voice가 호출.
- [src/features/ownership-routing/](src/features/ownership-routing/) — RouteDecision lookup만 사용. UI 패널 변경 없음.

### 백엔드 트랙과의 contract

- `ChatTurn` discriminated union schema가 frontend-backend boundary
- voice들은 deterministic이지만 input은 evaluate.ts(현재 frontend) → 실제 backend admission engine으로 swap 가능. swap point는 `voices/*Voice.ts`의 1줄.
- LLM 호출은 paraphrase + Phase 3 hint 추출 2지점만. 두 지점 모두 별도 endpoint로 격리, 감사 로그 가능하게.
- 모든 fixture는 [src/entities/chat-participants/model/fixtures.ts](src/entities/chat-participants/model/fixtures.ts) + 기존 [src/entities/admission/lib/sample.ts](src/entities/admission/lib/sample.ts) 재사용. 백엔드 붙으면 fixture만 dead code화.

## Why Developers Will Care

이 기능이 잘 되면 개발자는 "AI가 머지 가능하다고 했는데 실제로는 막혔다"는 경험을 안 한다.
deterministic governance가 chat에서 1급 시민으로 발화하니까, LLM 추측과 admission 결정이 어긋나지 않는다.
"왜 이 rule이 깨져?"라고 물으면 그 rule이 직접 자기 evidence를 들고 답한다 — paraphrase가 아니라 원본이.
이게 AI 시대에 governance와 conversation이 한 자리에 들어오는 진짜 통합점이다.
