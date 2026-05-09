# Feature 04: AI Investigation Workspace

## One-liner
인텔리전스 페이지를 "맵 + 패널"에서 끝내지 않고, AI가 스스로 문맥을 모으고 근거를 붙여서 조사 업무를 수행하는 investigation workspace로 확장한다.

## Problem Statement

개발자는 문제를 풀 때 코드보다 문맥을 모으는 데 시간을 더 많이 쓴다.

- 관련 파일 찾기
- 정의/참조 확인
- 최근 PR 확인
- 오너 찾기
- 비슷한 incident 찾기
- 테스트 범위 확인

2026년 기준으로 AI 코딩 도구가 많아졌지만, 여전히 가장 답답한 순간은 이것이다.

"AI가 답은 길게 하는데, 내가 지금 뭘 믿어야 하는지 모르겠다."

그래서 필요한 것은 범용 채팅창이 아니라, 조사 문맥을 구조적으로 조립해주는 workspace다.

## Why This Matters

현재 `/intelligence`는 검색창, 맵, focus rail, 오버레이까지 있다.
이 위에 조사 워크플로를 얹으면 제품 포지션이 달라진다.

- before: 시각화 도구
- after: 조사/판단/수정의 시작점

특히 AI-native 시대에는 context gathering이 moat다.
답변 모델 성능 차이보다 "어떤 근거를 자동으로 가져왔는가"가 훨씬 중요하다.

## Moat

Sourcegraph Cody류는 code graph + context gathering을 이미 검증했다.
Cursor류는 background agent와 작업 loop를 검증했다.
"context gathering이 moat다"는 약한 주장이다 — 그건 이미 둘 다 한다.

우리 진짜 moat는 **typed evidence**다.

> We don't gather more context. We gather *typed* context — taint, proof,
> freshness, dispatch over-approx — that generic RAG can't fake.

구체적으로:

1. evidence가 free-text snippet이 아니라 **schema가 있는 typed payload**다.
   각 항목에 kind, source tool, confidence, staleness, why-partial이 박혀 있다.
2. taint, graph path, change impact, proof, index freshness를 모두 같은 조사 단위로 묶을 수 있다.
3. AI 출력이 "요약"이 아니라 "증거 기반 조사 노트"가 된다 — 결론, 근거, **unknown**, 액션이 포맷 단위로 강제된다.
4. 조사 결과가 바로 blast planner / suspect commit / refactor stack으로 이어진다.

즉, generic repo chat이 아니라 evidence-native repo investigator가 된다.

## 기술 배경

핵심 엔진 자산:

- `lexical_search`, `semantic_search`, `hybrid_search`
- `go_to_definition`, `find_references`, `document_symbols`
- `function_summary`, `graph_path`, `dependency_reasoning`
- `taint_flow`, `change_impact_analysis`, `proof_analysis`
- `index_status`, `incremental_analysis`
- `explain`

조사 워크스페이스는 최소 5개 context lane이 있어야 한다.

1. structural context
   - file, symbol, references, ownership
2. behavioral context
   - call path, dataflow, taint, impact
3. temporal context
   - recent changes, incidents, PRs
4. proof context
   - confidence, stale/fresh, why partial
5. action context
   - patch, test, assign, refactor

이걸 AI가 매번 수동으로 모으면 느리고 흔들린다.
따라서 context bundle abstraction이 필요하다.

추천 내부 단위:

- `InvestigationTarget`
- `ContextBundle`
- `EvidenceItem`
- `Hypothesis`
- `ActionRecommendation`

## 제안 기능

### 1. Investigation Notebook

선택한 파일/심볼/incident에 대해 조사 세션을 연다.

- 질문 목록
- 수집된 evidence
- hypothesis
- pending unknowns
- next actions

### 2. Agentic Context Gathering

사용자가 seed 하나만 주면 AI가 다음을 자동 수집:

- 관련 심볼
- strongest callers/callees
- 영향 테스트
- 최근 PR/incident
- owner/team
- docs mismatch
- stale analysis 여부

중요한 건 자동 수집 후 스스로 reflection loop를 도는 것.

### 3. Evidence-first Answering

답변은 항상 아래 4개 슬롯을 갖는다. **슬롯이 비면 답변을 못 내보낸다** — 특히 unknown은 비어 있을 수 없다 (없으면 명시적으로 "no known unknowns"로 채운다).

- 결론
- 핵심 근거 3개 (각각 EvidenceItem 참조)
- **반증 또는 unknown** (필수 슬롯, 비울 수 없음)
- 추천 액션 (최소 1개)

unknown을 강제 슬롯으로 올리는 게 이 feature의 product value다. Cody/Cursor가 못 하는 거고, 정적 분석만 정확히 알 수 있다 (`stale`, `dispatch overapprox`, `runtime missing`).

이 형식이 없으면 조사 결과가 "그럴듯한 말"처럼 느껴진다.

### 4. Background Investigation Jobs

긴 질의는 백그라운드 분석으로 넘긴다.

- full taint path
- whole-repo blast
- runtime correlation
- refactor plan synthesis

intermediate 상태를 보여줘야 한다.

- queued
- partial
- stale
- completed

## AI-native 설계

이 기능은 그냥 챗봇을 붙이는 게 아니다.

AI-native 조건:

1. 사용자가 파일을 고르지 않아도 seed localization을 해줘야 함
2. 필요한 context를 먼저 수집한 뒤 대답해야 함
3. 근거 부족 시 `unknown`을 말해야 함
4. 조사 결과를 바로 action으로 연결해야 함

좋은 흐름:

- "왜 이 노드가 위험해?"
- AI가 hotspot, ownership, temporal coupling, blast 자료 자동 수집
- evidence strip으로 보여줌
- "다음으로 무엇을 열어볼까?"까지 제안

즉 채팅창이 아니라 context-orchestrated investigator여야 한다.

## 리팩토링 / 아키텍처 영향

필수적으로 분리해야 할 것:

1. chat UI와 investigation model 분리
2. tool invocation log와 user-facing evidence 분리
3. context selection policy를 독립 모듈화
4. answer rendering과 action rendering 분리

필요한 새 계층 (frontend feature slice):

- `features/investigation/model` — InvestigationTarget, ContextBundle, EvidenceItem, Hypothesis, ActionRecommendation 타입과 store
- `features/investigation/planner` — seed → bundle 자동 수집 정책 (mock first; backend 별도)
- `features/investigation/evidence` — EvidenceCard, EvidenceStrip, UnknownTag 등 렌더링 primitives
- `features/investigation/jobs` — background job state (queued/partial/stale/completed) — UI 전용

### ChatAgent와의 경계 (결정)

Investigation은 ChatAgent의 **다른 모드가 아니라 다른 surface**다. 한 화면에서 토글로 바꾸지 않는다.

- `features/chat-agent`는 그대로 유지된다 — 가벼운 lookup, 자유 형식 대화, suggestion preset 4개.
- `features/investigation`은 새로운 surface로 시작한다 — 입구가 다르다 (focus stack의 "Investigate" CTA, 또는 `/intelligence` 우상단의 별도 진입점).
- session/thread 객체는 공유하지 않는다. investigation은 InvestigationTarget을 root로 하는 별도 store.
- 단, 같은 token/cost meter (`features/chat-agent/model/TokensContext`)는 재사용한다 — 둘 다 같은 LLM 예산을 쓴다.

이 경계가 흐려지면 ChatAgent가 다시 god component로 자란다 (현재 [src/features/chat-agent/ui/ChatAgent.tsx](src/features/chat-agent/ui/ChatAgent.tsx) 747줄). investigation은 처음부터 별도로 자란다.

## UI/UX 코멘트

1. 조사 패널은 일반 채팅창처럼 보이면 안 된다.
   메시지 로그보다 evidence cards와 hypothesis blocks 중심이어야 한다.

2. evidence strip이 필요하다.
   답변 문장보다 "이 답이 어디서 나왔는지"를 먼저 훑게 해야 한다.

3. unknown을 당당히 보여줘야 한다.
   "runtime context missing", "analysis stale", "dispatch overapprox" 같은 태그가 필수다.

4. 노트북식 구조가 좋다.

- Question
- Findings
- Evidence
- Actions

5. 액션 버튼은 답변 아래에 붙여야 한다.

- open focus
- run deep scan
- create fix task
- assign owner

## 검증된 외부 패턴과 차이점

검증된 패턴:

- Sourcegraph code graph context
- agentic context gathering
- background agent workflow

우리가 더 가야 하는 부분:

- proof/evidence schema
- static analysis native context bundles
- action handoff into fix / refactor / routing

## 성공 지표

- 질문당 수동 파일 열람 수 감소
- first useful answer latency
- answer 후 action click-through
- evidence-backed answer acceptance rate

## 출시 순서

### Phase 1 — Evidence schema + first answer surface
범위를 좁힌다. 목표: **하나의 질문 유형**("왜 이 노드가 위험해?")에 evidence-first 답변이 나오는 것.

- EvidenceItem schema 확정 (kind, source tool, confidence, staleness, payload, why-partial)
- 단일 질문 유형 end-to-end: focus stack → Investigate CTA → ContextBundle 자동 수집 (mock) → 4슬롯 답변
- 답변 surface: evidence strip + 결론 + unknown tag + 액션 버튼 (단순 1개: open focus)

### Phase 2 — Notebook + 추가 질문 유형 + 추가 액션

- Investigation Notebook UI (Question / Findings / Evidence / Actions 4구역)
- 질문 유형 확장: "이 변경의 blast는?" / "이 incident의 suspect는?"
- 액션 확장: run deep scan, create fix task, assign owner
- background investigation jobs UI (queued/partial/stale/completed) — 잡 큐는 mock state

### Phase 3 — Planner + similarity + handoff

- multi-hop investigation planner (reflection loop UI)
- similar incident / similar code recall
- investigation-to-fix pipeline 연결 (Feature 06과 wiring)
- autonomous follow-up questions ("다음으로 무엇을 열어볼까?")

## Frontend 구현계획 (백엔드 제외)

백엔드는 별도 트랙. 이 섹션은 모든 phase를 frontend feature slice 단위로 풀어 쓴다. mock data는 `entities/` 레벨의 fixtures로 둔다 — 추후 실제 분석 엔진 응답으로 교체할 때 schema만 매칭되면 된다.

### 0. 사전 정리 (모든 phase 공통)

- [src/features/](src/features/) 아래 새 슬라이스 4개 생성: `investigation/{model,planner,evidence,jobs}`
- [src/entities/](src/entities/) 아래 `investigation` entity 추가 — InvestigationTarget / ContextBundle / EvidenceItem / Hypothesis / ActionRecommendation 타입과 fixture
- `features/chat-agent`는 손대지 않는다. 단, `TokensContext`는 export로 노출되어 있어 investigation에서도 import 해서 cost meter 공유

### Phase 1 — Evidence schema + 단일 질문 답변

#### 1.1 entity 정의 — [src/entities/investigation/](src/entities/investigation/)

- `model/types.ts` — 핵심 타입
  - `EvidenceKind = 'symbol' | 'caller' | 'callee' | 'recent_change' | 'owner' | 'taint_path' | 'test_coverage' | 'incident'`
  - `Confidence = 'high' | 'medium' | 'low' | 'unknown'`
  - `Staleness = 'fresh' | 'stale' | 'unknown'`
  - `WhyPartial = 'dispatch_overapprox' | 'runtime_missing' | 'index_stale' | 'analysis_truncated' | null`
  - `EvidenceItem = { id, kind, sourceTool, confidence, staleness, whyPartial, payload, summary }` (payload는 kind별 discriminated union)
  - `InvestigationTarget = { kind: 'file'|'symbol'|'incident', id, label }`
  - `ContextBundle = { id, target, evidence: EvidenceItem[], gatheredAt, status: 'gathering'|'partial'|'complete' }`
  - `Hypothesis = { id, statement, supporting: EvidenceId[], refuting: EvidenceId[] }`
  - `ActionRecommendation = { id, kind: 'open_focus'|'run_deep_scan'|'create_fix_task'|'assign_owner', label, payload }`
  - `InvestigationAnswer = { conclusion, evidence: EvidenceId[3], unknowns: UnknownTag[], actions: ActionRecommendation[] }` ← unknowns는 빈 배열 금지 (린트 또는 런타임 assertion으로 강제)
- `model/fixtures.ts` — Phase 1 demo용 mock bundle (file.id 한두 개)
- `index.ts` export

#### 1.2 store + planner — [src/features/investigation/model/](src/features/investigation/model/)

- `InvestigationContext.tsx` — provider + hook (`useInvestigation`)
  - state: `{ activeTarget, bundle, answer, status }`
  - actions: `start(target)`, `cancel()`, `regenerate()`
- `planner.ts` — `gatherContext(target): Promise<ContextBundle>` — Phase 1은 mock fixtures를 setTimeout으로 흘려서 gathering → partial → complete 상태 전이만 구현. 실제 백엔드 호출 시그니처만 비워둠 (TODO comment).
- `answerComposer.ts` — bundle → InvestigationAnswer. Phase 1은 결론/근거 3/unknown/액션 1을 fixture에서 골라 채우는 deterministic 합성기. 답변 슬롯 채움 검증은 여기서 throw.

#### 1.3 evidence rendering — [src/features/investigation/evidence/](src/features/investigation/evidence/)

- `EvidenceCard.tsx` — kind별 아이콘, source tool 배지, confidence dot, staleness pill
  - **left stripe 절대 금지** (memory rule)
  - GlassCard 위에서 동작 (memory rule: backdrop-filter 부모 transform 주의)
- `EvidenceStrip.tsx` — 답변 위에 가로로 evidence 3개를 띄우는 thin row. 클릭 → 카드 expand
- `UnknownTag.tsx` — `runtime_missing` 등 라벨이 있는 작은 pill
- `ConfidenceDot.tsx`, `StalenessPill.tsx` — primitives
- `AnswerView.tsx` — 4슬롯 layout (Conclusion / EvidenceStrip / Unknowns / Actions). 슬롯 누락 시 dev console warn.

#### 1.4 surface 진입점 — [src/features/investigation/ui/](src/features/investigation/ui/)

- `InvestigatePanel.tsx` — 우측 또는 모달 surface (Phase 1은 우측 슬라이드아웃이 가장 마찰 적음). FocusScanStack 옆에 stack되거나 그것을 push하는 형태
- `InvestigateCTA.tsx` — focus stack item 위에 "Investigate" 버튼. 클릭 → `start(target)` 호출 + InvestigatePanel 오픈
- [src/features/inspect-target/](src/features/inspect-target/)에 CTA 슬롯 추가 (props로 주입; inspect-target 자체는 investigation을 모름)

#### 1.5 라우팅 / providers

- [src/app/providers/AppProviders.tsx](src/app/providers/AppProviders.tsx)에 `<InvestigationProvider>` 추가 (TokensProvider 안쪽)
- `IntelligenceLayout.tsx`에 `InvestigatePanel`을 lazy import로 마운트

#### 1.6 액션 wiring

- `open_focus` 액션 — `useStack().open(...)` 호출 (이미 [src/features/inspect-target/](src/features/inspect-target/)에 있음)
- 나머지 3개 액션 (`run_deep_scan`, `create_fix_task`, `assign_owner`)은 Phase 1에서 disabled 버튼으로만 노출

#### 1.7 스타일 가드 (memory rules 반영)

- 좌측 컬러 stripe 사용 금지 — 모든 evidence card에 적용
- glassmorphism 유지 (alpha 0.3–0.45 dark / 0.5–0.7 light)
- InspectPanel과 surface가 비슷해지면 같은 GlassCard 모듈 사용

#### Phase 1 완료 조건

- [ ] focus stack의 file item에서 "Investigate" 클릭 시 우측 패널 오픈
- [ ] gathering → partial → complete 상태 전이가 fixture 기반으로 시각화됨
- [ ] 4슬롯 답변이 렌더링되고, unknowns 슬롯이 항상 채워짐
- [ ] open_focus 액션 클릭이 실제 stack 동작과 wiring됨
- [ ] cost meter (TokensContext) 가 fixture 호출 1회당 mock token을 소비

---

### Phase 2 — Notebook + 추가 질문 유형 + jobs

#### 2.1 Notebook UI — [src/features/investigation/ui/Notebook/](src/features/investigation/ui/Notebook/)

- `Notebook.tsx` — 4구역 layout (Question / Findings / Evidence / Actions)
- `QuestionList.tsx` — 한 investigation 안의 다중 question 누적
- `FindingsBlock.tsx` — answer 본문 (Phase 1의 AnswerView를 embed)
- `HypothesisBlock.tsx` — supporting/refuting evidence 연결 UI
- `PendingUnknownsBlock.tsx` — 아직 답 못 한 unknown들을 follow-up question 후보로 변환

#### 2.2 질문 유형 확장 — [src/features/investigation/planner/](src/features/investigation/planner/)

- `questionTypes.ts` — `'why_risky' | 'blast_of_change' | 'incident_suspect'` 타입 enum
- 각 타입별 evidence kind 우선순위 정책 (예: blast_of_change → callers/callees + recent_change)
- `gatherContext(target, questionType)`로 시그니처 확장

#### 2.3 액션 확장

- `run_deep_scan` — `features/investigation/jobs`에 새 job 등록
- `create_fix_task` — Feature 06 (verified-fix-pipeline) 진입점 hook (Phase 3에서 실제 wiring; 여기서는 placeholder route)
- `assign_owner` — Feature 05 (ownership-routing) hook

#### 2.4 background jobs — [src/features/investigation/jobs/](src/features/investigation/jobs/)

- `JobsContext.tsx` — `{ jobs: Job[], enqueue, cancel }`
- `Job = { id, kind, status: 'queued'|'running'|'partial'|'stale'|'completed', startedAt, target }`
- `JobsTray.tsx` — 화면 우하단에 살짝 떠 있는 tray (chat-agent 위치와 충돌 안 나는 위치). 잡이 0개면 숨김.
- 상태 전이는 mock setInterval; 실제 스케줄러는 백엔드 트랙에서 붙임

#### Phase 2 완료 조건

- [ ] notebook에 다중 question 누적 가능
- [ ] 3가지 질문 유형 모두 evidence-first 답변이 나옴
- [ ] jobs tray가 deep scan 실행 시 partial → completed 까지 표시
- [ ] hypothesis block에서 evidence 토글 시 supporting/refuting 시각화

---

### Phase 3 — Planner + similarity + fix handoff

#### 3.1 multi-hop planner UI — [src/features/investigation/planner/](src/features/investigation/planner/)

- `PlannerTrace.tsx` — reflection loop의 step list (step → evidence → next-question). expandable
- `PlannerStep = { question, gathered: EvidenceItem[], conclusion, nextQuestion? }`
- `runPlanner(target)` — Phase 3은 결정론적 chain (step1 → step2 → step3)으로 시작. 실제 LLM 통합은 백엔드 트랙.

#### 3.2 similarity recall — [src/features/investigation/evidence/](src/features/investigation/evidence/)

- `SimilarIncidentCard.tsx` / `SimilarCodeCard.tsx` — evidence kind에 `'similar_incident'`, `'similar_code'` 추가
- `entities/investigation/fixtures.ts`에 demo similarity row 추가

#### 3.3 follow-up questions

- `FollowUpStrip.tsx` — answer 하단에 "다음으로 무엇을 열어볼까?" 후보 3개. 클릭 → notebook에 새 question으로 push
- 후보 generation은 pending unknowns + planner step 결과에서 deterministic하게 합성

#### 3.4 fix pipeline handoff

- Feature 06 (verified-fix-pipeline)이 만든 surface로 `create_fix_task` 액션 라우팅
- payload: `{ target, evidence: EvidenceItem[], hypothesis }` — fix pipeline이 같은 evidence를 재사용하도록 schema 일치 보장

#### 3.5 polish

- empty state, error state, cancellation, keyboard nav (notebook 안에서 j/k로 question 이동)
- accessibility pass (aria labels on evidence cards, role="region" on notebook sections)

#### Phase 3 완료 조건

- [ ] planner trace가 reflection loop 형태로 시각화
- [ ] similar incident / code 카드가 같은 EvidenceCard 컴포넌트로 렌더
- [ ] follow-up question 클릭 시 새 질문이 자동으로 시작됨
- [ ] create_fix_task가 Feature 06 surface로 evidence와 함께 점프

---

### 모듈 의존성 그래프

```
entities/investigation
  ↑
features/investigation/model         ← TokensContext (chat-agent에서 share)
  ↑                ↑
  evidence         planner
  ↑                ↑
  ui/InvestigatePanel + Notebook + JobsTray
  ↑
app/providers + IntelligenceLayout
```

ChatAgent는 이 그래프 밖이다. 둘은 TokensContext만 공유한다.

### 손대지 않을 것

- [src/features/chat-agent/](src/features/chat-agent/) — 그대로 둔다
- [src/features/inspect-target/](src/features/inspect-target/) — CTA 슬롯 prop 1개만 추가
- 기존 stage / overlay / filter 슬라이스 — 액션 wiring으로만 호출

### 백엔드 트랙과의 contract

- `EvidenceItem`, `ContextBundle`, `InvestigationAnswer` schema가 frontend-backend boundary
- planner mock의 함수 시그니처가 그대로 백엔드 호출로 교체될 수 있도록 `gatherContext` / `runPlanner`만 swap point
- 모든 fixture는 [src/entities/investigation/model/fixtures.ts](src/entities/investigation/model/fixtures.ts) 한 곳에 모아두고, 백엔드 붙으면 이 파일만 dead code화

## Why Developers Will Care

이 기능이 잘 되면 개발자는 "질문을 잘하는 법"을 고민하지 않아도 된다.
seed만 던지면 시스템이 알아서 근거를 모아오고, 믿을 수 있는 답과 다음 액션을 준다.
이게 AI 시대의 진짜 productivity jump다.
