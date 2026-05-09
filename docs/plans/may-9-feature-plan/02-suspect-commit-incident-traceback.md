# Feature 02: Suspect Commit + Incident Traceback

## One-liner
문제가 터졌을 때 "어느 코드가 위험한가"가 아니라 "누가, 어느 변경에서, 왜 이 문제를 만들었는가"를 바로 좁혀주는 레이어.

## Problem Statement

개발자에게 가장 비싼 순간 중 하나는 장애/에러/회귀를 보고도 원인 변경을 빨리 못 찾는 순간이다.

실제 현장에서는 아래를 계속 반복한다.

- stack trace 확인
- 최근 PR 뒤짐
- blame/commit history 확인
- 누가 바꿨는지 슬랙 핑
- 비슷한 장애가 있었는지 뒤짐

Sentry, Datadog의 suspect commit이 먹히는 이유는 아주 단순하다.
사람이 수동으로 하는 triage를 몇 분에서 몇 초로 줄여주기 때문이다.

하지만 시장 기본형은 대체로 "stack trace에 나온 파일을 최근 누가 만졌는지" 수준이다.
우리에게 필요한 것은 그보다 한 단계 더 깊은 traceback이다.

## 우리가 풀어야 하는 질문

- 이 장애와 가장 관련 높은 변경은 무엇인가
- 직접 수정 파일만 아니라, transitive impact까지 보면 어떤 PR이 더 위험한가
- 어떤 owner/team이 지금 즉시 들어와야 하는가
- 이슈가 isolated bug인지, hotspot cluster의 일부인지
- rollback, patch, escalate 중 무엇이 맞는가

## Moat

기본 suspect commit은 이미 commodity다.
moat는 "정적 근거를 포함한 suspect ranking"에서 나온다.

우리가 더 잘할 수 있는 이유:

1. stack frame 파일 일치뿐 아니라 call path proximity를 쓸 수 있다.
2. changed symbol과 failing symbol 사이의 dataflow / control-flow 근접도를 반영할 수 있다.
3. auth / config / async / error path 같은 위험 경로를 가중할 수 있다.
4. 단순 범인 지목이 아니라 patch blast와 rollback ease까지 붙일 수 있다.

즉, 남들은 "가장 최근 변경"을 보여주고 우리는 "가장 설명력이 높은 변경"을 보여준다.

## 기술 배경

이 기능은 외부 telemetry만으로는 부족하고, 정적 엔진과 결합해야 품질이 올라간다.

핵심 조합:

- 런타임 쪽: stack trace, error signature, release/version, first seen, owner mapping
- 정적 쪽: `go_to_definition`, `find_references`, `call_graph`, `graph_path`
- 변화 쪽: `query_change_impact`, `behavior_diff`
- reasoning 쪽: `explain`, `function_summary`, `proof_analysis`

추천 랭킹 신호:

1. stack frame exact hit
2. changed lines / changed symbols overlap
3. failing path까지의 graph distance
4. error-handling / taint / typestate 민감 경로 여부
5. first-seen 직전 release와의 시간 근접성
6. 이미 같은 owner가 과거 유사 incident를 해결한 이력

추천 출력:

- suspect PR
- suspect commit
- suspect symbol
- suspect owner
- confidence
- why-ranked

## 제안 기능

### 1. Issue-to-Code Overlay

인텔리전스 맵에서 incident를 오버레이하면:

- 관련 노드 glowing
- stack-hit node와 transitive suspect node 구분
- direct evidence와 inferred evidence 분리

### 2. Suspect Ranking Card

우측 패널 또는 incident drilldown에서 노출:

- top suspect commit / PR / author
- first-seen 이전 마지막 touched release
- reasoning bullets
- rollback ease
- patch blast estimate

### 3. Similar Incident Memory

같은 경로, 같은 module, 같은 owner에서 반복된 문제를 묶는다.

- "이전에도 같은 seam에서 3회 발생"
- "항상 config parser 변경 후 재발"
- "이 owner/team이 이전 2회 해결"

이건 단순 blame이 아니라 팀 memory layer다.

### 4. Fix Mode Handoff

card에서 바로 이어지는 액션:

- open evidence
- open owner
- draft fix
- create rollback patch
- assign to AI agent

## AI-native 설계

이 기능이 AI-native 하려면 "범인 추측"이 아니라 "조사 브리핑 생성기"가 되어야 한다.

AI가 이 기능 위에서 해야 하는 일:

1. top 3 suspects 설명
2. 각 suspect의 반증 포인트도 함께 제시
3. 패치/롤백/관찰 강화 중 어떤 전략이 맞는지 추천
4. 검증 계획까지 자동으로 붙임

좋은 출력 예:

- "가장 유력한 원인은 `auth/session.ts`의 최근 변경입니다. stack hit는 없지만 `token refresh -> session cache -> request guard` 경로가 이번 에러와 정확히 겹칩니다."
- "즉시 롤백보다 hotfix가 유리합니다. blast radius는 중간이고, 영향 테스트 6개로 검증 가능합니다."

즉 AI는 summary bot이 아니라 incident commander의 보조석 역할을 해야 한다.

## 리팩토링 / 아키텍처 영향

필수 분리 포인트:

1. runtime incident model과 static evidence model 분리
2. ranking engine과 narrative engine 분리
3. suspect evidence를 explanation schema로 정규화
4. 외부 issue id / release id / commit id / symbol id를 공통 identity layer로 묶기

추천 내부 모델:

- `Incident`
- `EvidenceEdge`
- `SuspectCandidate`
- `TriageAction`
- `VerificationPlan`

이렇게 분리해야 나중에 Sentry/Datadog/GitHub Actions/CI signal을 다 먹여도 UI가 안 깨진다.

## UI/UX 코멘트

1. blame tone 금지.
   "누가 잘못했나" 느낌보다 "가장 설명력 높은 변경은 무엇인가" 톤이어야 한다.

2. confidence는 눈에 띄게.

- exact
- strong inferred
- weak inferred

3. direct stack hit와 transitive suspect를 시각적으로 분리.
   이 둘을 섞으면 신뢰가 바로 무너진다.

4. 첫 화면에서 너무 많은 suspect를 뿌리지 말 것.
   상위 3개 + "why this one"만 먼저 보여줘야 한다.

5. action button은 triage 순서대로.

- investigate
- patch
- rollback
- escalate

## 성공 지표

- incident open 후 first suspect 확인까지 시간
- first assigned owner accuracy
- rollback vs hotfix decision latency
- repeat incident rate
- AI-suggested suspect acceptance rate

## 출시 순서

### Phase 1 — "Sentry와 뭐가 다른데"에 한 문장으로 답할 수 있는 최소 단위

commodity 기준선만 깔면 시장에서 "또 하나의 suspect commit"으로 묶인다.
Phase 1부터 *최소 한 개*의 정적 신호와 차별화 UX 한 가지가 들어가야 moat 메시지가 산다.

기준선:

- stack-hit + recent-change suspect
- PR/author mapping
- simple ranking card

차별화 (Phase 1에 반드시 포함):

- **changed-symbol ↔ stack-symbol overlap** — call graph 풀 빌드 없이도 가능한 가장 싼 정적 신호. graph distance는 비싸므로 Phase 2로.
- **"왜 *아닐* 수도 있는가" 반증 1줄** — ranking card에서 confidence와 *동급* 비중으로 노출. 부가 기능이 아니라 primary surface.
- confidence를 단순 3-tier로 끝내지 말고, 반증 근거가 동시에 보이도록 카드 레이아웃 설계.

### Phase 2

- graph distance / call path weighting
- incident memory (Phase 1엔 cold-start로 비어있으므로 표면 노출 금지)
- owner auto-routing

### Phase 3

- AI triage brief
- patch/rollback recommendation
- verification plan generation

## 열린 질문 (Phase 1 전에 결정 필요)

이 기능은 framing이 단단한 만큼, 출시 전 풀어야 하는 정합성 문제가 있다.
아래는 디자인/엔지니어링이 결정을 미루면 Phase 1이 commodity로 회귀하거나 신뢰가 한 번에 무너지는 지점들.

### Q1. 포지셔닝 — Sentry/Datadog과 어떻게 공존할 건가

대부분 팀이 이미 Sentry/Datadog로 incident inbox를 쓴다. 두 갈래가 있다.

- **Deep-dive 레이어**: Sentry incident → 우리 도구로 점프. 진입 장벽 낮음, standalone 가치는 약함.
- **Inbox 자체**: 우리가 incident 진입점이 됨. 진입 장벽 큼, 도입 시 가치 큼.

이 결정이 Phase 1 IA를 좌우한다. Deep-dive면 deeplink 스펙(incident id 매핑, 인증 핸드오프)이 Phase 1에 들어가야 하고, inbox면 ingestion 파이프라인이 들어가야 한다.

### Q2. Ground truth — ranking 품질을 어떻게 검증할 건가

"AI-suggested suspect acceptance rate" 지표는 ground truth 없이는 측정 불가능하고, ranking을 개선할 피드백 루프가 닫히지 않는다.

필요한 작업:

- 디자인 파트너 1팀 확보 → 그들의 과거 incident 50건 라벨링
- 각 incident의 "실제로 원인이었던 commit/PR"이 우리 ranking 상위 3에 들어가는지 backtest
- 이 backtest 결과가 Phase 1 출시 GA 게이트가 되어야 한다

이게 없으면 ranking은 영원히 "그럴듯해 보이는 휴리스틱" 상태로 머무른다.

### Q3. False positive 비용 비대칭

incident 상황에서 잘못된 suspect를 "strong inferred"로 자신 있게 보여주면 신뢰가 한 번에 끝난다.
"왜 의심되는가"보다 "왜 *아닐* 수도 있는가"가 더 중요한 surface가 될 가능성.

설계 원칙으로 반영:

- 반증 근거가 confidence와 같은 시각 비중을 가져야 함
- "strong inferred"는 반증 1개 미만일 때만 부여 가능하도록 calibration rule
- ranking 1위가 "weak inferred"인 incident는 카드 대신 "근거 부족, 수동 조사" 메시지로 fallback

### Q4. Similar Incident Memory의 cold-start

첫 6개월은 데이터가 거의 없어 카드가 빈 상태로 노출된다. 데모에선 빛나지만 도입 초기엔 신뢰를 깎는다.

해결: Phase 1엔 표면 노출 금지. Phase 2에 N건 이상 누적 시점부터 점진 노출. 데모/마케팅 자료에선 별도 mock 데이터로 보여주되 제품 안에서는 숨김.

### Q5. Confidence tier가 3개로 충분한가

exact / strong inferred / weak inferred는 사용자에게는 깔끔하지만, ranking engine 내부 score 분포와 매핑이 자의적일 위험.
calibration 후 실제 acceptance rate가 tier별로 단조 증가하는지(=tier가 의미 있는지) Phase 1 backtest에서 검증해야 한다. 단조 증가 안 하면 tier 재설계.

## Why Developers Will Care

이 기능은 "장애가 났다"를 "어디부터 잡아야 한다"로 즉시 바꿔준다.
hotspot이 평시 홈화면이라면, suspect traceback은 비상시 홈화면이다.
