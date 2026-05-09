# Feature 03: Blast Radius + Safe Change Planner

## One-liner
개발자가 코드를 바꾸기 전에 "뭐가 깨질지"와 "어떻게 안전하게 나눠서 바꿀지"를 보여주는 핵심 기능.

## Problem Statement

리팩토링, 버그 수정, API 변경, 성능 개선 모두 공통 문제가 있다.

- 영향 범위를 정확히 모른다.
- 테스트를 어디까지 돌려야 하는지 모른다.
- 한 PR로 내도 되는지, stack으로 나눠야 하는지 모른다.

지금 시장에는 change impact, test impact, code owners, autofix가 각각 따로 있다.
하지만 개발자가 실제로 원하는 것은 하나다.

"이 변경을 안전하게 착지시키는 계획"

즉 blast radius는 visualization이 아니라 planning primitive여야 한다.

## Why This Matters

인텔리전스 페이지가 진짜 돈 되는 순간은 다음 질문에 답할 때다.

- 이 함수 시그니처 바꾸면 어디까지 번지나
- 이 config key 바꾸면 어떤 route / service / test / runtime path가 영향받나
- 이 파일을 나눌 때 먼저 잘라야 하는 seam이 어디냐
- 이 변경을 1개 PR로 내면 위험한가

2026년엔 AI가 코드를 더 빨리 쓰게 한다.
그래서 오히려 "안전하게 바꾸는 법"의 가치가 더 커진다.

## Moat

blast radius 기능은 흔하다. moat는 "정확한 영향 경로 + 실행 가능한 계획"이다.

우리의 강점:

1. import graph 수준이 아니라 `call_graph`, `dataflow`, `program_dependence`, `points_to`, `typestate`까지 동원 가능
2. `rename_preview`, `code_actions`, `query_change_impact` 같은 refactor surface가 이미 있음
3. `proof_analysis`, `explain`, `index_status`로 confidence / freshness를 같이 노출 가능
4. 나중에 AI patch와 검증 플랜까지 한 덩어리로 연결 가능

즉, 남들이 "affected files"를 보여줄 때 우리는 "추천 변경 순서와 필요한 검증"까지 낸다.

## 기술 배경

핵심 엔진 자산:

- `call_graph`
- `dataflow`, `slice`, `dfg`, `program_dependence`
- `points_to`, `pta_precise`
- `typestate_analysis`
- `change_impact_analysis`, `behavior_diff`
- `rename_preview`, `code_actions`
- `proof_analysis`, `explain`

blast radius는 최소 4개 레이어로 나눠야 한다.

1. structural impact
   - import, references, downstream callers
2. behavioral impact
   - control/dataflow, exception path, async chain
3. verification impact
   - affected tests, missing tests, proof gap
4. delivery impact
   - owners, rollout risk, rollback ease

중요한 점:
정확히 모르는 영역을 "0 영향"처럼 보이면 안 된다.

필수 상태:

- exact
- overapprox
- unknown

## 제안 기능

### 1. Change Seed Panel

seed는 아래로 시작 가능해야 한다.

- file
- symbol
- route
- API
- config key
- diff hunk / PR

### 2. Blast Radius Map

맵에서 ring 또는 path 형태로 보여준다.

- L1: direct references
- L2: transitive impact
- L3: likely runtime / config / test impact

색 의미:

- solid: exact/static strong
- dashed: inferred/transitive
- faded: possible but weak

### 3. Safe Change Planner

단순 영향 목록이 아니라 plan을 생성한다.

- recommended order
- safe seams
- PR split suggestion
- must-run checks
- risky unknowns

예:

1. rename preview 먼저
2. adapter 추가
3. callsite migration
4. dead path cleanup
5. contract test rerun

### 4. Proof Obligations

이게 진짜 차별점이다.

- 어떤 테스트가 꼭 필요하나
- 타입/린트만으로 충분한가
- runtime trace가 필요한가
- human review가 필요한 경계는 어디인가

## AI-native 설계

AI가 이 기능 위에서 해야 하는 일:

1. 변경 계획 생성
2. 위험 seam 설명
3. 작은 PR stack 제안
4. 검증 checklist 생성
5. 수정 후 재계산

좋은 AI-native 경험은 이런 흐름이다.

- 개발자: "auth/session rename 하고 싶음"
- 시스템: blast radius 계산
- AI: 4-step migration plan 제안
- 개발자: step 1만 실행
- 시스템: 남은 radius 재계산

즉 analysis가 일회성 리포트가 아니라 interactive planning loop여야 한다.

## 리팩토링 / 아키텍처 영향

필수 모듈 분리:

1. `seed selection`
2. `impact graph builder`
3. `confidence model`
4. `planner`
5. `verification obligations`

현재 인텔리전스 구조 기준으로는:

- `Stage`는 시각화 표면만 담당
- `FocusScan`은 evidence panel
- 새로 `change-planner` 도메인 레이어 필요

특히 planner는 UI에서 if/else로 만들면 안 된다.
추후 AI planner, static planner, hybrid planner가 교체 가능해야 한다.

## UI/UX 코멘트

1. blast radius는 시각적으로 크다고 무조건 나쁜 것처럼 보이면 안 된다.
   public API 변경은 반경이 넓은 게 정상일 수 있다.

2. "위험"과 "넓음"을 분리해서 보여줘야 한다.

- radius size
- confidence
- risk
- verification cost

3. 카드 하나에 아래 4개를 항상 같이 보여줘야 한다.

- impacted nodes
- unknowns
- required checks
- suggested split

4. focus panel은 두 탭으로 나누는 게 좋다.

- Impact
- Plan

5. hover 상태에서는 요약만.
   실제 plan은 클릭 후 panel에서 읽게 해야 한다.

## 검증된 외부 패턴과 차이점

검증된 패턴:

- GitHub rename preview / code actions
- Sourcegraph식 graph context
- change impact analyzers

우리가 더 가야 하는 부분:

- verification obligations
- PR stack planning
- unknown zone honesty
- AI loop integration

## 성공 지표

- impact prediction 후 실제 수정 범위 적중률
- plan 기반 split PR 비율
- blast-based test selection 적중률
- risky rename / migration rollback 감소

## 출시 순서

### Phase 1

- file/symbol seed
- direct impact
- required tests list

### Phase 2

- transitive impact
- confidence / unknown display
- split plan recommendation

### Phase 3

- diff-aware planner
- AI migration loop
- proof obligations + runtime correlation

## Why Developers Will Care

이 기능은 "바꿔도 될까?"를 "이 순서대로 바꾸면 된다"로 바꿔준다.
AI 시대에 가장 비싼 건 코드 생성이 아니라 안전한 변경 설계다.
여기가 강하면 개발자는 진짜로 매일 들어온다.
