# Feature 06: AI Verified Fix Pipeline

## One-liner
AI가 단순히 패치를 제안하는 수준을 넘어서, 근거 수집 -> 수정 -> 검증 -> draft PR까지 닫힌 루프로 수행하게 만드는 기능.

## Problem Statement

2026년엔 AI가 코드를 쓰는 것 자체는 희소성이 아니다.
희소한 것은 이거다.

- 어떤 수정이 맞는지
- 얼마나 안전한지
- 무엇으로 검증했는지
- 어디까지 자동화해도 되는지

기존 autofix류의 가장 큰 한계는 "patch는 있는데 믿을 수 있는 proof가 약하다"는 점이다.
그래서 실제 조직에서는 아래가 병목이 된다.

- 수정안 검토
- 영향 범위 확인
- 테스트/스캔 실행
- PR 설명 작성

즉, AI patch의 본질 문제는 생성이 아니라 검증이다.

## Why This Matters

우리가 이미 강한 정적 엔진을 갖고 있다면, 가장 비싼 시장 포지션은 "AI coding"이 아니라 "AI verified change"다.

개발자는 다음 질문에 돈을 낸다.

- 이 수정이 정말 root cause를 건드렸나
- 다른 경로는 안 깨지나
- 테스트/타입/정적분석 기준으로 안전한가
- 이걸 지금 PR로 내도 되나

GitHub Copilot Autofix가 검증한 건 "자동 수정 수요가 크다"는 사실이다.
우리가 더 가야 할 곳은 "자동 수정의 신뢰도"다.

## Moat

autofix 자체는 시장에 널려간다.
moat는 proof-carrying fix pipeline에서 나온다.

우리 강점:

1. `taint_flow`, `change_impact_analysis`, `rename_preview`, `proof_analysis`를 수정 전후 비교에 쓸 수 있다.
2. 정적 엔진이 root cause evidence와 regression evidence를 함께 줄 수 있다.
3. blast planner, ownership, routing과 바로 연결된다.
4. 결과물을 patch가 아니라 "검증된 change package"로 만들 수 있다.

즉, 남들이 "이렇게 바꿔보세요"일 때 우리는 "왜 이렇게 바꾸고, 무엇으로 검증했고, 어디까지 자동 제출 가능한지"를 보여준다.

## 기술 배경

핵심 자산:

- `taint_flow`, `source_sink_detection`
- `change_impact_analysis`, `behavior_diff`
- `rename_preview`, `code_actions`
- `proof_analysis`, `explain`
- `policy_bundle`, `vulnerability_scan`, `sarif_report`
- test/lint/typecheck/scan execution rails

fix pipeline은 최소 아래 상태를 가져야 한다.

1. diagnosis
2. candidate patch
3. proof obligations
4. validation result
5. delivery recommendation

proof obligations 예시:

- affected tests pass
- security path no worse
- public API unchanged or explicitly migrated
- policy violation absent
- unknown zone bounded

정적 근거와 실행 근거를 분리해서 보여줘야 한다.

- static proof
- dynamic validation
- human-required review

## 제안 기능

### 1. Fix Candidate Generator

seed는 incident, hotspot, alert, focus panel에서 받을 수 있다.

- root cause 요약
- candidate fix 1~3개
- 각 fix의 장단점
- 예상 blast radius

#### Seed schema (필수)

candidate 품질의 진짜 병목은 seed다. seed가 부실하면 candidate도 부실해진다.
seed는 최소 아래 필드를 가져야 하고, 누락 시 candidate generator는 거부해야 한다.

- `id`, `kind` (incident | hotspot | alert | focus)
- `symptom`: 관찰된 현상 (stack trace, sarif finding, taint path 등)
- `evidence_refs`: 정적 엔진이 참조한 노드/경로 (필수 — 없으면 generator는 chat-completion 수준으로 떨어진다)
- `suspected_root_cause` (optional, 정적 분석 결과)
- `blast_hint`: 영향 받을 수 있는 모듈/owner 후보
- `constraints`: 건드리면 안 되는 영역, public API 여부 등

evidence_refs가 비어있으면 fix가 아니라 "추측"이 된다.
seed validator를 generator 앞단에 둬서 이 경계를 강제한다.

### 2. Verification Checklist

패치마다 자동 생성:

- must-run tests
- must-check paths
- required owner review
- policy/security checks
- runtime unknowns

### 3. Post-patch Re-analysis

수정 후 자동으로 재계산:

- taint path 제거 여부
- blast radius 변화
- hotspot 변화
- policy/regression 발생 여부

### 4. Draft PR Package

검증을 통과하면:

- summary
- why this fix
- validation results
- remaining unknowns
- reviewer suggestion

까지 draft PR로 묶는다.

## AI-native 설계

AI-native 핵심은 "한 번 답하고 끝"이 아니라 self-check loop다.

좋은 루프:

1. 조사
2. patch 생성
3. self-critique
4. validation 실행
5. 결과에 따라 patch 수정
6. draft PR 생성

즉 AI는 chat completion이 아니라 bounded agent workflow가 되어야 한다.

필수 원칙:

- low confidence면 자동 제출 금지
- unknown zone이 크면 human checkpoint 강제
- proof가 충분하면 작은 mechanical fix는 원클릭 승인 가능

#### Loop bounds (필수)

루프는 무한정 돌면 안 된다. 비용/지연/불안정성이 폭발한다.
아래 종료 조건을 명시한다.

- **max iterations**: 기본 2회. 3회째부터는 human handoff.
- **time budget**: 누적 validation 시간 N분 초과 시 중단 → 현재 best candidate를 human review로 전달.
- **token budget**: 누적 토큰 한도 초과 시 동일 처리.
- **non-progress detection**: self-critique 결과가 직전 iteration과 같은 종류의 실패를 다시 내면 즉시 중단 (LLM이 같은 실수를 반복할 가능성이 높다).
- **self-critique reject 처리**: 모든 candidate가 critique에서 reject되면 abort + "왜 막혔는지" 요약을 사람에게 넘긴다. 새 candidate를 무한 생성하지 않는다.

bounded agent는 "끝까지 해결"이 아니라 "안전하게 멈출 줄 안다"가 핵심이다.

#### Cost model

루프 도입 전에 단위 경제성을 측정해야 한다.

- 1 cycle = (LLM 토큰 비용) + (CI/validation 분 비용)
- target: `acceptance_rate × value_per_accepted_patch > expected_cycles × cycle_cost`
- 이 부등식이 안 서면 self-loop는 product가 아니라 demo에 머문다.
- Phase 1 단계에서 초기 cost telemetry를 박아둬야 Phase 2에서 자동화 범위를 정할 수 있다.

## 리팩토링 / 아키텍처 영향

필수 모듈:

1. `fix-candidate/model`
2. `verification-plan/model`
3. `validation-executor`
4. `delivery-gate`

현재 구조 기준으로는 coding-stage와 intelligence-stage의 경계도 다시 정리해야 한다.

- intelligence: diagnosis / evidence / planning
- coding: patch authoring / execution / diff review

하지만 UX는 끊기면 안 된다.
따라서 shared workflow state가 필요하다.

## UI/UX 코멘트

1. patch diff를 첫 화면에 크게 두지 말 것.
   먼저 root cause / proof / blast를 보여줘야 한다.

2. candidate는 많아도 3개.
   선택 과부하가 오면 안 된다.

3. 검증 결과는 pass/fail보다 coverage of risk를 보여줘야 한다.

- what was checked
- what remains unknown

4. 자동 제출과 수동 검토 경계를 분명히 해야 한다.

- safe mechanical
- guarded
- human required

5. PR package는 복붙용 리포트가 아니라 reviewer가 바로 이해할 수 있는 concise package여야 한다.

## Delivery Gate: 정량 기준

"low confidence면 자동 제출 금지"는 동어반복이다.
보수적으로 다 human required로 가면 자동화 가치가 사라지므로 정량 룰을 못 박는다.

각 tier의 진입 조건 (모두 AND):

### safe mechanical (one-click 자동 제출 가능)

- diff size: 변경 라인 ≤ 20, 변경 파일 ≤ 2
- blast radius: 영향 모듈 ≤ 1
- public API 미변경
- proof obligations 100% 통과 (static + dynamic 모두)
- unknown zone = 0
- patch kind: rename / null-check / typo / deprecated API swap 등 화이트리스트

### guarded (draft PR + 명시적 human approve)

- blast radius ≤ 5 모듈
- proof obligations static 100% 통과
- dynamic validation 통과 또는 affected test가 적은 경우 명시
- public API 변경 시 migration 명시
- unknown zone bounded

### human required

- 위 조건 미달
- security path 영향
- 정책/컴플라이언스 변경
- self-critique loop가 max iteration까지 갔는데도 obligation 미충족

이 임계값들은 telemetry로 튜닝 대상이고, 코드에 magic number로 박지 말고 policy bundle에 둔다.

## Rollback / Trust Signal

Phase 3로 미루면 안 되는 항목 — Phase 1부터 필수.

draft PR이라도 잘못된 fix가 reviewer time을 태우면 신뢰가 죽는다.
patch 자체에 "이 PR을 무시해도 되는 신호"가 들어있어야 한다.

- 각 patch에 `confidence_score` + `weakest_obligation` 노출
- "이 candidate는 X 때문에 약하다"를 reviewer가 5초 안에 읽도록
- one-click "이 candidate dismiss + 사유" 버튼
- dismiss 사유는 다음 candidate generation에 feedback으로 회수

Phase 3의 rollback package는 "merge 후 되돌리기"이지만,
Phase 1의 trust signal은 "merge 전에 빨리 거절하기"다. 이게 먼저다.

## Convention Conformance

정적/동적 proof만으로는 부족하다.
reviewer가 가장 빨리 reject하는 이유는 "코드베이스답지 않다"이다.

추가 obligation:

- 주변 파일의 import 스타일, 에러 핸들링 패턴, 네이밍 일관성
- 기존 utility/abstraction 재사용 여부 (새로 만드는 대신)
- 프로젝트의 lint/format 규칙 통과 (이건 dynamic validation에서 자동)

이 obligation은 정적/동적 proof와 별도 카테고리(`stylistic_proof`)로 분리해서 보여준다.
실패해도 자동 제출은 막되, candidate 자체를 reject하진 않는다 (LLM이 다음 iteration에서 고칠 수 있다).

## 검증된 외부 패턴과 차이점

검증된 패턴:

- GitHub Copilot Autofix
- code scanning -> fix agent
- draft PR automation

우리가 더 갈 부분:

- proof-first UX
- blast-aware validation
- static + dynamic merged verification
- routing + reviewer recommendation

## 성공 지표

- AI fix acceptance rate
- accepted patch의 post-merge regression rate
- incident-to-draft-PR time
- **edit delta < threshold인 patch의 비율** (단순 "human edit delta"는 게이밍됨 — AI가 보수적으로 작은 fix만 내게 됨)
- cycle 당 cost (토큰 + CI 분) vs accepted patch의 가치 비율
- dismiss-rate by weakest obligation (어떤 obligation이 가장 자주 fix를 죽이는지)

## 출시 순서

원칙: Phase 1은 "1 candidate + static proof + trust signal"로 좁힌다.
candidate generator / validation executor / draft PR package는 각각 다른 product 수준이라 한꺼번에 못 만든다.

### Phase 1 (좁게)

- seed validator + 1개 candidate fix (정적 evidence 기반)
- **static proof만**: taint path 제거, blast radius, policy violation
- candidate-level trust signal (confidence_score, weakest_obligation, dismiss 버튼)
- manual draft PR package (사람이 버튼 눌러 생성)
- cost telemetry 박기

### Phase 2

- candidate 1~3개 다중 생성
- dynamic validation (test/lint/typecheck/scan 실행)
- post-patch re-analysis
- bounded self-loop (max 2 iter)
- guarded tier one-click draft PR
- reviewer routing integration
- convention conformance obligation

### Phase 3

- safe-mechanical tier 자동 제출 (정량 임계 만족 시)
- policy-aware auto submit threshold 튜닝
- rollback package generation (merge 후 되돌리기)
- dismiss 사유 → candidate generator feedback loop

## Why Developers Will Care

AI가 코드를 쓰는 건 이제 놀랍지 않다.
하지만 "이 수정은 안전합니다"를 증거와 함께 말해주면 얘기가 달라진다.
이 기능은 인텔리전스를 실제 delivery velocity로 바꾸는 마지막 조각이다.

---

## 자기 비판 / 약한 부분

이 문서가 강한 부분과 약한 부분을 분리해서 기록. 출시 위험을 미리 박아둔다.

### 강한 부분

- **"본질 문제는 생성이 아니라 검증"** — 한 줄 포지션. autofix가 검증한 _수요_ 위에 _신뢰도_ 축으로 차별화하는 게 정확함.
- **proof를 static / dynamic / human-required로 분리** — pass/fail 한 비트로 누르지 않는 게 신뢰의 핵심.
- **seed validator + `evidence_refs` 강제** — 없으면 파이프라인이 chat-completion 수준으로 무너짐. 가장 중요한 게이트가 앞단에 있음.
- **delivery gate를 정량 임계값으로 못박은 것** — 라인 수/모듈 수/화이트리스트 patch kind. "low confidence면 자동 제출 금지"라는 동어반복을 실행 가능한 룰로 내렸음.
- **trust signal을 Phase 1로 끌어온 것** — "merge 전 빨리 거절"이 "merge 후 되돌리기"보다 먼저. 순서 정확.
- **`stylistic_proof` 분리** — reviewer가 가장 빨리 reject하는 이유는 "코드베이스답지 않다". 자동 제출은 막되 candidate는 살리는 정책도 적절.
- **edit delta 게이밍 방지** — 단순 edit delta로 측정하면 AI가 보수적으로 작은 fix만 내는 쪽으로 학습됨을 문서가 자기 인식함.
- **Phase 1을 "1 candidate + static proof + trust signal"로 좁힌 것** — candidate / validation / packaging은 각자 product 수준이라 동시에 못 만듦. 좁힌 결정 잘했음.

### 약한 부분

**1. post-patch re-analysis의 latency 한도가 미정**

`taint_flow`, `change_impact_analysis`가 _patch가 적용된 가상 트리_ 위에서 같은 정밀도로 동작한다는 보장이 없음. 인덱싱을 다시 돌려야 한다면 사용자 체감 한도(~10초)를 쉽게 넘김. **"증분 인덱싱이 가능한 분석만 post-patch loop에 포함"** 을 Phase 2 진입 조건으로 명시. 안 그러면 "재계산 중..." 스피너가 30초 도는 데모가 됨.

**2. 03 confidence 모델과 의존성 미명시**

이 문서의 confidence가 03 (Blast Radius)의 exact/overapprox/unknown 3-state와 같은 정의여야 함. **"06은 03의 confidence 모델 위에 얹힌다"** 를 의존성으로 박지 않으면 두 팀이 confidence를 따로 정의함. 같은 patch에 대해 03 패널과 06 패널이 다른 점수를 표시하는 사고가 남.

**3. "candidate 1~3개 동등 비교"의 인지 함정 (Phase 2)**

3개를 동등하게 늘어놓으면 사용자가 _가장 그럴듯해 보이는 것_ 을 고름 → 검증 차이는 못 봄. **"추천 1개 + 나머지 2개를 왜 떨어뜨렸는가"** 형태로만 보여주는 걸 디자인 원칙으로 박는 게 맞음. 동등 비교 UI는 reviewer를 책임 회피 모드로 만든다.

**4. dynamic validation 환경 의존성 (Phase 2)**

"affected tests pass"는 사용자 환경에서 실제 실행돼야 보장됨. 사내망/모노레포/특수 빌드/외부 의존(DB, secrets)에서 _실행 불가_ 비율이 클 수 있음. **"실행 불가 = unknown 승격 + human checkpoint 강제"** 룰을 delivery gate 표에 한 줄 추가. dynamic 실패를 '정적만으로 통과'로 간주해 자동 제출하면 사고남.

**5. coding-stage / intelligence-stage 경계는 큰 리팩토링**

문서엔 한 단락이지만 06 출시의 critical path가 될 수 있음. shared workflow state 모델 (어디 살고, 누가 owner이고, persistence 정책이 뭐고)을 별도 ADR로 빼지 않으면 두 팀이 다르게 구현함. Phase 1 시작 _전_ 결정이 필요한 항목.

**6. 자동 제출된 PR의 책임 소재 (Phase 3)**

자동 제출 PR이 회귀를 일으켰을 때 _시스템이 책임지는 모양_ 으로 보이면 조직 정치적으로 무너짐. PR description에 **"제안자: 시스템 / 승인자: 사용자 X / 검증된 항목: ... / 검증 안 된 항목: ..."** 을 자동 박아야 함. autofix류가 이걸 빼서 reviewer 분노를 산 사례 다수.

**7. 점진적 권한 부여 모드가 빠짐**

이 기능은 한 번 데이면 영영 안 씀. 첫 N번의 fix는 일부러 보수적으로 (auto-submit 비활성, candidate 1개, human checkpoint 강제) 동작하다가 telemetry 기반으로 권한이 풀리는 _점진적 권한 부여_ 모드가 필요. _초기 모드 자체_ 는 Phase 1에 있어야 하고 "졸업 정책"만 Phase 3.

### 빠진 관점

- **secret-scan gate**: AI가 코드에서 본 token/내부 URL을 PR description에 흘릴 수 있음. **Phase 1 필수**로 추가해야 함 (현재 출시 순서에 빠져 있음).
- **다른 진행 중 PR과의 충돌**: branch 단위 분석만 하면 동시 진행 변경과 충돌하는 patch를 자신 있게 추천함. **open PRs 컨텍스트** 를 seed/validation에 포함시켜야 함. Phase 2 권장.
- **rollback package의 Phase 위치**: 자동 제출(Phase 3)과 한 쌍이라 Phase 3에 둔 건 일관성 있음. 다만 guarded tier one-click(Phase 2)에서도 _누군가가 merge_ 할 수 있으므로 rollback이 Phase 2에 가벼운 형태(revert PR 자동 생성)로 먼저 들어가는 게 안전함.
- **다국어/locale**: PR summary, why this fix 같은 자연어 산출물의 언어 결정 룰이 없음. 팀별로 한국어/영어 섞이면 reviewer 경험 무너짐.
- **AI 모델 교체 시 회귀 검증**: candidate generator 모델을 업그레이드했을 때 기존 telemetry로 안전성 회귀를 어떻게 잡을지. 모델 교체가 silent regression 진앙.
- **오프라인/사내망**: 정적 엔진은 로컬, generator는 원격이라면 네트워크 단절 시 어디까지 동작하는지 정의가 없음. 사내망 고객 첫 질문.

### 한 줄 결론

방향, 뼈대, Phase 좁히기 모두 잘 됨. seed validator + bounded agent + 3-축 proof + 정량 delivery gate + trust signal Phase 1 승격 — 여기까지 잘 짜였음.

출시까지 가려면 네 개를 더 박아야 함:

1. **post-patch re-analysis = 증분 인덱싱 가능 분석으로 제약** — Phase 2 latency가 여기서 갈림
2. **03 confidence 모델에 명시적 의존** — 따로 만들면 두 패널이 다른 점수 표시
3. **dynamic validation 실패 = unknown 승격 + human checkpoint** 를 delivery gate에 한 줄 추가
4. **점진적 권한 부여 모드를 Phase 1 필수**로 — 첫 사고 한 번이면 기능이 죽음

이 네 개 빠지면 데모는 인상적인데 실 조직 도입에서 첫 false positive로 끝남.
