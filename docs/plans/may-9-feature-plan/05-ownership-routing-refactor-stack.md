# Feature 05: Ownership Routing + Refactor Stack Planner

## One-liner
문제가 보였을 때 "누가 맡아야 하고", "어떻게 작은 단위로 쪼개서 안전하게 넣을지"까지 제안하는 조직 실행 레이어.

## Problem Statement

좋은 분석 결과가 있어도 실제 조직에서는 여기서 막힌다.

- 누구를 호출해야 하지?
- 이건 어느 팀 소관이지?
- 한 PR로 넣어도 되나?
- 리팩토링이면 어떤 순서로 나눠야 하지?
- 리뷰어는 누구를 태워야 하지?

즉, 분석의 마지막 병목은 기술이 아니라 라우팅과 착지 전략이다.

Sentry의 ownership, CODEOWNERS, Graphite의 stacked diff는 각각 이 문제의 일부를 푼다.
우리는 이걸 인텔리전스 맵 안으로 끌고 와야 한다.

## Why This Matters

`/intelligence`가 정말 daily driver가 되려면:

- 발견
- 조사
- 수정
- 리뷰/배포

전 구간을 닫아야 한다.

현재 인텔리전스는 발견/조사까지는 갈 수 있지만,
"그래서 누가, 어떤 단위로, 어떤 순서로 가져갈 것인가"는 약하다.

이 기능이 들어가면 맵이 planning board처럼 동작하기 시작한다.

## Moat

ownership만 있으면 commodity고,
stacked diff만 있어도 commodity다.

우리 moat는 다음 조합이다.

1. ownership을 file path가 아니라 dependency / impact / incident 기준으로 계산
2. refactor stack을 단순 커밋 분할이 아니라 blast radius와 proof obligation으로 설계
3. reviewer routing을 code owner + hotspot familiarity + recent incident expertise로 최적화
4. AI가 그 결과를 바로 draft stack / task list / PR plan으로 연결

즉 "누가 담당인가"를 넘어서 "누가 어떤 순서로 나눠 가져가면 제일 안전한가"까지 답한다.

## 기술 배경

핵심 자산:

- `project_model`, `import_graph`, `call_graph`
- `change_impact_analysis`
- `rename_preview`, `code_actions`
- `behavior_diff`
- git history / CODEOWNERS / review history / incident resolution history
- `function_summary`, `explain`

ownership 모델은 최소 4층이어야 한다.

1. declared ownership
   - CODEOWNERS, team mapping
2. historical ownership
   - 최근 변경량, review participation
3. expertise ownership
   - incident fix history, hotspot familiarity
4. impact ownership
   - 이번 변경으로 실제 영향을 받는 경계의 owner

refactor stack planner는 최소 아래 입력을 받아야 한다.

- impact graph
- coupling cluster
- safe seam candidates
- required proof obligations
- reviewer/load constraints

단, 초기 버전은 위 5개를 다 갖추려 하면 막힌다.
**Phase 2에서는 coupling cluster + blast radius 두 가지만으로 stack을 제안하고,
safe seam / proof obligation은 텍스트 슬롯으로 비워둔 채 시작한다.**
proof obligation 자체가 별도 R&D 영역이라 stack planner 출시를 가로막게 두면 안 된다.

### Ownership 데이터 freshness

historical / expertise ownership은 빠르게 stale된다 (퇴사, 팀 이동, 조직개편).
freshness 모델 없이 출시하면 데모는 좋고 실제 쓰면 죽은 사람을 추천하는 사고가 난다.

최소 정책:

- last-touched 컷오프: 최근 N개월 (default 6) 이내 활동만 ownership 후보
- decay weighting: 최근일수록 가중치 ↑, 12개월 넘은 활동은 거의 0
- inactive flag: 90일 이상 commit/review 0이면 후보에서 제외하고 backup만 노출
- team mapping은 외부 소스(HRIS or 수동 yaml)로 갱신 가능해야 함

### 진입 동선

이 기능은 별도 화면이 아니라 기존 인텔리전스 흐름에 박혀야 한다.

- hotspot 카드 우측 → "Who should take this?" 버튼
- incident detail → "Routing" 탭
- focus panel의 file/symbol 컨텍스트 메뉴 → "Show owners"
- refactor seed (rename preview, large change impact) → 자동으로 stack planner suggestion 띄움

새 라우트(`/intelligence/ownership` 같은)는 **만들지 않는다**.
"발견 → 라우팅"이 같은 화면에서 이어져야 가치가 산다.

## 제안 기능

### 1. Ownership Heat Layer

맵에서 보이게 해야 한다.

- orphan zone
- single-owner dependency
- cross-team hotspot
- review bottleneck zone

이건 단순 사람 이름 태그보다 훨씬 가치 있다.

### 2. Smart Routing Card

특정 hotspot / incident / refactor seed를 선택하면:

- primary owner
- backup owner
- recommended reviewer
- escalation target
- routing confidence

를 보여준다.

### 3. Refactor Stack Planner

리팩토링/대규모 수정 시 다음을 자동 제안:

1. prep PR
2. adapter / compatibility PR
3. caller migration PR
4. dead path cleanup PR
5. verification / policy gate PR

각 step마다:

- goal
- touched modules
- expected blast radius
- required checks
- suggested reviewer

를 붙인다.

### 4. Merge Strategy Recommendation

Graphite 스타일의 stacked workflow를 제품 안에서 제안한다.

- split now
- keep as one PR
- land bottom-up
- parallelizable pieces
- risky serialization point

## AI-native 설계

AI가 이 기능에서 해야 하는 일:

1. ownership ambiguity를 설명
2. reviewer와 implementer를 구분
3. 큰 변경을 stack으로 분해
4. 각 stack의 목적과 exit criteria를 적어줌

좋은 출력:

- "이번 변경은 결제팀 ownership이지만, 실제 영향은 auth guard와 shared policy engine까지 번집니다. 구현자는 결제팀, reviewer는 플랫폼팀이 적합합니다."
- "한 PR로 가면 review diff가 너무 큽니다. adapter -> callsite migration -> cleanup의 3-stack이 안전합니다."

즉 AI는 단순 assign bot이 아니라 landing planner여야 한다.

## 리팩토링 / 아키텍처 영향

필수 분리:

1. ownership graph model
2. routing policy
3. stack planner
4. reviewer recommendation engine

추천 내부 모듈:

- `ownership/model`
- `ownership/scoring`
- `routing/policy`
- `stack-planner/model`
- `stack-planner/render`

이 기능은 PR/issue/tool integration이 많아서 UI에서 직접 계산하면 안 된다.
도메인 레이어로 강하게 빼야 한다.

## UI/UX 코멘트

1. ownership은 사람 얼굴 나열로 끝나면 안 된다.
   위험한 ownership 상태를 시각화해야 한다.

- orphan
- overloaded
- fragmented
- siloed

2. stack planner는 checklist처럼 보여야 한다.
   장문의 설명보다 stepper + risk badge가 맞다.

3. reviewer 추천은 "왜 이 사람인지"를 보여줘야 한다.

- touched area familiarity
- recent reviewer
- incident resolver

4. implementation owner와 approval owner를 분리해서 보여주는 게 좋다.
   대규모 조직일수록 이 차이가 크다.

5. drag-and-drop stack reorder는 나중 문제다.
   초기에는 "추천 순서 + 이유"만 있어도 충분히 가치 있다.

## 검증된 외부 패턴과 차이점

검증된 패턴:

- CODEOWNERS / issue ownership
- Graphite stacked diffs
- merge when ready / reviewer automation

우리가 더 갈 부분:

- blast-aware stack planning
- incident/history-aware reviewer recommendation
- AI-authored stack rationale

## 성공 지표

### 단기 (빌드 중 방향 검증용 — leading)

- suggested reviewer가 실제로 reviewer로 assigned된 비율 (target ≥ 50%)
- stack 제안 채택률 (사용자가 제안된 split 그대로 받아들인 PR 비율)
- impact ownership 추천이 declared owner와 다를 때 사용자가 impact 쪽을 택한 비율
- routing card 노출 → 클릭 전환률
- ownership freshness alert (stale 추천을 사용자가 reject한 횟수)

### 장기 (조직 효과 — lagging)

- owner assignment latency
- reviewer reassignment 감소
- large refactor의 average PR size 감소
- stack-based landing success rate
- cross-team surprise regression 감소

## 출시 순서

> Phase 1이 commodity 구간에 머무르면 데모 첫 인상이 "또 다른 CODEOWNERS UI"로 보인다.
> 그래서 **impact ownership을 Phase 1에 끌어올리고, AI landing planner 수동 버전은 Phase 2로 당긴다.**
> Phase 1부터 "이 변경은 결제팀 owner지만 실제 blast는 auth까지 갑니다" 한 줄이 나와야 한다.

### Phase 1 — "왜 이 사람인지가 보이는 routing"

- ownership heat (orphan / overloaded / fragmented / siloed)
- primary/backup owner with **freshness flag**
- **impact ownership** (commodity와 차별되는 핵심 hook)
- reviewer suggestion + **routing confidence breakdown**
  - 왜 이 사람인지 근거(touched area familiarity / recent reviewer / incident resolver)를
    같이 묶지 않으면 신뢰가 안 붙음. confidence를 Phase 2로 미루지 않는다.
- implementation owner ≠ approval owner 분리 표시

### Phase 2 — "stack으로 쪼개주는 planner"

- stack planner (coupling cluster + blast radius 입력 두 가지로 시작)
- merge strategy recommendation
- cross-team hotspot detection
- **AI landing plan (수동 트리거 버전)**
  - 사용자가 "plan this refactor" 버튼을 눌렀을 때 stack rationale + reviewer per step 출력
  - 자동화는 아직 안 함. 하지만 narrative상 Phase 3까지 묻어두면 안 됨

### Phase 3 — "자동화와 정책"

- AI auto-draft task/PR stack (사용자 트리거 없이 hotspot에서 자동 제안)
- approval path recommendation
- proof obligation을 stack planner 입력으로 정식 편입
- safe seam candidate 자동 추출

## Why Developers Will Care

분석이 좋아도 실제로 조직에 넣는 단계에서 매번 막히면 제품이 습관이 안 된다.
이 기능은 "알았다"를 "움직일 수 있다"로 바꾼다.
리더, 시니어, 리뷰어가 특히 좋아할 기능이다.
