# Feature 13: Blast-Aware Chat Agent

## One-liner
챗 에이전트가 답을 내기 전에 그 답이 일으킬 변경의 blast radius를 먼저 측정해서, 답변 자체의 톤/포맷/거절 여부를 그 결과에 맞게 바꾼다.

## Problem Statement

지금 시장의 모든 코딩 챗봇은 같은 형식으로 답한다.

- "이 함수 시그니처 어떻게 바꿔?" → 코드 스니펫
- "이 config key 이름 바꿔도 돼?" → 코드 스니펫
- "이 public API 어떻게 deprecate 해?" → 코드 스니펫

세 질문의 위험도는 완전히 다르다. caller 2개짜리 helper와 caller 200개짜리 public API가 같은 답을 받는다는 건, 챗봇이 **자기 답의 결과를 모른다**는 뜻이다.

개발자가 실제로 답답한 순간:

- AI가 30초 만에 코드를 만들어 줬는데, 적용했더니 60곳이 깨졌다
- "이거 영향 큰데 stack으로 나누자" 같은 판단을 AI가 못 한다
- AI 답을 따라가다 보면 어느새 cross-team API를 건드리고 있다
- "그냥 코드만 줘" 하고 강제로 받았는데, 그게 강제 우회였다는 표시가 어디에도 없다

즉, 답변 모델은 좋아졌는데 답변 **조립 로직**이 blast 정보를 안 본다. 정적 분석 자산을 가진 우리는 다르게 할 수 있다.

## Why This Matters

2026년에는 코드 생성 자체는 commodity다.
차별점은 "이 코드를 적용해도 되는가"의 판단이다.

- before: 챗 에이전트가 같은 톤으로 모든 답을 함
- after: 답이 작은 변경이면 코드, 큰 변경이면 plan, cross-team이면 approval path까지 자동 attach

이 feature는 chat-agent를 **결과를 의식하는 advisor**로 격상시킨다. 같은 surface, 같은 4개 suggestion preset, 같은 entry point. 단지 답이 나가기 전에 한 번의 blast probe가 끼는 것뿐이다.

ChatAgent.tsx 자체는 747줄짜리 god component이고 손대지 않는다. 단 한 개의 prop slot — `messageMiddleware` — 만 추가한다. middleware가 모든 일을 한다.

## Moat

"챗봇이 답하기 전에 정적 분석 결과를 본다"는 건 흔하지 않다.

진짜 moat:

1. answer composition이 `change_impact_analysis` 결과에 **gated** 되어 있다. Cursor/Cody는 코드 컨텍스트를 검색해서 답에 attach하지만, 답 자체를 막거나 포맷을 바꾸지 않는다.
2. **typed BlastTier**가 답변 모드를 결정한다. free-text "이건 위험해 보여요" 가 아니라 `'small' | 'medium' | 'large' | 'cross_team'` 결정 트리.
3. force-bypass도 typed event로 기록된다. 나중에 "small-tier-no-checklist 답을 따라갔다가 incident 난 비율" 같은 지표를 뽑을 수 있다 — 일반 챗봇은 답이 자유 텍스트이라서 사후 분석 자체가 불가능.
4. mode chip이 답변에 **eviction되지 않는 메타데이터**로 박힌다. 다른 챗봇은 답을 캐시/공유/copy 하면 위험 신호가 사라지지만, 우리는 chip이 turn에 묶여 있다.

즉, generic LLM agent에서 advisory layer만 가진 게 아니라, **답변 자체가 blast graph에 종속**된다는 게 차이다.

## 기술 배경

핵심 엔진 자산 (Feature 03과 공유):

- `change_impact_analysis` — primary signal
- `dependency_reasoning` — caller/callee count, transitive
- `points_to`, `pta_precise` — dispatch overapprox 여부
- `find_references`, `go_to_definition` — direct caller 셈
- `ownership` data — cross-team 판정 (Feature 05와 공유)
- `index_status` — stale → confidence 강등

답변 모드는 4단계.

| Tier | 정의 | 답변 모드 |
|---|---|---|
| `small` | direct caller ≤ 3, single-team, fresh index | `direct` (코드 그대로) |
| `medium` | direct caller 4–49 | `checklist` (코드 + verify할 caller 목록) |
| `large` | direct caller ≥ 50, 또는 transitive ≥ 200 | `refactor_redirect` (코드 거절, change-planner로 redirect) |
| `cross_team` | 위 어느 tier든 owner team ≥ 2 | `cross_team_gated` (코드 + ownership-routing approval path) |

`cross_team`은 다른 tier와 **orthogonal**하다 — small이면서 cross_team일 수 있고, 그 경우 `cross_team_gated`가 우선한다 (가장 보수적인 mode 채택).

## 제안 기능

### 1. Pre-answer Blast Probe

챗에이전트가 사용자 질문을 받고, "이 질문이 코드 변경을 의도하는가"를 먼저 분류한다 ("how do I change X?", "rename X", "remove X" 등 keyword + LLM-light intent classifier; Phase 1은 keyword 기반).

변경 의도가 있으면, target symbol을 추출하고 `probeBlast(target)`을 호출한다.

- cache hit (최근 N분 내 같은 target): 즉시 사용
- cache miss: `change_impact_analysis` 호출 (또는 Phase 1은 heuristic — caller count만)

probe가 끝나기 전까지는 **답변을 보내지 않는다**. 사용자에게는 "blast probing..." 인디케이터가 잠깐 뜬다.

### 2. Answer Mode Selection

probe 결과 → `AnswerMode` 결정 트리. 결정 로직은 데이터-주도 (policy table).

- middleware가 `AnswerModeDecision`을 반환하면 ChatAgent 본체는 그 decision대로 turn을 렌더링
- middleware가 `null`을 반환하면 (변경 의도 없음, 또는 probe 실패) chat-agent는 **원래대로** 동작 — 즉 middleware는 opt-in proxy

### 3. Mode Chip on AI Turn

답변 위에 작은 chip이 붙는다.

- 아이콘 + 텍스트만 (예: `<ShieldAlert/> Large blast — refactor recommended`)
- **컬러 left stripe 절대 사용 안 함** (memory rule)
- chip 클릭 → 왜 이 mode가 됐는지 popover (caller count, owner count, staleness)
- glass 표면 위 chip; chip 자체는 frosted pill, alpha 0.3–0.45

chip은 turn에 묶여 있어서 답변을 스크롤해도, copy해서 다른 곳에 붙여도 (cmd+C 시 `[mode: large blast — refactor]` prefix가 붙는다) 사라지지 않는다.

### 4. Force-bypass

사용자가 chip 옆 "Just give me the code anyway" 버튼을 누르면:

- middleware는 mode를 `direct`로 강제 변경 (실제 코드 답변 생성)
- 새 turn에 `forced=true` 플래그가 박힘
- chip이 `<AlertOctagon/> force-bypassed (large blast)` 형태로 변경됨 — 원래 tier가 텍스트에 남아 있어야 함
- analytics event: `chat_agent.force_bypass` (target, original_tier, user_id)

force-bypass는 권리이지 권고가 아니다. 나중에 incident 분석에서 "force-bypass turn → 며칠 뒤 revert" 패턴을 뽑을 수 있어야 한다.

### 5. Cross-team Awareness

`cross_team` mode는 답변에 ownership-routing의 approval path 카드를 inline embed한다.

- Feature 05의 `ApprovalPathCard`를 **재사용** (새 컴포넌트 만들지 않는다)
- 답변 본문 → checklist → ApprovalPathCard 순서
- 사용자가 카드의 "request approval" 버튼을 누르면 Feature 05 surface로 jump

### 6. Cost Awareness

probe 자체에 비용이 든다. `large` blast의 transitive dependency_reasoning은 토큰을 많이 먹을 수 있다.

- BudgetContext (Feature 04에서 정의된 컨텍스트, 또는 chat-agent용 동등 컨텍스트)에서 probe 비용을 체크
- 한도 임박 시 chip에 작은 cost badge (`~12K tokens to probe`) 표시
- 한도 초과 시 probe를 skip하고 fallback chip (`<HelpCircle/> blast unknown — answering as-is`) 띄움
- 사용자는 fallback에서도 force-bypass와 같은 "다시 probe 시도" 버튼을 누를 수 있음

## AI-native 설계

이 feature는 LLM 답변을 더 똑똑하게 하는 게 아니라, LLM 답변의 **조립 단계**에 결정론적 게이트를 끼운다.

AI-native 조건:

1. 사용자 질문이 변경 의도인지 stochastic하게 판별 (LLM intent classifier 또는 keyword)
2. 변경 의도면 target localization을 먼저 (사용자가 파일/심볼 이름을 안 줘도 chat-agent context에서 추론)
3. blast probe는 **답변 생성보다 먼저** 실행 — 답이 나오는 동안 probe하면 force-bypass UX가 어색해짐
4. mode 결정은 **deterministic policy table** — LLM이 mode를 정하지 않는다. 같은 입력에 같은 mode가 나와야 한다.
5. force-bypass도 LLM의 결정이 아니다. 사용자만 누를 수 있다.

가장 중요한 설계 원칙: **LLM은 답을 생성하고, middleware는 답의 형태를 결정**. 두 책임이 섞이면 mode가 prompt-injection으로 우회될 수 있다.

## 리팩토링 / 아키텍처 영향

ChatAgent.tsx (747줄, [src/features/chat-agent/ui/ChatAgent.tsx](src/features/chat-agent/ui/ChatAgent.tsx))의 core는 손대지 않는다. 추가되는 prop은 정확히 1개.

```ts
// ChatAgent props 변경 — 단 1줄
type ChatAgentProps = {
  maxWidth?: number | string;
  messageMiddleware?: MessageMiddleware[]; // ← 새로 추가
};
```

새 feature slice 구조:

```
features/blast-aware-chat/
├── probe/
│   ├── probeBlast.ts             // probeBlast(target): Promise<BlastProbe>
│   ├── intentClassifier.ts       // "is this a change request?" — keyword + (Phase 2) LLM
│   ├── targetExtractor.ts        // 질문에서 symbol/file 후보 추출
│   └── probeCache.ts             // LRU by target id, TTL 기반
├── mode-policy/
│   ├── policyTable.ts            // BlastProbe → AnswerMode (deterministic)
│   ├── decideMode.ts             // policyTable + cross_team override 적용
│   └── types.ts                  // BlastTier, AnswerMode, AnswerModeDecision
├── ui-extensions/
│   ├── ModeChip.tsx              // 아이콘 + 텍스트 chip (no left stripe)
│   ├── ChecklistInline.tsx       // medium mode의 caller verify 목록
│   ├── RefactorRedirectCard.tsx  // large mode 거절 카드
│   ├── ForceBypassButton.tsx     // chip 옆 small button
│   └── ProbeIndicator.tsx        // "blast probing..." 로딩
└── middleware/
    └── blastAwareMiddleware.ts    // MessageMiddleware 구현체. ChatAgent에 주입.
```

ChatAgent와의 경계 (결정):

- ChatAgent.tsx **core 로직 절대 수정 금지**. 새로 추가되는 건 prop 1개와 그 prop을 호출하는 1줄 (`await runMiddleware(ctx)`).
- chat-agent의 4 suggestion preset (`lowSafety`, `unknownFlag`, `refactor`, `blastRadius`)은 그대로. 이미 blastRadius preset이 있다 — 이 preset이 trigger한 turn은 자연스럽게 large/cross_team mode가 될 가능성이 높다.
- TokensPanel.tsx는 손대지 않는다. cost 표시는 chip에 inline.
- 만약 ChatAgent가 middleware prop을 받지 않는 환경에서 mount되면 (e.g. AppProviders 변경 전 단계), middleware는 그냥 동작 안 함 — 기존 chat 동작 그대로.

이게 흐려지면 ChatAgent가 또 god component로 자란다. middleware 패턴은 "chat-agent를 안 바꾸는" 가장 강한 보장이다.

## UI/UX 코멘트

이 섹션은 [00-uiux-science-guide.md](docs/plans/may-9-feature-plan/00-uiux-science-guide.md)를 인용한다. blast-aware chat의 핵심 도전: **답변에 자기 위험도 chip을 붙이는데** 사용자 시선이 chip이 아닌 답변 본문에 가야 함.

### 1. ModeChip — icon shape escalation (가이드 §1.1, §3.1)

| Tier | Icon | Text label | Chip weight |
|---|---|---|---|
| small | `<Check/>` (또는 chip 자체 생략) | "direct" | regular |
| medium | `<ListChecks/>` | "checklist" | regular |
| large | `<ShieldAlert/>` filled | "refactor" | medium |
| cross_team | `<Users/>` filled | "cross-team" | medium |
| force-bypassed | `<AlertOctagon/>` + 원래 tier text | "bypassed · large" | semibold |

icon shape escalation (outline → checklist grid → shield → users → octagon) + weight escalation. 두 redundant 채널 → 색맹 sim에서도 보존 (가이드 §9.2).
**좌측 stripe / accent bar 영구 금지** (memory rule × 3+, 가이드 §3.3).

### 2. small-tier chip은 생략 (가이드 §2.2 Hick + §10 안티패턴)

small tier에서는 chip을 *아예 표시하지 않음*. 매번 "everything is fine" pill을 보여주면 사용자가 chip 자체를 무시하기 시작한다 (Norman 2013, signal habituation). chip이 등장한다 = 주의 필요.

### 3. ChecklistInline (가이드 §2.1, §7.2)

medium tier에서 답변 본문 아래 inline `<details>` 펼침. 별도 모달 금지 (가이드 §10).
- caller 50개 중 **top 5–8개**만 노출 (Cowan 4±1 상한, 가이드 §2.1) + "+N more" fold.
- 각 caller row = file path + line + numeric impact score. 색 없음.

### 4. RefactorRedirectCard (large tier)

답을 거절하는 게 아니라 *redirect* — 사용자에게 더 적합한 surface(change-planner)로 spatial transition. card는 본문 아래 single CTA "Open in Change Planner" (Hick: 1 액션, 가이드 §2.2). 본문은 "이 변경은 N callers에 영향" numeric만.

### 5. Glass 제약 (가이드 §4)

- ModeChip / ChecklistInline / RefactorRedirectCard 모두 chat-agent 기존 GlassCard 모듈 (memory × 20+).
- alpha 0.30–0.45 dark / 0.50–0.70 light. 가독성 부족 시 alpha 안 올림 — typography로 (가이드 §4.1).
- backdrop-filter ancestor transform 금지. ChatAgent의 resize handle / drag transform 사용 시 ModeChip는 portal 사용 검토 (memory + 가이드 §4.2).

### 6. suggestion preset 4개 보존 (가이드 §2.1)

`lowSafety` / `unknownFlag` / `refactor` / `blastRadius` 4개는 Cowan 한도 정확히 4 — 늘리지 않음. middleware는 preset trigger turn에도 동일 적용 (preset도 결국 사용자 질문).

### 7. Probe indicator — Doherty Threshold (가이드 §5.2)

probe 200ms 미만 → indicator 숨김. 200ms 이상 걸리면 chat-agent 본문 아래 thin row "probing blast…" + 미세 dot pulse (Bartram 2001, 가이드 §1.2 — 한 surface 한 motion).
500ms 초과 시에도 chat-agent typing indicator는 유지 (사용자가 답변 시작이 아예 멈춘 게 아니라는 시그널).

### 8. force-bypass 버튼 위치 (가이드 §2.3, §7.3)

chip 바로 옆 (Fitts: 거리 짧음 + 같은 의미 cluster). 단:
- 첫 등장 시 disabled 상태 + "read first" tooltip 1.2초 후 enable (사용자가 chip을 *보고* mode를 이해한 다음에야 누르도록).
- bypass 후 turn에는 영구 `bypassed · large` chip이 박힘 (가이드 §10 — fact는 사라지면 안 됨).

### 9. Cognitive load — turn당 시각 신호 2개 (가이드 §2.1)

ModeChip(L1) + ChecklistInline 또는 RefactorRedirectCard(L2 펼침). 그 외에는 본문이 가장 visually heavy해야 함 — 답변 자체가 결국 사용자가 읽는 것. probe / cost meter 같은 metadata는 L3 (progressive disclosure).

### 10. Cross-team 모드 — ownership 통합 (Feature 05)

`cross_team` tier에서 답변 끝에 [src/features/ownership-routing/ui/ApprovalPathCard.tsx](src/features/ownership-routing/ui/ApprovalPathCard.tsx) inline 임베드. team chip은 색 없이 text + icon 만. 동일 GlassCard 모듈.

### 11. Motion 표 (가이드 §5)

| 이벤트 | duration | easing |
|---|---|---|
| ModeChip enter | 200ms | ease-out (0, 0, 0.2, 1) |
| ChecklistInline expand | 240ms | ease-out (height transition) |
| probe dot pulse | 1200ms loop | ease-in-out |
| force-bypass disabled→enabled | 120ms | ease-out (opacity) |
| RefactorRedirectCard hover lift | 80ms | ease-out (translateY -1px) |

`prefers-reduced-motion: reduce` (가이드 §5.3, WCAG 2.3.3): 모든 motion → fade only. height transition → 즉시 jump. 정보 손실 0.

### 12. Surface cheat (가이드 §8)

| 채널 | 사용 |
|---|---|
| Primary preattentive | icon shape + text + weight |
| Cognitive load | turn당 chip 1, expand 1 |
| 색 사용 | none — tier는 모양·텍스트·weight |
| Motion | 1 surface 1 motion (probe dot only) |

### 13. 검증 (가이드 §9)

- color-blind sim 4종: 5 tier icon이 보존되는지.
- WCAG AA: glass 위 chip text 4.5:1, body text 4.5:1.
- time-to-first-glance: ModeChip 등장 후 사용자가 *tier*를 인지하는 데 <1s. peripheral vision으로 인식되어야 함 (시선은 답변 본문에).
- prefers-reduced-motion ON에서도 tier / bypass 정보 손실 0.
- bypass rate per tier: large >30%면 threshold 잘못 잡힘 (admission rule처럼 튜닝 대상).

## 검증된 외부 패턴과 차이점

검증된 패턴:

- Cursor — code completion, agent loop. 답변 형식 고정.
- Sourcegraph Cody — code graph context 답변 attach. 답 거절/redirect 안 함.
- GitHub Copilot Chat — repo context 추가. impact 기반 모드 분기 없음.

이들 모두 답변을 **검색-증강**한다. 우리는 답변을 **분석-게이트**한다.

차이점:

| | 외부 (Cursor/Cody/Copilot) | 우리 (Blast-Aware Chat) |
|---|---|---|
| 답변 전 분석 | 컨텍스트 검색만 | change_impact_analysis까지 |
| 답변 거절 | 거의 없음 | large tier에서 명시적 redirect |
| cross-team 인지 | 없음 | ownership data로 자동 게이트 |
| force-bypass 추적 | 없음 (애초에 거절도 없음) | typed event |
| mode 결정 | LLM 자율 | deterministic policy table |

## 성공 지표

- **blast classification accuracy** — probe가 분류한 tier vs 실제 적용 후 깨진 caller 수
- **force-bypass rate** — turn 중 force-bypass된 비율. 너무 높으면 (>30%) tier threshold가 잘못 잡혔다는 신호.
- **downstream incident rate** per "small-tier-no-checklist" answer — 작은 변경이라 checklist 없이 코드만 줬는데 incident가 난 비율. 0%에 가까워야 함.
- **cross-team approval attach rate** — `cross_team` mode에서 사용자가 approval path를 실제로 클릭한 비율
- **redirect-to-planner conversion** — `refactor_redirect` 답변에서 사용자가 change-planner surface로 jump한 비율
- **probe latency p95** — 답변 첫 token까지의 추가 지연. <500ms 목표.

## 출시 순서

### Phase 1 — 2 modes, heuristic blast estimate

좁게 시작. 목표: chat-agent 답이 small/large 두 모드로 분기하기.

- intent classifier: keyword 기반 (rename, remove, change, deprecate 등)
- target extractor: regex로 backtick 안 symbol + 직전 mention된 file
- probe: `find_references` 결과의 caller 수만 — `change_impact_analysis`는 Phase 2
- mode policy: `caller ≤ 3 → direct`, 그 외 모두 `large` (medium 없음, cross_team 없음)
- ModeChip + RefactorRedirectCard 만 구현
- force-bypass 가능
- middleware ChatAgent에 prop으로 주입

### Phase 2 — 4 modes + cross-team

- `change_impact_analysis` 진짜 호출 (mock 백엔드 OK)
- medium tier 추가 → ChecklistInline 구현
- cross_team tier 추가 → Feature 05의 ApprovalPathCard 재사용
- intent classifier에 LLM-light fallback (keyword 못 잡은 케이스)
- BudgetContext 연동 — cost badge

### Phase 3 — middleware 확장 가능 + 캐시 layer

- `MessageMiddleware`를 다른 feature에서도 register 가능하도록 (e.g. "PII filter middleware", "deprecated API warning middleware")
- middleware chain 우선순위 정의 (blast > pii > deprecated 등)
- probeCache LRU + TTL — 같은 target에 대한 반복 probe를 줄임
- analytics dashboard hook (force-bypass / classification / latency)

## Frontend 구현계획

백엔드는 별도 트랙. 모든 phase를 frontend feature slice 단위로 풀어 쓴다.

### 0. 사전 정리 (모든 phase 공통)

- [src/features/](src/features/) 아래 새 슬라이스: `blast-aware-chat/{probe,mode-policy,ui-extensions,middleware}`
- ChatAgent.tsx에 prop 1개 추가 — 그 외 변경 금지
- chat-agent의 `model/suggestions.ts`는 손대지 않음

### Phase 1 — 2 modes, heuristic

#### 1.1 types — [src/features/blast-aware-chat/mode-policy/types.ts](src/features/blast-aware-chat/mode-policy/types.ts)

```ts
// branded id — chat-agent의 turn id와 혼용 방지
export type TurnId = string & { readonly __brand: 'TurnId' };
export type ProbeId = string & { readonly __brand: 'ProbeId' };

export type BlastTier = 'small' | 'medium' | 'large' | 'cross_team';
export type AnswerMode =
  | 'direct'
  | 'checklist'
  | 'refactor_redirect'
  | 'cross_team_gated';

export interface BlastProbe {
  id: ProbeId;
  target: { kind: 'symbol' | 'file' | 'config'; id: string; label: string };
  directCallers: number;
  transitiveCallers: number;
  ownerTeams: string[];          // length >= 1
  staleness: 'fresh' | 'stale' | 'unknown';
  whyPartial: 'none' | 'dispatch_overapprox' | 'index_stale' | 'analysis_truncated';
  tier: BlastTier;
  estimatedTokensSpent: number;  // BudgetContext에 보고
  probedAt: string;              // ISO
}

export interface AnswerContext {
  turnId: TurnId;
  userMessage: string;
  // chat-agent의 session msgs는 read-only로 받음 — middleware가 history를 변형하면 안 됨
  history: ReadonlyArray<{ role: 'user' | 'agent'; text: string }>;
}

export interface AnswerModeDecision {
  mode: AnswerMode;
  tier: BlastTier;
  probe: BlastProbe | null;      // null = probe 못 함 (intent 없음/예산 초과/실패)
  forced: boolean;               // force-bypass 결과인지
  // chat-agent가 mode대로 turn을 그리기 위한 메타데이터
  meta: {
    chipIcon: 'check' | 'list-checks' | 'shield-alert' | 'users' | 'alert-octagon' | 'help-circle';
    chipText: string;
    inlineSlots: Array<'checklist' | 'refactor_redirect' | 'approval_path'>;
  };
}

export interface MessageMiddleware {
  name: string;
  // null 반환 = 이 middleware는 이 turn에 관여하지 않음 (chat-agent가 원래대로 답함)
  beforeRespond(ctx: AnswerContext): Promise<AnswerModeDecision | null>;
}
```

- `AnswerModeDecision`은 **읽기 전용 메타데이터**다. chat-agent는 이걸 보고 답변을 어떻게 그릴지 결정한다 — 답 자체를 middleware가 만들지 않는다.
- `forced: true`인 decision은 항상 `mode: 'direct'` 여야 한다 (force-bypass의 정의).

#### 1.2 probe — [src/features/blast-aware-chat/probe/](src/features/blast-aware-chat/probe/)

- `intentClassifier.ts` — `classifyIntent(userMessage): 'change' | 'lookup' | 'unknown'`. Phase 1은 keyword regex.
  ```ts
  const CHANGE_KEYWORDS = /\b(rename|remove|delete|deprecate|change|modify|refactor|update.*signature)\b/i;
  ```
- `targetExtractor.ts` — `extractTarget(userMessage, history): { kind, id, label } | null`. Phase 1은 backtick + 직전 mention 휴리스틱.
- `probeBlast.ts` — `probeBlast(target): Promise<BlastProbe>`. Phase 1은 mock — caller count를 fixture에서 lookup. setTimeout으로 200–400ms 흘림.
- `probeCache.ts` — LRU(50) + TTL(5min). target.id 기준 key.

#### 1.3 mode policy — [src/features/blast-aware-chat/mode-policy/](src/features/blast-aware-chat/mode-policy/)

```ts
import type { BlastProbe, BlastTier, AnswerMode, AnswerModeDecision } from './types';

// 단일 진실원. 변경은 여기서만.
const TIER_RULES: ReadonlyArray<{ test: (p: BlastProbe) => boolean; tier: BlastTier }> = [
  { test: (p) => p.ownerTeams.length >= 2, tier: 'cross_team' },
  { test: (p) => p.directCallers >= 50 || p.transitiveCallers >= 200, tier: 'large' },
  { test: (p) => p.directCallers >= 4, tier: 'medium' },
  { test: () => true, tier: 'small' },
];

export function classifyTier(probe: BlastProbe): BlastTier {
  return TIER_RULES.find((r) => r.test(probe))!.tier;
}

const MODE_BY_TIER: Record<BlastTier, AnswerMode> = {
  small: 'direct',
  medium: 'checklist',
  large: 'refactor_redirect',
  cross_team: 'cross_team_gated',
};

export function decideMode(probe: BlastProbe, forced: boolean): AnswerModeDecision {
  if (forced) {
    return {
      mode: 'direct',
      tier: probe.tier,
      probe,
      forced: true,
      meta: {
        chipIcon: 'alert-octagon',
        chipText: `force-bypassed (${probe.tier} blast)`,
        inlineSlots: [],
      },
    };
  }
  const mode = MODE_BY_TIER[probe.tier];
  return {
    mode,
    tier: probe.tier,
    probe,
    forced: false,
    meta: buildMeta(probe.tier, mode),
  };
}
```

- Phase 1은 `medium` / `cross_team` rule을 정의하긴 하지만 fixture에서 절대 발생하지 않게 만들어 mode 자체는 small/large만 등장.
- `buildMeta`는 chip 아이콘/텍스트와 inline slot 목록을 생성. test 가능한 순수 함수.

#### 1.4 middleware — [src/features/blast-aware-chat/middleware/blastAwareMiddleware.ts](src/features/blast-aware-chat/middleware/blastAwareMiddleware.ts)

```ts
import type { MessageMiddleware, AnswerContext, AnswerModeDecision } from '../mode-policy/types';
import { classifyIntent } from '../probe/intentClassifier';
import { extractTarget } from '../probe/targetExtractor';
import { probeBlast } from '../probe/probeBlast';
import { probeCache } from '../probe/probeCache';
import { classifyTier, decideMode } from '../mode-policy/decideMode';

export const blastAwareMiddleware: MessageMiddleware = {
  name: 'blast-aware',
  async beforeRespond(ctx: AnswerContext): Promise<AnswerModeDecision | null> {
    if (classifyIntent(ctx.userMessage) !== 'change') return null;
    const target = extractTarget(ctx.userMessage, ctx.history);
    if (!target) return null;

    let probe = probeCache.get(target.id);
    if (!probe) {
      try {
        probe = await probeBlast(target);
        probe.tier = classifyTier(probe);
        probeCache.set(target.id, probe);
      } catch {
        return null; // probe 실패 → fallback to original chat behavior
      }
    }
    return decideMode(probe, /* forced */ false);
  },
};
```

- middleware는 **상태가 없다** (cache는 module-level). 같은 input에 같은 output.
- force-bypass는 middleware가 아닌 ChatAgent UI에서 trigger됨 — 사용자가 chip 옆 버튼 누르면 chat-agent가 같은 turn을 `forced=true`로 다시 호출.

#### 1.5 ui-extensions — [src/features/blast-aware-chat/ui-extensions/](src/features/blast-aware-chat/ui-extensions/)

- `ModeChip.tsx` — 아이콘 + 텍스트. `meta.chipIcon` switch. **left stripe 없음**. GlassCard 위 frosted pill.
- `RefactorRedirectCard.tsx` — large mode 본문. "이 변경은 caller N개에 영향을 줍니다. change-planner를 여세요." + CTA 버튼.
- `ProbeIndicator.tsx` — 200ms 이상 걸릴 때만 보이는 작은 spinner + "Probing blast...".
- `ForceBypassButton.tsx` — chip 옆 작은 ghost 버튼. 클릭 → chat-agent의 turn re-trigger callback.

#### 1.6 chat-agent에 1줄 prop 추가

- [src/features/chat-agent/ui/ChatAgent.tsx](src/features/chat-agent/ui/ChatAgent.tsx) 의 props에 `messageMiddleware?: MessageMiddleware[]` 추가.
- chat-agent의 turn 생성 hook에서 답변을 만들기 직전 한 줄:
  ```ts
  const decision = await runMiddlewareChain(messageMiddleware ?? [], ctx);
  ```
- decision이 있으면 mode chip / inline slot을 turn에 attach. 없으면 기존 동작.
- **코어 로직 (session 관리, scroll, suggestion preset, tab) 0줄 변경**.

#### 1.7 mount 위치

- AppProviders가 ChatAgent를 마운트하는 곳에서 `messageMiddleware={[blastAwareMiddleware]}` 주입.
- intelligence 라우트 외에서도 chat-agent는 글로벌 surface이므로 middleware도 글로벌. 단, intent classifier가 "change" 의도가 없으면 즉시 null 반환하므로 다른 라우트에서는 사실상 no-op.

#### Phase 1 완료 조건

- [ ] caller ≤ 3 질문 → 코드만 답변, chip 표시 없음 (또는 작은 small chip)
- [ ] caller ≥ 4 질문 → RefactorRedirectCard 표시, 코드 답 거절
- [ ] force-bypass 버튼 클릭 시 코드 답 + force-bypassed chip
- [ ] probe latency >200ms일 때만 ProbeIndicator 노출
- [ ] ChatAgent.tsx core diff: prop 1개 추가 + 1줄 호출만

---

### Phase 2 — 4 modes + cross-team

#### 2.1 medium mode

- `ChecklistInline.tsx` — `probe.directCallers` 데이터에서 top 5–8 caller 추출 (Phase 1의 mock fixture 확장)
- 답변 본문 + checklist 순서. checklist는 collapsed-by-default `<details>`.

#### 2.2 cross_team mode

- Feature 05 (ownership-routing)의 [src/features/ownership-routing/ui/ApprovalPathCard.tsx](src/features/ownership-routing/ui/ApprovalPathCard.tsx) 를 import해서 inline embed.
- 새 컴포넌트 만들지 말 것. 만약 ApprovalPathCard가 ownership context를 require한다면, blast-aware-chat은 그 context provider를 ChatAgent와 같은 레벨에서 mount하도록 한다 (= AppProviders 또는 chat-agent wrapper).
- payload: `{ targetSymbol, ownerTeams, suggestedApprovers }` — Feature 05 schema와 1:1 매칭.

#### 2.3 LLM intent classifier

- keyword 못 잡은 케이스를 위한 fallback. Phase 2는 mock으로 시작 (특정 패턴은 항상 'change'로 분류).
- 호출은 비싸므로 keyword가 명확하면 LLM 호출 skip — 비용 우선.

#### 2.4 BudgetContext 연동

- BudgetContext는 Feature 04에서 정의. blast-aware-chat은 그 컨텍스트를 import해서 probe 비용 보고.
- 임계치 초과 시 probe skip → fallback chip (`<HelpCircle/> blast unknown`).
- chip에 inline cost badge.

#### Phase 2 완료 조건

- [ ] 4개 mode 모두 등장하는 fixture 시나리오 존재
- [ ] cross_team mode가 ApprovalPathCard 제대로 embed
- [ ] LLM intent fallback이 keyword가 못 잡는 케이스 1개 이상 처리
- [ ] BudgetContext 한도 초과 시 fallback chip 노출

---

### Phase 3 — middleware 확장 + 캐시 + analytics

#### 3.1 middleware chain

- `runMiddlewareChain(middlewares, ctx)` — 우선순위 sort, 첫 non-null decision 채택.
- 다른 feature가 자기 middleware를 register할 수 있도록 export.
- 예: `piiFilterMiddleware`, `deprecatedApiMiddleware`. blast-aware는 그 중 하나.

#### 3.2 probe cache 정교화

- LRU + TTL + invalidation hook (인덱스 갱신 시 cache flush)
- 디버그 패널 (개발자 모드에서만): 현재 cache 내용 dump.

#### 3.3 analytics

- force-bypass 이벤트 firing
- mode classification 분포 차트 (개발용 surface — 사용자에게 노출 X)
- "small-tier-no-checklist" 답변 → 후속 incident 연결 (Feature 02 suspect commit과 연동 가능)

#### Phase 3 완료 조건

- [ ] 다른 middleware 1개 이상 register되어 chain 동작
- [ ] cache hit/miss 비율 측정 가능
- [ ] force-bypass event가 외부 sink로 빠짐

#### 3.4 force-bypass 흐름 상세

force-bypass는 단순한 "버튼 누르면 코드 줌"이 아니다. 다음 절차로 명시:

1. 사용자가 chip 옆 ForceBypassButton 클릭
2. ChatAgent가 같은 `userMessage`로 turn을 **재생성** — 단, middleware에는 `forceBypass: true` 힌트를 붙여 호출 (AnswerContext에 optional `forced?: boolean` 필드)
3. middleware는 cache된 probe를 그대로 쓰되 `decideMode(probe, /* forced */ true)` 호출
4. 결과 turn은 `mode: 'direct'` + `forced: true`. ModeChip은 `<AlertOctagon/>` + 원래 tier
5. 답변 본문은 LLM에게 다시 코드를 요청. **이전 turn은 지워지지 않는다** — refactor_redirect 답변이 위에 그대로 남아 있고, 그 아래 force-bypassed 답이 새 turn으로 추가됨
6. analytics event firing — `{ turnId, originalTier, probedAt, bypassedAt }`

이 흐름의 product point: 사용자가 "AI가 거절했다가 풀어줬다"는 history를 본인 chat session에서 본다. 단순히 toggle이 아니라 의식적 결정으로 느껴진다.

---

### 모듈 의존성 그래프

```
features/blast-aware-chat/probe        features/blast-aware-chat/mode-policy
                  ↑                                  ↑
                  └────── middleware ────────────────┘
                                ↑
                  features/blast-aware-chat/ui-extensions
                                ↑
                  features/chat-agent/ui/ChatAgent.tsx (← prop 1개 추가만)
                                ↑
                  app/providers/AppProviders.tsx (← middleware 주입)
```

cross-feature 참조 (Phase 2+):

- ownership-routing/ui/ApprovalPathCard ← blast-aware-chat/ui-extensions (cross_team mode)
- shared/budget (or features/investigation/model/BudgetContext) ← blast-aware-chat/probe (cost)

ChatAgent core는 이 그래프의 leaf consumer일 뿐이다 — middleware가 없어도 정상 동작.

### 손대지 않을 것

- [src/features/chat-agent/ui/ChatAgent.tsx](src/features/chat-agent/ui/ChatAgent.tsx) **core 로직** — prop 1개 + 호출 1줄만
- [src/features/chat-agent/model/suggestions.ts](src/features/chat-agent/model/suggestions.ts) — 4 preset 보존
- [src/features/chat-agent/ui/TokensPanel.tsx](src/features/chat-agent/ui/TokensPanel.tsx) — 손대지 않음
- admission-rules — 별도 도메인, 건드리지 않음
- 기존 ownership-routing UI — ApprovalPathCard import만, 그 내부 수정 X

### 백엔드 트랙과의 contract

frontend-backend boundary는 다음 함수 1개의 시그니처에 모인다.

```ts
probeBlast(target: { kind: 'symbol'|'file'|'config'; id: string; label: string }): Promise<BlastProbe>
```

- Phase 1은 fixture, Phase 2부터 진짜 backend 호출. schema가 같으면 swap 가능.
- `BlastProbe.tier`는 frontend의 `classifyTier`로 결정 — backend가 tier를 직접 반환하지 않는다 (정책이 frontend에 있으므로). backend는 raw counts만 준다.
- `MessageMiddleware` interface는 frontend-only — 백엔드가 알 필요 없음.

### 테스트 전략

- `policyTable` / `classifyTier` / `decideMode` — 순수 함수, unit test로 모든 분기 커버
- `intentClassifier` — keyword regex는 표 기반 spec test (입력/예상 분류 매트릭스)
- `probeCache` — TTL 만료, LRU eviction, invalidation hook unit test
- `blastAwareMiddleware` — integration test:
  - intent='lookup' → null 반환
  - intent='change' but target 추출 실패 → null
  - intent='change' + target → decision 반환
  - probe 실패 → null (chat-agent fallback)
- ChatAgent core는 테스트하지 않는다 — middleware prop만 mock으로 주입해서 turn 렌더링만 확인

### Edge cases (미리 박아둠)

- 사용자가 한 메시지에서 **여러 symbol을 변경**하려 함 → targetExtractor가 첫 번째 symbol만 추출. multi-target은 Phase 3 스코프 (각 symbol마다 probe → 가장 보수적인 mode 채택).
- **probe 진행 중 사용자가 질문을 추가로 입력** → ChatAgent의 입력 큐는 chat-agent core 책임. middleware는 새 turn마다 새로 호출됨. 이전 probe는 abandon (cache에는 남음).
- **force-bypass 후 같은 target에 대해 새 질문** → cache hit하므로 probe 다시 안 함. force flag는 turn-local이므로 새 질문은 다시 large mode로 시작.
- **targetExtractor가 너무 일반적인 단어를 잡음** ("config", "user") → blacklist + 길이 ≥ 3 + camelCase/snake_case heuristic으로 거름.
- **chat-agent의 suggestion preset이 trigger한 질문** → preset이 합성한 message text가 그대로 `userMessage`로 들어옴. middleware는 preset인지 모르고 동일하게 동작 — 의도된 행동 (preset도 결국 변경 요청이면 게이트되어야 함).

## Why Developers Will Care

이 기능이 잘 되면 챗 에이전트가 처음으로 "이 답을 적용하면 뭐가 일어나는지"를 알게 된다.

- 작은 변경: 기존처럼 빠르게 코드를 받음
- 큰 변경: 코드 대신 plan으로 redirect — 시간을 vs 미리 절약
- cross-team: approval path가 답에 같이 옴 — Slack ping할 사람을 찾으러 안 나감
- 무시하고 싶으면: force-bypass 한 번에 — 단, 그 결정이 기록됨

generic LLM agent는 답을 잘하지만 결과를 모른다. blast-aware chat은 답이 결과를 의식한다. 2026년 코드 생성이 commodity가 되면, 이 차이가 매일 사용하게 만든다.
