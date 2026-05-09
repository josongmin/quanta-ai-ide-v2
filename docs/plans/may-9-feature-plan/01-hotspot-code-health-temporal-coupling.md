# Feature 01: Hotspot + Code Health + Temporal Coupling

## One-liner
개발자가 "지금 어디부터 봐야 하는지"를 가장 빠르게 알려주는 기본 레이어. `/intelligence`의 맵을 단순 구조 뷰에서 "팀 마찰 지도"로 바꾼다.

## Problem Statement

대부분의 코드 분석 화면은 세 가지 중 하나만 보여준다.

- 구조: 파일/폴더/의존 관계
- 품질: complexity, duplication, lint
- 변경: git churn

문제는 개발자 의사결정이 이 셋의 곱으로 일어난다는 점이다.

- 복잡하지만 거의 안 바뀌는 코드는 당장 우선순위가 낮다.
- 자주 바뀌지만 건강한 코드는 운영 비용이 낮다.
- 자주 바뀌고, 건강하지 않고, 같이 자주 움직이는 주변 파일까지 있으면 거기가 진짜 돈이 새는 곳이다.

2026년에도 이 문제는 그대로다. 그래서 CodeScene 계열이 계속 먹힌다. "핫스팟"은 여전히 개발자에게 가장 직관적으로 가치가 보이는 분석 결과다.

## Why This Matters Now

현재 `/intelligence`는 맵, 필터, focus panel, overlay 같은 껍데기는 좋다. 하지만 실무에서 더 치명적인 질문인 아래를 아직 바로 답하지 못한다.

- 이번 분기에 제일 비싼 코드가 어디냐
- 지금 PR 리스크를 가장 많이 키우는 구역이 어디냐
- 구조적으로 얽혀서 계속 같이 터지는 파일 묶음이 뭐냐
- 특정 팀/개인이 과도하게 붙들고 있는 hotspot이 어디냐

즉, "보는 재미"는 있는데 "즉시 우선순위 판단"이 아직 약하다.

## Moat

이 기능 자체는 시장에 존재한다. moat는 기능명이 아니라 정밀도와 연결성에서 나온다.

우리 moat는 다음 조합이다.

1. 파일 단위가 아니라 심볼/경계 단위까지 내려갈 수 있다.
2. import graph 수준이 아니라 call graph, dataflow, change impact와 연결된다.
3. temporal coupling을 단순 git 공동변경이 아니라 아키텍처 경계 위반/호출 경로와 함께 설명할 수 있다.
4. 이후 AI 조사, blast radius, refactor planning의 입력 레이어가 된다.

즉, 경쟁 툴이 "여기가 뜨겁다"를 말할 때 우리는 "왜 뜨겁고, 누구에게 위험하며, 어디서부터 잘라야 하는지"까지 이어준다.

## 기술 배경

우리는 이미 정적 엔진 자산이 많다. 이 기능은 새 엔진을 만드는 과제가 아니라 기존 엔진을 랭킹과 UX로 묶는 과제에 가깝다.

핵심 활용 자산:

- `project_model`, `import_graph`, `call_graph`
- `behavior_diff`, `query_change_impact`
- `whole_repo_reachability`, `graph_path`
- `function_summary`, `explain`, `proof_analysis`
- `dead_code`, `clone_detection`
- `index_status`, `incremental_analysis`

핫스팟 점수는 최소 아래 신호를 합성해야 한다.

1. 변경 빈도: churn, commit density, recentness
2. 구조 난이도: complexity, dependency depth, cycle proximity
3. 건강도: code health, clone/dead code/coverage deficits
4. coupling: temporal coupling, logical coupling, ownership fragmentation
5. business criticality proxy: entrypoint, public surface, auth/payment/config proximity

추천 점수 모델:

- `hotspot_score = change_pressure x structural_friction x blast_multiplier x ownership_risk`
- 단일 숫자로 끝내지 말고, 하위 기여 요인을 반드시 노출한다.

temporal coupling은 최소 3레벨로 나눠야 한다.

- file-file
- file-symbol
- subsystem-subsystem

여기서 file-level만 있으면 "같이 바뀐다" 수준이고, symbol/subsystem 레벨까지 있어야 refactor 제안으로 연결된다.

## 제안 기능

### 1. Hotspot Heat Layer

맵의 기본 레이어 중 하나로 넣는다.

- 노드 밝기: hotspot score
- halo: 최근 14일 가속
- stripe: ownership fragmentation
- warning badge: low health + high change pressure

### 2. Temporal Coupling Cluster

같이 자주 움직이는 파일/심볼 묶음을 클러스터로 띄운다.

- "같이 바뀌는 이유"를 edge evidence로 설명
- architectural boundary를 넘어가면 red cluster
- 동일 팀 내부 결합과 cross-team 결합을 구분

### 3. Hotspot Triage Rail

우측 또는 하단 요약 레일에서 보여준다.

- 이번 주 top 10 hotspots
- 신규 진입 hotspot
- 급격히 악화된 hotspot
- "먼저 잘라야 할 seam" 추천

### 4. PR / Release Risk Overlay

현재 브랜치 diff가 있을 때:

- touched files 중 hotspot score가 높은 구역 강조
- 최근 coupling cluster와 겹치면 merge risk 가중
- release seed와 연결되면 release risk 카드 생성

## AI-native 설계

이 기능은 AI의 입력 레이어여야 한다.

AI가 이 레이어를 소비해서 바로 이런 말을 해야 한다.

- "이 영역은 최근 30일간 11번 바뀌었고, 인증/결제 경계와 같이 움직여서 우선 조사 가치가 높습니다."
- "이 hotspot은 파일 수는 작지만, temporal coupling이 4개 팀 경계를 넘어서므로 작은 PR stack으로 분해하는 것이 안전합니다."
- "현재 PR은 hotspot 상위 5% 구역 두 곳을 동시에 건드립니다. 분리 제출이 유리합니다."

AI-native로 만들려면:

1. 숫자보다 narrative를 생성해야 한다.
2. 모든 narrative에 근거 신호를 붙여야 한다.
3. 다음 액션 추천이 있어야 한다.

추천 액션:

- 조사 시작
- 오너 호출
- refactor stack 생성
- 테스트 보강
- release gate escalte

## 리팩토링 / 아키텍처 영향

필수 리팩토링 포인트:

1. 맵 렌더링용 score model을 UI 바깥의 독립 `ranking/model` 계층으로 분리
2. git-derived 신호와 static-derived 신호를 분리 저장
3. hotspot score 계산과 explanation 계산을 분리
4. temporal coupling 계산은 background cache로 이동
5. `FocusScan`과 연결되는 stable node identity를 확보

이 기능이 들어오면 이후 기능도 쉽게 붙는다.

- blast radius: hotspot node를 seed로 활용
- suspect commit: hotspot + incident correlation
- ownership routing: hotspot triage 결과를 팀 액션으로 전환
- refactor stack: hotspot cluster를 stack seed로 사용

## UI/UX 코멘트

1. 기본 맵은 과하게 붉지 않아야 한다.
   hotspot은 scarce signal이어야 한다. 전체가 다 위험해 보이면 실패다.

2. 단일 점수만 크게 보여주면 안 된다.
   "왜 뜨거운지"를 3개 정도의 기여 요인으로 바로 보여줘야 한다.

3. temporal coupling은 선을 많이 그리면 맵이 망가진다.
   평소엔 cluster contour만, hover/focus 시에만 edge를 연다.

4. hover 툴팁은 아래 4줄이면 충분하다.

- hotspot percentile
- 최근 변경 추세
- coupling strongest partner
- ownership risk

5. focus panel에서는 "읽기 시작점"이 있어야 한다.

- 가장 핵심 함수
- 가장 자주 같이 바뀌는 파일
- 가장 위험한 public entry

## 성공 지표

- hotspot 클릭 후 첫 관련 파일 열기까지 시간
- hotspot이 포함된 PR의 분리 제출 비율
- hotspot 기반 triage 후 rollback/reopen 감소
- hotspot 상위 구역의 MTTR 감소

## 출시 순서

### Phase 1

- file-level hotspot
- basic code health
- top hotspots rail

### Phase 2

- temporal coupling clusters
- ownership fragmentation
- PR risk overlay

### Phase 3

- symbol-level hotspot
- AI triage narrative
- refactor seam recommendation

## Why Developers Will Care

이 기능은 "인텔리전스 맵이 예쁘다"가 아니라 "어디부터 보면 되는지 바로 안다"로 바뀌는 순간 효용이 생긴다.
핫스팟은 제품 데모용 기능이 아니라, 팀이 매일 들어와서 보는 홈화면이 될 수 있는 기능이다.
